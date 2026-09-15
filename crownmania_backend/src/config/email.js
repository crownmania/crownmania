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
 * Brand tokens mirroring the site's Royal Blue Vault palette
 * (see crownmania_frontend/src/styles/GlobalStyles.jsx).
 *
 * All colours are hex on purpose. Gmail's mobile clients discard `rgba()`
 * values in `color:`, which silently rendered muted text as near-black on the
 * dark background — legible nowhere.
 */
const BRAND = {
  logoUrl: 'https://firebasestorage.googleapis.com/v0/b/sonorous-crane-440603-s6.firebasestorage.app/o/images%2Fcrownmania_logo_white.png?alt=media',
  bgOuter: '#000000',
  bgPanel: '#00050f',
  bgCard: '#081023',
  accent: '#4169E1',
  accentBright: '#6B8DD6',
  success: '#34C759',
  text: '#FFFFFF',
  textMuted: '#AEB9CC',
  textFaint: '#78849B',
  border: '#1E2F56'
};

const siteUrl = () => process.env.FRONTEND_URL || 'https://crownmania.com';

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
 * Wrap body content in the shared Crownmania email shell: logo, wordmark,
 * title and footer. Table-based so Outlook renders it, and the wordmark is
 * live text so the header still reads when images are blocked (which is the
 * default in many clients).
 *
 * @param {object} opts - { preheader, title, subtitle, bodyHtml }
 */
const renderEmailShell = ({ preheader = '', title, subtitle = '', bodyHtml }) => `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${escapeHtml(title)}</title>
</head>
<body style="margin:0; padding:0; background-color:${BRAND.bgOuter};">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BRAND.bgOuter}; padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%; max-width:600px; background-color:${BRAND.bgPanel}; border:1px solid ${BRAND.border}; border-radius:16px; overflow:hidden;">
          <tr>
            <td align="center" style="padding:32px 32px 8px 32px;">
              <img src="${BRAND.logoUrl}" width="62" height="80" alt="Crownmania"
                   style="display:block; width:62px; height:auto; border:0; outline:none; text-decoration:none;">
              <div style="margin-top:14px; font-family:'Arial Black',Arial,Helvetica,sans-serif; font-size:22px; font-weight:900; letter-spacing:0.26em; color:${BRAND.text}; text-transform:uppercase;">
                Crownmania
              </div>
              <div style="margin-top:6px; height:2px; width:64px; background-color:${BRAND.accent};"></div>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:22px 32px 0 32px;">
              <h1 style="margin:0; font-family:Arial,Helvetica,sans-serif; font-size:21px; font-weight:700; color:${BRAND.text};">${escapeHtml(title)}</h1>
              ${subtitle ? `<p style="margin:8px 0 0 0; font-family:Arial,Helvetica,sans-serif; font-size:13px; color:${BRAND.textMuted};">${escapeHtml(subtitle)}</p>` : ''}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px 32px 32px; font-family:Arial,Helvetica,sans-serif;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:0 32px 30px 32px;">
              <div style="height:1px; background-color:${BRAND.border}; margin-bottom:18px;"></div>
              <p style="margin:0; font-family:Arial,Helvetica,sans-serif; font-size:11px; line-height:1.7; color:${BRAND.textFaint};">
                <a href="${siteUrl()}" style="color:${BRAND.accentBright}; text-decoration:none;">crownmania.com</a><br>
                &copy; ${new Date().getFullYear()} Crownmania. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

/**
 * Primary call-to-action button, built with a table so Outlook honours it.
 */
const ctaButton = (href, label) => `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:26px auto 0 auto;">
    <tr>
      <td align="center" bgcolor="${BRAND.accent}" style="border-radius:8px;">
        <a href="${href}" style="display:inline-block; padding:14px 34px; font-family:Arial,Helvetica,sans-serif; font-size:14px; font-weight:700; color:#FFFFFF; text-decoration:none; border-radius:8px;">${escapeHtml(label)}</a>
      </td>
    </tr>
  </table>`;

/**
 * Card used to highlight a block of content (items, addresses, tracking).
 */
const infoCard = (innerHtml) => `
  <div style="background-color:${BRAND.bgCard}; border:1px solid ${BRAND.border}; border-radius:12px; padding:18px;">
    ${innerHtml}
  </div>`;

/**
 * Label/value row for detail tables.
 */
const detailRow = (label, value, opts = {}) => `
  <tr>
    <td style="padding:10px 0; border-bottom:1px solid ${BRAND.border}; font-family:Arial,Helvetica,sans-serif; font-size:12px; color:${BRAND.textMuted}; text-transform:uppercase; letter-spacing:0.06em;">${escapeHtml(label)}</td>
    <td style="padding:10px 0; border-bottom:1px solid ${BRAND.border}; font-family:${opts.mono ? "'Courier New',monospace" : 'Arial,Helvetica,sans-serif'}; font-size:13px; color:${opts.accent ? BRAND.accentBright : BRAND.text}; text-align:right;">${escapeHtml(value)}</td>
  </tr>`;

/**
 * Send the verification email containing a one-time token
 * @param {string} toEmail - Recipient email address
 * @param {string} token - One-time verification token
 * @param {string} serialNumber - Associated product serial number
 */
export const sendVerificationEmail = async (toEmail, token, serialNumber) => {
  const subject = 'Your Crownmania verification code';
  const plainText = `Your Crownmania verification code is:\n\n${token}\n\nSerial: ${serialNumber}\n\nThis code expires in 15 minutes. If you did not request this, you can ignore this email.`;
  const bodyHtml = `
    <p style="margin:0; font-family:Arial,Helvetica,sans-serif; font-size:14px; line-height:1.7; color:${BRAND.textMuted};">
      Enter this code to verify your collectible:
    </p>
    ${infoCard(`
      <p style="margin:0; text-align:center; font-family:'Courier New',monospace; font-size:30px; font-weight:700; letter-spacing:0.22em; color:${BRAND.text};">${escapeHtml(token)}</p>`)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:22px;">
      ${detailRow('Serial', serialNumber, { mono: true })}
      ${detailRow('Expires in', '15 minutes')}
    </table>
    <p style="margin:22px 0 0 0; font-family:Arial,Helvetica,sans-serif; font-size:12px; line-height:1.7; color:${BRAND.textFaint};">
      If you did not request this code, you can safely ignore this email.
    </p>`;

  const html = renderEmailShell({
    preheader: `Your Crownmania verification code is ${token}.`,
    title: 'Verification Code',
    bodyHtml
  });

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

  const bodyHtml = `
    ${infoCard(`
      <p style="margin:0; font-family:Arial,Helvetica,sans-serif; font-size:18px; font-weight:700; color:${BRAND.text};">${escapeHtml(productName)}</p>
      <p style="margin:6px 0 0 0; font-family:Arial,Helvetica,sans-serif; font-size:13px; color:${BRAND.accentBright};">Lil Durk: Free The Voice Series</p>`)}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:22px;">
      ${detailRow('Edition', `#${editionNumber || '1'} of 500`, { mono: true, accent: true })}
      ${detailRow('Serial number', `${serialNumber.slice(0, 8)}...${serialNumber.slice(-8)}`, { mono: true })}
      ${detailRow('Token ID', tokenId || `NFT-${editionNumber || '001'}`, { mono: true })}
      ${detailRow('Wallet', `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`, { mono: true })}
      ${detailRow('Claimed', claimDate || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }))}
    </table>

    ${ctaButton(`${siteUrl()}/vault`, 'View in The Vault')}

    <p style="margin:26px 0 0 0; font-family:Arial,Helvetica,sans-serif; font-size:11px; line-height:1.7; text-align:center; color:${BRAND.textFaint};">
      This confirms your NFT claim on the Polygon blockchain.
    </p>`;

  const html = renderEmailShell({
    preheader: `${productName} claimed — edition #${editionNumber || '1'}.`,
    title: 'NFT Claimed Successfully',
    subtitle: productName,
    bodyHtml
  });

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
    <tr>
      <td style="padding:10px 0; border-bottom:1px solid ${BRAND.border}; font-family:Arial,Helvetica,sans-serif; font-size:14px; color:${BRAND.text};">${escapeHtml(i.name)}</td>
      <td style="padding:10px 0; border-bottom:1px solid ${BRAND.border}; font-family:Arial,Helvetica,sans-serif; font-size:14px; color:${BRAND.textMuted}; text-align:right;">${i.quantity > 1 ? `&times;${escapeHtml(i.quantity)}` : '&times;1'}</td>
    </tr>`).join('');

  const bodyHtml = `
    ${infoCard(`
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        ${itemRowsHtml}
        ${total ? `
        <tr>
          <td style="padding:14px 0 0 0; font-family:Arial,Helvetica,sans-serif; font-size:14px; font-weight:700; color:${BRAND.text};">Total</td>
          <td style="padding:14px 0 0 0; font-family:Arial,Helvetica,sans-serif; font-size:16px; font-weight:700; color:${BRAND.accentBright}; text-align:right;">$${total.toFixed(2)}</td>
        </tr>` : ''}
      </table>`)}

    <p style="margin:22px 0 0 0; font-family:Arial,Helvetica,sans-serif; font-size:14px; line-height:1.7; color:${BRAND.textMuted};">
      Your figure is being prepared for shipment. You'll receive a shipping confirmation with tracking as soon as it's on its way.
    </p>
    <p style="margin:14px 0 0 0; font-family:Arial,Helvetica,sans-serif; font-size:14px; line-height:1.7; color:${BRAND.textMuted};">
      When it arrives, find the <strong style="color:${BRAND.text};">unique serial number sticker on the box</strong> and enter it in The Vault to verify authenticity and claim your digital collectible.
    </p>
    ${ctaButton(`${frontendUrl}/vault`, 'Open The Vault')}`;

  const html = renderEmailShell({
    preheader: `Order ${orderId} confirmed — your figure is being prepared for shipment.`,
    title: 'Order Confirmed',
    subtitle: `Order ${orderId}`,
    bodyHtml
  });

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

  const bodyHtml = `
    ${infoCard(`
      <div style="text-align:center;">
        ${carrier ? `<p style="margin:0 0 8px 0; font-family:Arial,Helvetica,sans-serif; font-size:12px; letter-spacing:0.08em; text-transform:uppercase; color:${BRAND.textMuted};">${escapeHtml(carrier)}</p>` : ''}
        <p style="margin:0; font-family:'Courier New',monospace; font-size:19px; color:${BRAND.text}; word-break:break-all;">${escapeHtml(trackingNumber)}</p>
      </div>`)}
    ${trackingUrl ? ctaButton(trackingUrl, 'Track Your Package') : ''}
    <p style="margin:24px 0 0 0; font-family:Arial,Helvetica,sans-serif; font-size:14px; line-height:1.7; color:${BRAND.textMuted};">
      When your figure arrives, find the <strong style="color:${BRAND.text};">serial number sticker on the box</strong> and enter it in The Vault to claim your digital collectible and unlock exclusive perks.
    </p>
    ${ctaButton(`${siteUrl()}/vault`, 'Open The Vault')}`;

  const html = renderEmailShell({
    preheader: `Order ${orderId} has shipped — tracking ${trackingNumber}.`,
    title: 'Your Order Has Shipped',
    subtitle: `Order ${orderId}`,
    bodyHtml
  });

  await sgMail.send({ to: toEmail, from: EMAIL_CONFIG.from, subject, text: plainText, html });
};

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

  const bodyHtml = `
    <div style="text-align:center; margin:0 0 22px 0;">
      <span style="display:inline-block; padding:8px 18px; background-color:${BRAND.bgCard}; border:1px solid ${BRAND.accent}; border-radius:999px; font-family:Arial,Helvetica,sans-serif; font-size:22px; font-weight:700; color:${BRAND.success};">${escapeHtml(amount)}</span>
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      ${detailRow('Customer', customerEmail || 'unknown')}
      ${detailRow('Items', itemLines.join(', ') || 'none')}
    </table>

    <div style="margin-top:22px;">
      ${infoCard(`
        <p style="margin:0 0 10px 0; font-family:Arial,Helvetica,sans-serif; font-size:11px; letter-spacing:0.1em; text-transform:uppercase; color:${BRAND.accentBright};">Ship to</p>
        <p style="margin:0; font-family:Arial,Helvetica,sans-serif; font-size:14px; line-height:1.7; color:${BRAND.text};">${addressLines.map(escapeHtml).join('<br>')}</p>`)}
    </div>

    <p style="margin:22px 0 0 0; font-family:Arial,Helvetica,sans-serif; font-size:12px; line-height:1.7; color:${BRAND.textFaint};">
      Internal serial(s): <span style="font-family:'Courier New',monospace; color:${BRAND.textMuted};">${escapeHtml(serials.join(', ') || 'none')}</span><br>
      The customer claims using the sticker on their box, not this serial.
    </p>

    <p style="margin:20px 0 8px 0; font-family:Arial,Helvetica,sans-serif; font-size:12px; color:${BRAND.textMuted};">When shipped, run:</p>
    <div style="background-color:#000000; border:1px solid ${BRAND.border}; border-radius:8px; padding:12px;">
      <code style="font-family:'Courier New',monospace; font-size:12px; color:${BRAND.accentBright}; word-break:break-all;">node scripts/markShipped.js ${escapeHtml(orderId)} &lt;trackingNumber&gt; &lt;carrier&gt;</code>
    </div>`;

  const html = renderEmailShell({
    preheader: `New sale ${amount} — ${orderId}`,
    title: 'New Sale',
    subtitle: `${orderId}`,
    bodyHtml
  });

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
