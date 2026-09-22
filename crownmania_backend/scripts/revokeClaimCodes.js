import 'dotenv/config';
import { db } from '../src/config/firebase.js';

/**
 * Revoke claim codes whose IDs were exposed in a committed diagnostic file.
 * Sets revoked=true — the docs stay in the system (audit trail intact), but
 * verificationService refuses them at verify, request-code, and claim time.
 *
 * Usage: node scripts/revokeClaimCodes.js [--yes]
 */

const COMPROMISED_CODES = [
  '00013ab99ca74d4295eb48d533cc5b42',
  '0004bd9f7d244f7a9607b6d45c97958a',
];

const confirm = process.argv.includes('--yes');

for (const code of COMPROMISED_CODES) {
  const ref = db.collection('claimCodes').doc(code);
  const doc = await ref.get();

  if (!doc.exists) {
    console.log(`SKIP ${code.substring(0, 8)}… — doc does not exist`);
    continue;
  }

  const data = doc.data();
  console.log(`${code.substring(0, 8)}… — exists | claimed=${!!(data.claimed || data.claimedBy)} revoked=${!!data.revoked} productId=${data.productId}`);

  if (data.claimed || data.claimedBy) {
    console.log(`  already claimed — revocation is a no-op, marking anyway for audit`);
  }

  if (!confirm) continue;

  await ref.set({
    revoked: true,
    revokedAt: new Date(),
    revokedReason: 'claim code ID exposed in committed diagnostic file',
  }, { merge: true });
  console.log(`  REVOKED`);
}

if (!confirm) {
  console.log('\nDry run — re-run with --yes to apply.');
}
process.exit(0);
