import express from 'express';
import rateLimit from 'express-rate-limit';
import { sgMail, EMAIL_CONFIG } from '../config/email.js';

const router = express.Router();

const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || 'crown@crownmania.com';

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

    const adminHtml = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0f; padding: 40px; border-radius: 16px; border: 1px solid rgba(0,163,255,0.2);">
      <h2 style="color: #00a3ff; margin: 0 0 24px 0; font-size: 20px;">📬 New Contact Form Submission</h2>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.08); color: rgba(255,255,255,0.5); font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; width: 100px;">Name</td>
          <td style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.08); color: white; font-size: 15px;">${name}</td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.08); color: rgba(255,255,255,0.5); font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em;">Email</td>
          <td style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.08); color: #00a3ff; font-size: 15px;"><a href="mailto:${email}" style="color: #00a3ff;">${email}</a></td>
        </tr>
        <tr>
          <td style="padding: 12px 16px 12px 0; color: rgba(255,255,255,0.5); font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; vertical-align: top;">Message</td>
          <td style="padding: 12px 0; color: rgba(255,255,255,0.85); font-size: 14px; line-height: 1.7; white-space: pre-wrap;">${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>
        </tr>
      </table>
      <p style="color: rgba(255,255,255,0.3); font-size: 12px; margin: 0;">Received: ${new Date().toUTCString()}</p>
    </div>`;

    const autoReplyHtml = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0f; padding: 40px; border-radius: 16px; border: 1px solid rgba(0,163,255,0.2);">
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="color: #00a3ff; font-size: 24px; margin: 0 0 8px 0; letter-spacing: -0.02em;">Message Received</h1>
        <p style="color: rgba(255,255,255,0.5); font-size: 14px; margin: 0;">We'll get back to you soon.</p>
      </div>
      <div style="background: rgba(0,163,255,0.06); border: 1px solid rgba(0,163,255,0.15); border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <p style="color: rgba(255,255,255,0.8); font-size: 14px; line-height: 1.7; margin: 0;">
          Hi <strong style="color: white;">${name}</strong>,<br><br>
          Thanks for reaching out to us. We've received your message and will respond within 1–2 business days.
        </p>
      </div>
      <p style="color: rgba(255,255,255,0.3); font-size: 12px; text-align: center; margin: 0;">© 2026 CrownMania. All rights reserved.</p>
    </div>`;

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
