import { Resend } from 'resend';

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

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

export { sgMail, EMAIL_CONFIG };

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
  // Rendered from email-assets/wordmark-render.html via scripts/uploadEmailAssets.js —
  // the real Designer font + hero glow, so the wordmark matches the site exactly.
  wordmarkUrl: 'https://firebasestorage.googleapis.com/v0/b/sonorous-crane-440603-s6.firebasestorage.app/o/images%2Femail-wordmark.png?alt=media',
  // Same file the site ships; the bucket's CORS is *, which lets Apple Mail's
  // @font-face fetch succeed. Clients without web-font support (Gmail, Outlook)
  // fall back to Arial Black Italic — same bold slanted-caps silhouette.
  designerFontUrl: 'https://firebasestorage.googleapis.com/v0/b/sonorous-crane-440603-s6.firebasestorage.app/o/fonts%2FDesigner.otf?alt=media',
  bgOuter: '#000000',
  bgPanel: '#000000',
  bgCard: '#0B0F16',
  accent: '#4169E1',
  accentBright: '#6B8DD6',
  success: '#34C759',
  text: '#FFFFFF',
  textMuted: '#C7CEDA',
  textFaint: '#8A94A6',
  tagline: '#9A9A9A', // rgba(255,255,255,0.6) composited on black — hex so Gmail mobile keeps it
  border: '#1B2740'
};

const siteUrl = () => process.env.FRONTEND_URL || 'https://crownmania.com';

/**
 * Single source of truth for the ops inbox.
 *
 * Three different env var names accumulated across services
 * (ADMIN_ALERT_EMAIL, ADMIN_EMAIL, ADMIN_NOTIFICATION_EMAIL) and only
 * ADMIN_ALERT_EMAIL is actually set in production — the rest silently fell
 * back to hardcoded literals that differed per file, including one pointing at
 * admin@crownmania.com. Resolve all three here so every notification lands in
 * the same inbox regardless of which var is configured.
 */
export const resolveAdminEmail = () =>
  process.env.ADMIN_ALERT_EMAIL
  || process.env.ADMIN_EMAIL
  || process.env.ADMIN_NOTIFICATION_EMAIL
  || 'crown@crownmania.com';

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
 * Wrap body content in the shared Crownmania email shell. The header mirrors
 * the site hero (Landing.jsx): glowing CROWNMANIA wordmark, tagline, crown.
 * The wordmark is an image rendered from the real Designer font so it looks
 * identical in every client — including Gmail and Outlook, which strip
 * @font-face; the crown below it doubles as the images-off brand cue.
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
<style>
  /* Same Designer face the site ships; declared as the italic face so clients
     don't synthesize a second slant on top of its naturally oblique glyphs.
     Ignored by Gmail/Outlook, honoured by Apple Mail. */
  @font-face {
    font-family: 'Designer';
    font-style: italic;
    src: url('${BRAND.designerFontUrl}') format('opentype');
  }
</style>
</head>
<body style="margin:0; padding:0; background-color:${BRAND.bgOuter};">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BRAND.bgOuter}; padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%; max-width:600px; background-color:${BRAND.bgPanel}; border:1px solid ${BRAND.border}; border-radius:16px; overflow:hidden;">
          <tr>
            <td align="center" style="padding:34px 32px 26px 32px; background-color:${BRAND.bgPanel}; background:radial-gradient(ellipse at center 0%, rgba(65,105,225,0.14), rgba(0,0,0,0) 70%);">
              <a href="${siteUrl()}" style="text-decoration:none;">
                <img src="${BRAND.wordmarkUrl}" width="300" height="98" alt="CROWNMANIA"
                     style="display:block; width:300px; height:auto; border:0; outline:none; text-decoration:none; font-family:'Arial Black',Arial,sans-serif; font-size:16px; font-style:italic; letter-spacing:0.15em; color:${BRAND.text};">
              </a>
              <div style="margin-top:2px; font-family:Arial,Helvetica,sans-serif; font-size:8px; letter-spacing:0.3em; text-transform:uppercase; color:${BRAND.tagline};">
                Revolutionizing Collectibles, Connecting The World
              </div>
              <img src="${BRAND.logoUrl}" width="38" height="49" alt=""
                   style="display:block; margin:16px auto 0 auto; width:38px; height:auto; border:0; outline:none; text-decoration:none;">
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:24px 32px 0 32px;">
              <h1 style="margin:0; font-family:'Designer','Arial Black',Arial,sans-serif; font-size:22px; font-weight:700; font-style:italic; letter-spacing:0.15em; text-transform:uppercase; color:${BRAND.text}; text-shadow:0 0 10px rgba(255,255,255,0.4), 0 0 30px rgba(255,255,255,0.15);">${escapeHtml(title)}</h1>
              ${subtitle ? `<p style="margin:10px 0 0 0; font-family:Arial,Helvetica,sans-serif; font-size:13px; color:${BRAND.textMuted};">${escapeHtml(subtitle)}</p>` : ''}
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
 * Shared branding primitives, exported so every service that sends mail
 * renders the same shell instead of hand-rolling its own markup.
 */
export { BRAND, renderEmailShell, ctaButton, infoCard, detailRow, escapeHtml };

/**
 * Shared renderer for one-time-code emails (admin login, wallet 2FA,
 * collectible verification) so every code email looks identical.
 *
 * @param {object} opts - { title, subtitle, code, expiryLabel, rows, note }
 * @returns {{html: string, text: string}}
 */
export const renderCodeEmail = ({ title, subtitle = '', code, expiryLabel, rows = {}, note = '' }) => {
  const detailRows = Object.entries(rows)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => detailRow(k, String(v), { mono: /wallet|serial|code|id/i.test(k) }))
    .join('');

  const bodyHtml = `
    <p style="margin:0; font-family:Arial,Helvetica,sans-serif; font-size:14px; line-height:1.7; color:${BRAND.textMuted}; text-align:center;">
      Your verification code is:
    </p>
    ${infoCard(`
      <p style="margin:0; text-align:center; font-family:'Courier New',monospace; font-size:32px; font-weight:700; letter-spacing:0.22em; color:${BRAND.text};">${escapeHtml(code)}</p>`)}
    ${detailRows || expiryLabel ? `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:22px;">
      ${detailRows}
      ${expiryLabel ? detailRow('Expires in', expiryLabel) : ''}
    </table>` : ''}
    <p style="margin:22px 0 0 0; font-family:Arial,Helvetica,sans-serif; font-size:12px; line-height:1.7; color:${BRAND.textFaint}; text-align:center;">
      ${escapeHtml(note || 'If you did not request this code, you can safely ignore this email.')}
    </p>`;

  const text = [
    title,
    '',
    `Your verification code is: ${code}`,
    ...Object.entries(rows).map(([k, v]) => `${k}: ${v}`),
    expiryLabel ? `Expires in: ${expiryLabel}` : '',
    '',
    note || 'If you did not request this code, you can safely ignore this email.'
  ].filter(Boolean).join('\n');

  return { html: renderEmailShell({ preheader: `Your code: ${code}`, title, subtitle, bodyHtml }), text };
};

/**
 * Convenience wrapper for the common "notify ops with a table of details"
 * email. Values are escaped; keys are rendered as labels.
 *
 * @param {object} opts - { subject, title, subtitle, rows, bodyHtml, preheader }
 */
export const sendBrandedAdminEmail = async ({ subject, title, subtitle = '', rows = {}, bodyHtml = '', preheader = '' }) => {
  const adminEmail = resolveAdminEmail();
  const detailRows = Object.entries(rows)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => detailRow(k, String(v), { mono: /wallet|serial|code|id|ip/i.test(k) }))
    .join('');

  const html = renderEmailShell({
    preheader: preheader || subtitle || title,
    title,
    subtitle,
    bodyHtml: `
      ${bodyHtml}
      ${detailRows ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${detailRows}</table>` : ''}`
  });

  const plainText = `${title}\n\n${Object.entries(rows)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n')}`;

  await sgMail.send({ to: adminEmail, from: EMAIL_CONFIG.from, subject, text: plainText, html });
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
Serial Number: ${serialNumber.slice(0, 8)}...${serialNumber.slice(-8)}
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
  const adminEmail = resolveAdminEmail();
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
  const adminEmail = resolveAdminEmail();
  const detailText = typeof details === 'string' ? details : JSON.stringify(details, null, 2);

  const html = renderEmailShell({
    preheader: `Operational alert: ${subject}`,
    title: 'Operational Alert',
    subtitle: subject,
    bodyHtml: infoCard(`
      <pre style="margin:0; font-family:'Courier New',monospace; font-size:12px; line-height:1.6; color:${BRAND.textMuted}; white-space:pre-wrap; word-break:break-word;">${escapeHtml(detailText)}</pre>`)
      + `<p style="margin:18px 0 0 0; font-family:Arial,Helvetica,sans-serif; font-size:11px; color:${BRAND.textFaint}; text-align:center;">${new Date().toISOString()}</p>`
  });

  try {
    await sgMail.send({
      to: adminEmail,
      from: EMAIL_CONFIG.from,
      subject: `[CROWNMANIA ALERT] ${subject}`,
      text: `Operational alert:\n\n${detailText}\n\nTime: ${new Date().toISOString()}`,
      html
    });
  } catch (error) {
    console.error('Failed to send admin alert email:', error);
  }
};
