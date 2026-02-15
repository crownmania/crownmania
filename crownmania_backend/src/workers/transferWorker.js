import { Worker } from 'bullmq';
import { ethers } from 'ethers';
import { db } from '../config/firebase.js';
import logger from '../config/logger.js';
import { contentSecurity } from '../utils/contentSecurity.js';

// Blockchain configuration - Polygon (chainId 137)
const provider = new ethers.providers.JsonRpcProvider(
    process.env.ALCHEMY_RPC_URL || 'https://polygon-mainnet.g.alchemy.com/v2/' + process.env.ALCHEMY_API_KEY
);

const backendWallet = new ethers.Wallet(process.env.BACKEND_WALLET_PRIVATE_KEY, provider);

// Contract ABI (minimal - just what we need)
const contractABI = [
    'function transferFrom(address from, address to, uint256 tokenId) public',
    'function ownerOf(uint256 tokenId) public view returns (address)',
    'function balanceOf(address owner) public view returns (uint256)'
];

const contract = new ethers.Contract(
    process.env.NFT_CONTRACT_ADDRESS,
    contractABI,
    backendWallet
);

/**
 * Transfer Worker - Processes NFT transfer jobs
 */
export const transferWorker = new Worker(
    'nft-transfer',
    async (job) => {
        const { collectibleId, toAddress, tokenId } = job.data;

        logger.info(`[Transfer Worker] Processing job ${job.id}: tokenId=${tokenId}, to=${toAddress}`);

        try {
            // Update progress
            await job.updateProgress(10);

            // Verify we still own the token
            const currentOwner = await contract.ownerOf(tokenId);
            if (currentOwner.toLowerCase() !== backendWallet.address.toLowerCase()) {
                throw new Error(`Backend wallet does not own tokenId ${tokenId}. Current owner: ${currentOwner}`);
            }

            await job.updateProgress(25);

            // Estimate gas
            const gasEstimate = await contract.estimateGas.transferFrom(
                backendWallet.address,
                toAddress,
                tokenId
            );

            logger.info(`[Transfer Worker] Gas estimate: ${gasEstimate.toString()}`);
            await job.updateProgress(40);

            // Execute transfer
            const tx = await contract.transferFrom(
                backendWallet.address,
                toAddress,
                tokenId,
                {
                    gasLimit: gasEstimate.mul(120).div(100)  // 20% buffer
                }
            );

            logger.info(`[Transfer Worker] Transaction submitted: ${tx.hash}`);
            await job.updateProgress(60);

            // Wait for confirmation
            const receipt = await tx.wait(1);  // 1 confirmation

            logger.info(`[Transfer Worker] Transaction confirmed: ${receipt.transactionHash}`);
            await job.updateProgress(80);

            // Update database
            await db.collection('collectibles').doc(collectibleId).update({
                status: 'active',
                transactionHash: receipt.transactionHash,
                transferAttempts: job.attemptsMade + 1,
                lastTransferAttempt: new Date(),
                updatedAt: new Date()
            });

            // Log success to audit
            await db.collection('auditLogs').add({
                event: 'nft_transfer_success',
                collectibleId,
                tokenId,
                toAddress,
                transactionHash: receipt.transactionHash,
                gasUsed: receipt.gasUsed.toString(),
                blockNumber: receipt.blockNumber,
                timestamp: new Date()
            });

            await job.updateProgress(100);

            logger.info(`[Transfer Worker] Job ${job.id} completed successfully`);

            return {
                success: true,
                txHash: receipt.transactionHash,
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed.toString()
            };

        } catch (error) {
            logger.error(`[Transfer Worker] Job ${job.id} failed:`, error);

            // Update database with failure info
            await db.collection('collectibles').doc(collectibleId).update({
                transferAttempts: job.attemptsMade + 1,
                lastTransferAttempt: new Date(),
                lastTransferError: error.message
            });

            // Log failure to audit
            await db.collection('auditLogs').add({
                event: 'nft_transfer_failed',
                collectibleId,
                tokenId,
                toAddress,
                error: error.message,
                attemptsMade: job.attemptsMade + 1,
                timestamp: new Date()
            });

            throw error;  // Re-throw to let BullMQ handle retry
        }
    },
    {
        connection: {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379')
        },
        concurrency: 3,  // Process up to 3 transfers simultaneously
        limiter: {
            max: 10,       // Max 10 jobs
            duration: 60000  // Per minute (rate limiting)
        }
    }
);

// Event handlers
transferWorker.on('completed', (job) => {
    logger.info(`[Transfer Worker] Job ${job.id} completed`);
});

transferWorker.on('failed', async (job, err) => {
    logger.error(`[Transfer Worker] Job ${job.id} failed after ${job.attemptsMade} attempts:`, err.message);

    // If this was the last attempt, mark as dead
    if (job.attemptsMade >= 5) {
        await db.collection('transferJobs').add({
            collectibleId: job.data.collectibleId,
            tokenId: job.data.tokenId,
            toAddress: job.data.toAddress,
            status: 'dead',
            attempts: job.attemptsMade,
            lastError: err.message,
            enqueuedAt: job.data.enqueuedAt,
            failedAt: new Date()
        });

        // Send admin alert
        contentSecurity.logSecurityEvent('nft_transfer_dead', {
            jobId: job.id,
            collectibleId: job.data.collectibleId,
            error: err.message,
            attempts: job.attemptsMade
        });

        logger.error(`[Transfer Worker] Job ${job.id} moved to dead-letter queue`);
    }
});

transferWorker.on('error', (err) => {
    logger.error('[Transfer Worker] Worker error:', err);
});

transferWorker.on('stalled', (jobId) => {
    logger.warn(`[Transfer Worker] Job ${jobId} stalled`);
});

logger.info('[Transfer Worker] Worker started and listening for jobs');

export default transferWorker;
