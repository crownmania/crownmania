/**
 * Crownmania Test Claim Code Tool
 *
 * Creates and recycles a claim code flagged `isTestCode: true`, so you can walk
 * the full scan → verify → claim → materialize flow end to end without touching
 * production inventory. A test code:
 *
 *   - does NOT consume an edition number (the counter is never read or bumped)
 *   - does NOT trigger an on-chain NFT transfer
 *   - returns instantly as claimed, so the verify page skips the "delivering"
 *     poll and plays the materialization immediately
 *
 * It DOES still send the real email OTP, the customer confirmation email, and
 * the admin alert (labelled "TEST (no NFT minted)"). That is deliberate — it
 * exercises the same path a customer takes.
 *
 * NOTE: this writes to PRODUCTION Firestore; there is no staging environment.
 * Every destructive command refuses to touch a code that is not flagged
 * isTestCode, so a real customer's claim can never be reset by this tool.
 *
 * Usage:
 *   node scripts/testClaimCode.js create    # create (or reuse) the test code
 *   node scripts/testClaimCode.js status    # show its current state
 *   node scripts/testClaimCode.js reset     # un-claim it so you can replay
 *   node scripts/testClaimCode.js watch     # auto-reset N seconds after each claim
 *   node scripts/testClaimCode.js delete    # remove it entirely
 *
 * Options:
 *   --code=<32-hex>   operate on a specific code instead of the default
 *   --new             create a freshly generated random test code
 *   --after=<sec>     (watch) seconds to stay claimed before resetting; default 120
 *   --every=<sec>     (watch) poll interval; default 10
 */

import crypto from 'crypto';
import { db } from '../src/config/firebase.js';

const PRODUCT_ID = 'lil-durk-figure';
// "7e57c0de" spells TESTCODE in hex, repeated to the 32 chars the claim-code
// format requires. Stable and obvious in the console if anyone finds it.
const DEFAULT_CODE = '7e57c0de'.repeat(4);
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://crownmania.com';

const args = process.argv.slice(2);
const command = args.find((a) => !a.startsWith('--')) || 'status';
const flag = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
const has = (name) => args.includes(`--${name}`);

const code = (has('new') ? crypto.randomBytes(16).toString('hex') : (flag('code') || DEFAULT_CODE)).toLowerCase();

if (!/^[a-f0-9]{32}$/.test(code)) {
  console.error(`❌ Invalid code "${code}" — must be exactly 32 hex characters.`);
  process.exit(1);
}

const claimCodeRef = db.collection('claimCodes').doc(code);

function printLinks() {
  console.log('');
  console.log('  Serial / claim code:');
  console.log(`    ${code}`);
  console.log('  Verify URL (this is what the QR sticker encodes):');
  console.log(`    ${FRONTEND_URL}/verify/${code}`);
  console.log(`    http://localhost:5173/verify/${code}`);
  console.log('');
}

/** Refuse to mutate anything that is not an explicitly flagged test code. */
async function loadTestCodeOrExit(action) {
  const doc = await claimCodeRef.get();
  if (!doc.exists) {
    console.error(`❌ Claim code ${code} does not exist. Run: node scripts/testClaimCode.js create`);
    process.exit(1);
  }
  const data = doc.data();
  if (data.isTestCode !== true) {
    console.error(`🛑 REFUSING TO ${action.toUpperCase()}: ${code} is NOT flagged isTestCode.`);
    console.error('   This looks like a real claim code. This tool only touches test codes.');
    process.exit(1);
  }
  return data;
}

async function create() {
  const product = await db.collection('products').doc(PRODUCT_ID).get();
  if (!product.exists) {
    console.error(`❌ Product "${PRODUCT_ID}" is missing from Firestore — verification would fail.`);
    process.exit(1);
  }

  const existing = await claimCodeRef.get();
  if (existing.exists) {
    if (existing.data().isTestCode !== true) {
      console.error(`🛑 ${code} already exists and is NOT a test code. Aborting.`);
      process.exit(1);
    }
    console.log('ℹ️  Test claim code already exists — leaving it as is.');
    await status();
    return;
  }

  await claimCodeRef.set({
    productId: PRODUCT_ID,
    isTestCode: true,
    claimed: false,
    claimedBy: null,
    claimedAt: null,
    tokenId: null,
    edition: null,
    revoked: false,
    createdAt: new Date(),
    note: 'Test code — no edition consumed, no NFT transferred. Created by scripts/testClaimCode.js'
  });

  console.log(`✅ Created test claim code (isTestCode: true) for "${product.data().name}".`);
  printLinks();
}

async function status() {
  const doc = await claimCodeRef.get();
  if (!doc.exists) {
    console.log(`⚪ ${code} does not exist yet. Run: node scripts/testClaimCode.js create`);
    return;
  }
  const d = doc.data();
  const collectibles = await db.collection('collectibles').where('serialNumber', '==', code).get();

  console.log('');
  console.log(`  Code        ${code}`);
  console.log(`  Test code   ${d.isTestCode === true ? 'yes' : '⚠️  NO — this is a real code'}`);
  console.log(`  Claimed     ${d.claimed ? `yes, by ${d.claimedBy}` : 'no'}`);
  if (d.claimedAt) console.log(`  Claimed at  ${d.claimedAt.toDate ? d.claimedAt.toDate().toISOString() : d.claimedAt}`);
  console.log(`  Edition     ${d.edition ?? '— (test codes never consume one)'}`);
  console.log(`  Collectible ${collectibles.size} record(s)`);
  printLinks();

  if (d.claimed) {
    console.log('  To run the flow again: node scripts/testClaimCode.js reset');
    console.log('');
  }
}

async function clearClaim() {
  // Drop the collectible records the claim created
  const collectibles = await db.collection('collectibles').where('serialNumber', '==', code).get();
  const batch = db.batch();
  collectibles.forEach((doc) => batch.delete(doc.ref));

  batch.update(claimCodeRef, {
    claimed: false,
    claimedBy: null,
    claimedAt: null,
    claimedByEmail: null,
    claimedByAuth: null,
    tokenId: null,
    edition: null
  });

  // Clear the email-OTP doc too: it rate limits to 3 codes per hour per
  // serial, which you would hit fast while iterating on the animation.
  batch.delete(db.collection('verificationCodes').doc(`claim_${code}`));

  await batch.commit();
  return collectibles.size;
}

async function reset() {
  await loadTestCodeOrExit('reset');
  const removed = await clearClaim();
  console.log(`♻️  Reset ${code} — removed ${removed} collectible record(s) and cleared the OTP rate limit.`);
  printLinks();
}

const toMillis = (ts) => (ts?.toDate ? ts.toDate().getTime() : new Date(ts).getTime());

/**
 * Poll the code and auto-reset it once it has been claimed for long enough,
 * so you can replay the materialization without touching a terminal between
 * runs. Polling Firestore centrally means it still works when you are
 * claiming from your phone — this just has to be running somewhere.
 */
async function watch() {
  const after = Number(flag('after') ?? 120);
  const every = Number(flag('every') ?? 10);

  if (!Number.isFinite(after) || after < 5) {
    console.error('❌ --after must be a number of seconds, at least 5.');
    process.exit(1);
  }
  if (!Number.isFinite(every) || every < 2) {
    console.error('❌ --every must be a number of seconds, at least 2.');
    process.exit(1);
  }

  await loadTestCodeOrExit('watch');

  console.log(`👀 Watching ${code}`);
  console.log(`   Auto-reset ${after}s after each claim · polling every ${every}s · Ctrl+C to stop`);
  printLinks();

  let announcedIdle = false;
  let resets = 0;

  for (;;) {
    const doc = await claimCodeRef.get();

    if (!doc.exists) {
      console.log('⚠️  The code was deleted — stopping watcher.');
      return;
    }

    const data = doc.data();
    if (data.isTestCode !== true) {
      console.error('🛑 Code is no longer flagged isTestCode — stopping watcher rather than touching it.');
      process.exit(1);
    }

    if (data.claimed && data.claimedAt) {
      announcedIdle = false;
      const ageSeconds = Math.round((Date.now() - toMillis(data.claimedAt)) / 1000);

      if (ageSeconds >= after) {
        const removed = await clearClaim();
        resets++;
        console.log(`♻️  [${new Date().toLocaleTimeString()}] Auto-reset after ${ageSeconds}s (${removed} collectible record(s) removed). Ready to claim again — total resets: ${resets}`);
      } else {
        console.log(`   claimed ${ageSeconds}s ago — resetting in ${after - ageSeconds}s`);
      }
    } else if (!announcedIdle) {
      console.log(`   [${new Date().toLocaleTimeString()}] Unclaimed and ready — go claim it.`);
      announcedIdle = true;
    }

    await new Promise((r) => setTimeout(r, every * 1000));
  }
}

async function remove() {
  await loadTestCodeOrExit('delete');

  const collectibles = await db.collection('collectibles').where('serialNumber', '==', code).get();
  const batch = db.batch();
  collectibles.forEach((doc) => batch.delete(doc.ref));
  batch.delete(claimCodeRef);
  batch.delete(db.collection('verificationCodes').doc(`claim_${code}`));
  await batch.commit();

  console.log(`🗑️  Deleted test claim code ${code} and ${collectibles.size} collectible record(s).`);
}

const commands = { create, status, reset, watch, delete: remove };

if (!commands[command]) {
  console.error(`Unknown command "${command}". Use: create | status | reset | watch | delete`);
  process.exit(1);
}

process.on('SIGINT', () => {
  console.log('\n👋 Watcher stopped. The code keeps whatever state it is in — run "reset" if it is still claimed.');
  process.exit(0);
});

commands[command]()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Failed:', err.message);
    process.exit(1);
  });
