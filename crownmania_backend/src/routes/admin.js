/**
 * CROWNMANIA ADMIN ROUTES
 * ========================
 * Protected admin endpoints for system management
 */

import express from 'express';
import { adminService } from '../services/adminService.js';
import { db } from '../config/firebase.js';
import requireAdmin from '../middleware/requireAdmin.js';
import { adminLoginLimiter, authLimiter } from '../middleware/rateLimiter.js';
import logger from '../config/logger.js';

const router = express.Router();

// Serials / claim codes are bearer credentials — never return full values.
const maskSerial = (s) => (typeof s === 'string' && s.length > 8 ? `${s.slice(0, 8)}…` : s);
const maskSerialFields = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  const masked = { ...obj };
  for (const key of Object.keys(masked)) {
    if (/serial|claimcode/i.test(key) && typeof masked[key] === 'string') {
      masked[key] = maskSerial(masked[key]);
    }
  }
  return masked;
};

// ============================================
// PUBLIC: Authentication Endpoints
// ============================================

/**
 * POST /api/admin/login
 * Request admin login - sends OTP to email
 */
router.post('/login', adminLoginLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const result = await adminService.requestLogin(email);
    res.json(result);
  } catch (error) {
    logger.error('Admin login request error:', error);
    res.status(500).json({ error: 'Failed to process login request' });
  }
});

/**
 * POST /api/admin/verify
 * Verify OTP and get session token
 */
router.post('/verify', authLimiter, async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: 'Email and code are required' });
    }

    const result = await adminService.verifyOTP(email, code);

    if (!result.success) {
      return res.status(401).json(result);
    }

    res.json(result);
  } catch (error) {
    logger.error('Admin verify error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

/**
 * POST /api/admin/logout
 * Destroy admin session
 */
router.post('/logout', requireAdmin, (req, res) => {
  const token = req.headers.authorization.split('Bearer ')[1];
  adminService.logout(token);
  res.json({ success: true, message: 'Logged out successfully' });
});

/**
 * GET /api/admin/session
 * Check if current session is valid
 */
router.get('/session', requireAdmin, (req, res) => {
  res.json({
    valid: true,
    email: req.adminEmail,
    message: 'Session is active'
  });
});

// ============================================
// PROTECTED: Dashboard & Stats
// ============================================

/**
 * GET /api/admin/stats
 * Get comprehensive system statistics
 */
router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const stats = await adminService.getSystemStats();
    res.json(stats);
  } catch (error) {
    logger.error('Error getting stats:', error);
    res.status(500).json({ error: 'Failed to get system stats' });
  }
});

// ============================================
// PROTECTED: Collectibles Management
// ============================================

/**
 * GET /api/admin/collectibles
 * Get all collectibles with pagination
 */
router.get('/collectibles', requireAdmin, async (req, res) => {
  try {
    const { limit = 50, startAfter, status } = req.query;

    // Status filtering runs in memory: a (status, createdAt) composite index
    // does not exist, and collectible counts are small enough to scan.
    if (status && status !== 'all') {
      const snapshot = await db.collection('collectibles')
        .orderBy('createdAt', 'desc')
        .get();
      const filtered = snapshot.docs
        .filter(doc => doc.data().status === status)
        .slice(0, parseInt(limit))
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null
        }));
      return res.json({ collectibles: filtered, count: filtered.length });
    }

    const collectibles = await adminService.getAllCollectibles(parseInt(limit), startAfter);
    res.json({ collectibles, count: collectibles.length });
  } catch (error) {
    logger.error('Error getting collectibles:', error);
    res.status(500).json({ error: 'Failed to get collectibles' });
  }
});

/**
 * POST /api/admin/collectibles/:id/transfer
 * Transfer ownership of a collectible (database only)
 */
router.post('/collectibles/:id/transfer', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { newOwnerWallet } = req.body;

    if (!newOwnerWallet) {
      return res.status(400).json({ error: 'New owner wallet address is required' });
    }

    // Validate wallet format
    if (!/^0x[a-fA-F0-9]{40}$/.test(newOwnerWallet)) {
      return res.status(400).json({ error: 'Invalid wallet address format' });
    }

    const result = await adminService.transferOwnership(id, newOwnerWallet);
    res.json(result);
  } catch (error) {
    logger.error('Error transferring ownership:', error);
    res.status(500).json({ error: 'Failed to transfer ownership' });
  }
});

/**
 * POST /api/admin/collectibles/:id/revoke
 * Revoke a collectible
 */
router.post('/collectibles/:id/revoke', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Revocation reason is required' });
    }

    const result = await adminService.revokeCollectible(id, reason);
    res.json(result);
  } catch (error) {
    logger.error('Error revoking collectible:', error);
    res.status(500).json({ error: 'Failed to revoke collectible' });
  }
});

// ============================================
// PROTECTED: Claim Codes Management
// ============================================

/**
 * GET /api/admin/claim-codes
 * Aggregate counts plus claimed codes only. Unclaimed serial values are
 * bearer credentials and are never enumerable through this API.
 */
router.get('/claim-codes', requireAdmin, async (req, res) => {
  try {
    const summary = await adminService.getClaimCodesSummary();
    res.json(summary);
  } catch (error) {
    logger.error('Error getting claim codes:', error);
    res.status(500).json({ error: 'Failed to get claim codes' });
  }
});

/**
 * POST /api/admin/claim-codes/:id/reset
 * Reset a specific claim code to unclaimed
 */
router.post('/claim-codes/:id/reset', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await adminService.resetClaimCode(id);
    res.json(result);
  } catch (error) {
    logger.error('Error resetting claim code:', error);
    res.status(500).json({ error: 'Failed to reset claim code' });
  }
});

// ============================================
// PROTECTED: System Operations
// ============================================

/**
 * POST /api/admin/system/reset
 * Full system reset (requires confirmation)
 * WARNING: This is destructive!
 */
router.post('/system/reset', requireAdmin, async (req, res) => {
  try {
    const { confirm } = req.body;

    if (confirm !== 'RESET_CROWNMANIA_SYSTEM') {
      return res.status(400).json({
        error: 'Confirmation required',
        message: 'Send { confirm: "RESET_CROWNMANIA_SYSTEM" } to proceed'
      });
    }

    // Import the reset functionality
    const { db } = await import('../config/firebase.js');

    logger.warn(`SYSTEM RESET initiated by admin: ${req.adminEmail}`);

    // Reset claim codes
    const claimCodesSnapshot = await db.collection('claimCodes').get();
    let resetCodes = 0;
    const batch1 = db.batch();

    for (const doc of claimCodesSnapshot.docs) {
      if (doc.data().claimed) {
        batch1.update(doc.ref, {
          claimed: false,
          claimedBy: null,
          claimedAt: null,
          tokenId: null,
          edition: null
        });
        resetCodes++;
      }
    }
    await batch1.commit();

    // Delete collectibles
    const collectiblesSnapshot = await db.collection('collectibles').get();
    let deletedCollectibles = 0;
    const batch2 = db.batch();

    for (const doc of collectiblesSnapshot.docs) {
      batch2.delete(doc.ref);
      deletedCollectibles++;
    }
    await batch2.commit();

    // Reset counters
    const countersSnapshot = await db.collection('counters').get();
    const batch3 = db.batch();

    for (const doc of countersSnapshot.docs) {
      batch3.update(doc.ref, { currentEdition: 0 });
    }
    await batch3.commit();

    logger.warn(`SYSTEM RESET completed: ${resetCodes} codes reset, ${deletedCollectibles} collectibles deleted`);

    res.json({
      success: true,
      message: 'System reset complete',
      details: {
        claimCodesReset: resetCodes,
        collectiblesDeleted: deletedCollectibles,
        countersReset: countersSnapshot.size
      }
    });
  } catch (error) {
    logger.error('System reset error:', error);
    res.status(500).json({ error: 'System reset failed' });
  }
});

// ============================================
// PROTECTED: Audit Logs
// ============================================

/**
 * GET /api/admin/audit-logs
 * Query audit logs with filters
 */
router.get('/audit-logs', requireAdmin, async (req, res) => {
  try {
    const { event, userId, from, to, limit = 100 } = req.query;

    // Only the timestamp range hits Firestore — event/userId are filtered in
    // memory so no (event, timestamp) composite index is required.
    let query = db.collection('auditLogs').orderBy('timestamp', 'desc');

    if (from) {
      query = query.where('timestamp', '>=', new Date(from));
    }

    if (to) {
      query = query.where('timestamp', '<=', new Date(to));
    }

    // Over-fetch so in-memory filtering still returns up to `limit` rows.
    const snapshot = await query.limit(event || userId ? 500 : parseInt(limit)).get();

    const logs = snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...maskSerialFields(doc.data()),
        timestamp: doc.data().timestamp?.toDate().toISOString()
      }))
      .filter(l => (!event || event === 'all' || l.event === event)
        && (!userId || l.userId === userId))
      .slice(0, parseInt(limit));

    res.json({ logs, count: logs.length });
  } catch (error) {
    logger.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// ============================================
// PROTECTED: Content Management
// ============================================

/**
 * GET /api/admin/content
 * List all token-gated content
 */
router.get('/content', requireAdmin, async (req, res) => {
  try {
    const snapshot = await db.collection('content').get();

    const content = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate().toISOString(),
      publishedAt: doc.data().publishedAt?.toDate().toISOString()
    }));

    res.json({ content, count: content.length });
  } catch (error) {
    logger.error('Error fetching content:', error);
    res.status(500).json({ error: 'Failed to fetch content' });
  }
});

/**
 * POST /api/admin/content
 * Create new token-gated content
 */
router.post('/content', requireAdmin, async (req, res) => {
  try {
    const { title, type, url, accessRules, notifyOwners = true } = req.body;

    if (!title || !type || !url) {
      return res.status(400).json({ error: 'Title, type, and URL are required' });
    }

    const contentData = {
      title,
      type,
      url,
      accessRules: accessRules || {},
      notifyOwners,
      createdAt: new Date(),
      publishedAt: new Date(),
      createdBy: req.user?.uid || 'admin'
    };

    const contentRef = await db.collection('content').add(contentData);

    await db.collection('auditLogs').add({
      event: 'content_created',
      contentId: contentRef.id,
      adminId: req.user?.uid,
      timestamp: new Date()
    });

    logger.info(`Content drop created: ${contentRef.id}`);

    res.json({
      success: true,
      contentId: contentRef.id,
      content: { id: contentRef.id, ...contentData }
    });
  } catch (error) {
    logger.error('Error creating content:', error);
    res.status(500).json({ error: 'Failed to create content' });
  }
});

// ============================================
// PROTECTED: User Management
// ============================================

/**
 * GET /api/admin/users
 * List all users
 */
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const { limit = 50, from, to } = req.query;

    let query = db.collection('users');
    if (from || to) {
      if (from) query = query.where('createdAt', '>=', new Date(from));
      if (to) query = query.where('createdAt', '<=', new Date(to));
      query = query.orderBy('createdAt', 'desc');
    }

    const snapshot = await query.limit(parseInt(limit)).get();

    const users = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        walletAddress: data.walletAddress,
        name: data.name,
        email: data.emailPlain,
        profileComplete: data.profileComplete,
        role: data.role,
        createdAt: data.createdAt?.toDate().toISOString()
      };
    });

    res.json({ users, count: users.length });
  } catch (error) {
    logger.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// ============================================
// PROTECTED: Queue Management
// ============================================

/**
 * GET /api/admin/queue/metrics
 * Get transfer queue metrics
 */
router.get('/queue/metrics', requireAdmin, async (req, res) => {
  try {
    // Get transfer job metrics from Firestore
    const allJobs = await db.collection('collectibles').get();
    const statuses = { pending_transfer: 0, active: 0, failed_transfer: 0, transferred: 0, revoked: 0 };

    allJobs.docs.forEach(doc => {
      const status = doc.data().status || 'unknown';
      if (statuses[status] !== undefined) {
        statuses[status]++;
      }
    });

    // Get dead-letter queue items
    const deadLetterSnapshot = await db.collection('transferJobs')
      .where('status', '==', 'dead')
      .get();

    res.json({
      queue: {
        pending: statuses.pending_transfer,
        active: statuses.active,
        completed: statuses.transferred,
        failed: statuses.failed_transfer,
        revoked: statuses.revoked,
        deadLetter: deadLetterSnapshot.size
      },
      totalCollectibles: allJobs.size,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error getting queue metrics:', error);
    res.status(500).json({ error: 'Failed to get queue metrics' });
  }
});

/**
 * POST /api/admin/queue/retry/:collectibleId
 * Retry a failed transfer
 */
router.post('/queue/retry/:collectibleId', requireAdmin, async (req, res) => {
  try {
    const { collectibleId } = req.params;

    const collectibleDoc = await db.collection('collectibles').doc(collectibleId).get();

    if (!collectibleDoc.exists) {
      return res.status(404).json({ error: 'Collectible not found' });
    }

    const collectible = collectibleDoc.data();

    if (!['failed_transfer', 'pending_transfer'].includes(collectible.status)) {
      return res.status(400).json({
        error: 'Collectible is not in a retryable state',
        currentStatus: collectible.status
      });
    }

    // Reset to pending_transfer for re-processing
    await db.collection('collectibles').doc(collectibleId).update({
      status: 'pending_transfer',
      transferAttempts: (collectible.transferAttempts || 0),
      lastTransferAttempt: null,
      updatedAt: new Date()
    });

    // Log retry action
    await db.collection('auditLogs').add({
      event: 'transfer_retry_initiated',
      collectibleId,
      adminEmail: req.adminEmail,
      previousStatus: collectible.status,
      timestamp: new Date()
    });

    logger.info(`Transfer retry initiated for collectible ${collectibleId} by admin ${req.adminEmail}`);

    res.json({ success: true, message: 'Transfer retry initiated', collectibleId });
  } catch (error) {
    logger.error('Error retrying transfer:', error);
    res.status(500).json({ error: 'Failed to retry transfer' });
  }
});

// ============================================
// PROTECTED: CSV Export
// ============================================

// NOTE: all CSV exports were intentionally removed — bulk downloads of
// serials, wallets, and emails are leak paths. Per-record data remains
// available through the individual admin endpoints.

// ============================================
// ORDER MANAGEMENT
// ============================================

import Order from '../models/Order.js';
import { orderFulfillmentService } from '../services/orderFulfillmentService.js';
import Inventory from '../models/Inventory.js';

/**
 * GET /api/admin/orders
 * List all orders with optional status filter and pagination
 */
router.get('/orders', requireAdmin, async (req, res) => {
  try {
    const { status, from, to, limit = 50, offset = 0 } = req.query;
    let query = db.collection('orders').orderBy('createdAt', 'desc');

    // createdAt is a single-field index — range filters need no composite
    // index. Status is filtered in memory so status+date combos never hit
    // the missing (status, createdAt) composite index.
    if (from) query = query.where('createdAt', '>=', new Date(from));
    if (to) query = query.where('createdAt', '<=', new Date(to));

    const snapshot = await query.limit(parseInt(limit)).offset(parseInt(offset)).get();
    const orders = snapshot.docs
      .map(doc => {
        const { allocatedSerials, ...rest } = doc.data();
        return {
          id: doc.id,
          ...rest,
          allocatedSerialCount: Array.isArray(allocatedSerials) ? allocatedSerials.length : 0
        };
      })
      .filter(o => !status || status === 'all' || o.status === status);

    res.json({ orders, count: orders.length });
  } catch (error) {
    logger.error('Error listing orders:', error);
    res.status(500).json({ error: 'Failed to list orders' });
  }
});

/**
 * GET /api/admin/orders/:orderId
 * Get full order detail including allocated serials and collectible entitlements
 */
router.get('/orders/:orderId', requireAdmin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Get inventory items for this order
    const inventoryItems = await Inventory.findByOrderId(req.params.orderId);

    res.json({
      order: {
        id: order.id,
        status: order.status,
        total: order.total,
        items: order.items,
        customerEmail: order.customerEmail,
        shippingAddress: order.shippingAddress,
        trackingNumber: order.trackingNumber,
        allocatedSerials: (order.allocatedSerials || []).map(s =>
          maskSerial(typeof s === 'object' ? s.serialNumber : s)),
        collectibleEntitlements: order.collectibleEntitlements,
        entitlementStatus: order.entitlementStatus,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt
      },
      inventoryItems: inventoryItems.map(inv => ({
        serialNumber: maskSerial(inv.serialNumber),
        productId: inv.productId,
        status: inv.status,
        claimedAt: inv.claimedAt
      }))
    });
  } catch (error) {
    logger.error('Error getting order detail:', error);
    res.status(500).json({ error: 'Failed to get order' });
  }
});

/**
 * POST /api/admin/orders/:orderId/ship
 * Mark an order as shipped with tracking number and carrier
 * Sends shipping confirmation email to customer
 */
router.post('/orders/:orderId/ship', requireAdmin, async (req, res) => {
  try {
    const { trackingNumber, carrier } = req.body;

    if (!trackingNumber || typeof trackingNumber !== 'string') {
      return res.status(400).json({ error: 'Tracking number is required' });
    }

    const result = await orderFulfillmentService.markShipped(
      req.params.orderId,
      trackingNumber.trim(),
      carrier || null
    );

    logger.info(`Order ${req.params.orderId} marked shipped by admin ${req.adminEmail}`);
    res.json(result);
  } catch (error) {
    logger.error('Error marking order shipped:', error);
    res.status(500).json({ error: error.message || 'Failed to mark order shipped' });
  }
});

/**
 * GET /api/admin/fulfillment-failures
 * List all pending fulfillment failures (dead-letter queue)
 */
router.get('/fulfillment-failures', requireAdmin, async (req, res) => {
  try {
    const { status: filterStatus = 'pending' } = req.query;
    const snapshot = await db.collection('fulfillment_failures')
      .where('status', '==', filterStatus)
      .orderBy('createdAt', 'desc')
      .get();

    const failures = snapshot.docs.map(doc => ({ id: doc.id, ...maskSerialFields(doc.data()) }));
    res.json({ failures, count: failures.length });
  } catch (error) {
    logger.error('Error listing fulfillment failures:', error);
    res.status(500).json({ error: 'Failed to list fulfillment failures' });
  }
});

/**
 * POST /api/admin/fulfillment-failures/:sessionId/retry
 * Retry a failed fulfillment
 */
router.post('/fulfillment-failures/:sessionId/retry', requireAdmin, async (req, res) => {
  try {
    const result = await orderFulfillmentService.retryFailedFulfillment(req.params.sessionId);
    logger.info(`Fulfillment retry succeeded for session ${req.params.sessionId} by admin ${req.adminEmail}`);
    res.json(result);
  } catch (error) {
    logger.error('Error retrying fulfillment:', error);
    res.status(500).json({ error: error.message || 'Failed to retry fulfillment' });
  }
});

/**
 * GET /api/admin/inventory/count
 * Get available inventory count by product
 */
router.get('/inventory/count', requireAdmin, async (req, res) => {
  try {
    const { productId } = req.query;
    const count = await Inventory.getAvailableCount(productId || null);
    res.json({ available: count, productId: productId || 'all' });
  } catch (error) {
    logger.error('Error getting inventory count:', error);
    res.status(500).json({ error: 'Failed to get inventory count' });
  }
});

// ============================================
// PROTECTED: Sales Analytics
// ============================================

const SALES_RANGES = {
  today: 'today',
  yesterday: 'yesterday',
  '7d': '7d',
  '30d': '30d',
  all: 'all',
};
const SALES_EXCLUDED_STATUSES = new Set(['pending', 'refunded', 'cancelled']);

/**
 * GET /api/admin/sales?range=today|yesterday|7d|30d|all
 * Revenue + order counts bucketed per UTC day (per month for 'all').
 */
router.get('/sales', requireAdmin, async (req, res) => {
  try {
    const range = SALES_RANGES[req.query.range] || '30d';
    const now = Date.now();
    const DAY = 86400000;
    const todayStart = new Date(now).setUTCHours(0, 0, 0, 0);
    const [from, to] = {
      today: [new Date(todayStart), null],
      yesterday: [new Date(todayStart - DAY), new Date(todayStart)],
      '7d': [new Date(todayStart - 6 * DAY), null],
      '30d': [new Date(todayStart - 29 * DAY), null],
      all: [null, null],
    }[range];

    // Single-field createdAt query — no composite index needed.
    let query = db.collection('orders').orderBy('createdAt', 'desc');
    if (from) query = query.where('createdAt', '>=', from);
    if (to) query = query.where('createdAt', '<', to);

    const snapshot = await query.get();
    const bucketKey = range === 'all'
      ? (d) => d.toISOString().slice(0, 7)
      : (d) => d.toISOString().slice(0, 10);

    const buckets = {};
    const byStatus = {};
    let revenue = 0;
    let paidCount = 0;

    for (const doc of snapshot.docs) {
      const o = doc.data();
      const status = o.status || 'unknown';
      byStatus[status] = (byStatus[status] || 0) + 1;
      if (SALES_EXCLUDED_STATUSES.has(status)) continue;

      const at = o.createdAt?.toDate?.() || (o.createdAt ? new Date(o.createdAt) : null);
      if (!at || isNaN(at)) continue;

      const key = bucketKey(at);
      if (!buckets[key]) buckets[key] = { key, revenue: 0, orders: 0 };
      buckets[key].revenue += o.total || 0;
      buckets[key].orders += 1;
      revenue += o.total || 0;
      paidCount += 1;
    }

    res.json({
      range,
      granularity: range === 'all' ? 'month' : 'day',
      buckets: Object.values(buckets).sort((a, b) => a.key.localeCompare(b.key)),
      totals: { revenue, orders: paidCount, allOrders: snapshot.size },
      byStatus,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error getting sales analytics:', error);
    res.status(500).json({ error: 'Failed to load sales analytics' });
  }
});

// ============================================
// PROTECTED: Contact Inbox
// ============================================

/**
 * GET /api/admin/contact-messages?status=unread|read|all&from&to&limit
 * Contact form submissions persisted by POST /api/contact.
 */
router.get('/contact-messages', requireAdmin, async (req, res) => {
  try {
    const { status, from, to, limit = 100 } = req.query;

    let query = db.collection('contactMessages').orderBy('createdAt', 'desc');
    if (from) query = query.where('createdAt', '>=', new Date(from));
    if (to) query = query.where('createdAt', '<=', new Date(to));

    const snapshot = await query.limit(500).get();
    const unread = snapshot.docs.filter(d => !d.data().read).length;
    const messages = snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null
      }))
      .filter(m => !status || status === 'all' || (status === 'unread' ? !m.read : !!m.read))
      .slice(0, parseInt(limit));

    res.json({ messages, count: messages.length, unread });
  } catch (error) {
    logger.error('Error listing contact messages:', error);
    res.status(500).json({ error: 'Failed to list messages' });
  }
});

/**
 * POST /api/admin/contact-messages/:id/read
 * Body: { read: boolean } — toggles read state on a message.
 */
router.post('/contact-messages/:id/read', requireAdmin, async (req, res) => {
  try {
    const read = req.body?.read !== false;
    const ref = db.collection('contactMessages').doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Message not found' });
    }
    await ref.update({ read, readAt: read ? new Date() : null, readBy: req.adminEmail });
    res.json({ success: true, id: req.params.id, read });
  } catch (error) {
    logger.error('Error updating contact message:', error);
    res.status(500).json({ error: 'Failed to update message' });
  }
});

// ============================================
// PROTECTED: Push Broadcasts
// ============================================

/**
 * GET /api/admin/push
 * Registered token count + recent broadcasts.
 */
router.get('/push', requireAdmin, async (req, res) => {
  try {
    const [tokensSnap, broadcastSnap] = await Promise.all([
      db.collection('pushTokens').get(),
      db.collection('pushBroadcasts').orderBy('createdAt', 'desc').limit(10).get(),
    ]);

    res.json({
      tokens: tokensSnap.size,
      broadcasts: broadcastSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null
      })),
    });
  } catch (error) {
    logger.error('Error getting push info:', error);
    res.status(500).json({ error: 'Failed to load push info' });
  }
});

/**
 * POST /api/admin/push
 * Body: { title, body } — broadcasts a push notification to all tokens.
 */
router.post('/push', requireAdmin, async (req, res) => {
  try {
    const title = String(req.body?.title || '').trim().slice(0, 80);
    const body = String(req.body?.body || '').trim().slice(0, 240);
    if (!title || !body) {
      return res.status(400).json({ error: 'Title and body are required' });
    }

    const { sendPushToAll } = await import('../services/pushService.js');
    const result = await sendPushToAll(title, body, { type: 'admin_broadcast' });
    const sent = result?.sent ?? 0;
    const total = result?.total ?? 0;

    await db.collection('pushBroadcasts').add({
      title, body, sent, total,
      sentBy: req.adminEmail,
      createdAt: new Date(),
    });
    await db.collection('auditLogs').add({
      event: 'push_broadcast',
      adminEmail: req.adminEmail,
      title, sent, total,
      timestamp: new Date(),
    });

    logger.info(`Push broadcast by ${req.adminEmail}: "${title}" → ${sent}/${total} tokens`);
    res.json({ success: true, sent, total, skipped: result?.skipped });
  } catch (error) {
    logger.error('Error sending push broadcast:', error);
    res.status(500).json({ error: 'Failed to send broadcast' });
  }
});

// ============================================
// PROTECTED: Forum Moderation
// ============================================

/**
 * GET /api/admin/forum/posts
 * All posts (newest first) for the moderation queue.
 */
router.get('/forum/posts', requireAdmin, async (req, res) => {
  try {
    const snapshot = await db.collection('forum_posts')
      .orderBy('createdAt', 'desc')
      .limit(200)
      .get();

    const posts = snapshot.docs.map(doc => {
      const d = doc.data();
      return {
        id: doc.id,
        content: d.content || '',
        authorName: d.authorName || 'Anonymous',
        likes: Number(d.likes) || 0,
        dislikes: Number(d.dislikes) || 0,
        replyCount: Number(d.replyCount) || 0,
        createdAt: d.createdAt?.toMillis?.() || null,
      };
    });
    res.json({ posts });
  } catch (error) {
    logger.error('Error listing forum posts:', error);
    res.status(500).json({ error: 'Failed to load forum posts' });
  }
});

/**
 * DELETE /api/admin/forum/posts/:postId
 * Removes a post plus its replies and votes subcollections.
 */
router.delete('/forum/posts/:postId', requireAdmin, async (req, res) => {
  try {
    const ref = db.collection('forum_posts').doc(req.params.postId);
    const snap = await ref.get();
    if (!snap.exists) {
      return res.status(404).json({ error: 'Post not found' });
    }

    await db.recursiveDelete(ref);
    await db.collection('auditLogs').add({
      event: 'forum_post_deleted',
      postId: req.params.postId,
      adminEmail: req.adminEmail,
      timestamp: new Date(),
    });
    logger.info(`Forum post ${req.params.postId} deleted by ${req.adminEmail}`);
    res.json({ success: true });
  } catch (error) {
    logger.error('Error deleting forum post:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

/**
 * DELETE /api/admin/forum/posts/:postId/replies/:replyId
 * Removes a single reply and decrements the parent reply count.
 */
router.delete('/forum/posts/:postId/replies/:replyId', requireAdmin, async (req, res) => {
  try {
    const { postId, replyId } = req.params;
    const postRef = db.collection('forum_posts').doc(postId);
    const replyRef = postRef.collection('forum_replies').doc(replyId);
    const replySnap = await replyRef.get();
    if (!replySnap.exists) {
      return res.status(404).json({ error: 'Reply not found' });
    }

    await replyRef.delete();
    const postSnap = await postRef.get();
    if (postSnap.exists) {
      await postRef.update({
        replyCount: Math.max(0, (Number(postSnap.data().replyCount) || 1) - 1),
      });
    }

    await db.collection('auditLogs').add({
      event: 'forum_reply_deleted',
      postId, replyId,
      adminEmail: req.adminEmail,
      timestamp: new Date(),
    });
    logger.info(`Forum reply ${replyId} on ${postId} deleted by ${req.adminEmail}`);
    res.json({ success: true });
  } catch (error) {
    logger.error('Error deleting forum reply:', error);
    res.status(500).json({ error: 'Failed to delete reply' });
  }
});

export { router as adminRouter };
export default router;
