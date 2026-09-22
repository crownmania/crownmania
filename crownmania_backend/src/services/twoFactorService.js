import crypto from 'crypto';
import { db } from '../config/firebase.js';
import logger from '../config/logger.js';
import smsService from './smsService.js';
import { sgMail, EMAIL_CONFIG, renderCodeEmail } from '../config/email.js';

const CODE_LENGTH = 6;
const CODE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const CLAIM_CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_VERIFY_ATTEMPTS = 5;
const MAX_CLAIM_CODES_PER_HOUR = 3;

/**
 * Two-Factor Authentication Service
 * Supports email + phone verification
 */
export const twoFactorService = {

    // ── helpers ───────────────────────────────────

    /**
     * Generate a cryptographically random N-digit code
     */
    generateCode(length = CODE_LENGTH) {
        const max = Math.pow(10, length);
        const code = crypto.randomInt(0, max);
        return code.toString().padStart(length, '0');
    },

    // ── email verification ───────────────────────

    /**
     * Send email verification code
     * @param {string} userId  - Firestore user doc ID
     * @param {string} email   - User's email
     */
    async sendEmailCode(userId, email) {
        const code = this.generateCode();
        const expiresAt = new Date(Date.now() + CODE_TTL_MS);

        // Store code
        await db.collection('verificationCodes').add({
            userId,
            type: 'email',
            code,
            expiresAt,
            verified: false,
            attempts: 0,
            createdAt: new Date(),
        });

        // Send email
        try {
            const { html, text } = renderCodeEmail({
                title: 'Verify Your Email',
                subtitle: 'Two-factor authentication',
                code,
                expiryLabel: '5 minutes'
            });

            await sgMail.send({
                to: email,
                from: EMAIL_CONFIG.from,
                subject: 'Your Crownmania verification code',
                text,
                html,
            });
            logger.info(`[2FA] Email code sent to user ${userId}`);
        } catch (err) {
            logger.error(`[2FA] Failed to send email code:`, err.message);
            throw new Error('Failed to send email verification code');
        }

        return { sent: true, expiresAt };
    },

    // ── phone verification ───────────────────────

    /**
     * Send SMS verification code
     * @param {string} userId - Firestore user doc ID
     * @param {string} phone  - E.164 phone number
     */
    async sendPhoneCode(userId, phone) {
        const code = this.generateCode();
        const expiresAt = new Date(Date.now() + CODE_TTL_MS);

        await db.collection('verificationCodes').add({
            userId,
            type: 'sms',
            code,
            expiresAt,
            verified: false,
            attempts: 0,
            createdAt: new Date(),
        });

        await smsService.sendVerificationCode(phone, code);
        logger.info(`[2FA] SMS code sent to user ${userId}`);
        return { sent: true, expiresAt };
    },

    // ── verification ─────────────────────────────

    /**
     * Verify a code (email or SMS)
     * @param {string} userId
     * @param {'email'|'sms'} type
     * @param {string} code
     * @returns {Promise<boolean>}
     */
    async verifyCode(userId, type, code) {
        // Find the most recent un-verified code of this type
        const snap = await db.collection('verificationCodes')
            .where('userId', '==', userId)
            .where('type', '==', type)
            .where('verified', '==', false)
            .orderBy('createdAt', 'desc')
            .limit(1)
            .get();

        if (snap.empty) {
            throw new Error('No pending verification code found. Request a new one.');
        }

        const doc = snap.docs[0];
        const data = doc.data();

        // Check expiry
        if (data.expiresAt.toDate() < new Date()) {
            throw new Error('Verification code expired. Request a new one.');
        }

        // Check attempt limit
        if (data.attempts >= MAX_VERIFY_ATTEMPTS) {
            throw new Error('Too many failed attempts. Request a new code.');
        }

        // Check code match
        if (data.code !== code) {
            await db.collection('verificationCodes').doc(doc.id).update({
                attempts: data.attempts + 1,
            });
            throw new Error('Invalid verification code');
        }

        // Mark verified
        await db.collection('verificationCodes').doc(doc.id).update({
            verified: true,
            verifiedAt: new Date(),
        });

        // Update user flags
        const flagField = type === 'email' ? 'emailVerified' : 'phoneVerified';
        const userSnap = await db.collection('users')
            .where('walletAddress', '==', userId.toLowerCase())
            .limit(1)
            .get();

        if (!userSnap.empty) {
            await db.collection('users').doc(userSnap.docs[0].id).update({
                [flagField]: true,
                updatedAt: new Date(),
            });
        }

        logger.info(`[2FA] ${type} verified for user ${userId}`);
        return true;
    },

    // ── claim verification ───────────────────────

    /**
     * Send an email verification code for a collectible claim.
     * Uses a deterministic doc (claim_<serial>) so the latest request
     * always wins and no composite index is needed.
     * @param {string} serialNumber - The claim code / serial being claimed
     * @param {string} email - Claimant's email address
     */
    async sendClaimEmailCode(serialNumber, email) {
        const normalizedSerial = serialNumber.toLowerCase().trim();
        const normalizedEmail = email.toLowerCase().trim();
        const docRef = db.collection('verificationCodes').doc(`claim_${normalizedSerial}`);

        const now = Date.now();
        const existing = await docRef.get();
        let requestCount = 0;
        let windowStart = new Date(now);

        if (existing.exists) {
            const data = existing.data();
            const windowStartMs = data.windowStart?.toDate ? data.windowStart.toDate().getTime() : 0;
            if (now - windowStartMs < 60 * 60 * 1000) {
                requestCount = data.requestCount || 0;
                windowStart = data.windowStart;
            }
        }

        if (requestCount >= MAX_CLAIM_CODES_PER_HOUR) {
            throw new Error('Too many verification codes requested for this product. Please try again later.');
        }

        const code = this.generateCode();
        const expiresAt = new Date(now + CLAIM_CODE_TTL_MS);

        await docRef.set({
            type: 'claim-email',
            serialNumber: normalizedSerial,
            email: normalizedEmail,
            code,
            expiresAt,
            verified: false,
            attempts: 0,
            requestCount: requestCount + 1,
            windowStart,
            createdAt: new Date(now),
        });

        try {
            const { html, text } = renderCodeEmail({
                title: 'Verify Your Claim',
                subtitle: 'Confirm your email to claim your collectible',
                code,
                expiryLabel: '10 minutes',
                note: 'If you did not scan a Crownmania product code, you can safely ignore this email.'
            });

            await sgMail.send({
                to: normalizedEmail,
                from: EMAIL_CONFIG.from,
                subject: 'Your Crownmania claim code',
                text,
                html,
            });
            logger.info(`[2FA] Claim code sent to ${normalizedEmail} for serial ${normalizedSerial.substring(0, 8)}...`);
        } catch (err) {
            logger.error(`[2FA] Failed to send claim code:`, err.message);
            throw new Error('Failed to send verification code. Please try again.');
        }

        return { sent: true, expiresAt };
    },

    /**
     * Verify a claim email code. Once verified, the code stays valid for the
     * remainder of its TTL so a transient claim failure doesn't force a new code.
     * @param {string} serialNumber
     * @param {string} email
     * @param {string} code
     * @returns {Promise<boolean>}
     */
    async verifyClaimEmailCode(serialNumber, email, code) {
        const normalizedSerial = serialNumber.toLowerCase().trim();
        const normalizedEmail = email.toLowerCase().trim();
        const docRef = db.collection('verificationCodes').doc(`claim_${normalizedSerial}`);
        const doc = await docRef.get();

        if (!doc.exists || doc.data().type !== 'claim-email') {
            throw new Error('No verification code was requested for this product.');
        }

        const data = doc.data();

        if (data.email !== normalizedEmail) {
            throw new Error('The verification code was sent to a different email address.');
        }

        if (data.expiresAt.toDate() < new Date()) {
            throw new Error('Verification code expired. Please request a new one.');
        }

        if (data.verified) {
            return true;
        }

        if (data.attempts >= MAX_VERIFY_ATTEMPTS) {
            throw new Error('Too many failed attempts. Please request a new code.');
        }

        if (data.code !== String(code).trim()) {
            await docRef.update({ attempts: data.attempts + 1 });
            throw new Error('Invalid verification code.');
        }

        await docRef.update({ verified: true, verifiedAt: new Date() });
        logger.info(`[2FA] Claim email verified for serial ${normalizedSerial.substring(0, 8)}...`);
        return true;
    },

    // ── order lookup verification ────────────────

    /**
     * Send an email code that unlocks the customer's order history.
     * Deterministic doc (orderlookup_<email>) so the latest request wins
     * and no composite index is needed.
     * @param {string} email - Customer's email address
     */
    async sendOrderLookupCode(email) {
        const normalizedEmail = email.toLowerCase().trim();
        const docRef = db.collection('verificationCodes').doc(`orderlookup_${normalizedEmail}`);

        const now = Date.now();
        const existing = await docRef.get();
        let requestCount = 0;
        let windowStart = new Date(now);

        if (existing.exists) {
            const data = existing.data();
            const windowStartMs = data.windowStart?.toDate ? data.windowStart.toDate().getTime() : 0;
            if (now - windowStartMs < 60 * 60 * 1000) {
                requestCount = data.requestCount || 0;
                windowStart = data.windowStart;
            }
        }

        if (requestCount >= MAX_CLAIM_CODES_PER_HOUR) {
            throw new Error('Too many verification codes requested. Please try again later.');
        }

        const code = this.generateCode();
        const expiresAt = new Date(now + CLAIM_CODE_TTL_MS);

        await docRef.set({
            type: 'order-lookup',
            email: normalizedEmail,
            code,
            expiresAt,
            verified: false,
            attempts: 0,
            requestCount: requestCount + 1,
            windowStart,
            createdAt: new Date(now),
        });

        try {
            const { html, text } = renderCodeEmail({
                title: 'Track Your Order',
                subtitle: 'Confirm your email to view your order history',
                code,
                expiryLabel: '10 minutes',
                note: 'If you did not request order tracking, you can safely ignore this email.'
            });

            await sgMail.send({
                to: normalizedEmail,
                from: EMAIL_CONFIG.from,
                subject: 'Your Crownmania order lookup code',
                text,
                html,
            });
            logger.info(`[2FA] Order lookup code sent to ${normalizedEmail}`);
        } catch (err) {
            logger.error(`[2FA] Failed to send order lookup code:`, err.message);
            throw new Error('Failed to send verification code. Please try again.');
        }

        return { sent: true, expiresAt };
    },

    /**
     * Verify an order lookup code. Stays valid for the remainder of its TTL
     * so a page refresh doesn't force a new code.
     * @param {string} email
     * @param {string} code
     * @returns {Promise<boolean>}
     */
    async verifyOrderLookupCode(email, code) {
        const normalizedEmail = email.toLowerCase().trim();
        const docRef = db.collection('verificationCodes').doc(`orderlookup_${normalizedEmail}`);
        const doc = await docRef.get();

        if (!doc.exists || doc.data().type !== 'order-lookup') {
            throw new Error('No verification code was requested for this email.');
        }

        const data = doc.data();

        if (data.expiresAt.toDate() < new Date()) {
            throw new Error('Verification code expired. Please request a new one.');
        }

        if (data.verified) {
            return true;
        }

        if (data.attempts >= MAX_VERIFY_ATTEMPTS) {
            throw new Error('Too many failed attempts. Please request a new code.');
        }

        if (data.code !== String(code).trim()) {
            await docRef.update({ attempts: data.attempts + 1 });
            throw new Error('Invalid verification code.');
        }

        await docRef.update({ verified: true, verifiedAt: new Date() });
        logger.info(`[2FA] Order lookup verified for ${normalizedEmail}`);
        return true;
    },

    // ── 2FA enable / disable ─────────────────────

    /**
     * Enable 2FA after both email and phone are verified
     * @param {string} walletAddress
     */
    async enable2FA(walletAddress) {
        const userSnap = await db.collection('users')
            .where('walletAddress', '==', walletAddress.toLowerCase())
            .limit(1)
            .get();

        if (userSnap.empty) throw new Error('User not found');

        const user = userSnap.docs[0].data();
        if (!user.emailVerified || !user.phoneVerified) {
            throw new Error('Both email and phone must be verified before enabling 2FA');
        }

        await db.collection('users').doc(userSnap.docs[0].id).update({
            twoFactorEnabled: true,
            updatedAt: new Date(),
        });

        logger.info(`[2FA] Enabled for ${walletAddress.substring(0, 10)}...`);
        return { enabled: true };
    },

    /**
     * Disable 2FA (requires fresh email + SMS code verification first)
     * @param {string} walletAddress
     */
    async disable2FA(walletAddress) {
        const userSnap = await db.collection('users')
            .where('walletAddress', '==', walletAddress.toLowerCase())
            .limit(1)
            .get();

        if (userSnap.empty) throw new Error('User not found');

        await db.collection('users').doc(userSnap.docs[0].id).update({
            twoFactorEnabled: false,
            updatedAt: new Date(),
        });

        logger.info(`[2FA] Disabled for ${walletAddress.substring(0, 10)}...`);
        return { enabled: false };
    },

    // ── login challenge ──────────────────────────

    /**
     * Send a 2FA challenge (email or SMS) during login
     * @param {string} walletAddress
     * @param {'email'|'sms'} method
     */
    async sendLoginChallenge(walletAddress, method) {
        const userSnap = await db.collection('users')
            .where('walletAddress', '==', walletAddress.toLowerCase())
            .limit(1)
            .get();

        if (userSnap.empty) throw new Error('User not found');

        const user = userSnap.docs[0].data();
        if (!user.twoFactorEnabled) {
            return { required: false };
        }

        const userId = walletAddress.toLowerCase();

        if (method === 'email' && user.email) {
            // email is encrypted, import encryptionService if needed
            const { encryptionService } = await import('./encryptionService.js');
            const decryptedEmail = encryptionService.decrypt(user.email);
            await this.sendEmailCode(userId, decryptedEmail);
        } else if (method === 'sms' && user.phone) {
            const { encryptionService } = await import('./encryptionService.js');
            const decryptedPhone = encryptionService.decrypt(user.phone);
            await this.sendPhoneCode(userId, decryptedPhone);
        } else {
            throw new Error(`${method} not configured for this user`);
        }

        return { required: true, method };
    },

    // ── status ───────────────────────────────────

    /**
     * Get 2FA status for a wallet
     * @param {string} walletAddress
     */
    async getStatus(walletAddress) {
        const userSnap = await db.collection('users')
            .where('walletAddress', '==', walletAddress.toLowerCase())
            .limit(1)
            .get();

        if (userSnap.empty) {
            return { twoFactorEnabled: false, emailVerified: false, phoneVerified: false };
        }

        const user = userSnap.docs[0].data();
        return {
            twoFactorEnabled: user.twoFactorEnabled || false,
            emailVerified: user.emailVerified || false,
            phoneVerified: user.phoneVerified || false,
        };
    },
};

export default twoFactorService;
