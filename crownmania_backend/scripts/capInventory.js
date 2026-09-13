import 'dotenv/config';
import { db } from '../src/config/firebase.js';

/**
 * Caps sellable inventory by keeping only KEEP_AVAILABLE serials
 * with status 'available' and marking the rest as 'reserved'.
 * Reserved serials are NOT deleted and can be released later.
 *
 * Usage: node scripts/capInventory.js [count]
 */
const KEEP_AVAILABLE = parseInt(process.argv[2], 10) || 370;

const snapshot = await db.collection('inventory')
  .where('productId', '==', 'lil-durk-figure')
  .where('status', '==', 'available')
  .get();

console.log(`Available serials: ${snapshot.size}`);
console.log(`Keeping available: ${KEEP_AVAILABLE}`);

const toReserve = snapshot.docs.slice(KEEP_AVAILABLE);
console.log(`Marking as reserved: ${toReserve.length}`);

if (toReserve.length === 0) {
  console.log('Nothing to do.');
  process.exit(0);
}

let processed = 0;
// Firestore batch limit is 500 writes
for (let i = 0; i < toReserve.length; i += 500) {
  const batch = db.batch();
  for (const doc of toReserve.slice(i, i + 500)) {
    batch.update(doc.ref, {
      status: 'reserved',
      reservedReason: 'inventory-cap',
      reservedAt: new Date()
    });
  }
  await batch.commit();
  processed += Math.min(500, toReserve.length - i);
  console.log(`Progress: ${processed}/${toReserve.length}`);
}

const remaining = await db.collection('inventory')
  .where('productId', '==', 'lil-durk-figure')
  .where('status', '==', 'available')
  .count().get();

console.log(`✅ Done. Sellable inventory is now: ${remaining.data().count}`);
process.exit(0);
