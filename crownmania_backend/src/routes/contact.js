import express from 'express';
import rateLimit from 'express-rate-limit';
import { sgMail, EMAIL_CONFIG, sendBrandedAdminEmail, renderEmailShell, infoCard, escapeHtml, resolveAdminEmail } from '../config/email.js';

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

    // Admin notification — name/email/message are user input; the helper
    // escapes all row values before they reach the inbox.
    const adminHtml = renderEmailShell({
      preheader: `Contact form: ${name}`,
      title: 'New Contact Submission',
      subtitle: 'Via crownmania.com contact form',
      bodyHtml: `
        ${infoCard(`
          <p style="margin:0; font-family:Arial,Helvetica,sans-serif; font-size:14px; line-height:1.7; color:#C7CEDA; white-space:pre-wrap;">${escapeHtml(message)}</p>`)}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:22px;">
          <tr>
            <td style="padding:10px 0; border-bottom:1px solid #1B2740; font-family:Arial,Helvetica,sans-serif; font-size:12px; color:#C7CEDA; text-transform:uppercase; letter-spacing:0.06em;">Name</td>
            <td style="padding:10px 0; border-bottom:1px solid #1B2740; font-family:Arial,Helvetica,sans-serif; font-size:13px; color:#FFFFFF; text-align:right;">${escapeHtml(name)}</td>
          </tr>
          <tr>
            <td style="padding:10px 0; border-bottom:1px solid #1B2740; font-family:Arial,Helvetica,sans-serif; font-size:12px; color:#C7CEDA; text-transform:uppercase; letter-spacing:0.06em;">Reply to</td>
            <td style="padding:10px 0; border-bottom:1px solid #1B2740; font-family:Arial,Helvetica,sans-serif; font-size:13px; text-align:right;"><a href="mailto:${escapeHtml(email)}" style="color:#6B8DD6; text-decoration:none;">${escapeHtml(email)}</a></td>
          </tr>
          <tr>
            <td style="padding:10px 0; font-family:Arial,Helvetica,sans-serif; font-size:12px; color:#C7CEDA; text-transform:uppercase; letter-spacing:0.06em;">Received</td>
            <td style="padding:10px 0; font-family:Arial,Helvetica,sans-serif; font-size:13px; color:#FFFFFF; text-align:right;">${new Date().toUTCString()}</td>
          </tr>
        </table>`
    });

    // Customer auto-reply
    const autoReplyHtml = renderEmailShell({
      preheader: 'We received your message',
      title: 'Message Received',
      subtitle: "We'll get back to you soon",
      bodyHtml: `
        ${infoCard(`
          <p style="margin:0; font-family:Arial,Helvetica,sans-serif; font-size:14px; line-height:1.8; color:#C7CEDA;">
            Hi <span style="color:#FFFFFF; font-weight:700;">${escapeHtml(name)}</span>,<br><br>
            Thanks for reaching out to us. We've received your message and will respond within 1–2 business days.
          </p>`)}`
    });

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
