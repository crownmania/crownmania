/**
 * Reconcile claimCodes against collectibles.
 *
 * Historic mints created collectibles without marking the matching claim
 * code as claimed, leaving those serials claimable again (double-mints).
 * This script marks the claim code for every already-minted serial as
 * claimed so it cannot be claimed twice.
 *
 * Usage:
 *   node scripts/reconcileClaimCodes.js --dry-run   # show plan only
 *   node scripts/reconcileClaimCodes.js --apply     # write changes
 */

import { db } from '../src/config/firebase.js';

const APPLY = process.argv.includes('--apply');
const DRY_RUN = !APPLY;

const run = async () => {
  const col = await db.collection('collectibles').get();

  // Only records that represent a real minted token: serial + owner + token id
  const minted = col.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(r => r.serialNumber && r.ownerId && r.blockchainTokenId !== undefined && r.blockchainTokenId !== null);

  // Earliest mint per serial wins claimedBy (duplicates are reported, not merged)
  const earliest = {};
  minted.forEach(r => {
    const s = r.serialNumber.toLowerCase();
    const t = r.createdAt?.toDate?.()?.getTime() || 0;
    if (!earliest[s] || t < (earliest[s].createdAt?.toDate?.()?.getTime() || 0)) earliest[s] = r;
  });

  const toMark = [];
  const alreadyClaimed = [];
  const missingCode = [];
  const duplicates = [];

  const serialCounts = {};
  minted.forEach(r => {
    const s = r.serialNumber.toLowerCase();
    serialCounts[s] = (serialCounts[s] || 0) + 1;
  });
  Object.entries(serialCounts).filter(([, n]) => n > 1).forEach(([s, n]) => duplicates.push({ serial: s, count: n }));

  for (const [serial, r] of Object.entries(earliest)) {
    const doc = await db.collection('claimCodes').doc(serial).get();
    if (!doc.exists) { missingCode.push(serial); continue; }
    if (doc.data().claimed) { alreadyClaimed.push(serial); continue; }
    toMark.push({ serial, owner: r.ownerId, blockchainTokenId: r.blockchainTokenId, tokenId: r.tokenId, claimedAt: r.createdAt });
  }

  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'APPLY'}`);
  console.log(`Minted collectibles: ${minted.length} (${Object.keys(earliest).length} distinct serials)`);
  console.log(`To mark claimed: ${toMark.length} | already claimed: ${alreadyClaimed.length} | missing claim code: ${missingCode.length}`);
  console.log(`Duplicate serials (multiple tokens minted): ${duplicates.length}`);
  duplicates.forEach(d => console.log(`  dup ${d.serial.slice(0, 16)}… x${d.count}`));
  if (missingCode.length) missingCode.forEach(s => console.log(`  MISSING claimCode for serial ${s}`));

  if (DRY_RUN) {
    toMark.forEach(m => console.log(`  would mark ${m.serial.slice(0, 16)}… → ${m.owner.slice(0, 10)}… btid:${m.blockchainTokenId}`));
    console.log('Run with --apply to write changes.');
    process.exit(0);
  }

  const batch = db.batch();
  toMark.forEach(m => {
    batch.update(db.collection('claimCodes').doc(m.serial), {
      claimed: true,
      claimedBy: m.owner.toLowerCase(),
      claimedAt: m.claimedAt || new Date(),
      blockchainTokenId: String(m.blockchainTokenId),
      tokenId: m.tokenId || String(m.blockchainTokenId),
      reconciledAt: new Date(),
      reconciledBy: 'reconcileClaimCodes.js',
    });
  });
  await batch.commit();
  console.log(`Marked ${toMark.length} claim codes as claimed.`);
  process.exit(0);
};

run().catch(err => { console.error(err); process.exit(1); });
