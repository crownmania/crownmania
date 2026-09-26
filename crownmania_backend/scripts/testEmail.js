/**
 * Send a REAL branded order-confirmation email to the ops inbox so template
 * changes can be eyeballed in an actual mail client before deploying.
 * Renders through the same production path (renderEmailShell + hosted assets).
 *
 * Usage: node scripts/testEmail.js [recipient]
 *   recipient defaults to the resolved admin/ops email.
 */
import 'dotenv/config';
import { sendOrderConfirmationEmail, resolveAdminEmail } from '../src/config/email.js';

const to = process.argv[2] || resolveAdminEmail();

try {
  const result = await sendOrderConfirmationEmail(to, {
    orderId: 'ORD-TESTEMAIL-preview',
    items: [{ name: 'Lil Durk Collectible Figure', quantity: 1 }],
    total: 200
  });
  console.log(`✅ Branded test email sent to ${to} — Resend id: ${result?.id}`);
} catch (err) {
  console.error('❌ Email failed:', err.message);
}
process.exit(0);
