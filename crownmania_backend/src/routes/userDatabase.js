import express from 'express';
import { db, firebaseReady } from '../config/firebase.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import signatureService from '../services/signatureService.js';
import { assignUsername, backfillUsernames, getUsername } from '../services/usernameService.js';
import { aggregateUser, listUsers } from '../services/userAggregationService.js';
import { getActivityLog, logUserAction } from '../services/userActivityService.js';
import User from '../models/User.js';
import logger from '../config/logger.js';

const router = express.Router();

/**
 * Resolve an identifier (wallet address OR username) to a normalized wallet
 * address. Returns null if not found.
 */
const resolveWallet = async (identifier) => {
  if (!identifier) return null;
  // Direct wallet address
  if (/^0x[a-fA-F0-9]{40}$/.test(identifier)) {
    return identifier.toLowerCase();
  }
  // Treat as username
  try {
    const user = await User.findByUsername(identifier);
    return user?.walletAddress || null;
  } catch {
    return null;
  }
};

/**
 * Verify the requester owns `walletAddress` via wallet signature.
 * Query params: ?signature=...&message=...
 * Returns true if verified owner.
 */
const verifyOwner = async (req, walletAddress) => {
  const { signature, message } = req.query;
  if (!signature || !message || !walletAddress) return false;
  try {
    await signatureService.verifySignature(walletAddress, signature, message);
    return true;
  } catch {
    return false;
  }
};

const requireDb = (req, res, next) => {
  if (!firebaseReady || !db) {
    return res.status(503).json({ error: 'User database service unavailable.' });
  }
  next();
};

/**
 * Best-effort admin check (does not hard-reject; caller decides).
 * Supports OTP session tokens and Firebase ID tokens, mirroring requireAdmin.
 */
const checkAdmin = async (req) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return false;
    const token = authHeader.split('Bearer ')[1];

    const { adminService } = await import('../services/adminService.js');
    const session = await adminService.validateSessionAsync(token);
    if (session.valid) return true;

    const admin = await import('firebase-admin');
    const decoded = await admin.auth().verifyIdToken(token);
    const snap = await db.collection('users').where('walletAddress', '==', decoded.uid).limit(1).get();
    if (!snap.empty) return snap.docs[0].data().role === 'admin';
    const emailSnap = await db.collection('users').where('email', '==', decoded.email).limit(1).get();
    return !emailSnap.empty && emailSnap.docs[0].data().role === 'admin';
  } catch {
    return false;
  }
};

/**
 * GET /api/users
 * List all users (lightweight). Admin only.
 */
router.get('/', requireDb, requireAdmin, async (req, res) => {
  try {
    const { limit = 100 } = req.query;
    const users = await listUsers(limit);
    res.json({ users, count: users.length });
  } catch (err) {
    logger.error('List users error:', err.message);
    res.status(500).json({ error: 'Failed to list users.' });
  }
});

/**
 * GET /api/users/:identifier
 * Full aggregated user record. identifier = wallet address or username.
 *
 * Access:
 *  - Admin (Bearer token): full record with decrypted PII.
 *  - Owner (wallet signature via ?signature&message): full record with PII.
 *  - Anyone else: 403 (this is an internal database, not public).
 */
router.get('/:identifier', requireDb, async (req, res) => {
  try {
    const { identifier } = req.params;
    const wallet = await resolveWallet(identifier);
    if (!wallet) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const isAdmin = await checkAdmin(req);
    const isOwner = await verifyOwner(req, wallet);

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        error: 'Access denied. Admin token or wallet signature (owner) required.',
      });
    }

    const { activity = 50 } = req.query;
    const record = await aggregateUser(wallet, {
      includePII: true,
      activityLimit: parseInt(activity, 10) || 50,
    });

    if (!record) {
      return res.status(404).json({ error: 'User profile not found.' });
    }

    // Log the access (the admin/owner viewing a record is itself an action)
    logUserAction({
      walletAddress: wallet,
      username: record.profile.username,
      action: 'user_record_viewed',
      category: 'admin',
      description: `User record viewed by ${isAdmin ? 'admin' : 'owner'}`,
      metadata: { identifier, viewer: isAdmin ? 'admin' : 'owner' },
      req,
    });

    res.json(record);
  } catch (err) {
    logger.error('Get user error:', err.message);
    res.status(500).json({ error: 'Failed to fetch user record.' });
  }
});

/**
 * GET /api/users/:identifier/activity
 * Raw activity log for a user. Admin or owner only.
 */
router.get('/:identifier/activity', requireDb, async (req, res) => {
  try {
    const { identifier } = req.params;
    const wallet = await resolveWallet(identifier);
    if (!wallet) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const isAdmin = await checkAdmin(req);
    const isOwner = await verifyOwner(req, wallet);
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const { limit = 100 } = req.query;
    const activity = await getActivityLog(wallet, parseInt(limit, 10) || 100);
    res.json({ walletAddress: wallet, count: activity.length, activity });
  } catch (err) {
    logger.error('Get user activity error:', err.message);
    res.status(500).json({ error: 'Failed to fetch activity log.' });
  }
});

/**
 * POST /api/users/:walletAddress/assign-username
 * Assign an internal username to a wallet (idempotent). Admin or owner.
 */
router.post('/:walletAddress/assign-username', requireDb, async (req, res) => {
  try {
    const { walletAddress } = req.params;
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({ error: 'Invalid wallet address.' });
    }
    const wallet = walletAddress.toLowerCase();

    const isAdmin = await checkAdmin(req);
    const isOwner = await verifyOwner(req, wallet);
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const result = await assignUsername(wallet);
    logUserAction({
      walletAddress: wallet,
      username: result.username,
      action: 'username_assigned',
      category: 'profile',
      description: `Username ${result.username} ${result.assigned ? 'newly assigned' : 'already present'}`,
      metadata: result,
      req,
    });
    res.json({ walletAddress: wallet, ...result });
  } catch (err) {
    logger.error('Assign username error:', err.message);
    res.status(500).json({ error: 'Failed to assign username.' });
  }
});

/**
 * POST /api/users/backfill-usernames
 * Backfill usernames for all existing users missing one. Admin only.
 */
router.post('/backfill-usernames', requireDb, requireAdmin, async (req, res) => {
  try {
    const result = await backfillUsernames();
    logUserAction({
      walletAddress: req.adminEmail || null,
      action: 'username_backfill',
      category: 'admin',
      description: `Backfill: ${result.assigned}/${result.processed} users`,
      metadata: result,
      req,
    });
    res.json(result);
  } catch (err) {
    logger.error('Backfill usernames error:', err.message);
    res.status(500).json({ error: 'Failed to backfill usernames.' });
  }
});

/**
 * GET /api/users/:identifier/username
 * Public lookup of a user's internal username by wallet or username (echo).
 */
router.get('/:identifier/username', requireDb, async (req, res) => {
  try {
    const { identifier } = req.params;
    const wallet = await resolveWallet(identifier);
    if (!wallet) {
      return res.status(404).json({ error: 'User not found.' });
    }
    const username = await getUsername(wallet);
    res.json({ walletAddress: wallet, username });
  } catch (err) {
    logger.error('Get username error:', err.message);
    res.status(500).json({ error: 'Failed to fetch username.' });
  }
});

export { router as userDatabaseRouter };
export default router;
