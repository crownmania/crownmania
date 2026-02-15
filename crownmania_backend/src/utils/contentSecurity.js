import crypto from 'crypto';
import logger from '../config/logger.js';

// ── Fail-fast secret validation ──────────────────────────────
const SERIAL_HASH_SALT = process.env.SERIAL_HASH_SALT;
const CONTENT_ACCESS_SECRET = process.env.CONTENT_ACCESS_SECRET;

if (process.env.NODE_ENV === 'production') {
  if (!SERIAL_HASH_SALT) {
    throw new Error('FATAL: SERIAL_HASH_SALT env var is required in production');
  }
  if (!CONTENT_ACCESS_SECRET) {
    throw new Error('FATAL: CONTENT_ACCESS_SECRET env var is required in production');
  }
} else {
  if (!SERIAL_HASH_SALT) {
    console.warn('⚠️  SERIAL_HASH_SALT not set — using insecure dev fallback');
  }
  if (!CONTENT_ACCESS_SECRET) {
    console.warn('⚠️  CONTENT_ACCESS_SECRET not set — using insecure dev fallback');
  }
}

const RESOLVED_SALT = SERIAL_HASH_SALT || 'DEV_ONLY_INSECURE_SALT';
const RESOLVED_SECRET = CONTENT_ACCESS_SECRET || 'DEV_ONLY_INSECURE_SECRET';

/**
 * Security utilities for content protection and serial number hashing
 */
export const contentSecurity = {
  /**
   * Hash a serial number for secure storage
   * @param {string} serial - The serial number to hash
   * @returns {string} - SHA-256 hash of the serial number
   */
  hashSerialNumber: (serial) => {
    if (!serial || typeof serial !== 'string') {
      throw new Error('Invalid serial number provided');
    }

    // Use SHA-256 with salt for additional security
    const salt = RESOLVED_SALT;
    const hash = crypto.createHash('sha256');
    hash.update(serial + salt);
    return hash.digest('hex');
  },

  /**
   * Verify a serial number against its hash
   * @param {string} serial - The plain serial number
   * @param {string} hash - The stored hash
   * @returns {boolean} - Whether the serial matches the hash
   */
  verifySerialHash: (serial, hash) => {
    if (!serial || !hash) return false;

    try {
      const computedHash = contentSecurity.hashSerialNumber(serial);
      return crypto.timingSafeEqual(
        Buffer.from(computedHash, 'hex'),
        Buffer.from(hash, 'hex')
      );
    } catch (error) {
      // If timingSafeEqual fails due to different lengths, return false
      return false;
    }
  },

  /**
   * Generate a secure content access signature
   * @param {string} contentId - The content identifier
   * @param {number} timestamp - Current timestamp
   * @param {string} userId - User identifier (optional)
   * @returns {string} - HMAC signature
   */
  generateContentSignature: (contentId, timestamp, userId = '') => {
    const secret = RESOLVED_SECRET;
    const data = `${contentId}:${timestamp}:${userId}`;

    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(data);
    return hmac.digest('hex');
  },

  /**
   * Verify a content access signature
   * @param {string} contentId - The content identifier
   * @param {number} timestamp - The timestamp from the request
   * @param {string} signature - The signature to verify
   * @param {string} userId - User identifier (optional)
   * @returns {boolean} - Whether the signature is valid
   */
  verifyContentSignature: (contentId, timestamp, signature, userId = '') => {
    // Check timestamp is within reasonable window (5 minutes)
    const now = Date.now();
    const timeDiff = Math.abs(now - timestamp);
    const maxAge = 5 * 60 * 1000; // 5 minutes

    if (timeDiff > maxAge) {
      return false;
    }

    const expectedSignature = contentSecurity.generateContentSignature(contentId, timestamp, userId);
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(signature, 'hex')
    );
  },

  /**
   * Generate a secure random token for temporary access
   * @param {number} length - Length of the token in bytes (default 32)
   * @returns {string} - Base64 encoded random token
   */
  generateSecureToken: (length = 32) => {
    return crypto.randomBytes(length).toString('base64url');
  },

  /**
   * Sanitize input to prevent injection attacks
   * @param {string} input - Input to sanitize
   * @returns {string} - Sanitized input
   */
  sanitizeInput: (input) => {
    if (typeof input !== 'string') return '';

    // Remove potentially dangerous characters
    return input
      .replace(/[<>'"&]/g, '')
      .trim()
      .substring(0, 1000); // Limit length
  },

  /**
   * Log security events for audit purposes
   * @param {string} event - The security event type
   * @param {object} details - Additional event details
   * @param {string} ip - IP address of the request
   * @param {string} userId - User ID if available
   */
  logSecurityEvent: (event, details, ip = '', userId = '') => {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      event,
      details,
      ip: ip || 'unknown',
      userId: userId || 'anonymous'
    };

    // Structured log output
    logger.info(`[SECURITY] ${event}`, logEntry);

    // Persist to Firestore audit log (fire-and-forget)
    import('../config/firebase.js').then(({ db }) => {
      db.collection('auditLogs').add({
        ...logEntry,
        timestamp: new Date(),
        source: 'contentSecurity'
      }).catch(err => logger.error('Failed to persist security event:', err.message));
    }).catch(() => { /* Firebase not available (test env) */ });
  }
};

export default contentSecurity;