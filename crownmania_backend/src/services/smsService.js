import logger from '../config/logger.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// In-memory rate limiter: { phoneHash: { count, resetAt } }
const smsRateLimits = new Map();
const MAX_SMS_PER_HOUR = 3;

/**
 * SMS Service for 2FA via Twilio
 * Sends 6-digit verification codes with rate limiting
 */
export const smsService = {
    client: null,

    /**
     * Initialize Twilio client lazily
     */
    getClient() {
        if (!this.client) {
            const sid = process.env.TWILIO_ACCOUNT_SID;
            const token = process.env.TWILIO_AUTH_TOKEN;

            if (!sid || !token) {
                logger.warn('[SMS] Twilio credentials not configured – SMS disabled');
                return null;
            }

            try {
                const twilio = require('twilio');
                this.client = twilio(sid, token);
            } catch (e) {
                logger.warn('[SMS] twilio package not installed – SMS disabled');
                return null;
            }
        }
        return this.client;
    },

    /**
     * Validate E.164 phone number
     * @param {string} phone
     * @returns {boolean}
     */
    isValidPhone(phone) {
        return /^\+[1-9]\d{10,14}$/.test(phone);
    },

    /**
     * Check rate limit for phone number
     * @param {string} phone
     * @returns {{ allowed: boolean, retryAfterMs?: number }}
     */
    checkRateLimit(phone) {
        const key = phone;
        const now = Date.now();
        const entry = smsRateLimits.get(key);

        if (!entry || now > entry.resetAt) {
            smsRateLimits.set(key, { count: 0, resetAt: now + 3600 * 1000 });
            return { allowed: true };
        }

        if (entry.count >= MAX_SMS_PER_HOUR) {
            return {
                allowed: false,
                retryAfterMs: entry.resetAt - now,
            };
        }

        return { allowed: true };
    },

    /**
     * Send a 6-digit verification code via SMS
     * @param {string} phone - E.164 phone number
     * @param {string} code  - 6-digit code
     * @returns {Promise<{ success: boolean, messageId?: string }>}
     */
    async sendVerificationCode(phone, code) {
        if (!this.isValidPhone(phone)) {
            throw new Error('Invalid phone number format (must be E.164)');
        }

        const rateCheck = this.checkRateLimit(phone);
        if (!rateCheck.allowed) {
            const retryMin = Math.ceil(rateCheck.retryAfterMs / 60000);
            throw new Error(`SMS rate limit exceeded. Try again in ${retryMin} minute(s).`);
        }

        const client = this.getClient();
        if (!client) {
            // Fallback: log code for development
            logger.info(`[SMS][DEV] Verification code for ${phone}: ${code}`);
            return { success: true, messageId: 'dev-mode' };
        }

        try {
            const msg = await client.messages.create({
                body: `Your CrownMania verification code is: ${code}. It expires in 5 minutes.`,
                from: process.env.TWILIO_PHONE_NUMBER,
                to: phone,
            });

            // Bump rate limit counter
            const entry = smsRateLimits.get(phone);
            if (entry) entry.count += 1;

            logger.info(`[SMS] Sent verification to ${phone.substring(0, 5)}***`);
            return { success: true, messageId: msg.sid };
        } catch (error) {
            logger.error(`[SMS] Failed to send to ${phone.substring(0, 5)}***:`, error.message);
            throw new Error('Failed to send SMS verification code');
        }
    },
};

export default smsService;
