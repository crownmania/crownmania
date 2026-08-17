/**
 * Crownmania Seed Test Claim Codes Script
 * 
 * Generates sample action figure claim codes and ensures the product configuration
 * exists in Firestore for Lil Durk Series 01 ("Free The Voice").
 * 
 * Usage: node scripts/seedTestClaimCodes.js
 */

import { db } from '../src/config/firebase.js';

const PRODUCT_ID = 'lil-durk-figure';

const TEST_CODES = [
  '12345678901234567890123456789012',
  'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6',
  'feefee11223344556677889900aabbcc',
  '00000000000000000000000000000001',
  '00000000000000000000000000000002',
  '00000000000000000000000000000003'
];

async function seedTestClaimCodes() {
  console.log('🚀 Initializing CrownMania Action Figure Test Seed...');

  // 1. Ensure Product exists in Firestore
  const productRef = db.collection('products').doc(PRODUCT_ID);
  const productDoc = await productRef.get();

  if (!productDoc.exists) {
    await productRef.set({
      name: 'Lil Durk 10-inch Resin Figure',
      type: 1,
      series: 'FREE THE VOICE',
      totalEditions: 500,
      description: 'The Lil Durk 10-inch Resin Figure is a premium physical action figure cryptographically paired with an ERC-721 Digital Twin NFT on Polygon.',
      imageUrl: 'https://storage.googleapis.com/sonorous-crane-440603-s6.appspot.com/products/lil-durk-figure/front.jpg',
      images: [
        'https://storage.googleapis.com/sonorous-crane-440603-s6.appspot.com/products/lil-durk-figure/front.jpg',
        'https://storage.googleapis.com/sonorous-crane-440603-s6.appspot.com/products/lil-durk-figure/body.jpg'
      ],
      modelUrl: '/models/durk.glb',
      createdAt: new Date(),
      active: true
    });
    console.log('✅ Created Lil Durk Figure product in products collection.');
  } else {
    console.log('ℹ️  Product record already exists.');
  }

  // 2. Ensure Counter doc exists
  const counterRef = db.collection('counters').doc(PRODUCT_ID);
  const counterDoc = await counterRef.get();
  if (!counterDoc.exists) {
    await counterRef.set({
      currentEdition: 0,
      totalEditions: 500
    });
    console.log('✅ Initialized counters doc for edition tracking.');
  }

  // 3. Seed test claim codes
  const batch = db.batch();
  let addedCount = 0;

  for (const code of TEST_CODES) {
    const claimCodeRef = db.collection('claimCodes').doc(code.toLowerCase());
    const docSnap = await claimCodeRef.get();

    if (!docSnap.exists) {
      batch.set(claimCodeRef, {
        productId: PRODUCT_ID,
        claimed: false,
        claimedBy: null,
        claimedAt: null,
        tokenId: null,
        createdAt: new Date()
      });
      addedCount++;
    }
  }

  if (addedCount > 0) {
    await batch.commit();
    console.log(`✅ Seeded ${addedCount} test claim codes.`);
  } else {
    console.log('ℹ️  Test claim codes already exist.');
  }

  console.log('\n📱 TEST CODES FOR VERIFICATION / SCANNING:');
  TEST_CODES.forEach(code => {
    console.log(`  - Serial Code: ${code}`);
    console.log(`  - Direct URL:  http://localhost:5173/verify/${code}`);
  });

  process.exit(0);
}

seedTestClaimCodes().catch(err => {
  console.error('❌ Seed script failed:', err);
  process.exit(1);
});
