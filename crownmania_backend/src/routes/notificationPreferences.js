import express from 'express';
import { db } from '../config/firebase.js';
import signatureService from '../services/signatureService.js';
import logger from '../config/logger.js';

const router = express.Router();

/**
 * GET /api/notifications/preferences
 * Get notification preferences for a wallet
 */
router.get('/preferences', async (req, res) => {
    try {
        const { address, signature, message } = req.query;

        if (!address) {
            return res.status(400).json({ error: 'address is required' });
        }

        // Verify ownership
        if (signature && message) {
            await signatureService.verifySignature(address, signature, message);
        }

        const snap = await db.collection('notificationPreferences')
            .where('userId', '==', address.toLowerCase())
            .limit(1)
            .get();

        if (snap.empty) {
            // Return defaults
            return res.json({
                userId: address.toLowerCase(),
                emailDrops: true,
                smsDrops: false,
                inAppDrops: true,
            });
        }

        res.json(snap.docs[0].data());
    } catch (error) {
        logger.error('Error fetching notification preferences:', error);
        res.status(500).json({ error: 'Failed to fetch preferences' });
    }
});

/**
 * PUT /api/notifications/preferences
 * Update notification preferences
 */
router.put('/preferences', async (req, res) => {
    try {
        const { walletAddress, emailDrops, smsDrops, inAppDrops, signature, message } = req.body;

        if (!walletAddress) {
            return res.status(400).json({ error: 'walletAddress is required' });
        }

        // Verify wallet ownership
        if (signature && message) {
            await signatureService.verifySignature(walletAddress, signature, message);
        }

        const prefs = {
            userId: walletAddress.toLowerCase(),
            emailDrops: emailDrops !== false,     // default true
            smsDrops: smsDrops === true,           // default false
            inAppDrops: inAppDrops !== false,      // default true
            updatedAt: new Date(),
        };

        // Upsert
        const snap = await db.collection('notificationPreferences')
            .where('userId', '==', walletAddress.toLowerCase())
            .limit(1)
            .get();

        if (snap.empty) {
            prefs.createdAt = new Date();
            await db.collection('notificationPreferences').add(prefs);
        } else {
            await db.collection('notificationPreferences').doc(snap.docs[0].id).update(prefs);
        }

        logger.info(`Notification prefs updated for ${walletAddress.substring(0, 10)}...`);
        res.json({ success: true, ...prefs });
    } catch (error) {
        logger.error('Error updating notification preferences:', error);
        res.status(500).json({ error: 'Failed to update preferences' });
    }
});

export { router as notificationPreferencesRouter };
export default router;
