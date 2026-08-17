import crypto from 'crypto';
import logger from '../config/logger.js';

// ── PII encryption key validation ──
// SECURITY FIX (S7): Fail-fast in production if the encryption key is missing.
// Previously the service would fall through to a deterministic dev key, which
// silently degraded PII protection. Booting without a real key in production
// is now a fatal startup error.
if (process.env.NODE_ENV === 'production' && !process.env.PII_ENCRYPTION_KEY) {
    const msg = 'FATAL: PII_ENCRYPTION_KEY env var is not set in production. ' +
        'Set it to a 64-char hex string (e.g. `openssl rand -hex 32`) before starting the server.';
    console.error('🚨 ' + msg);
    throw new Error(msg);
}

// Validate key format if provided
if (process.env.PII_ENCRYPTION_KEY && !/^[a-fA-F0-9]{64}$/.test(process.env.PII_ENCRYPTION_KEY)) {
    const msg = 'FATAL: PII_ENCRYPTION_KEY must be a 64-character hex string (32 bytes).';
    console.error('🚨 ' + msg);
    throw new Error(msg);
}

// In dev/test only, use a deterministic (but insecure) key so data survives restarts.
const DEV_FALLBACK_KEY = crypto.createHash('sha256').update('DEV_ONLY_INSECURE_PII_KEY').digest('hex');
const ENCRYPTION_KEY = process.env.PII_ENCRYPTION_KEY || DEV_FALLBACK_KEY;
const ALGORITHM = 'aes-256-gcm';

/**
 * Service for encrypting/decrypting sensitive PII data
 * Uses AES-256-GCM for authenticated encryption
 */
export const encryptionService = {
    /**
     * Encrypt sensitive text data
     * @param {string} text - The plaintext to encrypt
     * @returns {string} Encrypted data in format: iv:authTag:encrypted
     */
    encrypt: (text) => {
        try {
            if (!text) return null;

            const iv = crypto.randomBytes(16);
            const cipher = crypto.createCipheriv(
                ALGORITHM,
                Buffer.from(ENCRYPTION_KEY, 'hex'),
                iv
            );

            let encrypted = cipher.update(text, 'utf8', 'hex');
            encrypted += cipher.final('hex');

            const authTag = cipher.getAuthTag();

            // Return format: iv:authTag:encrypted
            return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
        } catch (error) {
            logger.error('Error encrypting data:', error);
            throw new Error('Encryption failed');
        }
    },

    /**
     * Decrypt encrypted text data
     * @param {string} encryptedData - Encrypted data in format: iv:authTag:encrypted
     * @returns {string} Decrypted plaintext
     */
    decrypt: (encryptedData) => {
        try {
            if (!encryptedData) return null;

            const [ivHex, authTagHex, encrypted] = encryptedData.split(':');

            if (!ivHex || !authTagHex || !encrypted) {
                throw new Error('Invalid encrypted data format');
            }

            const decipher = crypto.createDecipheriv(
                ALGORITHM,
                Buffer.from(ENCRYPTION_KEY, 'hex'),
                Buffer.from(ivHex, 'hex')
            );

            decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');

            return decrypted;
        } catch (error) {
            logger.error('Error decrypting data:', error);
            throw new Error('Decryption failed');
        }
    },

    /**
     * Mask sensitive data for logging (show first/last few chars only)
     * @param {string} data - Data to mask
     * @param {number} visibleChars - Number of chars to show at start/end
     * @returns {string} Masked data
     */
    mask: (data, visibleChars = 3) => {
        if (!data || data.length <= visibleChars * 2) {
            return '***';
        }
        const start = data.substring(0, visibleChars);
        const end = data.substring(data.length - visibleChars);
        return `${start}***${end}`;
    }
};

// Warn in non-prod if using fallback key
if (!process.env.PII_ENCRYPTION_KEY && process.env.NODE_ENV !== 'production') {
    logger.warn('⚠️  PII_ENCRYPTION_KEY not set — using deterministic dev-only fallback (NOT SECURE for production)');
}

export default encryptionService;
