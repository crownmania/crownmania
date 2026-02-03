/**
 * CROWNMANIA ADMIN ROUTES
 * ========================
 * Protected admin endpoints for system management
 */

import express from 'express';
import { adminService } from '../services/adminService.js';
import logger from '../config/logger.js';

const router = express.Router();

// ============================================
// MIDDLEWARE: Admin Authentication
// ============================================
const requireAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Admin authentication required' });
  }

  const token = authHeader.split('Bearer ')[1];
  const session = adminService.validateSession(token);

  if (!session.valid) {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }

  req.adminEmail = session.email;
  next();
};

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

export { router as adminRouter };
export default router;
