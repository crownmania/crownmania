import { db, firebaseReady } from '../config/firebase.js';
import logger from '../config/logger.js';

/**
 * usernameService
 * ---------------
 * Assigns stable, wallet-derived internal usernames to every user.
 *
 * Scheme: `user_<6 hex chars from wallet>` — deterministic, anonymous, no PII.
 * If a collision is detected (extremely unlikely with 6 chars), the suffix is
 * extended until unique. The username is stored on the user document and used
 * as the primary human-readable handle internally and in the user database.
 */

const USERS_COLLECTION = 'users';
const USERNAME_PREFIX = 'user_';
const MIN_HEX_LEN = 6;
const MAX_HEX_LEN = 12;

/**
 * Derive a candidate username from a wallet address.
 * Uses the trailing hex chars of the address (after 0x) for entropy.
 */
const deriveCandidate = (walletAddress, hexLen = MIN_HEX_LEN) => {
  if (!walletAddress || typeof walletAddress !== 'string') return null;
  const hex = walletAddress.toLowerCase().replace(/^0x/, '').replace(/[^a-f0-9]/g, '');
  if (!hex) return null;
  const slice = hex.slice(0, Math.min(hexLen, hex.length)) || hex;
  return `${USERNAME_PREFIX}${slice}`;
};

/**
 * Check whether a username is already taken by a different wallet.
 * Returns true if available.
 */
const isUsernameAvailable = async (username, excludeWallet = null) => {
  if (!firebaseReady || !db) return true;
  const snap = await db.collection(USERS_COLLECTION)
    .where('username', '==', username)
    .limit(2)
    .get();
  if (snap.empty) return true;
  // Available if the only match belongs to the same wallet
  for (const doc of snap.docs) {
    const data = doc.data();
    if (!excludeWallet || data.walletAddress !== excludeWallet) {
      return false;
    }
  }
  return true;
};

/**
 * Generate a unique username for a wallet, extending the hex suffix on collision.
 */
const generateUniqueUsername = async (walletAddress) => {
  let len = MIN_HEX_LEN;
  let candidate = deriveCandidate(walletAddress, len);
  while (candidate && len <= MAX_HEX_LEN) {
    if (await isUsernameAvailable(candidate, walletAddress)) return candidate;
    len += 2;
    candidate = deriveCandidate(walletAddress, len);
  }
  // Fallback: append a short random suffix
  const rand = Math.random().toString(16).slice(2, 6);
  return `${deriveCandidate(walletAddress, MAX_HEX_LEN) || 'user'}_${rand}`;
};

/**
 * Get the username for a wallet, or null if the user has none / doesn't exist.
 */
export const getUsername = async (walletAddress) => {
  if (!firebaseReady || !db || !walletAddress) return null;
  const normalized = walletAddress.toLowerCase();
  const snap = await db.collection(USERS_COLLECTION)
    .where('walletAddress', '==', normalized)
    .limit(1)
    .get();
  if (snap.empty) return null;
  return snap.docs[0].data().username || null;
};

/**
 * Assign a username to a wallet if they don't already have one.
 * Idempotent — safe to call on every profile save / login.
 * Returns { username, assigned }.
 */
export const assignUsername = async (walletAddress) => {
  if (!walletAddress) throw new Error('walletAddress is required');
  const normalized = walletAddress.toLowerCase();

  if (!firebaseReady || !db) {
    // Fallback when DB unavailable: return a derived name without persisting
    return { username: deriveCandidate(normalized) || 'user', assigned: false };
  }

  const snap = await db.collection(USERS_COLLECTION)
    .where('walletAddress', '==', normalized)
    .limit(1)
    .get();

  if (snap.empty) {
    // User doesn't exist yet — derive a name to be persisted on creation
    const username = await generateUniqueUsername(normalized);
    return { username, assigned: false };
  }

  const docRef = snap.docs[0].ref;
  const data = snap.docs[0].data();

  if (data.username) {
    return { username: data.username, assigned: false };
  }

  const username = await generateUniqueUsername(normalized);
  await docRef.update({ username, usernameAssignedAt: new Date() });
  logger.info(`Assigned username ${username} to wallet ${normalized.substring(0, 10)}...`);
  return { username, assigned: true };
};

/**
 * Backfill usernames for all existing users that don't have one.
 * Returns { processed, assigned }.
 */
export const backfillUsernames = async () => {
  if (!firebaseReady || !db) {
    return { processed: 0, assigned: 0 };
  }
  const snap = await db.collection(USERS_COLLECTION).get();
  let assigned = 0;
  let processed = 0;

  for (const doc of snap.docs) {
    processed += 1;
    const data = doc.data();
    if (data.username) continue;
    if (!data.walletAddress) continue;

    const username = await generateUniqueUsername(data.walletAddress);
    await doc.ref.update({ username, usernameAssignedAt: new Date() });
    assigned += 1;
  }

  logger.info(`Username backfill complete: ${assigned}/${processed} users assigned.`);
  return { processed, assigned };
};

export default {
  getUsername,
  assignUsername,
  backfillUsernames,
};
