import rateLimit from 'express-rate-limit';
import logger from '../config/logger.js';

/**
 * Rate limiting configuration for different API endpoints
 * All limits are per IP address
 */

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  // 15 minutes
  max: 100,
  // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false,
  // Disable the `X-RateLimit-*` headers
  message: {
    error: 'Too many requests, please try again later.'
  },
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`, {
      path: req.path,
      method: req.method,
      userAgent: req.headers['user-agent']
    });
    res.status(429).json({
      error: 'Too many requests, please try again later.'
    });
  }
});

// Stricter rate limiter for authentication attempts
export const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  // 1 hour
  max: 5,
  // Limit each IP to 5 failed attempts per hour
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  // Don't count successful authentications
  message: {
    error: 'Too many login attempts, please try again later.'
  },
  handler: (req, res) => {
    logger.warn(`Authentication rate limit exceeded for IP: ${req.ip}`, {
      path: req.path,
      method: req.method
    });
    res.status(429).json({
      error: 'Too many login attempts, please try again later.'
    });
  }
});

// Rate limiter for serial number verification
export const serialNumberLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  // 1 hour
  max: 10,
  // Limit each IP to 10 verification attempts per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many verification attempts, please try again later.'
  },
  handler: (req, res) => {
    logger.warn(`Serial number verification rate limit exceeded for IP: ${req.ip}`, {
      serialNumber: req.body.serialNumber,
      path: req.path
    });
    res.status(429).json({
      error: 'Too many verification attempts, please try again later.'
    });
  }
});

// Rate limiter for NFT minting operations
export const mintingLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  // 24 hours
  max: 25,
  // Limit each IP to 25 minting operations per day
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Daily minting limit reached, please try again tomorrow.'
  },
  handler: (req, res) => {
    logger.warn(`Minting rate limit exceeded for IP: ${req.ip}`, {
      userId: req.user?.uid,
      path: req.path
    });
    res.status(429).json({
      error: 'Daily minting limit reached, please try again tomorrow.'
    });
  }
});

// Rate limiter for order creation
export const orderLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  // 24 hours
  max: 50,
  // Limit each IP to 50 orders per day
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Daily order limit reached, please try again tomorrow.'
  },
  handler: (req, res) => {
    logger.warn(`Order creation rate limit exceeded for IP: ${req.ip}`, {
      userId: req.user?.uid,
      path: req.path
    });
    res.status(429).json({
      error: 'Daily order limit reached, please try again tomorrow.'
    });
  }
});