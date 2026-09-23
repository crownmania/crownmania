import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import IORedis from 'ioredis';
import logger from '../config/logger.js';

/**
 * Rate limiting configuration for different API endpoints
 * All limits are per IP address
 */

// ── Redis-backed store with in-memory fallback ──
// Redis keeps counters consistent across deploys and multiple instances.
// If Redis is unavailable the limiter degrades to per-process memory instead
// of failing requests — protection weakens but the store stays up.
let redisClient = null;
let redisDisabled = false;
let redisCooldownUntil = 0;

function getRedis() {
  // Redis is opt-in via REDIS_URL — without it the limiters run in pure
  // in-memory mode, which keeps tests and local dev free of connection
  // attempts against a socket that doesn't exist.
  if (!process.env.REDIS_URL) return null;
  if (redisDisabled || Date.now() < redisCooldownUntil) return null;
  if (!redisClient) {
    try {
      redisClient = new IORedis(process.env.REDIS_URL, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        retryStrategy: () => null,
      });
      redisClient.connect().catch(() => {});
      redisClient.on('error', () => {
        redisCooldownUntil = Date.now() + 30_000;
      });
    } catch {
      redisDisabled = true;
      return null;
    }
  }
  return redisClient;
}

// Minimal express-rate-limit store contract used when Redis is down.
class MemoryStore {
  constructor() { this.hits = new Map(); this.windowMs = 60_000; }
  init(options) { this.windowMs = options.windowMs; }
  increment(key) {
    const now = Date.now();
    let entry = this.hits.get(key);
    if (!entry || entry.resetTime <= now) {
      entry = { totalHits: 0, resetTime: new Date(now + this.windowMs) };
      this.hits.set(key, entry);
    }
    entry.totalHits += 1;
    return { totalHits: entry.totalHits, resetTime: entry.resetTime };
  }
  decrement(key) {
    const entry = this.hits.get(key);
    if (entry) entry.totalHits = Math.max(0, entry.totalHits - 1);
  }
  resetKey(key) { this.hits.delete(key); }
}

class HybridStore {
  constructor(prefix) {
    this.prefix = `rl:${prefix}:`;
    this.fallback = new MemoryStore();
    this.redis = null;
  }
  init(options) { this.fallback.init(options); }
  // RedisStore must only be built once the socket is ready — its constructor
  // eagerly loads the Lua script and ioredis throws synchronously while the
  // stream is unwritable.
  #tryRedis() {
    const client = getRedis();
    if (!client || client.status !== 'ready') return false;
    if (!this.redis) {
      try {
        this.redis = new RedisStore({
          prefix: this.prefix,
          sendCommand: (...args) => client.call(...args),
        });
      } catch {
        this.redis = null;
        return false;
      }
    }
    return true;
  }
  async increment(key) {
    if (this.#tryRedis()) {
      try {
        return await this.redis.increment(key);
      } catch {
        this.redis = null;
        redisCooldownUntil = Date.now() + 30_000;
      }
    }
    return this.fallback.increment(key);
  }
  async decrement(key) {
    if (this.#tryRedis()) {
      try { await this.redis.decrement(key); return; } catch { this.redis = null; }
    }
    this.fallback.decrement(key);
  }
  async resetKey(key) {
    if (this.#tryRedis()) {
      try { await this.redis.resetKey(key); return; } catch { this.redis = null; }
    }
    this.fallback.resetKey(key);
  }
}

const store = (name) => new HybridStore(name);

// Serials / claim codes are bearer credentials — log only a prefix.
const maskCode = (code) => {
  const s = typeof code === 'string' ? code : '';
  return s.length > 8 ? `${s.substring(0, 8)}…` : s;
};

// General API rate limiter
export const apiLimiter = rateLimit({
  store: store('apiLimiter'),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { error: 'Too many requests, please try again later.' },
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`, {
      path: req.path,
      method: req.method,
      userAgent: req.headers['user-agent']
    });
    res.status(429).json({ error: 'Too many requests, please try again later.' });
  }
});

// Stricter rate limiter for authentication attempts
export const authLimiter = rateLimit({
  store: store('authLimiter'),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 failed attempts per hour
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful authentications
  message: { error: 'Too many login attempts, please try again later.' },
  handler: (req, res) => {
    logger.warn(`Authentication rate limit exceeded for IP: ${req.ip}`, {
      path: req.path,
      method: req.method
    });
    res.status(429).json({ error: 'Too many login attempts, please try again later.' });
  }
});

// Enhanced rate limiter for serial number verification
export const serialNumberLimiter = rateLimit({
  store: store('serialNumberLimiter'),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 verification attempts per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many verification attempts, please try again later.' },
  handler: (req, res) => {
    logger.warn(`Serial number verification rate limit exceeded for IP: ${req.ip}`, {
      serialNumber: maskCode(req.body?.serialNumber || req.params?.serial),
      path: req.path,
      method: req.method
    });
    res.status(429).json({
      error: 'Too many verification attempts, please try again later.',
      retryAfter: Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000)
    });
  },
  // Use a more specific key generator that considers both IP and user agent
  keyGenerator: (req) => {
    return `${req.ip}-${req.headers['user-agent']?.substring(0, 50) || 'unknown'}`;
  }
});

// Stricter rate limiter for claim attempts (post-verification)
export const claimLimiter = rateLimit({
  store: store('claimLimiter'),
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 50, // Limit each IP to 50 claim attempts per day (temporarily increased for testing)
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Daily claim limit reached, please try again tomorrow.' },
  handler: (req, res) => {
    logger.warn(`Claim rate limit exceeded for IP: ${req.ip}`, {
      walletAddress: req.body?.walletAddress,
      path: req.path,
      method: req.method
    });
    res.status(429).json({
      error: 'Daily claim limit reached, please try again tomorrow.',
      retryAfter: Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000)
    });
  }
});

// Rate limiter for failed verification attempts (more lenient)
export const failedVerificationLimiter = rateLimit({
  store: store('failedVerificationLimiter'),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // Allow 3 failed attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Only count failed requests
  skip: (req, res) => res.statusCode < 400, // Skip if response is successful
  message: { error: 'Too many failed verification attempts, please try again later.' },
  handler: (req, res) => {
    logger.warn(`Failed verification rate limit exceeded for IP: ${req.ip}`, {
      serialNumber: maskCode(req.body?.serialNumber || req.params?.serial),
      path: req.path,
      attempts: req.rateLimit.current
    });
    res.status(429).json({
      error: 'Too many failed verification attempts, please try again later.',
      retryAfter: Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000)
    });
  }
});

// Rate limiter for NFT minting operations
export const mintingLimiter = rateLimit({
  store: store('mintingLimiter'),
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 25, // Limit each IP to 25 minting operations per day
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Daily minting limit reached, please try again tomorrow.' },
  handler: (req, res) => {
    logger.warn(`Minting rate limit exceeded for IP: ${req.ip}`, {
      userId: req.user?.uid,
      path: req.path
    });
    res.status(429).json({ error: 'Daily minting limit reached, please try again tomorrow.' });
  }
});

// Rate limiter for email verification requests
// SECURITY FIX (S6): Keys on destination email + IP so an attacker cannot
// spam a victim's inbox by rotating serial numbers or IPs.
export const emailVerificationLimiter = rateLimit({
  store: store('emailVerificationLimiter'),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Max 3 verification emails per (email, IP) per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many email verification requests. Please try again later.' },
  keyGenerator: (req) => {
    const email = (req.body?.email || 'no-email').toLowerCase().trim();
    return `email-verify:${email}:${req.ip}`;
  },
  handler: (req, res) => {
    logger.warn(`Email verification rate limit exceeded`, {
      email: req.body?.email,
      ip: req.ip,
      path: req.path
    });
    res.status(429).json({
      error: 'Too many email verification requests. Please try again later.',
      retryAfter: Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000)
    });
  }
});

// Limiter for post-claim transfer-status polling. The frontend polls every
// 5s for up to 3 minutes after a claim (~36 requests), so this must stay
// loose enough for a few real polls while still blocking enumeration.
export const transferStatusLimiter = rateLimit({
  store: store('transferStatusLimiter'),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 120, // ~3 full polling sessions per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many status checks, please try again later.' },
  keyGenerator: (req) => {
    return `${req.ip}-${req.headers['user-agent']?.substring(0, 50) || 'unknown'}`;
  },
  handler: (req, res) => {
    logger.warn(`Transfer status rate limit exceeded for IP: ${req.ip}`, {
      path: req.path
    });
    res.status(429).json({ error: 'Too many status checks, please try again later.' });
  }
});

// Rate limiter for admin OTP login requests
// Keys on email + IP so an attacker cannot spam the admin inbox by rotating IPs.
export const adminLoginLimiter = rateLimit({
  store: store('adminLoginLimiter'),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Max 5 OTP emails per (email, IP) per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login requests. Please try again later.' },
  keyGenerator: (req) => {
    const email = (req.body?.email || 'no-email').toLowerCase().trim();
    return `admin-login:${email}:${req.ip}`;
  },
  handler: (req, res) => {
    logger.warn('Admin login rate limit exceeded', {
      ip: req.ip,
      path: req.path
    });
    res.status(429).json({
      error: 'Too many login requests. Please try again later.',
      retryAfter: Math.ceil((req.rateLimit.resetTime - Date.now()) / 1000)
    });
  }
});

// Rate limiter for order creation
export const orderLimiter = rateLimit({
  store: store('orderLimiter'),
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 50, // Limit each IP to 50 orders per day
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Daily order limit reached, please try again tomorrow.' },
  handler: (req, res) => {
    logger.warn(`Order creation rate limit exceeded for IP: ${req.ip}`, {
      userId: req.user?.uid,
      path: req.path
    });
    res.status(429).json({ error: 'Daily order limit reached, please try again tomorrow.' });
  }
});