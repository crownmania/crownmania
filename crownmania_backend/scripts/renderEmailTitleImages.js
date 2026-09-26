/**
 * Renders every static email heading + button label as a transparent PNG via
 * headless Chrome (real Designer font / glow for titles; dark Arial for button
 * labels on the light button). Image pixels can't be color-inverted, so these
 * strings stay crisp white/dark even in Gmail iOS dark mode.
 *
 * Usage: node scripts/renderEmailTitleImages.js
 * Prints the JS maps to paste into BRAND in src/config/email.js.
 */
import 'dotenv/config';
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { adminStorage, firebaseReady } from '../src/config/firebase.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const OUT = path.join(root, 'email-assets/generated');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const RENDER = `file://${path.join(root, 'email-assets/title-render.html')}`;

// title text -> shell title key (exact match against renderEmailShell callers)
const TITLES = [
  'Order Confirmed', 'Your Order Has Shipped', 'NFT Claimed Successfully',
  'Verify Your Email', 'Verify Your Claim', 'Track Your Order',
  'New Content Drop', 'Message Received', 'New Contact Submission',
  'Admin Login', 'New Sale', 'Operational Alert',
  'Wallet Connection Attempt', 'Valid Serial Checked', 'Invalid Serial Attempt',
  'Collectible Claimed', 'Claim Failed'
];
// CTA labels — rendered dark, they sit on the light button pixel
const LABELS = ['Open The Vault', 'View in The Vault', 'Track Your Package'];

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const run = (args) => execFileSync(CHROME, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });

const measure = (qs) => {
  const dom = run(['--headless=new', '--disable-gpu', '--virtual-time-budget=4000', '--dump-dom', `${RENDER}?${qs}&measure=1`]);
  const m = dom.match(/id="m">(\d+)x(\d+)/);
  if (!m) throw new Error(`measure failed for ${qs}`);
  return { w: +m[1], h: +m[2] };
};

const shot = (qs, w, h, file) => run([
  '--headless=new', '--disable-gpu', '--force-device-scale-factor=3',
  '--default-background-color=00000000', '--window-size=' + w + 'x' + h,
  '--screenshot=' + file, `${RENDER}?${qs}`
]);

fs.mkdirSync(OUT, { recursive: true });

const jobs = [
  ...TITLES.map((t) => ({ s: t, qs: `text=${encodeURIComponent(t)}&size=24&pad=60`, dir: 'titles', pad: 60 })),
  ...LABELS.map((t) => ({ s: t, qs: `text=${encodeURIComponent(t)}&size=14&color=${encodeURIComponent('#14171F')}&plain=1&pad=10`, dir: 'labels', pad: 10 }))
];

const maps = { titles: {}, labels: {} };
for (const j of jobs) {
  const { w, h } = measure(j.qs);
  const pad = j.pad; // italic glyphs + glow overhang the layout box — generous margin
  const file = path.join(OUT, `${j.dir}-${slug(j.s)}.png`);
  shot(j.qs, w + pad * 2, h + pad * 2, file);
  j.file = file; j.w = w + pad * 2; j.h = h + pad * 2;
  console.log(`rendered ${j.s} -> ${j.w}x${j.h} css px`);
}

if (!firebaseReady) { console.error('Firebase not configured'); process.exit(1); }
const bucket = adminStorage.bucket();
const url = (dest) => `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(dest)}?alt=media`;

for (const j of jobs) {
  const dest = `images/email-${j.dir}/${slug(j.s)}-v1.png`;
  const [f] = await bucket.upload(j.file, { destination: dest, metadata: { contentType: 'image/png', cacheControl: 'public, max-age=31536000, immutable' } });
  try { await f.makePublic(); } catch { /* bucket public */ }
  maps[j.dir === 'titles' ? 'titles' : 'labels'][j.s] = { url: url(dest), w: j.w, h: j.h };
  console.log(`uploaded ${dest}`);
}

console.log('\nTITLE_IMAGES =');
console.log(JSON.stringify(maps.titles, null, 2));
console.log('\nLABEL_IMAGES =');
console.log(JSON.stringify(maps.labels, null, 2));
process.exit(0);
