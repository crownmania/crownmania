/**
 * DIAGNOSTIC EMAIL — not a real template. One labeled strip per background /
 * text-color technique so we can see what actually survives Gmail's dark-mode
 * inversion on a real device. Reply with a screenshot and we keep the winners.
 */
import 'dotenv/config';
import { sgMail, EMAIL_CONFIG, resolveAdminEmail } from '../src/config/email.js';

const to = process.argv[2] || resolveAdminEmail();
const PX = 'https://firebasestorage.googleapis.com/v0/b/sonorous-crane-440603-s6.firebasestorage.app/o/images%2Femail-black-v2.png?alt=media';
const WM = 'https://firebasestorage.googleapis.com/v0/b/sonorous-crane-440603-s6.firebasestorage.app/o/images%2Femail-wordmark-v4.png?alt=media';
const L = 'font-family:Courier New,monospace;font-size:12px;letter-spacing:0.08em;color:#9A9A9A;'; // label text — readable either way
const W = 'font-family:Arial;font-size:14px;color:#FFFFFF;';
const B = 'font-family:Arial;font-size:14px;color:#111111;';

const row = (label, inner) => `<tr><td style="padding:2px 0;">${inner}<div style="${L}padding:4px 2px 10px 2px;">${label}</div></td></tr>`;

const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark">
<style>
  [data-ogsb].px { background-color:#000 !important; }
  [data-ogsc].tw { color:#fff !important; -webkit-text-fill-color:#fff !important; }
</style></head>
<body style="margin:0;padding:10px;">
<p style="${W}">BACKGROUND TECHNIQUES (white text each)</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
${row('A — bgcolor attr', `<div style="padding:14px;${W}" bgcolor="#000000" class="x">abc</div><table width="100%" bgcolor="#000000"><tr><td style="padding:14px;${W}">stripe</td></tr></table>`)}
${row('B — inline background-color', `<div style="padding:14px;background-color:#000000;${W}">stripe</div>`)}
${row('C — background attr (img) on td', `<table width="100%"><tr><td background="${PX}" style="padding:14px;${W}">stripe</td></tr></table>`)}
${row('D — inline background-image', `<div style="padding:14px;background-image:url('${PX}');background-color:#000;${W}">stripe</div>`)}
${row('E — td background-image', `<table width="100%"><tr><td style="padding:14px;background:#000 url('${PX}') repeat;${W}">stripe</td></tr></table>`)}
${row('F — data-ogsb class on bg', `<div class="px" style="padding:14px;background-color:#000;${W}">stripe</div>`)}
${row('G — black img control', `<img src="${PX}" width="600" height="34" style="display:block;width:100%;height:34px;" alt="black">`)}
${row('H — wordmark transparent', `<div style="padding:8px;background-color:#000;"><img src="${WM}" width="200" style="display:block;width:200px;" alt="CROWNMANIA"></div>`)}
</table>
<p style="${W}margin-top:18px;">TEXT TECHNIQUES on bgcolor-black cells</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
${row('I — inline color', `<table width="100%" bgcolor="#000000"><tr><td style="padding:14px;${W}">inline white text</td></tr></table>`)}
${row('J — webkit-text-fill', `<table width="100%" bgcolor="#000000"><tr><td style="padding:14px;${W}-webkit-text-fill-color:#FFFFFF;">webkit fill white text</td></tr></table>`)}
${row('K — ogsc class text', `<table width="100%" bgcolor="#000000"><tr><td class="tw" style="padding:14px;${W}">ogsc class white text</td></tr></table>`)}
${row('L — dark text control', `<table width="100%" bgcolor="#000000"><tr><td style="padding:14px;${B}">dark text control</td></tr></table>`)}
</table>
</body></html>`;

const r = await sgMail.send({ to, from: EMAIL_CONFIG.from, subject: 'PROBE — Gmail inversion test', text: 'diagnostic', html });
console.log('sent', r?.id);
process.exit(0);
