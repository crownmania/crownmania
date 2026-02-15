import { db } from '../config/firebase.js';
import { transferNFTToWallet } from './thirdwebService.js';
import { sendClaimConfirmationEmail } from '../config/email.js';
import logger from '../config/logger.js';

/**
 * Retry service for pending NFT transfers
 * This service queries collectibles that have been claimed but NFT transfer failed,
 * and attempts to retry the transfer.
 */

/**
 * Retry all pending NFT transfers
 * @returns {Promise<{attempted: number, succeeded: number, failed: number, results: Array}>}
 */
export async function retryPendingTransfers() {
    logger.info('[NFT Retry Service] Starting retry of pending NFT transfers...');

    try {
        // Query all collectibles where claim succeeded but NFT transfer failed
        const pendingQuery = await db.collection('collectibles')
            .where('nftTransferred', '==', false)
            .where('status', '==', 'claimed')
            .get();

        if (pendingQuery.empty) {
            logger.info('[NFT Retry Service] No pending transfers found');
            return {
                attempted: 0,
                succeeded: 0,
                failed: 0,
                results: []
            };
        }

        logger.info(`[NFT Retry Service] Found ${pendingQuery.size} pending transfers`);

        const results = [];
        let succeeded = 0;
        let failed = 0;

        for (const doc of pendingQuery.docs) {
            const data = doc.data();
            const collectibleId = doc.id;
            const retryCount = (data.retryCount || 0) + 1;

            logger.info(`[NFT Retry Service] Retrying collectible ${collectibleId} (attempt #${retryCount})`);

            try {
                // Attempt the NFT transfer
                const transferResult = await transferNFTToWallet(
                    data.ownerId,
                    data.blockchainTokenId || null
                );

                logger.info(`[NFT Retry Service] Transfer succeeded for ${collectibleId}:`, transferResult);

                // Update the collectible record with success
                await doc.ref.update({
                    nftTransferred: true,
                    transactionHash: transferResult.transactionHash,
                    contractAddress: transferResult.contractAddress,
                    blockchainTokenId: transferResult.tokenId,
                    retryCount,
                    lastRetryAt: new Date(),
                    nftTransferError: null // Clear any previous error
                });

                // Send success email to user
                try {
                    await sendClaimConfirmationEmail({
                        email: data.ownerEmail || 'admin@crownmania.com', // Fallback to admin
                        productName: data.productName,
                        edition: data.edition,
                        walletAddress: data.ownerId,
                        transactionHash: transferResult.transactionHash
                    });
                } catch (emailError) {
                    logger.error('[NFT Retry Service] Failed to send confirmation email:', emailError);
                }

                succeeded++;
                results.push({
                    collectibleId,
                    success: true,
                    retryCount,
                    transactionHash: transferResult.transactionHash
                });

            } catch (error) {
                logger.error(`[NFT Retry Service] Transfer failed for ${collectibleId}:`, error.message);

                // Update the collectible with failure info
                await doc.ref.update({
                    retryCount,
                    lastRetryError: error.message,
                    lastRetryAt: new Date()
                });

                failed++;
                results.push({
                    collectibleId,
                    success: false,
                    retryCount,
                    error: error.message
                });

                // If retry count exceeds threshold, send admin alert
                if (retryCount >= 3) {
                    logger.error(`[NFT Retry Service] CRITICAL: Transfer failed ${retryCount} times for ${collectibleId}`);

                    try {
                        await sendAdminAlert({
                            type: 'nft_transfer_critical_failure',
                            collectibleId,
                            ownerId: data.ownerId,
                            productName: data.productName,
                            edition: data.edition,
                            retryCount,
                            error: error.message,
                            timestamp: new Date().toISOString()
                        });
                    } catch (alertError) {
                        logger.error('[NFT Retry Service] Failed to send admin alert:', alertError);
                    }
                }
            }
        }

        const summary = {
            attempted: pendingQuery.size,
            succeeded,
            failed,
            results
        };

        logger.info('[NFT Retry Service] Retry batch complete:', summary);
        return summary;

    } catch (error) {
        logger.error('[NFT Retry Service] Critical error during retry batch:', error);
        throw error;
    }
}

/**
 * Send admin alert for critical NFT transfer failures
 * @param {Object} alertData - Alert data
 */
async function sendAdminAlert(alertData) {
    // Log critical alert and send email notification to admin
    logger.error('[ADMIN ALERT] Critical NFT Transfer Failure:', JSON.stringify(alertData, null, 2));

    // If SendGrid is configured, send email to admin
    try {
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@crownmania.com';
        await sendClaimConfirmationEmail({
            email: adminEmail,
            productName: `ALERT: ${alertData.productName}`,
            edition: alertData.edition,
            walletAddress: alertData.ownerId,
            message: `NFT transfer has failed ${alertData.retryCount} times. Error: ${alertData.error}`
        });
    } catch (error) {
        logger.error('[NFT Retry Service] Failed to send admin email alert:', error);
    }
}

/**
 * Get status of pending transfers (for monitoring/dashboard)
 * @returns {Promise<{total: number, byRetryCount: Object, oldestPending: Object}>}
 */
export async function getPendingTransferStats() {
    try {
        const pendingQuery = await db.collection('collectibles')
            .where('nftTransferred', '==', false)
            .where('status', '==', 'claimed')
            .get();

        if (pendingQuery.empty) {
            return {
                total: 0,
                byRetryCount: {},
                oldestPending: null
            };
        }

        const byRetryCount = {};
        let oldestPending = null;

        pendingQuery.docs.forEach(doc => {
            const data = doc.data();
            const retryCount = data.retryCount || 0;

            byRetryCount[retryCount] = (byRetryCount[retryCount] || 0) + 1;

            if (!oldestPending || data.createdAt?.toDate() < oldestPending.createdAt.toDate()) {
                oldestPending = {
                    id: doc.id,
                    createdAt: data.createdAt,
                    retryCount,
                    error: data.lastRetryError
                };
            }
        });

        return {
            total: pendingQuery.size,
            byRetryCount,
            oldestPending
        };
    } catch (error) {
        logger.error('[NFT Retry Service] Error getting pending stats:', error);
        throw error;
    }
}

export default {
    retryPendingTransfers,
    getPendingTransferStats
};
