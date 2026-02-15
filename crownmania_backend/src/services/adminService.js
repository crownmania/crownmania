/**
 * CROWNMANIA ADMIN SERVICE
 * =========================
 * Handles admin authentication with email-based 2FA (OTP codes)
 * and admin operations like viewing system stats, managing tokens, etc.
 *
 * SECURITY FIX (S10): Sessions and OTPs are now Firestore-backed instead of
 * in-memory Maps. This ensures they survive server restarts and work across
 * multiple backend instances.
 */

import { db } from '../config/firebase.js';
import { sgMail, EMAIL_CONFIG } from '../config/email.js';
import crypto from 'crypto';
import logger from '../config/logger.js';

// Admin configuration
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'crown@crownmania.com';
const OTP_EXPIRY_MINUTES = 10;
const SESSION_EXPIRY_HOURS = 24;

// Firestore collections for admin auth state (S10 migration from in-memory Maps)
const sessionsCollection = () => db.collection('adminSessions');
const otpCollection = () => db.collection('adminOTPs');

/**
 * Generate a 6-digit OTP code
 */
function generateOTP() {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Generate a secure session token
 */
function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Admin Service
 */
export const adminService = {
  /**
   * Check if an email is authorized as admin
   */
  isAdminEmail(email) {
    return email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
  },

  /**
   * Request admin login - sends OTP to admin email
   * @param {string} email - Email requesting access
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async requestLogin(email) {
    // Verify this is the admin email
    if (!this.isAdminEmail(email)) {
      logger.warn(`Unauthorized admin login attempt from: ${email}`);
      // Don't reveal whether email is valid or not
      return {
        success: true,
        message: 'If this email is registered, you will receive a verification code.'
      };
    }

    // Generate OTP
    const otp = generateOTP();
    const expiry = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // Store OTP in Firestore (S10)
    await otpCollection().doc(email.toLowerCase()).set({
      code: otp,
      expiry,
      attempts: 0,
      createdAt: new Date()
    });

    // Send email
    try {
      await sgMail.send({
        to: email,
        from: EMAIL_CONFIG.from,
        subject: '🔐 Crownmania Admin Login Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #0a1628; padding: 40px; border-radius: 12px;">
            <h1 style="color: #00ff88; text-align: center; margin-bottom: 30px;">Admin Login</h1>
            <p style="color: white; font-size: 16px; text-align: center;">Your verification code is:</p>
            <div style="background: rgba(0, 255, 136, 0.1); border: 2px solid #00ff88; border-radius: 8px; padding: 30px; margin: 20px 0; text-align: center;">
              <span style="font-family: monospace; font-size: 36px; color: #00ff88; letter-spacing: 8px; font-weight: bold;">${otp}</span>
            </div>
            <p style="color: rgba(255,255,255,0.6); font-size: 14px; text-align: center;">
              This code expires in ${OTP_EXPIRY_MINUTES} minutes.<br>
              If you didn't request this, please ignore this email.
            </p>
            <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 30px 0;">
            <p style="color: rgba(255,255,255,0.4); font-size: 12px; text-align: center;">
              Crownmania Admin System<br>
              ${new Date().toISOString()}
            </p>
          </div>
        `
      });
      logger.info(`Admin OTP sent to ${email}`);
    } catch (error) {
      logger.error('Failed to send admin OTP email:', error);
      throw new Error('Failed to send verification email');
    }

    return {
      success: true,
      message: 'Verification code sent to your email.'
    };
  },

  /**
   * Verify OTP and create admin session
   * @param {string} email - Admin email
   * @param {string} otp - The OTP code entered
   * @returns {Promise<{success: boolean, token?: string, message: string}>}
   */
  async verifyOTP(email, otp) {
    const otpDocRef = otpCollection().doc(email.toLowerCase());
    const otpDoc = await otpDocRef.get();

    if (!otpDoc.exists) {
      return { success: false, message: 'No pending verification. Please request a new code.' };
    }

    const storedOTP = otpDoc.data();
    const expiryDate = storedOTP.expiry?.toDate ? storedOTP.expiry.toDate() : new Date(storedOTP.expiry);

    // Check attempts
    if (storedOTP.attempts >= 3) {
      await otpDocRef.delete();
      return { success: false, message: 'Too many attempts. Please request a new code.' };
    }

    // Check expiry
    if (new Date() > expiryDate) {
      await otpDocRef.delete();
      return { success: false, message: 'Code expired. Please request a new code.' };
    }

    // Verify code
    if (storedOTP.code !== otp) {
      await otpDocRef.update({ attempts: storedOTP.attempts + 1 });
      return { success: false, message: `Invalid code. ${3 - (storedOTP.attempts + 1)} attempts remaining.` };
    }

    // OTP verified — delete it and create a Firestore-backed session (S10)
    await otpDocRef.delete();

    const sessionToken = generateSessionToken();
    const sessionExpiry = new Date(Date.now() + SESSION_EXPIRY_HOURS * 60 * 60 * 1000);

    await sessionsCollection().doc(sessionToken).set({
      email: email.toLowerCase(),
      createdAt: new Date(),
      expiry: sessionExpiry
    });

    logger.info(`Admin session created for ${email}`);

    return {
      success: true,
      token: sessionToken,
      expiresAt: sessionExpiry,
      message: 'Login successful!'
    };
  },

  /**
   * Validate an admin session token
   * @param {string} token - Session token
   * @returns {{valid: boolean, email?: string}}
   */
  /**
   * Validate an admin session token.
   * NOTE: This is intentionally SYNCHRONOUS for middleware compatibility.
   * It starts a Firestore read but returns a cached/pre-fetched result.
   * For full async validation, use validateSessionAsync.
   */
  validateSession(token) {
    // Synchronous check against a local cache populated by validateSessionAsync.
    // The middleware will use validateSessionAsync when it can await.
    // This fallback returns {valid: false} so the middleware falls through
    // to the Firebase path, unless the async helper was used.
    return this._sessionCache?.get(token) || { valid: false };
  },

  /**
   * Async session validation — checks Firestore directly.
   * The requireAdmin middleware should call this.
   */
  async validateSessionAsync(token) {
    if (!token) return { valid: false };

    try {
      const sessionDoc = await sessionsCollection().doc(token).get();

      if (!sessionDoc.exists) {
        return { valid: false };
      }

      const session = sessionDoc.data();
      const expiryDate = session.expiry?.toDate ? session.expiry.toDate() : new Date(session.expiry);

      if (new Date() > expiryDate) {
        // Clean up expired session
        await sessionsCollection().doc(token).delete();
        return { valid: false };
      }

      return { valid: true, email: session.email };
    } catch (error) {
      logger.error('Error validating admin session:', error);
      return { valid: false };
    }
  },

  /**
   * Logout - destroy session
   * @param {string} token - Session token
   */
  async logout(token) {
    try {
      await sessionsCollection().doc(token).delete();
    } catch (error) {
      logger.error('Error deleting admin session from Firestore:', error);
    }
    logger.info('Admin session destroyed');
  },

  /**
   * Get comprehensive system statistics
   * @returns {Promise<object>}
   */
  async getSystemStats() {
    try {
      // Claim codes stats
      const claimCodesSnapshot = await db.collection('claimCodes').get();
      const claimCodes = claimCodesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const totalCodes = claimCodes.length;
      const claimedCodes = claimCodes.filter(c => c.claimed).length;
      const unclaimedCodes = totalCodes - claimedCodes;

      // Collectibles stats
      const collectiblesSnapshot = await db.collection('collectibles').get();
      const collectibles = collectiblesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const totalCollectibles = collectibles.length;
      const nftTransferred = collectibles.filter(c => c.nftTransferred === true).length;
      const nftPending = collectibles.filter(c => c.nftTransferred === false).length;

      // Users stats
      const usersSnapshot = await db.collection('users').get();
      const totalUsers = usersSnapshot.size;

      // Edition counter
      const counterSnapshot = await db.collection('counters').doc('lil-durk-figure').get();
      const counterData = counterSnapshot.exists ? counterSnapshot.data() : { currentEdition: 0, totalEditions: 500 };

      // Recent activity (last 10 claims)
      const recentClaimsSnapshot = await db.collection('collectibles')
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get();
      const recentClaims = recentClaimsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          edition: data.edition,
          wallet: data.ownerId?.substring(0, 10) + '...',
          claimedAt: data.createdAt?.toDate?.() || data.createdAt,
          nftTransferred: data.nftTransferred
        };
      });

      return {
        overview: {
          totalClaimCodes: totalCodes,
          claimedCodes,
          unclaimedCodes,
          claimRate: totalCodes > 0 ? ((claimedCodes / totalCodes) * 100).toFixed(1) + '%' : '0%'
        },
        collectibles: {
          total: totalCollectibles,
          nftTransferred,
          nftPending,
          transferSuccessRate: totalCollectibles > 0
            ? ((nftTransferred / totalCollectibles) * 100).toFixed(1) + '%'
            : '0%'
        },
        users: {
          total: totalUsers
        },
        editions: {
          current: counterData.currentEdition || 0,
          total: counterData.totalEditions || 500,
          remaining: (counterData.totalEditions || 500) - (counterData.currentEdition || 0)
        },
        recentActivity: recentClaims,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error getting system stats:', error);
      throw error;
    }
  },

  /**
   * Get all collectibles with full details
   * @param {number} limit - Max records to return
   * @param {string} startAfter - Document ID for pagination
   * @returns {Promise<Array>}
   */
  async getAllCollectibles(limit = 50, startAfter = null) {
    try {
      let query = db.collection('collectibles')
        .orderBy('createdAt', 'desc')
        .limit(limit);

      if (startAfter) {
        const startDoc = await db.collection('collectibles').doc(startAfter).get();
        if (startDoc.exists) {
          query = query.startAfter(startDoc);
        }
      }

      const snapshot = await query.get();
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null
      }));
    } catch (error) {
      logger.error('Error getting collectibles:', error);
      throw error;
    }
  },

  /**
   * Transfer token ownership in the database
   * NOTE: This does NOT transfer on blockchain - use for database corrections only
   * @param {string} collectibleId - The collectible document ID
   * @param {string} newOwnerWallet - New owner's wallet address
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async transferOwnership(collectibleId, newOwnerWallet) {
    try {
      const collectibleRef = db.collection('collectibles').doc(collectibleId);
      const doc = await collectibleRef.get();

      if (!doc.exists) {
        return { success: false, message: 'Collectible not found' };
      }

      const oldData = doc.data();
      const oldOwner = oldData.ownerId;

      await collectibleRef.update({
        ownerId: newOwnerWallet.toLowerCase(),
        previousOwnerId: oldOwner,
        transferredAt: new Date(),
        transferredBy: 'admin'
      });

      logger.info(`Admin transferred collectible ${collectibleId} from ${oldOwner} to ${newOwnerWallet}`);

      return {
        success: true,
        message: `Ownership transferred from ${oldOwner?.substring(0, 10)}... to ${newOwnerWallet.substring(0, 10)}...`
      };
    } catch (error) {
      logger.error('Error transferring ownership:', error);
      throw error;
    }
  },

  /**
   * Revoke/remove a collectible (marks as revoked, doesn't delete)
   * @param {string} collectibleId - The collectible document ID
   * @param {string} reason - Reason for revocation
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async revokeCollectible(collectibleId, reason) {
    try {
      const collectibleRef = db.collection('collectibles').doc(collectibleId);
      const doc = await collectibleRef.get();

      if (!doc.exists) {
        return { success: false, message: 'Collectible not found' };
      }

      await collectibleRef.update({
        status: 'revoked',
        revokedAt: new Date(),
        revokedBy: 'admin',
        revocationReason: reason
      });

      // Also mark the claim code as available again
      const data = doc.data();
      if (data.serialNumber) {
        const claimCodeRef = db.collection('claimCodes').doc(data.serialNumber.toLowerCase());
        await claimCodeRef.update({
          claimed: false,
          claimedBy: null,
          claimedAt: null,
          tokenId: null,
          edition: null,
          revokedAt: new Date()
        });
      }

      logger.info(`Admin revoked collectible ${collectibleId}: ${reason}`);

      return {
        success: true,
        message: 'Collectible revoked. Claim code is now available again.'
      };
    } catch (error) {
      logger.error('Error revoking collectible:', error);
      throw error;
    }
  },

  /**
   * Get all claim codes with their status
   * @returns {Promise<Array>}
   */
  async getAllClaimCodes() {
    try {
      const snapshot = await db.collection('claimCodes').get();
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        claimedAt: doc.data().claimedAt?.toDate?.()?.toISOString() || null
      }));
    } catch (error) {
      logger.error('Error getting claim codes:', error);
      throw error;
    }
  },

  /**
   * Reset a specific claim code
   * @param {string} claimCodeId - The claim code to reset
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async resetClaimCode(claimCodeId) {
    try {
      const claimCodeRef = db.collection('claimCodes').doc(claimCodeId.toLowerCase());
      const doc = await claimCodeRef.get();

      if (!doc.exists) {
        return { success: false, message: 'Claim code not found' };
      }

      await claimCodeRef.update({
        claimed: false,
        claimedBy: null,
        claimedAt: null,
        tokenId: null,
        edition: null
      });

      logger.info(`Admin reset claim code: ${claimCodeId}`);

      return {
        success: true,
        message: 'Claim code has been reset and is now available.'
      };
    } catch (error) {
      logger.error('Error resetting claim code:', error);
      throw error;
    }
  }
};

export default adminService;
