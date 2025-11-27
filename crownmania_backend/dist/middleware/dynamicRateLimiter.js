import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';
import logger from '../config/logger.js';

// Initialize Redis client
const redis = new Redis(process.env.REDIS_URL);

// Rate limit configurations per endpoint type
const rateLimitConfigs = {
  auth: {
    windowMs: 60 * 60 * 1000,
    // 1 hour
    maxRequests: {
      default: 5,
      verified: 10
    }
  },
  api: {
    windowMs: 15 * 60 * 1000,
    // 15 minutes
    maxRequests: {
      default: 100,
      verified: 300
    }
  },
  minting: {
    windowMs: 24 * 60 * 60 * 1000,
    // 24 hours
    maxRequests: {
      default: 25,
      verified: 50
    }
  }
};

// Dynamic key generator based on user status and IP
const keyGenerator = req => {
  const userId = req.user?.uid || 'anonymous';
  const userType = req.user?.verified ? 'verified' : 'default';
  return `${req.ip}:${userId}:${userType}`;
};

// Create dynamic rate limiter
export const createDynamicRateLimiter = (type = 'api') => {
  const config = rateLimitConfigs[type];
  return rateLimit({
    store: new RedisStore({
      client: redis,
      prefix: `ratelimit:${type}:`
    }),
    windowMs: config.windowMs,
    max: req => {
      const userType = req.user?.verified ? 'verified' : 'default';
      return config.maxRequests[userType];
    },
    keyGenerator,
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', {
        type,
        ip: req.ip,
        userId: req.user?.uid,
        path: req.path
      });
      res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil(config.windowMs / 1000)
      });
    },
    skip: req => {
      // Skip rate limiting for whitelisted IPs or admin users
      return req.ip === '127.0.0.1' || req.user?.role === 'admin';
    }
  });
};

// Middleware instances
export const authRateLimiter = createDynamicRateLimiter('auth');
export const apiRateLimiter = createDynamicRateLimiter('api');
export const mintingRateLimiter = createDynamicRateLimiter('minting');

// Monitor rate limit events
redis.on('error', error => {
  logger.error('Redis rate limiter error:', error);
});

// Cleanup expired keys periodically
setInterval(async () => {
  try {
    const keys = await redis.keys('ratelimit:*');
    for (const key of keys) {
      const ttl = await redis.ttl(key);
      if (ttl <= 0) {
        await redis.del(key);
      }
    }
  } catch (error) {
    logger.error('Rate limit cleanup error:', error);
  }
}, 60 * 60 * 1000); // Run every hour