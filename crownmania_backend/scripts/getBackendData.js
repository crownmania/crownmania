import '../src/env.js';
import { db } from '../src/config/firebase.js';

async function getBackendData() {
  console.log('=== Backend Data Snapshot ===\n');

  const claimCodesSnapshot = await db.collection('claimCodes').get();
  const totalClaimCodes = claimCodesSnapshot.size;
  const claimedCodes = claimCodesSnapshot.docs.filter(doc => doc.data().claimed).length;
  console.log(`Claim codes: ${totalClaimCodes} total, ${claimedCodes} claimed, ${totalClaimCodes - claimedCodes} unclaimed`);

  const recentClaimed = claimCodesSnapshot.docs
    .filter(doc => doc.data().claimed)
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .sort((a, b) => {
      const aTime = a.claimedAt?.toDate ? a.claimedAt.toDate().getTime() : 0;
      const bTime = b.claimedAt?.toDate ? b.claimedAt.toDate().getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, 10);

  console.log('\nRecent claimed codes:');
  if (recentClaimed.length === 0) {
    console.log('  None');
  } else {
    for (const c of recentClaimed) {
      const claimedAt = c.claimedAt?.toDate ? c.claimedAt.toDate().toISOString() : 'unknown';
      console.log(`  - serial: ${c.id}, product: ${c.productId || 'n/a'}, edition: ${c.edition || 'n/a'}, wallet: ${c.claimedBy || 'n/a'}, at: ${claimedAt}`);
    }
  }

  const collectiblesSnapshot = await db.collection('collectibles').get();
  console.log(`\nCollectibles: ${collectiblesSnapshot.size} records`);

  const recentCollectibles = collectiblesSnapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .sort((a, b) => {
      const aTime = a.claimedAt?.toDate ? a.claimedAt.toDate().getTime() : 0;
      const bTime = b.claimedAt?.toDate ? b.claimedAt.toDate().getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, 10);

  console.log('\nRecent collectibles:');
  if (recentCollectibles.length === 0) {
    console.log('  None');
  } else {
    for (const c of recentCollectibles) {
      const claimedAt = c.claimedAt?.toDate ? c.claimedAt.toDate().toISOString() : 'unknown';
      console.log(`  - ${c.productName || c.productId || c.id}: serial ${c.serialNumber || 'n/a'}, edition ${c.edition || 'n/a'}, wallet ${c.walletAddress || c.claimedBy || 'n/a'}, at ${claimedAt}`);
    }
  }

  const countersSnapshot = await db.collection('counters').get();
  console.log('\nCounters:');
  if (countersSnapshot.empty) {
    console.log('  None');
  } else {
    for (const doc of countersSnapshot.docs) {
      const data = doc.data();
      console.log(`  - ${doc.id}: currentEdition ${data.currentEdition || 0} of ${data.totalEditions || 'n/a'}`);
    }
  }

  process.exit(0);
}

getBackendData().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
