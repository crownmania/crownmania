import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import logger from '../config/logger.js';

// Lazy Redis connection — only connect when actually needed
let connection = null;
let connectionFailed = false;

function getConnection() {
    if (connectionFailed) return null;
    if (connection) return connection;

    try {
        const redisOptions = {
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
            lazyConnect: true,
            retryStrategy(times) {
                if (times > 3) {
                    connectionFailed = true;
                    logger.warn('Redis connection failed after 3 retries — queue service disabled');
                    return null; // Stop retrying
                }
                return Math.min(times * 200, 2000);
            }
        };

        connection = process.env.REDIS_URL
            ? new IORedis(process.env.REDIS_URL, redisOptions)
            : new IORedis({
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT || '6379'),
                ...redisOptions
            });
        connection.on('error', (err) => {
            if (!connectionFailed) {
                logger.warn('Redis connection error (queue service unavailable):', err.message);
                connectionFailed = true;
            }
        });

        return connection;
    } catch {
        connectionFailed = true;
        return null;
    }
}

// Lazy queue getters
let _transferQueue = null;
let _notificationQueue = null;

function getTransferQueue() {
    if (_transferQueue) return _transferQueue;
    const conn = getConnection();
    if (!conn) return null;
    _transferQueue = new Queue('nft-transfer', {
        connection: conn,
        defaultJobOptions: {
            attempts: 5,
            backoff: {
                type: 'exponential',
                delay: 2000
            },
            removeOnComplete: {
                count: 100,
                age: 86400
            },
            removeOnFail: false
        }
    });
    return _transferQueue;
}

function getNotificationQueue() {
    if (_notificationQueue) return _notificationQueue;
    const conn = getConnection();
    if (!conn) return null;
    _notificationQueue = new Queue('notification', {
        connection: conn,
        defaultJobOptions: {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 1000
            },
            removeOnComplete: {
                count: 50,
                age: 3600
            },
            removeOnFail: false
        }
    });
    return _notificationQueue;
}

// Note: QueueScheduler was removed in BullMQ v4+, scheduling is now built into Queue

/**
 * Queue Service for managing background jobs
 */
export const queueService = {
    /**
     * Enqueue NFT transfer job
     */
    async enqueueTransfer(data) {
        const queue = getTransferQueue();
        if (!queue) {
            logger.warn('Queue service unavailable — transfer job not enqueued (Redis not connected)');
            return null;
        }

        const { collectibleId, toAddress, tokenId } = data;
        logger.info(`Enqueuing NFT transfer: collectibleId=${collectibleId}, tokenId=${tokenId}, to=${toAddress}`);

        const job = await queue.add('transfer-nft', {
            collectibleId,
            toAddress,
            tokenId,
            enqueuedAt: new Date().toISOString()
        }, {
            jobId: `transfer-${collectibleId}`,
            removeOnComplete: true,
            removeOnFail: false
        });

        return job;
    },

    /**
     * Enqueue notification job
     */
    async enqueueNotification(data) {
        const queue = getNotificationQueue();
        if (!queue) {
            logger.warn('Queue service unavailable — notification not enqueued (Redis not connected)');
            return null;
        }

        const { type, recipientAddress, recipientEmail, subject, content, metadata } = data;
        logger.info(`Enqueuing notification: type=${type}, recipient=${recipientAddress || recipientEmail}`);

        const job = await queue.add('send-notification', {
            type,
            recipientAddress,
            recipientEmail,
            subject,
            content,
            metadata,
            enqueuedAt: new Date().toISOString()
        });

        return job;
    },

    /**
     * Get transfer job status
     */
    async getTransferJobStatus(collectibleId) {
        const queue = getTransferQueue();
        if (!queue) return { status: 'unavailable' };

        const jobId = `transfer-${collectibleId}`;
        const job = await queue.getJob(jobId);

        if (!job) {
            return { status: 'not_found' };
        }

        const state = await job.getState();
        const progress = await job.progress;

        return {
            status: state,
            progress,
            attemptsMade: job.attemptsMade,
            failedReason: job.failedReason,
            finishedOn: job.finishedOn,
            processedOn: job.processedOn
        };
    },

    /**
     * Retry failed transfer job
     */
    async retryTransfer(collectibleId) {
        const queue = getTransferQueue();
        if (!queue) throw new Error('Queue service unavailable');

        const jobId = `transfer-${collectibleId}`;
        const job = await queue.getJob(jobId);

        if (!job) {
            throw new Error('Job not found');
        }

        const state = await job.getState();

        if (state !== 'failed') {
            throw new Error(`Cannot retry job in state: ${state}`);
        }

        await job.retry();
        logger.info(`Retrying transfer job: ${jobId}`);

        return { success: true, jobId };
    },

    /**
     * Get failed jobs for admin dashboard
     */
    async getFailedJobs(limit = 50) {
        const queue = getTransferQueue();
        if (!queue) return [];

        const failed = await queue.getFailed(0, limit - 1);

        return failed.map(job => ({
            id: job.id,
            data: job.data,
            attemptsMade: job.attemptsMade,
            failedReason: job.failedReason,
            timestamp: job.timestamp
        }));
    },

    /**
     * Get queue metrics
     */
    async getQueueMetrics() {
        const queue = getTransferQueue();
        if (!queue) return { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 };

        const [
            waitingCount,
            activeCount,
            completedCount,
            failedCount,
            delayedCount
        ] = await Promise.all([
            queue.getWaitingCount(),
            queue.getActiveCount(),
            queue.getCompletedCount(),
            queue.getFailedCount(),
            queue.getDelayedCount()
        ]);

        return {
            waiting: waitingCount,
            active: activeCount,
            completed: completedCount,
            failed: failedCount,
            delayed: delayedCount
        };
    },

    /**
     * Clean old jobs
     */
    async cleanOldJobs() {
        const queue = getTransferQueue();
        if (!queue) return;

        await queue.clean(86400000, 100, 'completed');  // 24 hours
        await queue.clean(604800000, 0, 'failed');      // 7 days
        logger.info('Cleaned old jobs from queue');
    }
};

// Export queues for external usage (may be null if Redis unavailable)
export const transferQueue = { get: getTransferQueue };
export const notificationQueue = { get: getNotificationQueue };

export default queueService;
