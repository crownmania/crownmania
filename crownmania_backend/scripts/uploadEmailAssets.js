/**
 * Upload email branding assets to Firebase Storage so transactional emails can
 * reference stable public URLs (same bucket + URL scheme as crownmania_logo_white.png).
 *
 *   images/email-wordmark.png  — rendered from email-assets/wordmark-render.html
 *                                (regenerate with headless Chrome after font changes)
 *   fonts/Designer.otf         — copied from the frontend so @font-face works in
 *                                mail clients that support web fonts (bucket CORS is *).
 *
 * Usage: node scripts/uploadEmailAssets.js
 */
import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import { adminStorage, firebaseReady } from '../src/config/firebase.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const ASSETS = [
  {
    local: path.join(root, 'email-assets/crownmania-wordmark.png'),
    // Versioned filename — mail image proxies (Gmail) cache aggressively, so
    // never overwrite a URL emails already reference; bump the version instead.
    dest: 'images/email-wordmark-v6.png',
    contentType: 'image/png'
  },
  {
    local: path.join(root, '../crownmania_frontend/public/fonts/Designer.otf'),
    dest: 'fonts/Designer.otf',
    contentType: 'font/otf'
  },
  {
    // 1×1 black PNG used as a tiled background-image — Gmail's dark-mode
    // inversion rewrites background-color but cannot alter image pixels,
    // so this guarantees the email background stays black everywhere.
    local: path.join(root, 'email-assets/black-1x1.png'),
    dest: 'images/email-black-v2.png',
    contentType: 'image/png'
  },
  {
    // 1×1 #0B0F16 — infoCard surface, locked against Gmail's inversion
    local: path.join(root, 'email-assets/card-1x1.png'),
    dest: 'images/email-card-v1.png',
    contentType: 'image/png'
  },
  {
    // 1×1 #E9ECF4 — CTA button surface, locked against Gmail's inversion
    local: path.join(root, 'email-assets/btn-1x1.png'),
    dest: 'images/email-btn-v1.png',
    contentType: 'image/png'
  }
  // Titles/button labels are rendered + uploaded by renderEmailTitleImages.js
];

const publicUrl = (bucketName, dest) =>
  `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(dest)}?alt=media`;

if (!firebaseReady) {
  console.error('Firebase is not configured — check serviceAccountKey.json / FIREBASE_STORAGE_BUCKET');
  process.exit(1);
}

const bucket = adminStorage.bucket();
if (!bucket) {
  console.error('FIREBASE_STORAGE_BUCKET is not set');
  process.exit(1);
}

for (const asset of ASSETS) {
  const [file] = await bucket.upload(asset.local, {
    destination: asset.dest,
    metadata: {
      contentType: asset.contentType,
      cacheControl: 'public, max-age=31536000, immutable'
    }
  });
  try { await file.makePublic(); } catch { /* bucket-level public access already covers it */ }
  console.log(`${asset.dest}\n  ${publicUrl(bucket.name, asset.dest)}`);
}

process.exit(0);
