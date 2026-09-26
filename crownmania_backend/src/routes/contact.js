import express from 'express';
import rateLimit from 'express-rate-limit';
import { sgMail, EMAIL_CONFIG, renderContactAdminEmail, renderContactAutoReply, resolveAdminEmail } from '../config/email.js';
import { db } from '../config/firebase.js';
import logger from '../config/logger.js';

const router = express.Router();

const ADMIN_EMAIL = resolveAdminEmail();

// Rate limit: max 3 contact submissions per 10 minutes per IP
const contactLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 3,
    message: { error: 'Too many messages sent. Please wait before trying again.' },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * POST /api/contact
 * Submits a contact form — sends an email to admin and auto-reply to sender
 */
router.post('/', contactLimiter, async (req, res) => {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
        return res.status(400).json({ error: 'Name, email, and message are required.' });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Invalid email address.' });
    }

    if (message.length > 2000) {
        return res.status(400).json({ error: 'Message too long (max 2000 characters).' });
    }

    // Persist for the admin inbox — best-effort; email delivery is the contract.
    if (db) {
        db.collection('contactMessages').add({
            name: String(name).slice(0, 200),
            email: String(email).slice(0, 300),
            message: String(message).slice(0, 2000),
            read: false,
            createdAt: new Date(),
        }).catch(err => logger.warn('Contact message persist failed:', err.message));
    }

    // Admin notification + customer auto-reply — both rendered from the
    // shared templates in config/email.js so branding stays uniform.
    const adminHtml = renderContactAdminEmail({ name, email, message });
    const autoReplyHtml = renderContactAutoReply({ name });

    try {
        // Send to admin
        await sgMail.send({
            to: ADMIN_EMAIL,
            from: EMAIL_CONFIG.from,
            replyTo: email,
            subject: `📬 Contact: ${name} — ${message.slice(0, 60)}${message.length > 60 ? '...' : ''}`,
            html: adminHtml,
            text: `New contact from ${name} (${email}):\n\n${message}`,
        });

        // Send auto-reply to user
        await sgMail.send({
            to: email,
            from: EMAIL_CONFIG.from,
            subject: 'We received your message — CrownMania',
            html: autoReplyHtml,
            text: `Hi ${name},\n\nThanks for reaching out. We've received your message and will respond within 1–2 business days.\n\n© 2026 CrownMania`,
        });

        res.json({ success: true, message: 'Message sent successfully.' });
    } catch (error) {
        console.error('Contact form email error:', error?.response?.body || error.message);
        res.status(500).json({ error: 'Failed to send message. Please try again.' });
    }
});

export { router as contactRouter };
export default router;
