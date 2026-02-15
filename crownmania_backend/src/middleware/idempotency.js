import logger from '../config/logger.js';

/**
 * In-memory cache for idempotency (use Redis in production)
 */
const idempotencyCache = new Map();

/**
 * Idempotency middleware
 * Prevents duplicate processing of requests using idempotency keys
 */
export const idempotent = (req, res, next) => {
    const key = req.headers['idempotency-key'];

    // If no key provided, skip idempotency check
    if (!key) {
        return next();
    }

    // Check if we've seen this key before
    const cached = idempotencyCache.get(key);

    if (cached) {
        logger.info(`Idempotency hit: ${key}, returning cached response`);

        // Return cached response
        return res
            .status(cached.statusCode)
            .set(cached.headers)
            .json(cached.body);
    }

    // Capture the original response methods
    const originalJson = res.json.bind(res);
    const originalStatus = res.status.bind(res);
    const originalSet = res.set.bind(res);

    let statusCode = 200;
    let headers = {};

    // Override status to capture status code
    res.status = (code) => {
        statusCode = code;
        return originalStatus(code);
    };

    // Override set to capture headers
    res.set = (field, value) => {
        if (typeof field === 'object') {
            headers = { ...headers, ...field };
        } else {
            headers[field] = value;
        }
        return originalSet(field, value);
    };

    // Override json to cache response
    res.json = (body) => {
        // Cache the response for 24 hours
        idempotencyCache.set(key, {
            statusCode,
            headers,
            body,
            timestamp: Date.now()
        });

        logger.info(`Idempotency stored: ${key}, status=${statusCode}`);

        // Set cache expiry (24 hours)
        setTimeout(() => {
            idempotencyCache.delete(key);
            logger.debug(`Idempotency expired: ${key}`);
        }, 24 * 60 * 60 * 1000);

        return originalJson(body);
    };

    next();
};

/**
 * Clean expired cache entries (call periodically)
 */
export const cleanIdempotencyCache = () => {
    const now = Date.now();
    const ttl = 24 * 60 * 60 * 1000;  // 24 hours
    let cleaned = 0;

    for (const [key, value] of idempotencyCache.entries()) {
        if (now - value.timestamp > ttl) {
            idempotencyCache.delete(key);
            cleaned++;
        }
    }

    if (cleaned > 0) {
        logger.info(`Cleaned ${cleaned} expired idempotency keys`);
    }
};

// Clean cache every hour
setInterval(cleanIdempotencyCache, 60 * 60 * 1000);

export default idempotent;
