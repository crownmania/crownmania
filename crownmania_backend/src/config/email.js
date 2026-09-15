import { Resend } from 'resend';

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

// Email templates
const EMAIL_TEMPLATES = {
  ORDER_CONFIRMATION: 'd-xxxxxxxxxxxxx',
  SHIPPING_CONFIRMATION: 'd-xxxxxxxxxxxxx',
  TOKEN_CLAIM: 'd-xxxxxxxxxxxxx',
  WELCOME: 'd-xxxxxxxxxxxxx'
};

// Email sender configuration
const EMAIL_CONFIG = {
  from: {
    email: process.env.SENDGRID_FROM_EMAIL || 'noreply@crownmania.com',
    name: 'Crownmania'
  }
};

/**
 * SendGrid-compatible shim backed by Resend.
 * Keeps the sgMail.send({ to, from, subject, text, html }) interface
 * so all existing callers work without changes.
 */
const sgMail = {
  async send(msg) {
    const from = typeof msg.from === 'object'
      ? `${msg.from.name} <${msg.from.email}>`
      : msg.from;

    const { data, error } = await resend.emails.send({
      from,
      to: Array.isArray(msg.to) ? msg.to : [msg.to],
      subject: msg.subject,
      text: msg.text || undefined,
      html: msg.html || undefined
    });

    if (error) {
      const err = new Error(error.message || 'Resend email failed');
      err.code = error.name;
      throw err;
    }
    return data;
  },
  // No-op for backwards compatibility with SendGrid initialization calls
  setApiKey() {}
};

export { sgMail, EMAIL_TEMPLATES, EMAIL_CONFIG };

/**
 * Send the verification email containing a one-time token
 * @param {string} toEmail - Recipient email address
 * @param {string} token - One-time verification token
 * @param {string} serialNumber - Associated product serial number
 */
export const sendVerificationEmail = async (toEmail, token, serialNumber) => {
  const subject = 'Your Crownmania verification code';
  const plainText = `Your Crownmania verification code is:\n\n${token}\n\nSerial: ${serialNumber}\n\nThis code expires in 15 minutes. If you did not request this, you can ignore this email.`;
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
      <h2>Crownmania Verification</h2>
      <p>Your verification code is:</p>
      <p style="font-size: 18px; font-weight: bold; letter-spacing: 0.08em;">${token}</p>
      <p>Serial: <strong>${serialNumber}</strong></p>
      <p>This code expires in <strong>15 minutes</strong>.</p>
      <p>If you did not request this code, please ignore this email.</p>
    </div>
  `;

  const msg = {
    to: toEmail,
    from: EMAIL_CONFIG.from,
    subject,
    text: plainText,
    html
  };

  await sgMail.send(msg);
};

/**
 * Send claim confirmation email after successful NFT claim
 * @param {string} toEmail - Recipient email address
 * @param {object} claimData - Claim details
 */
export const sendClaimConfirmationEmail = async (toEmail, claimData) => {
  const { productName, serialNumber, walletAddress, tokenId, claimDate, editionNumber } = claimData;

  const subject = `🎉 Your ${productName} NFT Has Been Claimed!`;
  const plainText = `Congratulations! Your Crownmania NFT has been successfully claimed.

Product: ${productName}
Edition: #${editionNumber || '1'} of 500
Serial Number: ${serialNumber}
Token ID: ${tokenId || 'Pending'}
Wallet: ${walletAddress}
Claimed: ${claimDate || new Date().toLocaleDateString()}

View your collectible in The Vault at https://crownmania.com

Thank you for being part of the Crownmania community!
`;

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #0a1628 0%, #1a2f4a 100%); padding: 40px; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #00ff88; font-size: 28px; margin: 0;">🎉 NFT Claimed Successfully!</h1>
      </div>
      
      <div style="background: rgba(0, 255, 136, 0.1); border: 1px solid rgba(0, 255, 136, 0.3); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <h2 style="color: #00c8ff; margin: 0 0 16px 0; font-size: 20px;">${productName}</h2>
        <p style="color: #00ff88; font-size: 14px; margin: 0;">Lil Durk: Free The Voice Series</p>
      </div>
      
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.6); font-size: 13px;">EDITION</td>
          <td style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.1); color: #00c8ff; font-size: 14px; text-align: right; font-family: monospace;">#${editionNumber || '1'} of 500</td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.6); font-size: 13px;">SERIAL NUMBER</td>
          <td style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.1); color: white; font-size: 14px; text-align: right; font-family: monospace;">${serialNumber.slice(0, 8)}...${serialNumber.slice(-8)}</td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.6); font-size: 13px;">TOKEN ID</td>
          <td style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.1); color: white; font-size: 14px; text-align: right; font-family: monospace;">${tokenId || 'NFT-' + (editionNumber || '001')}</td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.6); font-size: 13px;">WALLET</td>
          <td style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.1); color: white; font-size: 14px; text-align: right; font-family: monospace;">${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}</td>
        </tr>
        <tr>
          <td style="padding: 12px 0; color: rgba(255,255,255,0.6); font-size: 13px;">CLAIMED</td>
          <td style="padding: 12px 0; color: white; font-size: 14px; text-align: right;">${claimDate || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
        </tr>
      </table>
      
      <div style="text-align: center; margin-top: 32px;">
        <a href="https://crownmania.com" style="display: inline-block; background: linear-gradient(135deg, #00ff88, #00c8ff); color: #000; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">View in The Vault →</a>
      </div>
      
      <p style="color: rgba(255,255,255,0.5); font-size: 12px; text-align: center; margin-top: 32px;">
        This is a confirmation of your NFT claim on the Polygon blockchain.<br>
        © 2025 Crownmania. All rights reserved.
      </p>
    </div>
  `;

  const msg = {
    to: toEmail,
    from: EMAIL_CONFIG.from,
    subject,
    text: plainText,
    html
  };

  try {
    await sgMail.send(msg);
    console.log(`Claim confirmation email sent to ${toEmail}`);
  } catch (error) {
    console.error('Error sending claim confirmation email:', error);
    // Don't throw - email failure shouldn't block the claim
  }
};

/**
 * Send order confirmation email with serial claim codes (inline HTML, no template needed)
 * @param {string} toEmail - Recipient email address
 * @param {object} orderData - { orderId, items: [{name, serialNumber, claimLink}], total }
 */
export const sendOrderConfirmationEmail = async (toEmail, orderData) => {
  const { orderId, items, total } = orderData;
  const frontendUrl = process.env.FRONTEND_URL || 'https://crownmania.com';

  const subject = `Order Confirmed — ${orderId}`;
  const itemRowsText = items.map(i => `- ${i.name}${i.quantity > 1 ? ` x${i.quantity}` : ''}`).join('\n');
  const plainText = `Thank you for your Crownmania order!

Order: ${orderId}
${total ? `Total: $${total.toFixed(2)}` : ''}

Your collectibles:
${itemRowsText}

Each figure comes with a unique serial number sticker on its box. Once your figure arrives, enter that serial in The Vault to verify authenticity and claim your digital collectible.

${frontendUrl}/vault

Thank you for being part of the Crownmania community!`;

  const itemRowsHtml = items.map(i => `
    <div style="background: rgba(0, 255, 136, 0.06); border: 1px solid rgba(0, 255, 136, 0.25); border-radius: 12px; padding: 18px; margin-bottom: 12px;">
      <p style="color: #00c8ff; font-size: 15px; font-weight: 600; margin: 0;">${i.name}${i.quantity > 1 ? ` ×${i.quantity}` : ''}</p>
    </div>`).join('');

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #0a1628 0%, #1a2f4a 100%); padding: 40px; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #00ff88; font-size: 26px; margin: 0;">👑 Order Confirmed!</h1>
        <p style="color: rgba(255,255,255,0.6); font-size: 13px; margin: 8px 0 0 0;">Order ${orderId}</p>
      </div>
      ${itemRowsHtml}
      ${total ? `<p style="color: white; font-size: 15px; text-align: right; margin: 16px 0;">Total: <strong>$${total.toFixed(2)}</strong></p>` : ''}
      <p style="color: rgba(255,255,255,0.7); font-size: 13px; line-height: 1.6;">
        Your figure is being prepared for shipment. You'll receive a shipping confirmation with tracking as soon as it's on its way.
        When it arrives, find the <strong style="color: #00ff88;">unique serial number sticker on the box</strong> and enter it in The Vault to verify authenticity and claim your digital collectible.
      </p>
      <div style="text-align: center; margin-top: 28px;">
        <a href="${frontendUrl}/vault" style="display: inline-block; background: linear-gradient(135deg, #00ff88, #00c8ff); color: #000; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">Open The Vault →</a>
      </div>
      <p style="color: rgba(255,255,255,0.5); font-size: 12px; text-align: center; margin-top: 32px;">
        © ${new Date().getFullYear()} Crownmania. All rights reserved.
      </p>
    </div>`;

  await sgMail.send({ to: toEmail, from: EMAIL_CONFIG.from, subject, text: plainText, html });
};

/**
 * Build a carrier tracking URL so customers can click through instead of
 * copying the number into the carrier's site manually.
 * @param {string} carrier - Carrier name (usps, ups, fedex, dhl)
 * @param {string} trackingNumber - The tracking number
 * @returns {string|null} Tracking URL, or null if the carrier is unknown
 */
export const getTrackingUrl = (carrier, trackingNumber) => {
  if (!carrier || !trackingNumber) return null;
  const n = encodeURIComponent(trackingNumber.trim());
  switch (carrier.trim().toLowerCase()) {
    case 'usps': return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${n}`;
    case 'ups': return `https://www.ups.com/track?tracknum=${n}`;
    case 'fedex': return `https://www.fedex.com/fedextrack/?trknbr=${n}`;
    case 'dhl': return `https://www.dhl.com/en/express/tracking.html?AWB=${n}`;
    default: return null;
  }
};

/**
 * Send shipping confirmation email with tracking number
 * @param {string} toEmail - Recipient email address
 * @param {object} shipData - { orderId, trackingNumber, carrier }
 */
export const sendShippingConfirmationEmail = async (toEmail, shipData) => {
  const { orderId, trackingNumber, carrier } = shipData;
  const trackingUrl = getTrackingUrl(carrier, trackingNumber);

  const subject = `Your Crownmania order has shipped — ${orderId}`;
  const plainText = `Great news! Your Crownmania order ${orderId} is on its way.

${carrier ? `Carrier: ${carrier}` : ''}
Tracking Number: ${trackingNumber}
${trackingUrl ? `Track it here: ${trackingUrl}` : ''}

When your figure arrives, verify its serial code in The Vault to claim your digital collectible.

Thank you for being part of the Crownmania community!`;

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #0a1628 0%, #1a2f4a 100%); padding: 40px; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #00ff88; font-size: 26px; margin: 0;">📦 Your Order Has Shipped!</h1>
        <p style="color: rgba(255,255,255,0.6); font-size: 13px; margin: 8px 0 0 0;">Order ${orderId}</p>
      </div>
      <div style="background: rgba(0, 200, 255, 0.08); border: 1px solid rgba(0, 200, 255, 0.3); border-radius: 12px; padding: 20px; text-align: center;">
        ${carrier ? `<p style="color: rgba(255,255,255,0.6); font-size: 13px; margin: 0 0 6px 0;">${carrier}</p>` : ''}
        <p style="color: white; font-size: 18px; font-family: monospace; margin: 0;">${trackingNumber}</p>
      </div>
      ${trackingUrl ? `
      <div style="text-align: center; margin-top: 24px;">
        <a href="${trackingUrl}" style="display: inline-block; background: linear-gradient(135deg, #00ff88, #00c8ff); color: #000; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">Track Your Package →</a>
      </div>` : ''}
      <p style="color: rgba(255,255,255,0.7); font-size: 13px; line-height: 1.6; margin-top: 20px;">
        When your figure arrives, verify its serial code in The Vault to claim your digital collectible and unlock exclusive perks.
      </p>
      <p style="color: rgba(255,255,255,0.5); font-size: 12px; text-align: center; margin-top: 32px;">
        © ${new Date().getFullYear()} Crownmania. All rights reserved.
      </p>
    </div>`;

  await sgMail.send({ to: toEmail, from: EMAIL_CONFIG.from, subject, text: plainText, html });
};

/**
 * Escape values that originate from customer input (names, addresses) before
 * interpolating them into HTML email bodies.
 */
const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

/**
 * Notify the admin/ops email that a sale completed, with everything needed to
 * fulfil it. Sent on every successful order — failures are covered separately
 * by sendAdminAlertEmail.
 * @param {object} saleData - { orderId, customerEmail, total, items, shippingAddress, serials }
 */
export const sendNewSaleEmail = async (saleData) => {
  const adminEmail = process.env.ADMIN_ALERT_EMAIL || process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    console.warn('ADMIN_ALERT_EMAIL not configured — cannot send new sale notification');
    return;
  }

  const { orderId, customerEmail, total, items = [], shippingAddress = {}, serials = [] } = saleData;
  const amount = typeof total === 'number' ? `$${total.toFixed(2)}` : 'unknown';

  const addressLines = [
    shippingAddress.name,
    shippingAddress.line1,
    shippingAddress.line2,
    [shippingAddress.city, shippingAddress.state, shippingAddress.postal_code].filter(Boolean).join(', '),
    shippingAddress.country
  ].filter(Boolean);

  const itemLines = items.map(i => `${i.name}${i.quantity > 1 ? ` x${i.quantity}` : ''}`);

  const subject = `New sale — ${amount} — ${orderId}`;
  const plainText = `You made a sale.

Order:    ${orderId}
Amount:   ${amount}
Customer: ${customerEmail || 'unknown'}

Items:
${itemLines.map(l => `- ${l}`).join('\n')}

Ship to:
${addressLines.join('\n')}

Internal serial(s) allocated: ${serials.join(', ') || 'none'}
(The customer claims using the sticker on their box, not this serial.)

When shipped, run:
node scripts/markShipped.js ${orderId} <trackingNumber> <carrier>

Time: ${new Date().toISOString()}`;

  const html = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #0a1628 0%, #1a2f4a 100%); padding: 40px; border-radius: 16px;">
      <div style="text-align: center; margin-bottom: 26px;">
        <h1 style="color: #00ff88; font-size: 26px; margin: 0;">💰 New Sale — ${escapeHtml(amount)}</h1>
        <p style="color: rgba(255,255,255,0.6); font-size: 13px; margin: 8px 0 0 0;">${escapeHtml(orderId)}</p>
      </div>
      <table style="width: 100%; border-collapse: collapse; color: white; font-size: 14px;">
        <tr><td style="padding: 8px 0; color: rgba(255,255,255,0.6);">Customer</td><td style="padding: 8px 0; text-align: right;">${escapeHtml(customerEmail || 'unknown')}</td></tr>
        <tr><td style="padding: 8px 0; color: rgba(255,255,255,0.6);">Items</td><td style="padding: 8px 0; text-align: right;">${itemLines.map(escapeHtml).join('<br>')}</td></tr>
      </table>
      <div style="background: rgba(0, 200, 255, 0.08); border: 1px solid rgba(0, 200, 255, 0.3); border-radius: 12px; padding: 18px; margin-top: 20px;">
        <p style="color: rgba(255,255,255,0.6); font-size: 12px; margin: 0 0 8px 0;">SHIP TO</p>
        <p style="color: white; font-size: 14px; margin: 0; line-height: 1.6;">${addressLines.map(escapeHtml).join('<br>')}</p>
      </div>
      <p style="color: rgba(255,255,255,0.5); font-size: 12px; line-height: 1.6; margin-top: 20px;">
        Internal serial(s): <span style="font-family: monospace;">${escapeHtml(serials.join(', ') || 'none')}</span><br>
        The customer claims using the sticker on their box, not this serial.
      </p>
      <p style="color: rgba(255,255,255,0.7); font-size: 12px; margin-top: 18px;">When shipped, run:</p>
      <pre style="background: rgba(0,0,0,0.35); color: #00ff88; font-size: 12px; padding: 12px; border-radius: 8px; white-space: pre-wrap; word-break: break-all;">node scripts/markShipped.js ${escapeHtml(orderId)} &lt;trackingNumber&gt; &lt;carrier&gt;</pre>
    </div>`;

  try {
    await sgMail.send({ to: adminEmail, from: EMAIL_CONFIG.from, subject, text: plainText, html });
  } catch (error) {
    console.error('Failed to send new sale notification:', error);
  }
};

/**
 * Send an operational alert to the admin/ops email.
 * Used for fulfillment failures, disputes, and other events needing human attention.
 * @param {string} subject - Alert subject line
 * @param {object|string} details - Details to include in the body
 */
export const sendAdminAlertEmail = async (subject, details) => {
  const adminEmail = process.env.ADMIN_ALERT_EMAIL || process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    console.warn('ADMIN_ALERT_EMAIL not configured — cannot send admin alert:', subject);
    return;
  }

  const detailText = typeof details === 'string' ? details : JSON.stringify(details, null, 2);

  try {
    await sgMail.send({
      to: adminEmail,
      from: EMAIL_CONFIG.from,
      subject: `[CROWNMANIA ALERT] ${subject}`,
      text: `Operational alert:\n\n${detailText}\n\nTime: ${new Date().toISOString()}`,
      html: `<div style="font-family: monospace; white-space: pre-wrap;"><h3>⚠️ ${subject}</h3><pre>${detailText}</pre><p>Time: ${new Date().toISOString()}</p></div>`
    });
  } catch (error) {
    console.error('Failed to send admin alert email:', error);
  }
};
