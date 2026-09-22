import express from 'express';
import { db } from '../config/firebase.js';
import { twoFactorService } from '../services/twoFactorService.js';
import { emailVerificationLimiter, authLimiter } from '../middleware/rateLimiter.js';
import logger from '../config/logger.js';

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/orders/lookup/request-code
 * Send a 6-digit code to the customer's email. Response is identical whether
 * or not orders exist for the address — never confirm/deny account existence.
 */
router.post('/lookup/request-code', emailVerificationLimiter, async (req, res) => {
    try {
        const email = String(req.body?.email || '').toLowerCase().trim();

        if (!EMAIL_RE.test(email)) {
            return res.status(400).json({ error: 'A valid email address is required' });
        }

        await twoFactorService.sendOrderLookupCode(email);
        res.json({ sent: true, message: 'If that email has orders, a verification code is on its way.' });
    } catch (error) {
        if (error.message?.includes('Too many')) {
            return res.status(429).json({ error: error.message });
        }
        logger.error('Order lookup code request failed:', error);
        res.status(500).json({ error: 'Failed to send verification code. Please try again.' });
    }
});

/**
 * POST /api/orders/lookup/verify
 * Verify the code, then return the customer's orders. Only order-safe fields
 * are returned — never serials, session IDs, or PII beyond the proven email.
 */
router.post('/lookup/verify', authLimiter, async (req, res) => {
    try {
        const email = String(req.body?.email || '').toLowerCase().trim();
        const code = String(req.body?.code || '').trim();

        if (!EMAIL_RE.test(email) || !/^\d{6}$/.test(code)) {
            return res.status(400).json({ error: 'Valid email and 6-digit code are required' });
        }

        try {
            await twoFactorService.verifyOrderLookupCode(email, code);
        } catch (verifyError) {
            return res.status(401).json({ error: verifyError.message || 'Invalid or expired verification code' });
        }

        // Single-field where avoids a composite index; sort in memory.
        const snapshot = await db.collection('orders')
            .where('customerEmail', '==', email)
            .limit(50)
            .get();

        const orders = snapshot.docs
            .map(doc => {
                const d = doc.data();
                return {
                    id: doc.id,
                    status: d.status,
                    total: d.total ?? null,
                    currency: d.currency || 'usd',
                    items: (d.items || []).map(i => ({
                        name: i.name || 'Item',
                        quantity: i.quantity || 1
                    })),
                    itemCount: d.allocatedSerials?.length || (d.items || []).reduce((s, i) => s + (i.quantity || 0), 0),
                    trackingNumber: d.trackingNumber || null,
                    carrier: d.carrier || null,
                    createdAt: d.createdAt?.toDate ? d.createdAt.toDate().toISOString() : null,
                    shippedAt: d.shippedAt?.toDate ? d.shippedAt.toDate().toISOString() : null
                };
            })
            .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
            .slice(0, 20);

        res.json({ orders });
    } catch (error) {
        logger.error('Order lookup verify failed:', error);
        res.status(500).json({ error: 'Failed to look up orders. Please try again.' });
    }
});

export { router as orderLookupRouter };
export default router;
