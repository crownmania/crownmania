import express from 'express';
import multer from 'multer';
import { contentService } from '../services/contentService.js';
import { contentSecurity } from '../utils/contentSecurity.js';
import { serialNumberLimiter, claimLimiter } from '../middleware/rateLimiter.js';
import requireAdmin from '../middleware/requireAdmin.js';
import { authenticateWallet } from '../middleware/auth.js';
import logger from '../config/logger.js';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit (hardened from 500MB)
    files: 1
  },
  fileFilter: (req, file, cb) => {
    // Allow common media and document types
    const allowedTypes = [
      'video/mp4', 'video/webm', 'video/ogg',
      'audio/mp3', 'audio/wav', 'audio/ogg',
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'text/plain', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed`), false);
    }
  }
});

/**
 * Middleware to extract client IP for security logging
 */
const extractClientIP = (req, res, next) => {
  const clientIP = req.headers['x-forwarded-for']?.split(',')[0] ||
    req.headers['x-real-ip'] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    req.ip ||
    'unknown';
  req.clientIP = clientIP;
  next();
};

/**
 * POST /api/content/upload
 * Upload content to Firebase Storage
 */
router.post('/upload', requireAdmin, extractClientIP, upload.single('file'), async (req, res) => {
  try {
    const { productId, tokenId, contentType, accessLevel } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    // Validate required fields
    if (!productId || !tokenId) {
      return res.status(400).json({ error: 'Product ID and Token ID are required' });
    }

    // Upload content
    const result = await contentService.uploadContent(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      {
        productId,
        tokenId,
        contentType: contentType || 'unknown',
        accessLevel: accessLevel || 'token_gated',
        uploadedBy: req.body.walletAddress || 'system'
      }
    );

    // Log successful upload
    contentSecurity.logSecurityEvent('content_upload_success', {
      contentId: result.contentId,
      productId,
      tokenId,
      fileSize: req.file.size,
      contentType: req.file.mimetype
    }, req.clientIP);

    res.json({
      success: true,
      contentId: result.contentId,
      url: result.url,
      message: 'Content uploaded successfully'
    });
  } catch (error) {
    console.error('Content upload error:', error);

    // Log upload failure
    contentSecurity.logSecurityEvent('content_upload_failed', {
      error: error.message,
      productId: req.body.productId,
      fileSize: req.file?.size
    }, req.clientIP);

    res.status(500).json({ error: 'Failed to upload content' });
  }
});

/**
 * POST /api/content/grant-access/:contentId
 * Requires wallet signature. Verifies on-chain ownership, creates 24-hour access session,
 * and returns a real Firebase signed URL for streaming.
 * @access Private (authenticated wallet)
 */
router.post('/grant-access/:contentId', extractClientIP, serialNumberLimiter, authenticateWallet, async (req, res) => {
  try {
    const { contentId } = req.params;
    const walletAddress = req.wallet; // Set by authenticateWallet middleware

    // Verify token ownership (DB + on-chain)
    const hasAccess = await contentService.verifyTokenAccess(contentId, walletAddress);
    if (!hasAccess) {
      contentSecurity.logSecurityEvent('content_access_denied', {
        contentId,
        walletAddress: walletAddress?.substring(0, 10) + '...',
        reason: 'Token ownership verification failed'
      }, req.clientIP, walletAddress);
      return res.status(403).json({ error: 'Access denied: You must own a Crownmania token to access this content' });
    }

    // Create or refresh 24-hour access session
    const session = await contentService.createAccessSession(walletAddress, contentId);

    // Generate a real Firebase signed URL (1 hour validity — frontend refreshes as needed)
    const signedUrlResult = await contentService.generateSignedUrl(contentId, walletAddress, 60);

    contentSecurity.logSecurityEvent('content_access_granted', {
      contentId,
      walletAddress: walletAddress?.substring(0, 10) + '...',
      sessionId: session.sessionId,
      sessionExpiresAt: session.expiresAt
    }, req.clientIP, walletAddress);

    res.json({
      success: true,
      signedUrl: signedUrlResult.signedUrl,
      signedUrlExpiresAt: signedUrlResult.expiresAt,
      sessionExpiresAt: session.expiresAt,
      message: 'Access granted for 24 hours'
    });
  } catch (error) {
    console.error('Grant access error:', error);
    res.status(403).json({ error: error.message || 'Failed to grant access' });
  }
});

/**
 * GET /api/content/exclusive/:walletAddress
 * Get all exclusive content available to a wallet (metadata only, no URLs)
 * @access Public (wallet address is public on-chain)
 */
router.get('/exclusive/:walletAddress', extractClientIP, serialNumberLimiter, async (req, res) => {
  try {
    const { walletAddress } = req.params;

    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({ error: 'Valid wallet address is required' });
    }

    const content = await contentService.getExclusiveContent(walletAddress);

    res.json({
      success: true,
      content,
      count: content.length
    });
  } catch (error) {
    console.error('Error getting exclusive content:', error);
    res.status(500).json({ error: 'Failed to get exclusive content' });
  }
});

/**
 * GET /api/content/signed-url/:contentId
 * Generate a signed URL for content access (requires wallet auth via query params for video player compatibility)
 * @access Semi-private (wallet address + active session required)
 */
router.get('/signed-url/:contentId', extractClientIP, serialNumberLimiter, async (req, res) => {
  try {
    const { contentId } = req.params;
    const { walletAddress, expiryMinutes } = req.query;

    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    // Sanitize inputs
    const sanitizedContentId = contentSecurity.sanitizeInput(contentId);
    const sanitizedWallet = contentSecurity.sanitizeInput(walletAddress);

    // Check for active 24-hour session first
    const hasSession = await contentService.verifyAccessSession(sanitizedWallet, sanitizedContentId);
    if (!hasSession) {
      // No active session — require full ownership verification
      const hasAccess = await contentService.verifyTokenAccess(sanitizedContentId, sanitizedWallet);
      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied: Token ownership required' });
      }
      // Create session if ownership verified
      await contentService.createAccessSession(sanitizedWallet, sanitizedContentId);
    }

    const expiry = Math.min(parseInt(expiryMinutes) || 60, 1440); // Max 24 hours

    const result = await contentService.generateSignedUrl(
      sanitizedContentId,
      sanitizedWallet,
      expiry
    );

    res.json({
      success: true,
      signedUrl: result.signedUrl,
      expiresAt: result.expiresAt,
      message: 'Signed URL generated successfully'
    });
  } catch (error) {
    console.error('Signed URL generation error:', error);

    // Log access denial
    contentSecurity.logSecurityEvent('signed_url_generation_failed', {
      contentId: req.params.contentId,
      walletAddress: req.query.walletAddress?.substring(0, 10) + '...',
      error: error.message
    }, req.clientIP);

    res.status(403).json({ error: error.message });
  }
});

/**
 * GET /api/content/product/:productId
 * Get all content for a specific product
 */
router.get('/product/:productId', extractClientIP, async (req, res) => {
  try {
    const { productId } = req.params;
    const { walletAddress } = req.query;

    const content = await contentService.getProductContent(productId);

    // Filter content based on wallet access if wallet provided
    let accessibleContent = content;
    if (walletAddress) {
      const accessibleContentPromises = content.map(async (item) => {
        const hasAccess = await contentService.verifyTokenAccess(item.contentId, walletAddress);
        return hasAccess ? item : null;
      });

      accessibleContent = (await Promise.all(accessibleContentPromises)).filter(Boolean);
    }

    res.json({
      success: true,
      content: accessibleContent,
      count: accessibleContent.length
    });
  } catch (error) {
    console.error('Error getting product content:', error);
    res.status(500).json({ error: 'Failed to get product content' });
  }
});

/**
 * GET /api/content/accessible
 * Get content accessible by the requesting wallet
 */
router.get('/accessible', extractClientIP, async (req, res) => {
  try {
    const { walletAddress } = req.query;

    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    const content = await contentService.getAccessibleContent(walletAddress);

    res.json({
      success: true,
      content: content,
      count: content.length
    });
  } catch (error) {
    console.error('Error getting accessible content:', error);
    res.status(500).json({ error: 'Failed to get accessible content' });
  }
});

/**
 * DELETE /api/content/:contentId
 * Delete content (admin only - should be protected)
 */
router.delete('/:contentId', requireAdmin, extractClientIP, async (req, res) => {
  try {
    const { contentId } = req.params;

    await contentService.deleteContent(contentId);

    // Log deletion
    contentSecurity.logSecurityEvent('content_deleted', {
      contentId: contentId
    }, req.clientIP);

    res.json({
      success: true,
      message: 'Content deleted successfully'
    });
  } catch (error) {
    console.error('Content deletion error:', error);
    res.status(500).json({ error: 'Failed to delete content' });
  }
});

/**
 * GET /api/content/validate-url
 * Validate a signed URL (used by content serving middleware)
 */
router.get('/validate-url', (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    const validationResult = contentService.validateSignedUrl(url);

    if (validationResult) {
      res.json({
        valid: true,
        ...validationResult
      });
    } else {
      res.json({ valid: false });
    }
  } catch (error) {
    console.error('URL validation error:', error);
    res.status(500).json({ error: 'Failed to validate URL' });
  }
});

/**
 * GET /api/content/:contentId/metadata
 * Get content metadata without granting access
 */
router.get('/:contentId/metadata', extractClientIP, async (req, res) => {
  try {
    const { contentId } = req.params;

    // Get content document
    const contentDoc = await contentService.db.collection('content').doc(contentId).get();

    if (!contentDoc.exists) {
      return res.status(404).json({ error: 'Content not found' });
    }

    const contentData = contentDoc.data();

    res.json({
      success: true,
      metadata: {
        contentId: contentData.contentId,
        originalName: contentData.originalName,
        contentType: contentData.contentType,
        size: contentData.size,
        createdAt: contentData.createdAt?.toDate(),
        metadata: {
          contentType: contentData.metadata.contentType,
          accessLevel: contentData.metadata.accessLevel,
          uploadTimestamp: contentData.metadata.uploadTimestamp,
          lastAccessed: contentData.metadata.lastAccessed,
          accessCount: contentData.metadata.accessCount
        }
      }
    });
  } catch (error) {
    console.error('Error getting content metadata:', error);
    res.status(500).json({ error: 'Failed to get content metadata' });
  }
});

export default router;