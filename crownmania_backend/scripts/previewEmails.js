/**
 * Render every email template to local HTML files WITHOUT sending anything.
 *
 * The Resend transport is intercepted at the fetch layer, so the output is the
 * exact HTML that would have been delivered. Use this to review template
 * changes instead of emailing real people.
 *
 * Usage: node scripts/previewEmails.js [outputDir]
 * Then open the generated .html files in a browser.
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';

const outDir = process.argv[2] || path.join(process.cwd(), 'email-previews');
fs.mkdirSync(outDir, { recursive: true });

// Intercept Resend's HTTP call so nothing leaves the machine.
const realFetch = globalThis.fetch;
let captured = null;
globalThis.fetch = async (url, opts = {}) => {
  if (String(url).includes('api.resend.com')) {
    const body = JSON.parse(opts.body || '{}');
    captured = { subject: body.subject, html: body.html, text: body.text };
    return new Response(JSON.stringify({ id: 'preview-intercepted' }), {
      status: 200, headers: { 'content-type': 'application/json' }
    });
  }
  return realFetch(url, opts);
};

const email = await import('../src/config/email.js');

const save = (name) => {
  if (!captured) return console.warn(`!! nothing captured for ${name}`);
  fs.writeFileSync(path.join(outDir, `${name}.html`), captured.html);
  fs.writeFileSync(path.join(outDir, `${name}.txt`), captured.text || '(no plain text)');
  console.log(`${name.padEnd(26)} ${captured.subject}`);
  captured = null;
};

const ORDER_ID = 'ORD-0000000000000-preview';
const ITEMS = [{ name: 'Lil Durk Collectible Figure', quantity: 1 }];

await email.sendOrderConfirmationEmail('preview@example.com', {
  orderId: ORDER_ID, items: ITEMS, total: 200
});
save('order-confirmation');

await email.sendShippingConfirmationEmail('preview@example.com', {
  orderId: ORDER_ID, trackingNumber: '9400111899223197428490', carrier: 'usps'
});
save('shipping-confirmation');

await email.sendClaimConfirmationEmail('preview@example.com', {
  productName: 'Lil Durk Collectible Figure',
  serialNumber: '37498811f9a04add82aba501244f7fbb',
  walletAddress: '0x40B3fcE398FeCB3c002b7a71C1A576106e6a8a1B',
  tokenId: '12', editionNumber: 12
});
save('claim-confirmation');

await email.sendNewSaleEmail({
  orderId: ORDER_ID, customerEmail: 'preview@example.com', total: 200, items: ITEMS,
  shippingAddress: {
    name: 'Jane Doe', line1: '2487 Clearwater Cir', line2: '',
    city: 'Macon', state: 'GA', postal_code: '31217', country: 'US'
  },
  serials: ['37498811f9a04add82aba501244f7fbb']
});
save('new-sale-admin');

// ── Admin + ops notifications (notificationService / adminService / contact) ──

const notifications = await import('../src/services/notificationService.js');

await notifications.sendConnectionAttemptEmail({
  walletAddress: '0x40B3fcE398FeCB3c002b7a71C1A576106e6a8a1B',
  ip: '203.0.113.10',
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15'
});
save('admin-connection-attempt');

await notifications.sendScanAttemptEmail('37498811f9a04add82aba501244f7fbb', 'qr_scan', {
  ip: '203.0.113.10', userAgent: 'Mozilla/5.0', verified: true,
  productName: 'Lil Durk Collectible Figure'
});
save('admin-scan-attempt');

await notifications.sendClaimAttemptEmail({
  claimCodeId: '37498811f9a04add82aba501244f7fbb',
  walletAddress: '0x40B3fcE398FeCB3c002b7a71C1A576106e6a8a1B',
  success: true, edition: 12, ip: '203.0.113.10'
});
save('admin-claim-attempt');

// Admin login OTP + wallet 2FA code use the shared renderCodeEmail renderer —
// preview it directly since triggering the services writes Firestore state.
{
  const { html, text } = email.renderCodeEmail({
    title: 'Admin Login',
    subtitle: 'Sign in to the Crownmania admin dashboard',
    code: '482910',
    expiryLabel: '10 minutes',
    note: 'If you did not request this login, ignore this email.'
  });
  fs.writeFileSync(path.join(outDir, 'admin-login-otp.html'), html);
  fs.writeFileSync(path.join(outDir, 'admin-login-otp.txt'), text);
  console.log('admin-login-otp           Your Crownmania admin login code');
}

console.log(`\nNo emails were sent. Previews written to ${outDir}`);
process.exit(0);
