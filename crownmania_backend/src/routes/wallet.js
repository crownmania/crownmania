import express from 'express';
import rateLimit from 'express-rate-limit';
import { db } from '../config/firebase.js';
import signatureService from '../services/signatureService.js';
import ownershipService from '../services/ownershipService.js';
import twoFactorService from '../services/twoFactorService.js';
import { transferNFTToWallet } from '../services/thirdwebService.js';
import logger from '../config/logger.js';
import { contentSecurity } from '../utils/contentSecurity.js';
import { validateTransfer } from '../middleware/validation.js';

const router = express.Router();

// ── Rate Limiters ────────────────────────────────────
const transferLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,  // 1 hour
    max: 3,                     // 3 transfers per hour per IP
    message: { error: 'Too many transfer requests. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const twoFactorRequestLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,   // 5 minutes
    max: 5,                     // 5 requests per 5 min
    message: { error: 'Too many 2FA requests. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// ── 2FA Validity Window (OpenSea model: 20 minutes) ──
const TWO_FA_VALIDITY_MS = 20 * 60 * 1000;

/**
 * POST /api/wallet/connect
 * Connect external wallet after NFT transfer
 * Verifies on-chain ownership before updating DB
 */
router.post('/connect', async (req, res) => {
    try {
        const { walletAddress, signature, message, claimCodeId } = req.body;

        if (!walletAddress || !signature || !message) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Verify signature
        try {
            await signatureService.verifySignature(walletAddress, signature, message);
        } catch (error) {
            return res.status(401).json({ error: 'Signature verification failed' });
        }

        const sanitizedWallet = contentSecurity.sanitizeInput(walletAddress);
        const sanitizedCodeId = claimCodeId ? contentSecurity.sanitizeInput(claimCodeId) : null;

        // Find collectible by claim code or scan all collectibles for this contract
        let collectibleDoc = null;

        if (sanitizedCodeId) {
            const snapshot = await db.collection('collectibles')
                .where('serialNumber', '==', sanitizedCodeId.toLowerCase())
                .limit(1)
                .get();

            if (!snapshot.empty) {
                collectibleDoc = snapshot.docs[0];
            }
        }

        if (!collectibleDoc) {
            return res.status(404).json({ error: 'Collectible not found' });
        }

        const collectible = collectibleDoc.data();

        // Verify on-chain ownership
        if (collectible.contractAddress && collectible.blockchainTokenId) {
            const owns = await ownershipService.verifyOwnership(
                sanitizedWallet,
                collectible.contractAddress,
                collectible.blockchainTokenId
            );

            if (!owns) {
                return res.status(403).json({
                    error: 'You do not own this NFT on-chain'
                });
            }
        } else {
            // NFT not yet transferred, can't reconnect
            return res.status(400).json({
                error: 'NFT has not been transferred on-chain yet'
            });
        }

        // Update ownership in DB
        await db.collection('collectibles').doc(collectibleDoc.id).update({
            ownerId: sanitizedWallet.toLowerCase(),
            status: 'transferred',
            updatedAt: new Date()
        });

        // Log wallet connection
        contentSecurity.logSecurityEvent('wallet_reconnected', {
            collectibleId: collectibleDoc.id,
            newWallet: sanitizedWallet.substring(0, 10) + '...',
            serialNumber: collectible.serialNumber.substring(0, 8) + '...'
        }, req.ip, sanitizedWallet);

        logger.info(`Wallet ${sanitizedWallet.substring(0, 10)}... connected for collectible ${collectible.serialNumber}`);

        // Get all collectibles for this wallet
        const allCollectibles = await db.collection('collectibles')
            .where('ownerId', '==', sanitizedWallet.toLowerCase())
            .get();

        const collectibles = allCollectibles.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                serialNumber: data.serialNumber,
                productName: data.productName,
                edition: data.edition,
                totalEditions: data.totalEditions,
                metadata: data.metadata
            };
        });

        res.json({
            success: true,
            collectibles
        });
    } catch (error) {
        logger.error('Error connecting wallet:', error);
        res.status(500).json({ error: 'Failed to connect wallet' });
    }
});

/**
 * GET /api/wallet/:address/collectibles
 * Get all collectibles owned by a wallet
 */
router.get('/:address/collectibles', async (req, res) => {
    try {
        const { address } = req.params;

        if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
            return res.status(400).json({ error: 'Invalid wallet address' });
        }

        const snapshot = await db.collection('collectibles')
            .where('ownerId', '==', address.toLowerCase())
            .get();

        const collectibles = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                serialNumber: data.serialNumber,
                productName: data.productName,
                productId: data.productId,
                edition: data.edition,
                totalEditions: data.totalEditions,
                tokenId: data.tokenId,
                blockchainTokenId: data.blockchainTokenId,
                contractAddress: data.contractAddress,
                transactionHash: data.transactionHash,
                status: data.status,
                claimedAt: data.createdAt?.toDate().toISOString(),
                metadata: data.metadata
            };
        });

        res.json({ collectibles });
    } catch (error) {
        logger.error('Error fetching collectibles:', error);
        res.status(500).json({ error: 'Failed to fetch collectibles' });
    }
});

// ══════════════════════════════════════════════════════
//  EXTERNAL NFT TRANSFER (2FA + Wallet Signature)
//  Matches OpenSea security model:
//    - Wallet signature proves ownership
//    - 2FA code proves identity
//    - 20-minute 2FA validity window
//    - No cooldown (industry standard)
// ══════════════════════════════════════════════════════

/**
 * POST /api/wallet/transfer/request-2fa
 * Request a 2FA code before initiating a transfer
 * User must have 2FA enabled. If not, returns setup instructions.
 */
router.post('/transfer/request-2fa', twoFactorRequestLimiter, async (req, res) => {
    try {
        const { walletAddress, method } = req.body;

        if (!walletAddress || !method) {
            return res.status(400).json({ error: 'walletAddress and method (email|sms) required' });
        }

        if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
            return res.status(400).json({ error: 'Invalid wallet address format' });
        }

        if (!['email', 'sms'].includes(method)) {
            return res.status(400).json({ error: 'Method must be email or sms' });
        }

        // Check 2FA status
        const status = await twoFactorService.getStatus(walletAddress);

        if (!status.twoFactorEnabled) {
            return res.status(403).json({
                error: '2FA must be enabled before transferring NFTs',
                twoFactorRequired: true,
                setupUrl: '/settings/security'
            });
        }

        // Send the challenge code
        const result = await twoFactorService.sendLoginChallenge(walletAddress, method);

        logger.info(`[Transfer] 2FA code requested via ${method} for ${walletAddress.substring(0, 10)}...`);

        res.json({
            success: true,
            method,
            message: `Verification code sent via ${method}`,
            validityMinutes: TWO_FA_VALIDITY_MS / 60000
        });
    } catch (error) {
        logger.error('Error requesting transfer 2FA:', error);
        res.status(500).json({ error: error.message || 'Failed to send 2FA code' });
    }
});

/**
 * POST /api/wallet/transfer
 * Transfer an NFT from user's wallet to an external wallet
 * 
 * Security (OpenSea model):
 *   1. Wallet signature — proves the caller owns the source wallet
 *   2. 2FA code — proves the caller is the account owner (email/phone)
 *   3. On-chain ownership check — ensures the wallet actually holds the NFT
 *   4. Rate limited — 3 transfers per hour per IP
 */
router.post('/transfer', transferLimiter, validateTransfer, async (req, res) => {
    try {
        const {
            collectibleId,
            destinationAddress,
            twoFactorCode,
            twoFactorMethod,
            walletAddress,
            signature,
            message
        } = req.body;

        const sanitizedSource = contentSecurity.sanitizeInput(walletAddress).toLowerCase();
        const sanitizedDest = contentSecurity.sanitizeInput(destinationAddress).toLowerCase();

        // ── Guard: same wallet ──
        if (sanitizedSource === sanitizedDest) {
            return res.status(400).json({
                error: 'Destination wallet cannot be the same as source wallet'
            });
        }

        // ── Step 1: Verify wallet signature ──
        try {
            await signatureService.verifySignature(walletAddress, signature, message);
        } catch (error) {
            contentSecurity.logSecurityEvent('transfer_signature_failed', {
                wallet: sanitizedSource.substring(0, 10) + '...',
                destination: sanitizedDest.substring(0, 10) + '...'
            }, req.ip, sanitizedSource);

            return res.status(401).json({ error: 'Wallet signature verification failed' });
        }

        // ── Step 2: Verify 2FA code ──
        try {
            await twoFactorService.verifyCode(sanitizedSource, twoFactorMethod, twoFactorCode);
        } catch (error) {
            contentSecurity.logSecurityEvent('transfer_2fa_failed', {
                wallet: sanitizedSource.substring(0, 10) + '...',
                method: twoFactorMethod,
                reason: error.message
            }, req.ip, sanitizedSource);

            return res.status(401).json({ error: `2FA verification failed: ${error.message}` });
        }

        // ── Step 3: Load and validate collectible ──
        const collectibleRef = db.collection('collectibles').doc(collectibleId);
        const collectibleDoc = await collectibleRef.get();

        if (!collectibleDoc.exists) {
            return res.status(404).json({ error: 'Collectible not found' });
        }

        const collectible = collectibleDoc.data();

        // Verify caller owns this collectible in DB
        if (collectible.ownerId?.toLowerCase() !== sanitizedSource) {
            return res.status(403).json({
                error: 'You are not the owner of this collectible'
            });
        }

        // Must have been claimed / transferred on-chain
        if (!collectible.blockchainTokenId || !collectible.contractAddress) {
            return res.status(400).json({
                error: 'This collectible has not been minted on-chain yet'
            });
        }

        // ── Step 4: Verify on-chain ownership ──
        try {
            const owns = await ownershipService.verifyOwnership(
                sanitizedSource,
                collectible.contractAddress,
                collectible.blockchainTokenId
            );

            if (!owns) {
                // DB says they own it, but on-chain disagrees — might already be transferred
                return res.status(403).json({
                    error: 'On-chain ownership check failed. You may have already transferred this NFT.'
                });
            }
        } catch (error) {
            logger.warn(`On-chain ownership check failed for token ${collectible.blockchainTokenId}:`, error.message);
            // If Moralis is down, we fall back to DB-only check (already passed above)
        }

        // ── Step 5: Execute transfer ──
        logger.info(`[Transfer] Executing: token ${collectible.blockchainTokenId} from ${sanitizedSource.substring(0, 10)}... to ${sanitizedDest.substring(0, 10)}...`);

        const transferResult = await transferNFTToWallet(
            destinationAddress,  // Use original casing for on-chain
            collectible.blockchainTokenId
        );

        // ── Step 6: Update DB ──
        await collectibleRef.update({
            ownerId: sanitizedDest,
            previousOwnerId: sanitizedSource,
            status: 'transferred_external',
            lastTransferAt: new Date(),
            lastTransferTx: transferResult.transactionHash || null,
            lastTransferTo: sanitizedDest,
            updatedAt: new Date()
        });

        // ── Step 7: Audit trail ──
        contentSecurity.logSecurityEvent('nft_external_transfer', {
            collectibleId,
            tokenId: collectible.blockchainTokenId,
            from: sanitizedSource.substring(0, 10) + '...',
            to: sanitizedDest.substring(0, 10) + '...',
            txHash: transferResult.transactionHash || 'pending',
            edition: collectible.edition
        }, req.ip, sanitizedSource);

        logger.info(`[Transfer] Complete: edition #${collectible.edition} → ${sanitizedDest.substring(0, 10)}...`);

        res.json({
            success: true,
            message: 'NFT transferred successfully. Connect the destination wallet to view it in your Vault.',
            transfer: {
                collectibleId,
                tokenId: collectible.blockchainTokenId,
                from: sanitizedSource,
                to: sanitizedDest,
                transactionHash: transferResult.transactionHash || null,
                edition: collectible.edition,
                productName: collectible.productName
            }
        });

    } catch (error) {
        logger.error('Error transferring NFT:', error);
        res.status(500).json({ error: 'Failed to transfer NFT. Please try again.' });
    }
});

export { router as walletRouter };
export default router;
