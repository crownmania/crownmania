import 'dotenv/config';
import { sgMail, EMAIL_CONFIG } from '../src/config/email.js';

try {
  const result = await sgMail.send({
    to: process.env.ADMIN_ALERT_EMAIL || 'crown@crownmania.com',
    from: EMAIL_CONFIG.from,
    subject: 'Crownmania — Resend test email',
    text: 'If you are reading this, Resend is working correctly.',
    html: '<p>If you are reading this, <strong>Resend is working correctly</strong>.</p>'
  });
  console.log('✅ Email sent! ID:', result?.id);
} catch (err) {
  console.error('❌ Email failed:', err.message);
}
process.exit(0);
