import express from 'express';
import { db } from '../config/firebase.js';
import crypto from 'crypto';
import logger from '../config/logger.js';
import { contentSecurity } from '../utils/contentSecurity.js';
import { sendContentDropNotification } from '../services/notificationService.js';

const router = express.Router();

/**
 * Verify Moralis webhook signature
 */
const verifyMoralisSignature = (req) => {
    const signature = req.headers['x-signature'];
    const webhookSecret = process.env.MORALIS_WEBHOOK_SECRET;

    if (!webhookSecret) {
        // HARDENED: Fail-closed — reject ALL webhooks if secret is not configured.
        // Previously this silently accepted any webhook, allowing forged ownership transfers.
        logger.error('MORALIS_WEBHOOK_SECRET not set — rejecting webhook (fail-closed).');
        return false;
    }

    if (!signature) {
        return false;
    }

    const hash = crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(req.body))
        .digest('hex');

    return signature === hash;
};

/**
 * POST /api/webhooks/nft-transfer
 * Handle NFT transfer events from Moralis Stream
 */
router.post('/nft-transfer', express.json(), async (req, res) => {
    try {
        // Verify Moralis signature
        if (!verifyMoralisSignature(req)) {
            logger.warn('Invalid Moralis webhook signature');
            return res.status(401).json({ error: 'Invalid signature' });
        }

        const { confirmed, chainId, to, from, tokenId, contractAddress } = req.body;

        // Only process confirmed transfers
        if (!confirmed) {
            return res.json({ received: true, processed: false });
        }

        logger.info(`NFT transfer detected: Token ${tokenId} from ${from} to ${to}`);

        // Find collectible by contract and blockchain token ID
        const snapshot = await db.collection('collectibles')
            .where('contractAddress', '==', contractAddress.toLowerCase())
            .where('blockchainTokenId', '==', tokenId)
            .limit(1)
            .get();

        if (snapshot.empty) {
            logger.warn(`No collectible found for contract ${contractAddress} token ${tokenId}`);
            return res.json({ received: true, processed: false });
        }

        const collectibleDoc = snapshot.docs[0];
        const collectible = collectibleDoc.data();

        // Update owner
        await db.collection('collectibles').doc(collectibleDoc.id).update({
            ownerId: to.toLowerCase(),
            status: 'transferred',
            updatedAt: new Date()
        });

        // Log transfer event
        await db.collection('auditLogs').add({
            event: 'nft_transfer_detected',
            collectibleId: collectibleDoc.id,
            serialNumber: collectible.serialNumber,
            fromAddress: from.toLowerCase(),
            toAddress: to.toLowerCase(),
            tokenId,
            contractAddress: contractAddress.toLowerCase(),
            chainId,
            timestamp: new Date()
        });

        logger.info(`Updated collectible ${collectibleDoc.id} owner to ${to}`);

        res.json({ received: true, processed: true });
    } catch (error) {
        logger.error('Error processing NFT transfer webhook:', error);
        res.status(500).json({ error: 'Failed to process webhook' });
    }
});

/**
 * POST /api/webhooks/content-drop-notify
 * Internal webhook for notifying users of content drops
 * (Called by admin panel or cron job)
 */
router.post('/content-drop-notify', async (req, res) => {
    try {
        const { contentId, apiKey } = req.body;

        // Verify internal API key
        if (apiKey !== process.env.INTERNAL_API_KEY) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (!contentId) {
            return res.status(400).json({ error: 'Content ID required' });
        }

        // Get content details
        const contentDoc = await db.collection('content').doc(contentId).get();

        if (!contentDoc.exists) {
            return res.status(404).json({ error: 'Content not found' });
        }

        const content = contentDoc.data();
        const rules = content.accessRules || {};

        // Find eligible owners
        let query = db.collection('collectibles');

        if (rules.requiredProducts && rules.requiredProducts.length > 0) {
            query = query.where('productId', 'in', rules.requiredProducts);
        }

        const collectiblesSnapshot = await query.get();

        // Get unique wallet addresses
        const ownerWallets = [...new Set(collectiblesSnapshot.docs.map(doc => doc.data().ownerId))];

        // Get user profiles with marketing opt-in
        const userBatches = [];
        for (let i = 0; i < ownerWallets.length; i += 10) {
            const batch = ownerWallets.slice(i, i + 10);
            const usersSnapshot = await db.collection('users')
                .where('walletAddress', 'in', batch)
                .where('marketingOptIn', '==', true)
                .get();
            userBatches.push(...usersSnapshot.docs);
        }

        // Send notifications via email + SMS
        let notificationsSent = 0;
        for (const userDoc of userBatches) {
            const user = userDoc.data();
            // Get notification preferences
            const prefsDoc = await db.collection('notificationPreferences').doc(userDoc.id).get();
            const prefs = prefsDoc.exists ? prefsDoc.data() : { emailDrops: true, smsDrops: false };
            try {
                await sendContentDropNotification(content, user, prefs);
                notificationsSent++;
            } catch (err) {
                logger.error(`Failed to notify user ${userDoc.id}:`, err.message);
            }
        }

        // Log notification
        await db.collection('auditLogs').add({
            event: 'content_drop_notifications_sent',
            contentId,
            recipientCount: notificationsSent,
            timestamp: new Date()
        });

        logger.info(`Sent ${notificationsSent} notifications for content drop ${contentId}`);

        res.json({
            success: true,
            notificationsSent
        });
    } catch (error) {
        logger.error('Error sending content drop notifications:', error);
        res.status(500).json({ error: 'Failed to send notifications' });
    }
});

export { router as webhooksRouter };
export default router;
