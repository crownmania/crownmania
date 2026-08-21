import { db, firebaseReady } from '../config/firebase.js';
import { FieldValue } from 'firebase-admin/firestore';
import logger from '../config/logger.js';

/**
 * userActivityService
 * -------------------
 * Records every meaningful user action into the `user_activity` collection.
 * Each record captures who, what, when, and request context (IP, user-agent,
 * referrer) — the "all the information you can get on any user" trail.
 *
 * Logging is fire-and-forget: it must never break the request that triggered it.
 */

const ACTIVITY_COLLECTION = 'user_activity';

/**
 * Extract request context metadata safely.
 */
const extractRequestContext = (req) => {
  if (!req) return {};
  return {
    ip: req.ip || req.headers['x-forwarded-for'] || null,
    userAgent: req.headers['user-agent'] || null,
    referrer: req.headers['referer'] || req.headers['referrer'] || null,
    method: req.method || null,
    path: req.originalUrl || req.url || null,
  };
};

/**
 * Log a user action.
 *
 * @param {Object} params
 * @param {string} [params.walletAddress] - normalized wallet (primary key for users)
 * @param {string} [params.userId] - firestore user doc id
 * @param {string} [params.username] - internal username
 * @param {string} params.action - short machine identifier, e.g. 'forum_post'
 * @param {string} [params.category] - grouping: auth|profile|claim|order|forum|content|contact|admin
 * @param {string} [params.description] - human-readable summary
 * @param {Object} [params.metadata] - arbitrary action-specific payload
 * @param {import('express').Request} [params.req] - express request (for IP/UA)
 * @returns {Promise<string|null>} the activity doc id, or null if unavailable
 */
export const logUserAction = async ({
  walletAddress,
  userId,
  username,
  action,
  category,
  description,
  metadata = {},
  req = null,
}) => {
  if (!action) {
    logger.warn('logUserAction called without an action');
    return null;
  }
  if (!firebaseReady || !db) return null;

  try {
    const ctx = extractRequestContext(req);
    const normalizedWallet = walletAddress ? walletAddress.toLowerCase() : null;

    const payload = {
      walletAddress: normalizedWallet,
      userId: userId || null,
      username: username || null,
      action,
      category: category || 'general',
      description: description || null,
      metadata,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      referrer: ctx.referrer,
      method: ctx.method,
      path: ctx.path,
      createdAt: FieldValue.serverTimestamp(),
    };

    const ref = await db.collection(ACTIVITY_COLLECTION).add(payload);
    return ref.id;
  } catch (err) {
    // Never throw — activity logging must not break the calling request
    logger.error('logUserAction failed:', err.message);
    return null;
  }
};

/**
 * Fetch the activity log for a wallet, newest first.
 */
export const getActivityLog = async (walletAddress, limit = 100) => {
  if (!firebaseReady || !db || !walletAddress) return [];
  const normalized = walletAddress.toLowerCase();
  const snap = await db.collection(ACTIVITY_COLLECTION)
    .where('walletAddress', '==', normalized)
    .orderBy('createdAt', 'desc')
    .limit(Math.min(Math.max(parseInt(limit, 10) || 100, 1), 500))
    .get();
  return snap.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : null,
    };
  });
};

export default { logUserAction, getActivityLog };
