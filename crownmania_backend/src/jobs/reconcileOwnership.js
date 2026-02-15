import { db } from '../config/firebase.js';
import ownershipService from '../services/ownershipService.js';
import logger from '../config/logger.js';

/**
 * Daily job to reconcile DB ownership with on-chain ownership
 * Detects discrepancies and updates DB to match blockchain truth
 */
export const reconcileOwnership = async () => {
    logger.info('Starting ownership reconciliation job...');

    try {
        // Get all claimed collectibles with blockchain data
        const snapshot = await db.collection('collectibles')
            .where('status', 'in', ['claimed', 'transferred'])
            .get();

        let processed = 0;
        let synced = 0;
        let mismatches = 0;
        let errors = 0;

        for (const doc of snapshot.docs) {
            const collectible = doc.data();

            // Skip if NFT not yet transferred on-chain
            if (!collectible.blockchainTokenId || !collectible.contractAddress) {
                continue;
            }

            try {
                // Check on-chain owner
                const chainOwner = await ownershipService.checkNFTOwnership(
                    collectible.contractAddress,
                    collectible.blockchainTokenId
                );

                processed++;

                if (chainOwner.toLowerCase() !== collectible.ownerId.toLowerCase()) {
                    logger.warn(`Ownership mismatch for ${doc.id}: DB=${collectible.ownerId}, Chain=${chainOwner}`);

                    // Update DB to match chain
                    await db.collection('collectibles').doc(doc.id).update({
                        ownerId: chainOwner.toLowerCase(),
                        status: 'transferred',
                        updatedAt: new Date()
                    });

                    // Log mismatch
                    await db.collection('auditLogs').add({
                        event: 'ownership_mismatch_reconciled',
                        collectibleId: doc.id,
                        serialNumber: collectible.serialNumber,
                        oldOwner: collectible.ownerId,
                        newOwner: chainOwner,
                        timestamp: new Date()
                    });

                    mismatches++;
                } else {
                    synced++;
                }
            } catch (error) {
                logger.error(`Error checking ownership for ${doc.id}:`, error);
                errors++;
            }
        }

        logger.info(`Reconciliation complete: ${processed} processed, ${synced} synced, ${mismatches} mismatches fixed, ${errors} errors`);

        // Log job completion
        await db.collection('auditLogs').add({
            event: 'ownership_reconciliation_completed',
            stats: { processed, synced, mismatches, errors },
            timestamp: new Date()
        });

        return { processed, synced, mismatches, errors };
    } catch (error) {
        logger.error('Error in reconciliation job:', error);
        throw error;
    }
};

export default reconcileOwnership;
