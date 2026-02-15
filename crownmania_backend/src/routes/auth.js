import express from 'express';
import signatureService from '../services/signatureService.js';
import logger from '../config/logger.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Rate limiter for nonce endpoint (10 requests per minute per IP)
const nonceLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10,
    message: { error: 'Too many nonce requests. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * GET /api/auth/nonce
 * Generate a nonce for wallet signature authentication
 */
router.get('/nonce', nonceLimiter, async (req, res) => {
    try {
        const { address } = req.query;

        if (!address) {
            return res.status(400).json({ error: 'Wallet address is required' });
        }

        // Validate wallet address format
        if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
            return res.status(400).json({ error: 'Invalid wallet address format' });
        }

        const { nonce, message, expiresAt } = await signatureService.generateNonce(address);

        res.json({
            nonce,
            message,
            expiresAt: expiresAt.toISOString()
        });
    } catch (error) {
        logger.error('Error generating nonce:', error);
        res.status(500).json({ error: 'Failed to generate nonce' });
    }
});

/**
 * POST /api/auth/verify
 * Verify a wallet signature (optional endpoint for testing)
 */
router.post('/verify', async (req, res) => {
    try {
        const { walletAddress, signature, message } = req.body;

        if (!walletAddress || !signature || !message) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const verified = await signatureService.verifySignature(walletAddress, signature, message);

        res.json({ verified });
    } catch (error) {
        logger.error('Error verifying signature:', error);
        res.status(400).json({
            error: error.message || 'Signature verification failed'
        });
    }
});

// ============================================
// 2FA ENDPOINTS
// ============================================

import twoFactorService from '../services/twoFactorService.js';

const twoFactorLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    message: { error: 'Too many 2FA requests. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * POST /api/auth/2fa/setup-email
 * Send email verification code for 2FA setup
 */
router.post('/2fa/setup-email', twoFactorLimiter, async (req, res) => {
    try {
        const { walletAddress, email } = req.body;
        if (!walletAddress || !email) {
            return res.status(400).json({ error: 'walletAddress and email are required' });
        }
        const result = await twoFactorService.sendEmailCode(walletAddress.toLowerCase(), email);
        res.json(result);
    } catch (error) {
        logger.error('2FA setup-email error:', error);
        res.status(400).json({ error: error.message });
    }
});

/**
 * POST /api/auth/2fa/verify-email
 * Verify the email code
 */
router.post('/2fa/verify-email', twoFactorLimiter, async (req, res) => {
    try {
        const { walletAddress, code } = req.body;
        if (!walletAddress || !code) {
            return res.status(400).json({ error: 'walletAddress and code are required' });
        }
        const verified = await twoFactorService.verifyCode(walletAddress.toLowerCase(), 'email', code);
        res.json({ verified });
    } catch (error) {
        logger.error('2FA verify-email error:', error);
        res.status(400).json({ error: error.message });
    }
});

/**
 * POST /api/auth/2fa/setup-phone
 * Send SMS verification code for 2FA setup
 */
router.post('/2fa/setup-phone', twoFactorLimiter, async (req, res) => {
    try {
        const { walletAddress, phone } = req.body;
        if (!walletAddress || !phone) {
            return res.status(400).json({ error: 'walletAddress and phone are required' });
        }
        const result = await twoFactorService.sendPhoneCode(walletAddress.toLowerCase(), phone);
        res.json(result);
    } catch (error) {
        logger.error('2FA setup-phone error:', error);
        res.status(400).json({ error: error.message });
    }
});

/**
 * POST /api/auth/2fa/verify-phone
 * Verify the SMS code
 */
router.post('/2fa/verify-phone', twoFactorLimiter, async (req, res) => {
    try {
        const { walletAddress, code } = req.body;
        if (!walletAddress || !code) {
            return res.status(400).json({ error: 'walletAddress and code are required' });
        }
        const verified = await twoFactorService.verifyCode(walletAddress.toLowerCase(), 'sms', code);
        res.json({ verified });
    } catch (error) {
        logger.error('2FA verify-phone error:', error);
        res.status(400).json({ error: error.message });
    }
});

/**
 * POST /api/auth/2fa/enable
 * Enable 2FA after both verifications pass
 */
router.post('/2fa/enable', async (req, res) => {
    try {
        const { walletAddress } = req.body;
        if (!walletAddress) {
            return res.status(400).json({ error: 'walletAddress is required' });
        }
        const result = await twoFactorService.enable2FA(walletAddress);
        res.json(result);
    } catch (error) {
        logger.error('2FA enable error:', error);
        res.status(400).json({ error: error.message });
    }
});

/**
 * POST /api/auth/2fa/disable
 * Disable 2FA
 */
router.post('/2fa/disable', async (req, res) => {
    try {
        const { walletAddress } = req.body;
        if (!walletAddress) {
            return res.status(400).json({ error: 'walletAddress is required' });
        }
        const result = await twoFactorService.disable2FA(walletAddress);
        res.json(result);
    } catch (error) {
        logger.error('2FA disable error:', error);
        res.status(400).json({ error: error.message });
    }
});

/**
 * POST /api/auth/2fa/challenge
 * Login challenge – sends 2FA code if enabled
 */
router.post('/2fa/challenge', twoFactorLimiter, async (req, res) => {
    try {
        const { walletAddress, method } = req.body;
        if (!walletAddress) {
            return res.status(400).json({ error: 'walletAddress is required' });
        }
        const result = await twoFactorService.sendLoginChallenge(walletAddress, method || 'email');
        res.json(result);
    } catch (error) {
        logger.error('2FA challenge error:', error);
        res.status(400).json({ error: error.message });
    }
});

/**
 * GET /api/auth/2fa/status
 * Check 2FA status for a wallet
 */
router.get('/2fa/status', async (req, res) => {
    try {
        const { address } = req.query;
        if (!address) {
            return res.status(400).json({ error: 'address query param is required' });
        }
        const status = await twoFactorService.getStatus(address);
        res.json(status);
    } catch (error) {
        logger.error('2FA status error:', error);
        res.status(500).json({ error: error.message });
    }
});

export { router as authRouter };
export default router;

