/**
 * Data Validation Service
 * Provides utilities for data integrity checks and ownership verification
 */

import { db } from '../config/firebase.js';

export const dataValidationService = {
    /**
     * Validate a serial number format
     * @param {string} serialNumber - The serial number to validate
     * @returns {{valid: boolean, error?: string}}
     */
    validateSerialNumberFormat(serialNumber) {
        if (!serialNumber || typeof serialNumber !== 'string') {
            return { valid: false, error: 'Serial number is required and must be a string' };
        }

        const normalized = serialNumber.trim().toLowerCase();

        // Expected format: 32-character hex string
        if (!normalized.match(/^[a-f0-9]{32}$/)) {
            return { valid: false, error: 'Serial number must be a 32-character hex string' };
        }

        return { valid: true, normalized };
    },

    /**
     * Check if a serial number exists and get its status
     * @param {string} serialNumber - The serial number to check
     * @returns {Promise<{exists: boolean, claimed: boolean, productId?: string, claimedBy?: string}>}
     */
    async checkSerialNumberStatus(serialNumber) {
        const validation = this.validateSerialNumberFormat(serialNumber);
        if (!validation.valid) {
            return { exists: false, claimed: false, error: validation.error };
        }

        const claimCodeRef = db.collection('claimCodes').doc(validation.normalized);
        const claimCodeDoc = await claimCodeRef.get();

        if (!claimCodeDoc.exists) {
            return { exists: false, claimed: false };
        }

        const data = claimCodeDoc.data();
        return {
            exists: true,
            claimed: data.claimed || false,
            productId: data.productId,
            claimedBy: data.claimedBy || null,
            claimedAt: data.claimedAt || null,
            edition: data.edition || null
        };
    },

    /**
     * Verify ownership of a collectible
     * @param {string} collectibleId - The collectible document ID
     * @param {string} walletAddress - The wallet address to verify
     * @returns {Promise<{isOwner: boolean, collectible?: Object}>}
     */
    async verifyOwnership(collectibleId, walletAddress) {
        if (!collectibleId || !walletAddress) {
            return { isOwner: false, error: 'Both collectibleId and walletAddress are required' };
        }

        const collectibleRef = db.collection('collectibles').doc(collectibleId);
        const collectibleDoc = await collectibleRef.get();

        if (!collectibleDoc.exists) {
            return { isOwner: false, error: 'Collectible not found' };
        }

        const data = collectibleDoc.data();
        const isOwner = data.ownerId?.toLowerCase() === walletAddress.toLowerCase();

        return {
            isOwner,
            collectible: isOwner ? {
                id: collectibleDoc.id,
                serialNumber: data.serialNumber,
                productId: data.productId,
                productName: data.productName,
                edition: data.edition,
                totalEditions: data.totalEditions,
                status: data.status
            } : null
        };
    },

    /**
     * Find orphaned records (inconsistencies between claimCodes and collectibles)
     * @param {string} productId - Optional: limit to specific product
     * @returns {Promise<{orphanedClaimCodes: Array, orphanedCollectibles: Array}>}
     */
    async findOrphanedRecords(productId = null) {
        const orphanedClaimCodes = [];
        const orphanedCollectibles = [];

        // Get claimed claim codes
        let claimCodesQuery = db.collection('claimCodes').where('claimed', '==', true);
        if (productId) {
            claimCodesQuery = claimCodesQuery.where('productId', '==', productId);
        }
        const claimCodesSnapshot = await claimCodesQuery.get();

        // Get all collectibles
        let collectiblesQuery = db.collection('collectibles');
        if (productId) {
            collectiblesQuery = collectiblesQuery.where('productId', '==', productId);
        }
        const collectiblesSnapshot = await collectiblesQuery.get();

        // Build maps for cross-referencing
        const collectiblesBySerial = new Map();
        collectiblesSnapshot.forEach(doc => {
            const data = doc.data();
            collectiblesBySerial.set(data.serialNumber?.toLowerCase(), {
                id: doc.id,
                ...data
            });
        });

        const claimedSerials = new Set();
        claimCodesSnapshot.forEach(doc => {
            const serial = doc.id.toLowerCase();
            claimedSerials.add(serial);

            // Check if claimed code has matching collectible
            if (!collectiblesBySerial.has(serial)) {
                orphanedClaimCodes.push({
                    serialNumber: serial,
                    productId: doc.data().productId,
                    claimedBy: doc.data().claimedBy,
                    claimedAt: doc.data().claimedAt
                });
            }
        });

        // Check for collectibles without matching claimed codes
        collectiblesSnapshot.forEach(doc => {
            const data = doc.data();
            const serial = data.serialNumber?.toLowerCase();
            if (serial && !claimedSerials.has(serial)) {
                orphanedCollectibles.push({
                    id: doc.id,
                    serialNumber: serial,
                    ownerId: data.ownerId,
                    productId: data.productId
                });
            }
        });

        return { orphanedClaimCodes, orphanedCollectibles };
    },

    /**
     * Get edition statistics for a product
     * @param {string} productId - The product ID
     * @returns {Promise<{currentEdition: number, totalEditions: number, gapCount: number, gaps: Array}>}
     */
    async getEditionStats(productId) {
        if (!productId) {
            return { error: 'productId is required' };
        }

        // Get counter
        const counterRef = db.collection('counters').doc(productId);
        const counterDoc = await counterRef.get();

        const currentEdition = counterDoc.exists ? (counterDoc.data().currentEdition || 0) : 0;
        const totalEditions = counterDoc.exists ? (counterDoc.data().totalEditions || 500) : 500;

        // Get all collectibles for this product to check for gaps
        const collectiblesSnapshot = await db.collection('collectibles')
            .where('productId', '==', productId)
            .get();

        const editions = new Set();
        collectiblesSnapshot.forEach(doc => {
            const edition = doc.data().edition;
            if (edition) {
                editions.add(edition);
            }
        });

        // Find gaps
        const gaps = [];
        for (let i = 1; i <= currentEdition; i++) {
            if (!editions.has(i)) {
                gaps.push(i);
            }
        }

        return {
            currentEdition,
            totalEditions,
            claimed: editions.size,
            gapCount: gaps.length,
            gaps: gaps.slice(0, 20) // Only return first 20 gaps
        };
    },

    /**
     * Validate wallet address format
     * @param {string} walletAddress - The wallet address to validate
     * @returns {{valid: boolean, error?: string, normalized?: string}}
     */
    validateWalletAddress(walletAddress) {
        if (!walletAddress || typeof walletAddress !== 'string') {
            return { valid: false, error: 'Wallet address is required' };
        }

        const normalized = walletAddress.trim().toLowerCase();

        // Ethereum address format: 0x followed by 40 hex characters
        if (!normalized.match(/^0x[a-f0-9]{40}$/)) {
            return { valid: false, error: 'Invalid Ethereum wallet address format' };
        }

        return { valid: true, normalized };
    }
};

export default dataValidationService;
