/**
 * CROWNMANIA SYSTEM RESET SCRIPT
 * ================================
 * This script wipes the Firestore database for a clean slate:
 * - Resets all claim codes to unclaimed
 * - Deletes all collectibles records  
 * - Resets edition counters to 0
 * 
 * IMPORTANT: This does NOT affect the blockchain - NFTs already minted remain on Polygon.
 * For a true clean slate, you would need to deploy a new contract.
 * 
 * Usage: node scripts/resetSystem.js [--confirm]
 * 
 * @author Crownmania Development
 */

import '../src/env.js';
import { db } from '../src/config/firebase.js';
import readline from 'readline';

const BATCH_SIZE = 500;

// Collections to reset
const COLLECTIONS = {
  claimCodes: 'claimCodes',
  collectibles: 'collectibles',
  counters: 'counters',
  verificationTokens: 'verificationTokens'
};

/**
 * Delete all documents in a collection in batches
 */
async function deleteCollection(collectionName) {
  const collectionRef = db.collection(collectionName);
  const snapshot = await collectionRef.limit(BATCH_SIZE).get();
  
  if (snapshot.empty) {
    console.log(`  ✓ ${collectionName}: Already empty`);
    return 0;
  }

  let totalDeleted = 0;
  let batch = db.batch();
  let count = 0;

  for (const doc of snapshot.docs) {
    batch.delete(doc.ref);
    count++;
    
    if (count >= BATCH_SIZE) {
      await batch.commit();
      totalDeleted += count;
      console.log(`  ... Deleted ${totalDeleted} documents from ${collectionName}`);
      batch = db.batch();
      count = 0;
      
      // Recurse to delete more
      const remaining = await deleteCollection(collectionName);
      return totalDeleted + remaining;
    }
  }

  if (count > 0) {
    await batch.commit();
    totalDeleted += count;
  }

  console.log(`  ✓ ${collectionName}: Deleted ${totalDeleted} documents`);
  return totalDeleted;
}

/**
 * Reset claim codes to unclaimed status
 */
async function resetClaimCodes() {
  console.log('\n📋 Resetting claim codes...');
  
  const claimCodesRef = db.collection(COLLECTIONS.claimCodes);
  const snapshot = await claimCodesRef.get();
  
  if (snapshot.empty) {
    console.log('  ⚠ No claim codes found');
    return 0;
  }

  let resetCount = 0;
  let batch = db.batch();
  let batchCount = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    
    // Only reset if it was claimed
    if (data.claimed || data.claimedBy) {
      batch.update(doc.ref, {
        claimed: false,
        claimedBy: null,
        claimedAt: null,
        tokenId: null,
        edition: null
      });
      
      resetCount++;
      batchCount++;
      
      if (batchCount >= BATCH_SIZE) {
        await batch.commit();
        console.log(`  ... Reset ${resetCount} claim codes so far`);
        batch = db.batch();
        batchCount = 0;
      }
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  console.log(`  ✓ Reset ${resetCount} claim codes to unclaimed`);
  return resetCount;
}

/**
 * Reset edition counters
 */
async function resetCounters() {
  console.log('\n🔢 Resetting edition counters...');
  
  const countersRef = db.collection(COLLECTIONS.counters);
  const snapshot = await countersRef.get();
  
  if (snapshot.empty) {
    console.log('  ⚠ No counters found');
    return 0;
  }

  let resetCount = 0;
  const batch = db.batch();

  for (const doc of snapshot.docs) {
    batch.update(doc.ref, {
      currentEdition: 0
    });
    resetCount++;
  }

  await batch.commit();
  console.log(`  ✓ Reset ${resetCount} edition counters to 0`);
  return resetCount;
}

/**
 * Delete all collectibles (claimed tokens in our database)
 */
async function deleteCollectibles() {
  console.log('\n🗑️  Deleting collectibles records...');
  return await deleteCollection(COLLECTIONS.collectibles);
}

/**
 * Delete all verification tokens
 */
async function deleteVerificationTokens() {
  console.log('\n🔑 Deleting verification tokens...');
  return await deleteCollection(COLLECTIONS.verificationTokens);
}

/**
 * Get current system stats before reset
 */
async function getSystemStats() {
  console.log('\n📊 Current System Status:');
  
  // Count claim codes
  const claimCodesSnapshot = await db.collection(COLLECTIONS.claimCodes).get();
  const claimedCodes = claimCodesSnapshot.docs.filter(doc => doc.data().claimed).length;
  console.log(`  • Claim Codes: ${claimCodesSnapshot.size} total, ${claimedCodes} claimed`);
  
  // Count collectibles
  const collectiblesSnapshot = await db.collection(COLLECTIONS.collectibles).get();
  console.log(`  • Collectibles: ${collectiblesSnapshot.size} records`);
  
  // Get counter status
  const countersSnapshot = await db.collection(COLLECTIONS.counters).get();
  for (const doc of countersSnapshot.docs) {
    const data = doc.data();
    console.log(`  • Counter (${doc.id}): Edition ${data.currentEdition || 0} of ${data.totalEditions || 500}`);
  }
  
  return {
    totalClaimCodes: claimCodesSnapshot.size,
    claimedCodes,
    collectibles: collectiblesSnapshot.size
  };
}

/**
 * Prompt user for confirmation
 */
async function confirmReset() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question('\n⚠️  Are you sure you want to reset the system? This cannot be undone! (yes/no): ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes');
    });
  });
}

/**
 * Main reset function
 */
async function resetSystem() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║         CROWNMANIA SYSTEM RESET UTILITY                ║');
  console.log('╠════════════════════════════════════════════════════════╣');
  console.log('║  This will:                                            ║');
  console.log('║  • Reset all claim codes to unclaimed                  ║');
  console.log('║  • Delete all collectibles records                     ║');
  console.log('║  • Reset edition counters to 0                         ║');
  console.log('║  • Delete all verification tokens                      ║');
  console.log('║                                                        ║');
  console.log('║  ⚠️  This does NOT affect blockchain NFTs!             ║');
  console.log('╚════════════════════════════════════════════════════════╝');

  // Show current stats
  await getSystemStats();

  // Check for --confirm flag
  const autoConfirm = process.argv.includes('--confirm');
  
  if (!autoConfirm) {
    const confirmed = await confirmReset();
    if (!confirmed) {
      console.log('\n❌ Reset cancelled.');
      process.exit(0);
    }
  }

  console.log('\n🚀 Starting system reset...');
  const startTime = Date.now();

  try {
    // Step 1: Reset claim codes (don't delete, just unclaim)
    const resetCodes = await resetClaimCodes();
    
    // Step 2: Delete collectibles
    const deletedCollectibles = await deleteCollectibles();
    
    // Step 3: Reset counters
    const resetCounters_ = await resetCounters();
    
    // Step 4: Delete verification tokens
    const deletedTokens = await deleteVerificationTokens();

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║              ✅ SYSTEM RESET COMPLETE                  ║');
    console.log('╠════════════════════════════════════════════════════════╣');
    console.log(`║  • Claim codes reset: ${resetCodes}`);
    console.log(`║  • Collectibles deleted: ${deletedCollectibles}`);
    console.log(`║  • Counters reset: ${resetCounters_}`);
    console.log(`║  • Verification tokens deleted: ${deletedTokens}`);
    console.log(`║  • Time elapsed: ${elapsed}s`);
    console.log('╚════════════════════════════════════════════════════════╝');
    
    console.log('\n✨ The system is now ready for fresh claims!');
    console.log('   Next person to scan will be Edition #1.');
    
  } catch (error) {
    console.error('\n❌ Reset failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }

  process.exit(0);
}

// Run the reset
resetSystem();
