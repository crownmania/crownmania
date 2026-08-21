/**
 * CROWNMANIA ADMIN ROUTES
 * ========================
 * Protected admin endpoints for system management
 */

import express from 'express';
import { adminService } from '../services/adminService.js';
import { db } from '../config/firebase.js';
import requireAdmin from '../middleware/requireAdmin.js';
import logger from '../config/logger.js';

const router = express.Router();

// ============================================
// PUBLIC: Authentication Endpoints
// ============================================

/**
 * POST /api/admin/login
 * Request admin login - sends OTP to email
 */
router.post('/login', async (req, res) => {
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
router.post('/verify', async (req, res) => {
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
    const { limit = 50, startAfter } = req.query;
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
 * Get all claim codes with their status
 */
router.get('/claim-codes', requireAdmin, async (req, res) => {
  try {
    const claimCodes = await adminService.getAllClaimCodes();
    res.json({
      claimCodes,
      total: claimCodes.length,
      claimed: claimCodes.filter(c => c.claimed).length,
      unclaimed: claimCodes.filter(c => !c.claimed).length
    });
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

    let query = db.collection('auditLogs');

    if (event) {
      query = query.where('event', '==', event);
    }

    if (from) {
      query = query.where('timestamp', '>=', new Date(from));
    }

    if (to) {
      query = query.where('timestamp', '<=', new Date(to));
    }

    query = query.orderBy('timestamp', 'desc').limit(parseInt(limit));

    const snapshot = await query.get();

    const logs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate().toISOString()
    }));

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
    const { limit = 50 } = req.query;

    const snapshot = await db.collection('users').limit(parseInt(limit)).get();

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

/**
 * GET /api/admin/export/collectibles
 * Export collectibles data as CSV
 */
router.get('/export/collectibles', requireAdmin, async (req, res) => {
  try {
    const snapshot = await db.collection('collectibles').get();

    const headers = ['ID', 'SerialNumber', 'ProductName', 'Edition', 'TotalEditions', 'OwnerWallet', 'Status', 'TokenId', 'TransactionHash', 'ClaimedAt'];
    const rows = snapshot.docs.map(doc => {
      const d = doc.data();
      return [
        doc.id,
        d.serialNumber || '',
        (d.productName || '').replace(/,/g, ' '),
        d.editionNumber || d.edition || '',
        d.totalEditions || '',
        d.ownerId || '',
        d.status || '',
        d.tokenId || '',
        d.transactionHash || '',
        d.createdAt?.toDate?.()?.toISOString() || ''
      ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=collectibles_${Date.now()}.csv`);
    res.send(csv);

    logger.info(`CSV export: collectibles (${rows.length} rows) by admin ${req.adminEmail}`);
  } catch (error) {
    logger.error('Error exporting collectibles CSV:', error);
    res.status(500).json({ error: 'Failed to export CSV' });
  }
});

/**
 * GET /api/admin/export/users
 * Export users data as CSV (masked PII)
 */
router.get('/export/users', requireAdmin, async (req, res) => {
  try {
    const snapshot = await db.collection('users').get();

    const headers = ['ID', 'WalletAddress', 'Name', 'Email(masked)', 'ProfileComplete', 'TwoFactorEnabled', 'Role', 'CreatedAt'];
    const rows = snapshot.docs.map(doc => {
      const d = doc.data();
      return [
        doc.id,
        d.walletAddress || '',
        (d.name || '').replace(/,/g, ' '),
        d.emailPlain || '[no email]',
        d.profileComplete || false,
        d.twoFactorEnabled || false,
        d.role || 'user',
        d.createdAt?.toDate?.()?.toISOString() || ''
      ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=users_${Date.now()}.csv`);
    res.send(csv);

    logger.info(`CSV export: users (${rows.length} rows) by admin ${req.adminEmail}`);
  } catch (error) {
    logger.error('Error exporting users CSV:', error);
    res.status(500).json({ error: 'Failed to export CSV' });
  }
});

/**
 * GET /api/admin/export/claim-codes
 * Export claim codes data as CSV
 */
router.get('/export/claim-codes', requireAdmin, async (req, res) => {
  try {
    const snapshot = await db.collection('claimCodes').get();

    const headers = ['ID', 'ProductId', 'Claimed', 'ClaimedBy', 'ClaimedAt', 'EditionNumber', 'TokenId'];
    const rows = snapshot.docs.map(doc => {
      const d = doc.data();
      return [
        doc.id,
        d.productId || '',
        d.claimed || false,
        d.claimedBy || '',
        d.claimedAt?.toDate?.()?.toISOString() || '',
        d.editionNumber || '',
        d.tokenId || ''
      ].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=claim_codes_${Date.now()}.csv`);
    res.send(csv);

    logger.info(`CSV export: claim-codes (${rows.length} rows) by admin ${req.adminEmail}`);
  } catch (error) {
    logger.error('Error exporting claim codes CSV:', error);
    res.status(500).json({ error: 'Failed to export CSV' });
  }
});

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
    const { status, limit = 50, offset = 0 } = req.query;
    let query = db.collection('orders').orderBy('createdAt', 'desc');

    if (status) {
      query = query.where('status', '==', status);
    }

    const snapshot = await query.limit(parseInt(limit)).offset(parseInt(offset)).get();
    const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

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
        allocatedSerials: order.allocatedSerials,
        collectibleEntitlements: order.collectibleEntitlements,
        entitlementStatus: order.entitlementStatus,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt
      },
      inventoryItems: inventoryItems.map(inv => ({
        serialNumber: inv.serialNumber,
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

    const failures = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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

export { router as adminRouter };
export default router;
