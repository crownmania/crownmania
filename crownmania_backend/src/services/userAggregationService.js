import { db, firebaseReady } from '../config/firebase.js';
import encryptionService from './encryptionService.js';
import { getActivityLog } from './userActivityService.js';
import logger from '../config/logger.js';

/**
 * userAggregationService
 * ----------------------
 * Builds a complete picture of a user by pulling from every collection that
 * holds information about them. This is the "user database" view.
 *
 * PII (email/phone/birthday) is only decrypted when `includePII` is true,
 * which the route layer gates to admins or the verified owner.
 */

const tsToIso = (ts) => (ts && typeof ts.toDate === 'function') ? ts.toDate().toISOString() : null;

/**
 * Run a query defensively — return [] on error so one broken collection
 * never breaks the whole aggregate.
 */
const safeQuery = async (fn, label) => {
  try {
    return await fn();
  } catch (err) {
    logger.warn(`aggregation: ${label} failed:`, err.message);
    return [];
  }
};

/**
 * Aggregate everything we know about a user by wallet address.
 *
 * @param {string} walletAddress
 * @param {Object} opts
 * @param {boolean} [opts.includePII=false] - decrypt email/phone/birthday
 * @param {number} [opts.activityLimit=50] - number of activity log entries
 * @returns {Object|null} aggregated user record, or null if no profile exists
 */
export const aggregateUser = async (walletAddress, {
  includePII = false,
  activityLimit = 50,
} = {}) => {
  if (!walletAddress) return null;
  if (!firebaseReady || !db) return null;
  const wallet = walletAddress.toLowerCase();

  // ── Core profile ──────────────────────────────────────────────
  const profileSnap = await safeQuery(
    () => db.collection('users').where('walletAddress', '==', wallet).limit(1).get(),
    'users',
  );
  if (!profileSnap || profileSnap.empty) return null;

  const profileDoc = profileSnap.docs[0];
  const p = profileDoc.data();
  const userId = profileDoc.id;

  const profile = {
    userId,
    username: p.username || null,
    walletAddress: p.walletAddress,
    name: p.name || null,
    role: p.role || 'user',
    profileComplete: !!p.profileComplete,
    ageVerified: !!p.ageVerified,
    marketingOptIn: !!p.marketingOptIn,
    createdAt: tsToIso(p.createdAt),
    updatedAt: tsToIso(p.updatedAt),
    lastLogin: tsToIso(p.lastLogin),
    usernameAssignedAt: tsToIso(p.usernameAssignedAt),
  };

  if (includePII) {
    profile.email = p.email ? encryptionService.decrypt(p.email) : null;
    profile.phone = p.phone ? encryptionService.decrypt(p.phone) : null;
    profile.birthday = p.birthday ? encryptionService.decrypt(p.birthday) : null;
  } else {
    profile.emailMasked = p.emailPlain || null;
    profile.phoneMasked = p.phonePlain || null;
  }

  // ── Collectibles owned ────────────────────────────────────────
  const collectiblesSnap = await safeQuery(
    () => db.collection('collectibles').where('ownerId', '==', wallet).get(),
    'collectibles',
  );
  const collectibles = collectiblesSnap.docs.map((d) => {
    const c = d.data();
    return {
      id: d.id,
      serialNumber: c.serialNumber || null,
      productName: c.productName || null,
      edition: c.edition || null,
      status: c.status || null,
      claimedAt: tsToIso(c.createdAt) || tsToIso(c.claimedAt),
    };
  });

  // ── Orders (query by userId and walletAddress defensively) ────
  const [ordersByUser, ordersByWallet] = await Promise.all([
    safeQuery(() => db.collection('orders').where('userId', '==', wallet).get(), 'orders.userId'),
    safeQuery(() => db.collection('orders').where('walletAddress', '==', wallet).get(), 'orders.walletAddress'),
  ]);
  const seenOrderIds = new Set();
  const orders = [];
  for (const d of [...ordersByUser.docs, ...ordersByWallet.docs]) {
    if (seenOrderIds.has(d.id)) continue;
    seenOrderIds.add(d.id);
    const o = d.data();
    orders.push({
      id: d.id,
      userId: o.userId || null,
      status: o.status || null,
      total: o.total ?? o.amount ?? null,
      currency: o.currency || null,
      createdAt: tsToIso(o.createdAt),
    });
  }

  // ── Content access sessions ───────────────────────────────────
  const contentSnap = await safeQuery(
    () => db.collection('content_access_sessions').where('walletAddress', '==', wallet).get(),
    'content_access_sessions',
  );
  const contentAccess = contentSnap.docs.map((d) => {
    const s = d.data();
    return {
      id: d.id,
      contentId: s.contentId || null,
      expiresAt: tsToIso(s.expiresAt) || tsToIso(s.sessionExpiresAt),
      createdAt: tsToIso(s.createdAt),
    };
  });

  // ── Notification preferences ──────────────────────────────────
  const notifSnap = await safeQuery(
    () => db.collection('notificationPreferences').where('walletAddress', '==', wallet).limit(1).get(),
    'notificationPreferences',
  );
  const notificationPreferences = notifSnap.empty ? null : notifSnap.docs[0].data();

  // ── Push tokens ───────────────────────────────────────────────
  const pushSnap = await safeQuery(
    () => db.collection('pushTokens').where('walletAddress', '==', wallet).get(),
    'pushTokens',
  );
  const pushTokens = pushSnap.docs.map((d) => ({
    id: d.id,
    token: d.data().token || d.data().pushToken || null,
    createdAt: tsToIso(d.data().createdAt),
  }));

  // ── Forum activity (by authorName match to username, best-effort) ──
  // Forum posts are anonymous (no wallet link), so we match on the internal
  // username if it was used as authorName. This is best-effort only.
  let forumPosts = [];
  let forumReplies = [];
  if (profile.username) {
    const postsSnap = await safeQuery(
      () => db.collection('forum_posts').where('authorName', '==', profile.username).get(),
      'forum_posts',
    );
    forumPosts = postsSnap.docs.map((d) => ({
      id: d.id,
      content: (d.data().content || '').slice(0, 200),
      likes: Number(d.data().likes) || 0,
      dislikes: Number(d.data().dislikes) || 0,
      createdAt: tsToIso(d.data().createdAt),
    }));
  }

  // ── Audit logs mentioning this wallet ─────────────────────────
  const auditSnap = await safeQuery(
    () => db.collection('auditLogs').where('walletAddress', '==', wallet).orderBy('timestamp', 'desc').limit(50).get(),
    'auditLogs',
  );
  const auditLogs = auditSnap.docs.map((d) => {
    const a = d.data();
    return {
      id: d.id,
      event: a.event || a.action || null,
      timestamp: tsToIso(a.timestamp) || tsToIso(a.createdAt),
    };
  });

  // ── Activity log (the new user_activity collection) ───────────
  const activity = await getActivityLog(wallet, activityLimit);

  // ── Summary stats ─────────────────────────────────────────────
  return {
    profile,
    stats: {
      collectibles: collectibles.length,
      orders: orders.length,
      contentAccessSessions: contentAccess.length,
      forumPosts: forumPosts.length,
      forumReplies: forumReplies.length,
      auditEvents: auditLogs.length,
      activityEvents: activity.length,
      pushTokens: pushTokens.length,
    },
    collectibles,
    orders,
    contentAccess,
    notificationPreferences,
    pushTokens,
    forumPosts,
    forumReplies,
    auditLogs,
    activity,
    _aggregatedAt: new Date().toISOString(),
  };
};

/**
 * List all known users (lightweight summary). Admin-only at the route layer.
 */
export const listUsers = async (limit = 100) => {
  if (!firebaseReady || !db) return [];
  const snap = await safeQuery(
    () => db.collection('users').orderBy('createdAt', 'desc').limit(Math.min(Math.max(parseInt(limit, 10) || 100, 1), 1000)).get(),
    'listUsers',
  );
  return snap.docs.map((d) => {
    const u = d.data();
    return {
      userId: d.id,
      username: u.username || null,
      walletAddress: u.walletAddress,
      name: u.name || null,
      role: u.role || 'user',
      profileComplete: !!u.profileComplete,
      emailMasked: u.emailPlain || null,
      createdAt: tsToIso(u.createdAt),
      lastLogin: tsToIso(u.lastLogin),
    };
  });
};

export default { aggregateUser, listUsers };
