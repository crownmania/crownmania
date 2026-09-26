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
  wordmarkUrl: 'https://firebasestorage.googleapis.com/v0/b/sonorous-crane-440603-s6.firebasestorage.app/o/images%2Femail-wordmark-v6.png?alt=media',
  // Same file the site ships; the bucket's CORS is *, which lets Apple Mail's
  // @font-face fetch succeed. Clients without web-font support (Gmail, Outlook)
  // fall back to Arial Black Italic — same bold slanted-caps silhouette.
  designerFontUrl: 'https://firebasestorage.googleapis.com/v0/b/sonorous-crane-440603-s6.firebasestorage.app/o/fonts%2FDesigner.otf?alt=media',
  // 1×1 black pixel tiled as background-image. Gmail's dark-mode inversion
  // rewrites background-COLOR but cannot alter image pixels — this is what
  // actually guarantees the email stays black on a phone.
  blackPixelUrl: 'https://firebasestorage.googleapis.com/v0/b/sonorous-crane-440603-s6.firebasestorage.app/o/images%2Femail-black-v2.png?alt=media',
  // 1×1 pixels for the card and button surfaces — same trick as blackPixelUrl:
  // Gmail dark-mode rewrites CSS colours but can't alter image pixels, so any
  // surface that must keep its exact colour gets a matching tiled PNG.
  cardPixelUrl: 'https://firebasestorage.googleapis.com/v0/b/sonorous-crane-440603-s6.firebasestorage.app/o/images%2Femail-card-v1.png?alt=media',
  btnPixelUrl: 'https://firebasestorage.googleapis.com/v0/b/sonorous-crane-440603-s6.firebasestorage.app/o/images%2Femail-btn-v1.png?alt=media',
  bgOuter: '#000000',
  bgPanel: '#000000',
  bgCard: '#0B0F16',
  accent: '#4169E1',
  accentBright: '#6B8DD6',
  success: '#34C759',
  // Gmail iOS dark-mode inverts EVERY authored text colour — pure white comes
  // back near-black. Mid-silver sits at the inversion midpoint, so it renders
  // ~the same readable grey whether the client inverts or not. Anything that
  // must be literal white (wordmark, titles, button labels) ships as an image.
  text: '#B4BBC7',
  textMuted: '#99A2B0',
  textFaint: '#7C8492',
  tagline: '#9A9A9A', // rgba(255,255,255,0.6) composited on black — hex so Gmail mobile keeps it
  btnBg: '#E9ECF4',
  border: '#1B2740'
};

/**
 * Headings + CTA labels rendered to transparent PNGs by
 * scripts/renderEmailTitleImages.js — the only way to get literal white text
 * (and the real Designer font) inside Gmail iOS, which rewrites all CSS colours.
 * { url, w, h } — w/h are CSS px; the PNGs are 3x. Fallback is styled text.
 */
const TITLE_IMAGES = {
  'Order Confirmed': { url: 'https://firebasestorage.googleapis.com/v0/b/sonorous-crane-440603-s6.firebasestorage.app/o/images%2Femail-titles%2Forder-confirmed-v1.png?alt=media', w: 449, h: 150 },
  'Your Order Has Shipped': { url: 'https://firebasestorage.googleapis.com/v0/b/sonorous-crane-440603-s6.firebasestorage.app/o/images%2Femail-titles%2Fyour-order-has-shipped-v1.png?alt=media', w: 591, h: 150 },
  'NFT Claimed Successfully': { url: 'https://firebasestorage.googleapis.com/v0/b/sonorous-crane-440603-s6.firebasestorage.app/o/images%2Femail-titles%2Fnft-claimed-successfully-v1.png?alt=media', w: 619, h: 150 },
  'Verify Your Email': { url: 'https://firebasestorage.googleapis.com/v0/b/sonorous-crane-440603-s6.firebasestorage.app/o/images%2Femail-titles%2Fverify-your-email-v1.png?alt=media', w: 469, h: 150 },
  'Verify Your Claim': { url: 'https://firebasestorage.googleapis.com/v0/b/sonorous-crane-440603-s6.firebasestorage.app/o/images%2Femail-titles%2Fverify-your-claim-v1.png?alt=media', w: 467, h: 150 },
  'Track Your Order': { url: 'https://firebasestorage.googleapis.com/v0/b/sonorous-crane-440603-s6.firebasestorage.app/o/images%2Femail-titles%2Ftrack-your-order-v1.png?alt=media', w: 470, h: 150 },
  'New Content Drop': { url: 'https://firebasestorage.googleapis.com/v0/b/sonorous-crane-440603-s6.firebasestorage.app/o/images%2Femail-titles%2Fnew-content-drop-v1.png?alt=media', w: 478, h: 150 },
  'Message Received': { url: 'https://firebasestorage.googleapis.com/v0/b/sonorous-crane-440603-s6.firebasestorage.app/o/images%2Femail-titles%2Fmessage-received-v1.png?alt=media', w: 466, h: 150 },
  'New Contact Submission': { url: 'https://firebasestorage.googleapis.com/v0/b/sonorous-crane-440603-s6.firebasestorage.app/o/images%2Femail-titles%2Fnew-contact-submission-v1.png?alt=media', w: 594, h: 150 },
  'Admin Login': { url: 'https://firebasestorage.googleapis.com/v0/b/sonorous-crane-440603-s6.firebasestorage.app/o/images%2Femail-titles%2Fadmin-login-v1.png?alt=media', w: 350, h: 150 },
  'New Sale': { url: 'https://firebasestorage.googleapis.com/v0/b/sonorous-crane-440603-s6.firebasestorage.app/o/images%2Femail-titles%2Fnew-sale-v1.png?alt=media', w: 303, h: 150 },
  'Operational Alert': { url: 'https://firebasestorage.googleapis.com/v0/b/sonorous-crane-440603-s6.firebasestorage.app/o/images%2Femail-titles%2Foperational-alert-v1.png?alt=media', w: 485, h: 150 },
  'Wallet Connection Attempt': { url: 'https://firebasestorage.googleapis.com/v0/b/sonorous-crane-440603-s6.firebasestorage.app/o/images%2Femail-titles%2Fwallet-connection-attempt-v1.png?alt=media', w: 656, h: 150 },
  'Valid Serial Checked': { url: 'https://firebasestorage.googleapis.com/v0/b/sonorous-crane-440603-s6.firebasestorage.app/o/images%2Femail-titles%2Fvalid-serial-checked-v1.png?alt=media', w: 524, h: 150 },
  'Invalid Serial Attempt': { url: 'https://firebasestorage.googleapis.com/v0/b/sonorous-crane-440603-s6.firebasestorage.app/o/images%2Femail-titles%2Finvalid-serial-attempt-v1.png?alt=media', w: 563, h: 150 },
  'Collectible Claimed': { url: 'https://firebasestorage.googleapis.com/v0/b/sonorous-crane-440603-s6.firebasestorage.app/o/images%2Femail-titles%2Fcollectible-claimed-v1.png?alt=media', w: 506, h: 150 },
  'Claim Failed': { url: 'https://firebasestorage.googleapis.com/v0/b/sonorous-crane-440603-s6.firebasestorage.app/o/images%2Femail-titles%2Fclaim-failed-v1.png?alt=media', w: 359, h: 150 }
};

const LABEL_IMAGES = {
  'Open The Vault': { url: 'https://firebasestorage.googleapis.com/v0/b/sonorous-crane-440603-s6.firebasestorage.app/o/images%2Femail-labels%2Fopen-the-vault-v1.png?alt=media', w: 154, h: 38 },
  'View in The Vault': { url: 'https://firebasestorage.googleapis.com/v0/b/sonorous-crane-440603-s6.firebasestorage.app/o/images%2Femail-labels%2Fview-in-the-vault-v1.png?alt=media', w: 171, h: 38 },
  'Track Your Package': { url: 'https://firebasestorage.googleapis.com/v0/b/sonorous-crane-440603-s6.firebasestorage.app/o/images%2Femail-labels%2Ftrack-your-package-v1.png?alt=media', w: 204, h: 38 }
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
const titleBlock = (title) => {
  const img = TITLE_IMAGES[title];
  if (img) {
    // Cap long titles at the usable content width so they never overflow
    const w = Math.min(img.w, 480);
    const h = Math.round(img.h * (w / img.w));
    return `<img src="${img.url}" width="${w}" height="${h}" alt="${escapeHtml(title)}"
      style="display:block; width:${w}px; height:auto; border:0; outline:none; text-decoration:none; font-family:'Arial Black',Arial,sans-serif; font-size:18px; font-style:italic; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:${BRAND.text};">`;
  }
  return `<h1 class="cm-w" style="margin:0; font-family:'Designer','Arial Black',Arial,sans-serif; font-size:22px; font-weight:700; font-style:italic; letter-spacing:0.15em; text-transform:uppercase; color:${BRAND.text}; text-shadow:0 0 10px rgba(255,255,255,0.4), 0 0 30px rgba(255,255,255,0.15);">${escapeHtml(title)}</h1>`;
};

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
  /* Gmail/Outlook mobile dark theme forcibly inverts email colours and stashes
     the originals on data-ogsc (colour) / data-ogsb (background) / data-ogbc
     (border). These rules re-assert the Crownmania palette on tagged elements
     so the inversion still renders black-on-black as designed. */
  /* -webkit-text-fill-color is NOT in Gmail's inversion map, and in WebKit
     clients (iOS Gmail, Apple Mail) it wins over color — belt for the
     data-ogsc suspenders. */
  .cm-w,     [data-ogsc].cm-w     { color:#B4BBC7 !important; -webkit-text-fill-color:#B4BBC7 !important; }
  .cm-mut,   [data-ogsc].cm-mut   { color:#99A2B0 !important; -webkit-text-fill-color:#99A2B0 !important; }
  .cm-faint, [data-ogsc].cm-faint { color:#7C8492 !important; -webkit-text-fill-color:#7C8492 !important; }
  .cm-acc,   [data-ogsc].cm-acc   { color:#6B8DD6 !important; -webkit-text-fill-color:#6B8DD6 !important; }
  .cm-tag,   [data-ogsc].cm-tag   { color:#9A9A9A !important; -webkit-text-fill-color:#9A9A9A !important; }
  .cm-ok,    [data-ogsc].cm-ok    { color:#34C759 !important; -webkit-text-fill-color:#34C759 !important; }
  .cm-body,  [data-ogsb].cm-body  { background-color:#000000 !important; }
  .cm-card,  [data-ogsb].cm-card  { background-color:#0B0F16 !important; }
  .cm-btn,   [data-ogsb].cm-btn   { background-color:#E9ECF4 !important; }
  .cm-div,   [data-ogsb].cm-div   { background-color:#1B2740 !important; }
  .cm-brd,   [data-ogbc].cm-brd   { border-color:#1B2740 !important; }
  .cm-brd-acc, [data-ogbc].cm-brd-acc { border-color:#4169E1 !important; }
</style>
</head>
<body class="cm-body" bgcolor="#000000" style="margin:0; padding:0; background-color:${BRAND.bgOuter};">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0;">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#000000" background="${BRAND.blackPixelUrl}" class="cm-body" style="background-color:${BRAND.bgOuter}; background-image:url('${BRAND.blackPixelUrl}'); padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#000000" background="${BRAND.blackPixelUrl}" class="cm-body cm-brd" style="width:100%; max-width:600px; background-color:${BRAND.bgPanel}; background-image:url('${BRAND.blackPixelUrl}'); border:1px solid ${BRAND.border}; border-radius:16px; overflow:hidden;">
          <tr>
            <td align="center" bgcolor="#000000" background="${BRAND.blackPixelUrl}" class="cm-body" style="padding:34px 32px 26px 32px; background-color:${BRAND.bgPanel}; background-image:radial-gradient(ellipse at center 0%, rgba(65,105,225,0.14), rgba(0,0,0,0) 70%), url('${BRAND.blackPixelUrl}');">
              <a href="${siteUrl()}" style="text-decoration:none;">
                <!-- Wordmark + crown + tagline rendered from the real Designer
                     font (email-assets/wordmark-render.html) — image pixels
                     can't be color-inverted, so the lockup survives every client -->
                <img src="${BRAND.wordmarkUrl}" width="300" height="118" alt="CROWNMANIA — Revolutionizing Collectibles, Connecting The World" class="cm-w"
                     style="display:block; width:300px; height:auto; border:0; outline:none; text-decoration:none; font-family:'Arial Black',Arial,sans-serif; font-size:16px; font-style:italic; letter-spacing:0.15em; color:${BRAND.text};">
              </a>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:22px 32px 0 32px;">
              ${titleBlock(title)}
              ${subtitle ? `<p class="cm-mut" style="margin:6px 0 0 0; font-family:Arial,Helvetica,sans-serif; font-size:13px; color:${BRAND.textMuted};">${escapeHtml(subtitle)}</p>` : ''}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px 32px 32px; font-family:Arial,Helvetica,sans-serif;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:0 32px 30px 32px;">
              <div class="cm-div" style="height:1px; background-color:${BRAND.border}; margin-bottom:18px;"></div>
              <p class="cm-faint" style="margin:0; font-family:Arial,Helvetica,sans-serif; font-size:11px; line-height:1.7; color:${BRAND.textFaint};">
                <a href="${siteUrl()}" class="cm-acc" style="color:${BRAND.accentBright}; text-decoration:none;">crownmania.com</a><br>
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
const ctaButton = (href, label) => {
  const img = LABEL_IMAGES[label];
  const inner = img
    ? `<img src="${img.url}" width="${img.w}" height="${img.h}" alt="${escapeHtml(label)}"
        style="display:block; width:${img.w}px; max-width:100%; height:auto; border:0; outline:none; text-decoration:none; font-family:Arial,Helvetica,sans-serif; font-size:14px; font-weight:700; color:#14171F;">`
    : escapeHtml(label);
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:26px auto 0 auto;">
    <tr>
      <td align="center" bgcolor="${BRAND.btnBg}" background="${BRAND.btnPixelUrl}" class="cm-btn" style="background-color:${BRAND.btnBg}; background-image:url('${BRAND.btnPixelUrl}'); border-radius:8px;">
        <a href="${href}" style="display:inline-block; padding:13px 30px; font-family:Arial,Helvetica,sans-serif; font-size:14px; font-weight:700; color:#14171F; text-decoration:none; border-radius:8px;">${inner}</a>
      </td>
    </tr>
  </table>`;
};

/**
 * Card used to highlight a block of content (items, addresses, tracking).
 */
const infoCard = (innerHtml) => `
  <div class="cm-card cm-brd" style="background-color:${BRAND.bgCard}; background-image:url('${BRAND.cardPixelUrl}'); border:1px solid ${BRAND.border}; border-radius:12px; padding:18px;">
    ${innerHtml}
  </div>`;

/**
 * Label/value row for detail tables.
 */
const detailRow = (label, value, opts = {}) => `
  <tr>
    <td class="cm-mut cm-brd" style="padding:10px 0; border-bottom:1px solid ${BRAND.border}; font-family:Arial,Helvetica,sans-serif; font-size:12px; color:${BRAND.textMuted}; text-transform:uppercase; letter-spacing:0.06em;">${escapeHtml(label)}</td>
    <td class="${opts.accent ? 'cm-acc' : 'cm-w'} cm-brd" style="padding:10px 0; border-bottom:1px solid ${BRAND.border}; font-family:${opts.mono ? "'Courier New',monospace" : 'Arial,Helvetica,sans-serif'}; font-size:13px; color:${opts.accent ? BRAND.accentBright : BRAND.text}; text-align:right;">${escapeHtml(value)}</td>
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
    <p class="cm-mut" style="margin:0; font-family:Arial,Helvetica,sans-serif; font-size:14px; line-height:1.7; color:${BRAND.textMuted}; text-align:center;">
      Your verification code is:
    </p>
    ${infoCard(`
      <p class="cm-w" style="margin:0; text-align:center; font-family:'Courier New',monospace; font-size:32px; font-weight:700; letter-spacing:0.22em; color:${BRAND.text};">${escapeHtml(code)}</p>`)}
    ${detailRows || expiryLabel ? `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:22px;">
      ${detailRows}
      ${expiryLabel ? detailRow('Expires in', expiryLabel) : ''}
    </table>` : ''}
    <p class="cm-faint" style="margin:22px 0 0 0; font-family:Arial,Helvetica,sans-serif; font-size:12px; line-height:1.7; color:${BRAND.textFaint}; text-align:center;">
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
 * Contact form emails — admin notification + customer auto-reply.
 * Rendered here so all email markup stays in one place.
 */
export const renderContactAdminEmail = ({ name, email, message }) => renderEmailShell({
  preheader: `Contact form: ${name}`,
  title: 'New Contact Submission',
  subtitle: 'Via crownmania.com contact form',
  bodyHtml: `
    ${infoCard(`
      <p class="cm-mut" style="margin:0; font-family:Arial,Helvetica,sans-serif; font-size:14px; line-height:1.7; color:#99A2B0; white-space:pre-wrap;">${escapeHtml(message)}</p>`)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:22px;">
      <tr>
        <td class="cm-mut cm-brd" style="padding:10px 0; border-bottom:1px solid #1B2740; font-family:Arial,Helvetica,sans-serif; font-size:12px; color:#99A2B0; text-transform:uppercase; letter-spacing:0.06em;">Name</td>
        <td class="cm-w cm-brd" style="padding:10px 0; border-bottom:1px solid #1B2740; font-family:Arial,Helvetica,sans-serif; font-size:13px; color:#B4BBC7; text-align:right;">${escapeHtml(name)}</td>
      </tr>
      <tr>
        <td class="cm-mut cm-brd" style="padding:10px 0; border-bottom:1px solid #1B2740; font-family:Arial,Helvetica,sans-serif; font-size:12px; color:#99A2B0; text-transform:uppercase; letter-spacing:0.06em;">Reply to</td>
        <td class="cm-brd" style="padding:10px 0; border-bottom:1px solid #1B2740; font-family:Arial,Helvetica,sans-serif; font-size:13px; text-align:right;"><a href="mailto:${escapeHtml(email)}" class="cm-acc" style="color:#6B8DD6; text-decoration:none;">${escapeHtml(email)}</a></td>
      </tr>
      <tr>
        <td class="cm-mut" style="padding:10px 0; font-family:Arial,Helvetica,sans-serif; font-size:12px; color:#99A2B0; text-transform:uppercase; letter-spacing:0.06em;">Received</td>
        <td class="cm-w" style="padding:10px 0; font-family:Arial,Helvetica,sans-serif; font-size:13px; color:#B4BBC7; text-align:right;">${new Date().toUTCString()}</td>
      </tr>
    </table>`
});

export const renderContactAutoReply = ({ name }) => renderEmailShell({
  preheader: 'We received your message',
  title: 'Message Received',
  subtitle: "We'll get back to you soon",
  bodyHtml: `
    ${infoCard(`
      <p class="cm-mut" style="margin:0; font-family:Arial,Helvetica,sans-serif; font-size:14px; line-height:1.8; color:#99A2B0;">
        Hi <span class="cm-w" style="color:#B4BBC7; font-weight:700;">${escapeHtml(name)}</span>,<br><br>
        Thanks for reaching out to us. We've received your message and will respond within 1–2 business days.
      </p>`)}`
});

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
      <p class="cm-w" style="margin:0; font-family:Arial,Helvetica,sans-serif; font-size:18px; font-weight:700; color:${BRAND.text};">${escapeHtml(productName)}</p>
      <p class="cm-acc" style="margin:6px 0 0 0; font-family:Arial,Helvetica,sans-serif; font-size:13px; color:${BRAND.accentBright};">Lil Durk: Free The Voice Series</p>`)}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:22px;">
      ${detailRow('Edition', `#${editionNumber || '1'} of 500`, { mono: true, accent: true })}
      ${detailRow('Serial number', `${serialNumber.slice(0, 8)}...${serialNumber.slice(-8)}`, { mono: true })}
      ${detailRow('Token ID', tokenId || `NFT-${editionNumber || '001'}`, { mono: true })}
      ${detailRow('Wallet', `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`, { mono: true })}
      ${detailRow('Claimed', claimDate || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }))}
    </table>

    ${ctaButton(`${siteUrl()}/vault`, 'View in The Vault')}

    <p class="cm-faint" style="margin:26px 0 0 0; font-family:Arial,Helvetica,sans-serif; font-size:11px; line-height:1.7; text-align:center; color:${BRAND.textFaint};">
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
      <td class="cm-w cm-brd" style="padding:10px 0; border-bottom:1px solid ${BRAND.border}; font-family:Arial,Helvetica,sans-serif; font-size:14px; color:${BRAND.text};">${escapeHtml(i.name)}</td>
      <td class="cm-mut cm-brd" style="padding:10px 0; border-bottom:1px solid ${BRAND.border}; font-family:Arial,Helvetica,sans-serif; font-size:14px; color:${BRAND.textMuted}; text-align:right;">${i.quantity > 1 ? `&times;${escapeHtml(i.quantity)}` : '&times;1'}</td>
    </tr>`).join('');

  const bodyHtml = `
    ${infoCard(`
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        ${itemRowsHtml}
        ${total ? `
        <tr>
          <td class="cm-w" style="padding:14px 0 0 0; font-family:Arial,Helvetica,sans-serif; font-size:14px; font-weight:700; color:${BRAND.text};">Total</td>
          <td class="cm-acc" style="padding:14px 0 0 0; font-family:Arial,Helvetica,sans-serif; font-size:16px; font-weight:700; color:${BRAND.accentBright}; text-align:right;">$${total.toFixed(2)}</td>
        </tr>` : ''}
      </table>`)}

    <p class="cm-mut" style="margin:22px 0 0 0; font-family:Arial,Helvetica,sans-serif; font-size:14px; line-height:1.7; color:${BRAND.textMuted};">
      Your figure is being prepared for shipment. You'll receive a shipping confirmation with tracking as soon as it's on its way.
    </p>
    <p class="cm-mut" style="margin:14px 0 0 0; font-family:Arial,Helvetica,sans-serif; font-size:14px; line-height:1.7; color:${BRAND.textMuted};">
      When it arrives, find the <strong class="cm-w" style="color:${BRAND.text};">unique serial number sticker on the box</strong> and enter it in The Vault to verify authenticity and claim your digital collectible.
    </p>
    ${ctaButton(`${frontendUrl}/vault`, 'Open The Vault')}`;

  const html = renderEmailShell({
    preheader: `Order ${orderId} confirmed — your figure is being prepared for shipment.`,
    title: 'Order Confirmed',
    subtitle: `Order ${orderId}`,
    bodyHtml
  });

  return sgMail.send({ to: toEmail, from: EMAIL_CONFIG.from, subject, text: plainText, html });
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
        ${carrier ? `<p class="cm-mut" style="margin:0 0 8px 0; font-family:Arial,Helvetica,sans-serif; font-size:12px; letter-spacing:0.08em; text-transform:uppercase; color:${BRAND.textMuted};">${escapeHtml(carrier)}</p>` : ''}
        <p class="cm-w" style="margin:0; font-family:'Courier New',monospace; font-size:19px; color:${BRAND.text}; word-break:break-all;">${escapeHtml(trackingNumber)}</p>
      </div>`)}
    ${trackingUrl ? ctaButton(trackingUrl, 'Track Your Package') : ''}
    <p class="cm-mut" style="margin:24px 0 0 0; font-family:Arial,Helvetica,sans-serif; font-size:14px; line-height:1.7; color:${BRAND.textMuted};">
      When your figure arrives, find the <strong class="cm-w" style="color:${BRAND.text};">serial number sticker on the box</strong> and enter it in The Vault to claim your digital collectible and unlock exclusive perks.
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
      <span class="cm-card cm-brd-acc cm-ok" style="display:inline-block; padding:8px 18px; background-color:${BRAND.bgCard}; border:1px solid ${BRAND.accent}; border-radius:999px; font-family:Arial,Helvetica,sans-serif; font-size:22px; font-weight:700; color:${BRAND.success};">${escapeHtml(amount)}</span>
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      ${detailRow('Customer', customerEmail || 'unknown')}
      ${detailRow('Items', itemLines.join(', ') || 'none')}
    </table>

    <div style="margin-top:22px;">
      ${infoCard(`
        <p class="cm-acc" style="margin:0 0 10px 0; font-family:Arial,Helvetica,sans-serif; font-size:11px; letter-spacing:0.1em; text-transform:uppercase; color:${BRAND.accentBright};">Ship to</p>
        <p class="cm-w" style="margin:0; font-family:Arial,Helvetica,sans-serif; font-size:14px; line-height:1.7; color:${BRAND.text};">${addressLines.map(escapeHtml).join('<br>')}</p>`)}
    </div>

    <p class="cm-faint" style="margin:22px 0 0 0; font-family:Arial,Helvetica,sans-serif; font-size:12px; line-height:1.7; color:${BRAND.textFaint};">
      Internal serial(s): <span class="cm-mut" style="font-family:'Courier New',monospace; color:${BRAND.textMuted};">${escapeHtml(serials.join(', ') || 'none')}</span><br>
      The customer claims using the sticker on their box, not this serial.
    </p>

    <p class="cm-mut" style="margin:20px 0 8px 0; font-family:Arial,Helvetica,sans-serif; font-size:12px; color:${BRAND.textMuted};">When shipped, run:</p>
    <div class="cm-body cm-brd" style="background-color:#000000; border:1px solid ${BRAND.border}; border-radius:8px; padding:12px;">
      <code class="cm-acc" style="font-family:'Courier New',monospace; font-size:12px; color:${BRAND.accentBright}; word-break:break-all;">node scripts/markShipped.js ${escapeHtml(orderId)} &lt;trackingNumber&gt; &lt;carrier&gt;</code>
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
      <pre class="cm-mut" style="margin:0; font-family:'Courier New',monospace; font-size:12px; line-height:1.6; color:${BRAND.textMuted}; white-space:pre-wrap; word-break:break-word;">${escapeHtml(detailText)}</pre>`)
      + `<p class="cm-faint" style="margin:18px 0 0 0; font-family:Arial,Helvetica,sans-serif; font-size:11px; color:${BRAND.textFaint}; text-align:center;">${new Date().toISOString()}</p>`
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
