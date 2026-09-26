/**
 * Send a REAL example of every outbound email type to the ops inbox so all
 * templates can be reviewed in an actual mail client before deploying.
 *
 * Customer-facing emails are addressed to the given recipient; admin/ops
 * notifications always go to the resolved admin email (as in production).
 *
 * Usage: node scripts/sendTestEmails.js [recipient]
 */
import 'dotenv/config';
import {
  sgMail, EMAIL_CONFIG, resolveAdminEmail,
  sendOrderConfirmationEmail, sendShippingConfirmationEmail,
  sendClaimConfirmationEmail, sendNewSaleEmail, sendAdminAlertEmail,
  renderCodeEmail, renderContactAdminEmail, renderContactAutoReply
} from '../src/config/email.js';
import * as notifications from '../src/services/notificationService.js';
import { encryptionService } from '../src/services/encryptionService.js';

const to = process.argv[2] || resolveAdminEmail();
const ORDER_ID = 'ORD-TESTEMAIL-preview';
const WALLET = '0x40B3fcE398FeCB3c002b7a71C1A576106e6a8a1B';
const CODE = '37498811f9a04add82aba501244f7fbb';
const ITEMS = [{ name: 'Lil Durk Collectible Figure', quantity: 1 }];

let sent = 0, failed = 0;
const step = async (label, fn) => {
  try {
    const result = await fn();
    console.log(`✅ ${label}${result?.id ? ` — id ${result.id}` : ''}`);
    sent++;
  } catch (err) {
    console.error(`❌ ${label} — ${err.message}`);
    failed++;
  }
  await new Promise(r => setTimeout(r, 300)); // stay under Resend rate limits
};

const codeMail = (opts, subject) => () => {
  const { html, text } = renderCodeEmail(opts);
  return sgMail.send({ to, from: EMAIL_CONFIG.from, subject, text, html });
};

console.log(`Sending one of every email type. Customer emails → ${to}; admin notifications → ${resolveAdminEmail()}\n`);

// ── Customer-facing ──────────────────────────────────────────────────────────

await step('order confirmation', () => sendOrderConfirmationEmail(to, {
  orderId: ORDER_ID, items: ITEMS, total: 200
}));

await step('shipping confirmation', () => sendShippingConfirmationEmail(to, {
  orderId: ORDER_ID, trackingNumber: '9400111899223197428490', carrier: 'usps'
}));

await step('claim confirmation', () => sendClaimConfirmationEmail(to, {
  productName: 'Lil Durk Collectible Figure', serialNumber: CODE,
  walletAddress: WALLET, tokenId: '12', editionNumber: 12
}));

await step('email verification code', codeMail(
  { title: 'Verify Your Email', subtitle: 'Two-factor authentication', code: '482910', expiryLabel: '5 minutes' },
  'Your Crownmania verification code'));

await step('claim verification code', codeMail(
  { title: 'Verify Your Claim', subtitle: 'Confirm your email to claim your collectible', code: '482910', expiryLabel: '10 minutes', note: 'If you did not scan a Crownmania product code, you can safely ignore this email.' },
  'Your Crownmania claim code'));

await step('order tracking code', codeMail(
  { title: 'Track Your Order', subtitle: 'Confirm your email to view your order history', code: '482910', expiryLabel: '10 minutes', note: 'If you did not request order tracking, you can safely ignore this email.' },
  'Your Crownmania order lookup code'));

await step('content drop', () => notifications.sendContentDropNotification(
  { title: 'Behind The Voice — Studio Session', description: 'Exclusive footage from the Free The Voice recording sessions.', contentType: 'video' },
  { email: encryptionService.encrypt(to) },
  { emailDrops: true }));

await step('contact auto-reply', () => sgMail.send({
  to, from: EMAIL_CONFIG.from,
  subject: 'We received your message — CrownMania',
  text: 'Hi Jane,\n\nThanks for reaching out. We\'ve received your message and will respond within 1–2 business days.',
  html: renderContactAutoReply({ name: 'Jane Doe' })
}));

// ── Admin / ops ──────────────────────────────────────────────────────────────

await step('admin login OTP', () => {
  const { html, text } = renderCodeEmail({
    title: 'Admin Login', subtitle: 'Sign in to the Crownmania admin dashboard',
    code: '482910', expiryLabel: '10 minutes',
    note: 'If you did not request this login, ignore this email and consider rotating your credentials.'
  });
  return sgMail.send({ to, from: EMAIL_CONFIG.from, subject: 'Your Crownmania admin login code', text, html });
});

await step('new sale alert', () => sendNewSaleEmail({
  orderId: ORDER_ID, customerEmail: to, total: 200, items: ITEMS,
  shippingAddress: { name: 'Jane Doe', line1: '2487 Clearwater Cir', city: 'Macon', state: 'GA', postal_code: '31217', country: 'US' },
  serials: [CODE]
}));

await step('operational alert', () => sendAdminAlertEmail('Fulfillment failure', {
  orderId: ORDER_ID, error: 'Printify API timeout after 30s', attempt: 3
}));

await step('wallet connection attempt', () => notifications.sendConnectionAttemptEmail({
  walletAddress: WALLET, timestamp: new Date().toISOString(), ip: '203.0.113.10',
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15'
}));

await step('serial scanned (valid)', () => notifications.sendScanAttemptEmail(CODE, 'qr_scan', {
  ip: '203.0.113.10', userAgent: 'Mozilla/5.0', verified: true, productName: 'Lil Durk Collectible Figure'
}));

await step('serial entered (invalid)', () => notifications.sendScanAttemptEmail('deadbeefdeadbeef', 'manual_entry', {
  ip: '203.0.113.10', userAgent: 'Mozilla/5.0', verified: false
}));

await step('claim succeeded', () => notifications.sendClaimAttemptEmail({
  claimCodeId: CODE, walletAddress: WALLET, claimEmail: to, success: true, edition: 12, ip: '203.0.113.10'
}));

await step('claim failed', () => notifications.sendClaimAttemptEmail({
  claimCodeId: CODE, walletAddress: WALLET, claimEmail: to, success: false, ip: '203.0.113.10'
}));

await step('contact submission (admin)', () => sgMail.send({
  to: resolveAdminEmail(), from: EMAIL_CONFIG.from, replyTo: 'jane@example.com',
  subject: '📬 Contact: Jane Doe — When will my order ship?',
  text: 'New contact from Jane Doe (jane@example.com):\n\nWhen will my order ship?',
  html: renderContactAdminEmail({ name: 'Jane Doe', email: 'jane@example.com', message: 'When will my order ship?' })
}));

console.log(`\nDone — ${sent} sent, ${failed} failed.`);
process.exit(failed ? 1 : 0);
