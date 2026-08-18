import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import { ethers } from 'ethers';
import { db } from '../config/firebase.js';
import logger from '../config/logger.js';
import { contentSecurity } from '../utils/contentSecurity.js';

// Blockchain configuration - Polygon mainnet (137) or Amoy testnet (80002)
const IS_TESTNET = parseInt(process.env.POLYGON_CHAIN_ID || '137') === 80002;
const provider = new ethers.providers.JsonRpcProvider(
    process.env.ALCHEMY_RPC_URL
    || (IS_TESTNET ? process.env.ALCHEMY_AMOY_URL : process.env.ALCHEMY_POLYGON_URL)
    || (process.env.ALCHEMY_API_KEY
        ? `https://polygon-${IS_TESTNET ? 'amoy' : 'mainnet'}.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
        : (IS_TESTNET ? 'https://rpc-amoy.polygon.technology' : 'https://polygon-bor-rpc.publicnode.com'))
);

const backendWallet = new ethers.Wallet(
    process.env.BACKEND_WALLET_PRIVATE_KEY || process.env.MINTING_WALLET_PRIVATE_KEY,
    provider
);

// DropERC721 ABI — claim() mints + sends in one tx (lazy-mint drop contract)
const contractABI = [
    'function claim(address receiver, uint256 quantity, address currency, uint256 pricePerToken, tuple(bytes32[] proof, uint256 quantityLimitPerWallet, uint256 pricePerToken, address currency) allowlistProof, bytes data) external payable',
    'function nextTokenIdToClaim() view returns (uint256)',
    'function getActiveClaimConditionId() view returns (uint256)',
    'function getClaimConditionById(uint256 conditionId) view returns (tuple(uint256 startTimestamp, uint256 maxClaimableSupply, uint256 supplyClaimed, uint256 quantityLimitPerWallet, bytes32 merkleRoot, uint256 pricePerToken, address currency, string metadata))',
    'function ownerOf(uint256 tokenId) public view returns (address)',
    'function balanceOf(address owner) public view returns (uint256)',
    'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'
];

const contract = new ethers.Contract(
    process.env.NFT_CONTRACT_ADDRESS || process.env.THIRDWEB_NFT_CONTRACT,
    contractABI,
    backendWallet
);

const NATIVE_CURRENCY = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
const ZERO_ADDRESS = ethers.constants.AddressZero;

/**
 * Transfer Worker - Processes NFT transfer jobs
 */
export const transferWorker = new Worker(
    'nft-transfer',
    async (job) => {
        const { collectibleId, toAddress, tokenId: editionRef } = job.data;

        logger.info(`[Transfer Worker] Processing job ${job.id}: to=${toAddress}, editionRef=${editionRef}`);

        try {
            // Update progress
            await job.updateProgress(10);

            // Read next token ID that will be claimed (for logging)
            const nextTokenId = await contract.nextTokenIdToClaim();
            logger.info(`[Transfer Worker] Next token ID to claim: ${nextTokenId.toString()}`);

            // Read the active claim condition to get the correct price and currency
            const activeConditionId = await contract.getActiveClaimConditionId();
            const condition = await contract.getClaimConditionById(activeConditionId);
            const pricePerToken = condition.pricePerToken;
            const currency = condition.currency;
            const isNativeCurrency = currency.toLowerCase() === NATIVE_CURRENCY.toLowerCase();

            logger.info(`[Transfer Worker] Claim condition: price=${ethers.utils.formatEther(pricePerToken)} ${isNativeCurrency ? 'POL' : currency}`);

            if (!isNativeCurrency && pricePerToken.gt(0)) {
                throw new Error(`Claim condition requires ERC20 payment (${currency}) which is not supported by this worker`);
            }

            await job.updateProgress(25);

            // Build claim arguments for DropERC721
            // Public claim (no allowlist): empty proof, zero limits
            const allowlistProof = {
                proof: [],
                quantityLimitPerWallet: 0,
                pricePerToken: 0,
                currency: ZERO_ADDRESS
            };

            const claimArgs = [
                toAddress,           // receiver
                1,                   // quantity
                currency,            // currency from active claim condition
                pricePerToken,       // price from active claim condition
                allowlistProof,      // allowlist proof (empty)
                '0x'                 // data
            ];

            const txValue = isNativeCurrency ? pricePerToken : ethers.BigNumber.from(0);

            // Estimate gas for claim
            let gasEstimate;
            try {
                gasEstimate = await contract.estimateGas.claim(...claimArgs, { value: txValue });
            } catch (estErr) {
                logger.error(`[Transfer Worker] Gas estimation failed: ${estErr.message}`);
                throw new Error(`Claim gas estimation failed: ${estErr.reason || estErr.message}`);
            }

            logger.info(`[Transfer Worker] Gas estimate: ${gasEstimate.toString()}`);
            await job.updateProgress(40);

            // Fetch current gas fees to avoid "gas price below minimum" on Polygon.
            // Some public RPCs return incorrect fee data, so enforce a minimum.
            const feeData = await provider.getFeeData();
            const MIN_PRIORITY_FEE = ethers.BigNumber.from('30000000000'); // 30 gwei
            const MIN_MAX_FEE = ethers.BigNumber.from('350000000000'); // 350 gwei
            const maxPriorityFeePerGas = (feeData.maxPriorityFeePerGas && feeData.maxPriorityFeePerGas.gte(MIN_PRIORITY_FEE))
                ? feeData.maxPriorityFeePerGas.mul(120).div(100)
                : MIN_PRIORITY_FEE;
            const maxFeePerGas = (feeData.maxFeePerGas && feeData.maxFeePerGas.gte(MIN_MAX_FEE))
                ? feeData.maxFeePerGas.mul(120).div(100)
                : MIN_MAX_FEE;

            // Execute claim (mints + transfers in one tx)
            const tx = await contract.claim(...claimArgs, {
                value: txValue,
                gasLimit: gasEstimate.mul(130).div(100), // 30% buffer for drop contracts
                maxFeePerGas,
                maxPriorityFeePerGas
            });

            logger.info(`[Transfer Worker] Claim transaction submitted: ${tx.hash}`);
            await job.updateProgress(60);

            // Wait for confirmation
            const receipt = await tx.wait(1);

            logger.info(`[Transfer Worker] Transaction confirmed: ${receipt.transactionHash}`);
            await job.updateProgress(80);

            // Parse Transfer event from receipt to get the actual minted token ID
            const transferInterface = new ethers.utils.Interface(['event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)']);
            let mintedTokenId = null;

            for (const log of receipt.logs) {
                try {
                    const parsed = transferInterface.parseLog(log);
                    if (parsed && parsed.name === 'Transfer') {
                        mintedTokenId = parsed.args.tokenId.toString();
                        logger.info(`[Transfer Worker] Minted token ID: ${mintedTokenId}`);
                        break;
                    }
                } catch {
                    // Not a Transfer event, skip
                }
            }

            if (!mintedTokenId) {
                logger.warn('[Transfer Worker] Could not parse token ID from receipt events, using nextTokenIdToClaim');
                mintedTokenId = nextTokenId.toString();
            }

            // Update database with actual on-chain token ID
            await db.collection('collectibles').doc(collectibleId).update({
                status: 'active',
                tokenId: mintedTokenId,
                blockchainTokenId: mintedTokenId,
                transactionHash: receipt.transactionHash,
                nftTransferred: true,
                nftTransferredAt: new Date(),
                transferAttempts: job.attemptsMade + 1,
                lastTransferAttempt: new Date(),
                updatedAt: new Date()
            });

            // Also update the claim code with the real token ID
            const collectibleDoc = await db.collection('collectibles').doc(collectibleId).get();
            if (collectibleDoc.exists) {
                const serialNumber = collectibleDoc.data().serialNumber;
                if (serialNumber) {
                    await db.collection('claimCodes').doc(serialNumber).update({
                        tokenId: mintedTokenId,
                        blockchainTokenId: mintedTokenId,
                        transactionHash: receipt.transactionHash
                    });
                }
            }

            // Log success to audit
            await db.collection('auditLogs').add({
                event: 'nft_claim_success',
                collectibleId,
                tokenId: mintedTokenId,
                toAddress,
                transactionHash: receipt.transactionHash,
                gasUsed: receipt.gasUsed.toString(),
                blockNumber: receipt.blockNumber,
                timestamp: new Date()
            });

            await job.updateProgress(100);

            logger.info(`[Transfer Worker] Job ${job.id} completed successfully. Token ${mintedTokenId} minted to ${toAddress}`);

            return {
                success: true,
                txHash: receipt.transactionHash,
                tokenId: mintedTokenId,
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
                tokenId: editionRef,
                toAddress,
                error: error.message,
                attemptsMade: job.attemptsMade + 1,
                timestamp: new Date()
            });

            throw error;  // Re-throw to let BullMQ handle retry
        }
    },
    {
        connection: process.env.REDIS_URL
            ? new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null })
            : {
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
