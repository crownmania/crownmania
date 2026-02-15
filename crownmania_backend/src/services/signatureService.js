import { db } from '../config/firebase.js';
import { ethers } from 'ethers';
import crypto from 'crypto';
import logger from '../config/logger.js';

/**
 * Service for wallet signature authentication using nonce system
 * Prevents replay attacks and ensures wallet ownership
 */
export const signatureService = {
    /**
     * Generate a nonce for wallet signature authentication
     * @param {string} walletAddress - The wallet address requesting a nonce
     * @returns {Promise<{nonce: string, message: string, expiresAt: Date}>}
     */
    generateNonce: async (walletAddress) => {
        try {
            const nonce = crypto.randomUUID();
            const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

            // Store nonce in Firestore
            await db.collection('nonces').add({
                walletAddress: walletAddress.toLowerCase(),
                nonce,
                createdAt: new Date(),
                expiresAt,
                used: false
            });

            const timestamp = Date.now();
            const message = `Sign this message to prove wallet ownership:\nWallet: ${walletAddress}\nNonce: ${nonce}\nTimestamp: ${timestamp}`;

            logger.info(`Generated nonce for wallet ${walletAddress.substring(0, 10)}...`);

            return { nonce, message, expiresAt };
        } catch (error) {
            logger.error('Error generating nonce:', error);
            throw new Error('Failed to generate nonce');
        }
    },

    /**
     * Verify a wallet signature with nonce validation
     * @param {string} walletAddress - The wallet address that signed the message
     * @param {string} signature - The signature from the wallet
     * @param {string} message - The original message that was signed
     * @returns {Promise<boolean>}
     */
    verifySignature: async (walletAddress, signature, message) => {
        try {
            // 1. Parse message to extract nonce and timestamp
            const nonceMatch = message.match(/Nonce: ([a-f0-9-]+)/i);
            const timestampMatch = message.match(/Timestamp: (\d+)/);

            if (!nonceMatch || !timestampMatch) {
                throw new Error('Invalid message format');
            }

            const nonce = nonceMatch[1];
            const timestamp = parseInt(timestampMatch[1]);

            // 2. Check timestamp (±5min tolerance for clock skew)
            const now = Date.now();
            const timeDiff = Math.abs(now - timestamp);
            if (timeDiff > 5 * 60 * 1000) {
                logger.warn(`Signature expired: time diff ${timeDiff}ms`);
                throw new Error('Signature expired (timestamp out of range)');
            }

            // 3. Check nonce exists and not used
            const nonceSnapshot = await db.collection('nonces')
                .where('nonce', '==', nonce)
                .where('walletAddress', '==', walletAddress.toLowerCase())
                .where('used', '==', false)
                .limit(1)
                .get();

            if (nonceSnapshot.empty) {
                logger.warn(`Invalid nonce for wallet ${walletAddress.substring(0, 10)}...`);
                throw new Error('Invalid or already used nonce');
            }

            const nonceDoc = nonceSnapshot.docs[0];
            const nonceData = nonceDoc.data();

            // Check expiry
            if (nonceData.expiresAt.toDate() < new Date()) {
                logger.warn(`Nonce expired for wallet ${walletAddress.substring(0, 10)}...`);
                throw new Error('Nonce expired');
            }

            // 4. Verify signature using ethers.js
            const recoveredAddress = ethers.verifyMessage(message, signature);
            if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
                logger.warn(`Signature verification failed: expected ${walletAddress}, got ${recoveredAddress}`);
                throw new Error('Signature verification failed');
            }

            // 5. Mark nonce as used (prevent replay attacks)
            await db.collection('nonces').doc(nonceDoc.id).update({
                used: true,
                usedAt: new Date()
            });

            logger.info(`Signature verified successfully for wallet ${walletAddress.substring(0, 10)}...`);
            return true;
        } catch (error) {
            logger.error('Error verifying signature:', error);
            throw error;
        }
    },

    /**
     * Clean up expired nonces (called by cron job)
     * @returns {Promise<number>} Number of nonces deleted
     */
    cleanupExpiredNonces: async () => {
        try {
            const now = new Date();
            const snapshot = await db.collection('nonces')
                .where('expiresAt', '<', now)
                .get();

            const batch = db.batch();
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });

            await batch.commit();

            logger.info(`Cleaned up ${snapshot.size} expired nonces`);
            return snapshot.size;
        } catch (error) {
            logger.error('Error cleaning up nonces:', error);
            throw error;
        }
    }
};

export default signatureService;
