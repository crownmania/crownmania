import { db, adminStorage } from '../config/firebase.js';
import { contentSecurity } from '../utils/contentSecurity.js';
import { ownershipService } from './ownershipService.js';
import logger from '../config/logger.js';

// Use firebase-admin storage bucket instead of client-side Firebase Storage

// 24-hour access session duration
const ACCESS_SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours
// Signed URL validity (1 hour — refreshed by frontend as needed)
const SIGNED_URL_DURATION = 60 * 60 * 1000; // 1 hour

/**
 * Service for managing content storage and access for token-gated content
 */
export const contentService = {
  /**
   * Upload content to Firebase Storage with metadata
   * @param {Buffer} fileBuffer - The file buffer to upload
   * @param {string} fileName - Original file name
   * @param {string} contentType - MIME type of the content
   * @param {Object} metadata - Content metadata (productId, tokenId, etc.)
   * @returns {Promise<{success: boolean, contentId: string, url: string}>}
   */
  async uploadContent(fileBuffer, fileName, contentType, metadata = {}) {
    try {
      // Generate secure content ID
      const contentId = contentSecurity.generateSecureToken(16);

      // Create storage path: content/{productId}/{contentId}/{filename}
      const storagePath = `content/${metadata.productId || 'general'}/${contentId}/${fileName}`;
      const file = adminStorage.file(storagePath);

      // Prepare metadata for Firebase Storage
      const uploadMetadata = {
        contentType: contentType,
        metadata: {
          contentId: contentId,
          productId: metadata.productId || '',
          tokenId: metadata.tokenId || '',
          uploadedBy: metadata.uploadedBy || '',
          uploadTimestamp: Date.now().toString(),
          originalName: fileName,
          contentCategory: metadata.contentType || 'unknown',
          accessLevel: metadata.accessLevel || 'token_gated'
        }
      };

      // Upload file to Firebase Storage using admin SDK
      await file.save(fileBuffer, uploadMetadata);

      // Content stays PRIVATE — no makePublic(). Access is via signed URLs only.
      const downloadURL = `https://storage.googleapis.com/${adminStorage.name}/${storagePath}`;

      // Store content metadata in Firestore
      const contentDocRef = db.collection('content').doc(contentId);
      await contentDocRef.set({
        contentId: contentId,
        storagePath: storagePath,
        originalName: fileName,
        contentType: contentType,
        size: fileBuffer.length,
        downloadURL: downloadURL, // stored for reference only — file is NOT public
        isPublic: false,
        metadata: {
          ...metadata,
          uploadTimestamp: new Date(),
          lastAccessed: null,
          accessCount: 0
        },
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      return {
        success: true,
        contentId: contentId,
        url: downloadURL,
        storagePath: storagePath
      };
    } catch (error) {
      console.error('Error uploading content:', error);
      throw new Error('Failed to upload content');
    }
  },

  /**
   * Generate a signed URL for temporary content access
   * @param {string} contentId - The content identifier
   * @param {string} walletAddress - Wallet address requesting access
   * @param {number} expiryMinutes - URL expiry time in minutes (default 60)
   * @returns {Promise<{success: boolean, signedUrl: string, expiresAt: number}>}
   */
  async generateSignedUrl(contentId, walletAddress, expiryMinutes = 60) {
    try {
      // Verify content exists and user has access
      const contentDoc = await db.collection('content').doc(contentId).get();
      if (!contentDoc.exists) {
        throw new Error('Content not found');
      }

      const contentData = contentDoc.data();

      // Verify token ownership for gated content
      if (contentData.metadata.accessLevel === 'token_gated') {
        const hasAccess = await this.verifyTokenAccess(contentId, walletAddress);
        if (!hasAccess) {
          throw new Error('Access denied: Token ownership required');
        }
      }

      // Get storage file reference (using admin SDK)
      const file = adminStorage.file(contentData.storagePath);
      if (!file) {
        throw new Error('Storage not configured');
      }

      // Generate a REAL Firebase signed URL (works on private files)
      const expiresAt = Date.now() + (expiryMinutes * 60 * 1000);
      const [signedUrl] = await file.getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: expiresAt,
        responseContentType: contentData.contentType || 'application/octet-stream',
      });

      // Update access tracking
      await db.collection('content').doc(contentId).update({
        'metadata.lastAccessed': new Date(),
        'metadata.accessCount': (contentData.metadata.accessCount || 0) + 1,
        updatedAt: new Date()
      });

      // Log access for audit
      contentSecurity.logSecurityEvent('content_access_granted', {
        contentId: contentId,
        walletAddress: walletAddress?.substring(0, 10) + '...',
        expiryMinutes: expiryMinutes
      }, '', walletAddress);

      return {
        success: true,
        signedUrl: signedUrl,
        expiresAt: expiresAt
      };
    } catch (error) {
      console.error('Error generating signed URL:', error);
      contentSecurity.logSecurityEvent('content_access_denied', {
        contentId: contentId,
        walletAddress: walletAddress?.substring(0, 10) + '...',
        reason: error.message
      }, '', walletAddress);

      throw new Error(`Failed to generate signed URL: ${error.message}`);
    }
  },

  /**
   * Verify if a wallet address has access to specific content
   * @param {string} contentId - The content identifier
   * @param {string} walletAddress - Wallet address to check
   * @returns {Promise<boolean>} - Whether access is granted
   */
  async verifyTokenAccess(contentId, walletAddress) {
    try {
      // Get content metadata
      const contentDoc = await db.collection('content').doc(contentId).get();
      if (!contentDoc.exists) {
        return false;
      }

      const contentData = contentDoc.data();
      const tokenId = contentData.metadata.tokenId;

      if (!tokenId) {
        // Content is not token-gated
        return true;
      }

      // 1. Check Firestore DB for ownership (fast path)
      const tokenDoc = await db.collection('collectibles').doc(tokenId).get();
      if (!tokenDoc.exists) {
        return false;
      }

      const tokenData = tokenDoc.data();
      const dbOwned = tokenData.ownerId === walletAddress.toLowerCase();

      if (dbOwned) {
        // 2. Verify on-chain ownership for extra security (if contract info available)
        const contractAddress = tokenData.contractAddress || process.env.NFT_CONTRACT_ADDRESS;
        const chain = tokenData.chain || 'polygon';
        if (contractAddress && tokenData.blockchainTokenId) {
          try {
            const onChainOwned = await ownershipService.verifyOwnership(
              walletAddress,
              contractAddress,
              tokenData.blockchainTokenId,
              chain
            );
            if (!onChainOwned) {
              logger.warn(`On-chain ownership mismatch for wallet ${walletAddress?.substring(0, 10)}... — DB says owned but chain says not`);
              // If DB says owned but chain disagrees, trust the chain
              return false;
            }
          } catch (onChainErr) {
            // If on-chain check fails (API down, etc.), fall back to DB check
            logger.warn('On-chain verification failed, using DB fallback:', onChainErr.message);
          }
        }
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error verifying token access:', error);
      return false;
    }
  },

  /**
   * Get all content associated with a product
   * @param {string} productId - The product identifier
   * @returns {Promise<Array>} - Array of content objects
   */
  async getProductContent(productId) {
    try {
      const snapshot = await db.collection('content')
        .where('metadata.productId', '==', productId)
        .where('status', '==', 'active')
        .get();

      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          contentId: data.contentId,
          originalName: data.originalName,
          contentType: data.contentType,
          size: data.size,
          metadata: data.metadata,
          createdAt: data.createdAt?.toDate(),
          downloadURL: data.downloadURL
        };
      });
    } catch (error) {
      console.error('Error getting product content:', error);
      throw new Error('Failed to get product content');
    }
  },

  /**
   * Get content accessible by a wallet address
   * @param {string} walletAddress - Wallet address to check
   * @returns {Promise<Array>} - Array of accessible content
   */
  async getAccessibleContent(walletAddress) {
    try {
      // Get all tokens owned by the wallet
      const tokensSnapshot = await db.collection('collectibles')
        .where('ownerId', '==', walletAddress)
        .get();

      const tokenIds = tokensSnapshot.docs.map(doc => doc.id);

      if (tokenIds.length === 0) {
        return [];
      }

      // Get content associated with these tokens
      const contentPromises = tokenIds.map(tokenId =>
        db.collection('content')
          .where('metadata.tokenId', '==', tokenId)
          .where('status', '==', 'active')
          .get()
      );

      const contentSnapshots = await Promise.all(contentPromises);

      const accessibleContent = [];
      contentSnapshots.forEach(snapshot => {
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          accessibleContent.push({
            contentId: data.contentId,
            originalName: data.originalName,
            contentType: data.contentType,
            size: data.size,
            metadata: data.metadata,
            createdAt: data.createdAt?.toDate(),
            downloadURL: data.downloadURL
          });
        });
      });

      return accessibleContent;
    } catch (error) {
      console.error('Error getting accessible content:', error);
      throw new Error('Failed to get accessible content');
    }
  },

  /**
   * Delete content from storage and database
   * @param {string} contentId - The content identifier to delete
   * @returns {Promise<{success: boolean}>}
   */
  async deleteContent(contentId) {
    try {
      // Get content metadata
      const contentDoc = await db.collection('content').doc(contentId).get();
      if (!contentDoc.exists) {
        throw new Error('Content not found');
      }

      const contentData = contentDoc.data();

      // Delete from Firebase Storage using admin SDK
      const file = adminStorage.file(contentData.storagePath);
      await file.delete();

      // Delete from Firestore
      await db.collection('content').doc(contentId).delete();

      return { success: true };
    } catch (error) {
      console.error('Error deleting content:', error);
      throw new Error('Failed to delete content');
    }
  },

  /**
   * Validate signed URL and extract parameters
   * @param {string} url - The signed URL to validate
   * @returns {Object|null} - Extracted parameters or null if invalid
   */
  /**
   * Create or refresh a 24-hour access session for a wallet
   * @param {string} walletAddress - The wallet address
   * @param {string} contentId - The content being accessed
   * @returns {Promise<{sessionId: string, expiresAt: number}>}
   */
  async createAccessSession(walletAddress, contentId) {
    try {
      const now = Date.now();
      const expiresAt = now + ACCESS_SESSION_DURATION;

      // Check for existing active session
      const existing = await db.collection('content_access_sessions')
        .where('walletAddress', '==', walletAddress.toLowerCase())
        .where('contentId', '==', contentId)
        .where('expiresAt', '>', now)
        .limit(1)
        .get();

      if (!existing.empty) {
        const session = existing.docs[0];
        return {
          sessionId: session.id,
          expiresAt: session.data().expiresAt
        };
      }

      // Create new session
      const sessionRef = await db.collection('content_access_sessions').add({
        walletAddress: walletAddress.toLowerCase(),
        contentId,
        createdAt: new Date(),
        expiresAt: expiresAt,
        active: true
      });

      return {
        sessionId: sessionRef.id,
        expiresAt
      };
    } catch (error) {
      logger.error('Error creating access session:', error);
      throw new Error('Failed to create access session');
    }
  },

  /**
   * Verify an active access session exists
   * @param {string} walletAddress - The wallet address
   * @param {string} contentId - The content being accessed
   * @returns {Promise<boolean>}
   */
  async verifyAccessSession(walletAddress, contentId) {
    try {
      const now = Date.now();
      const snapshot = await db.collection('content_access_sessions')
        .where('walletAddress', '==', walletAddress.toLowerCase())
        .where('contentId', '==', contentId)
        .where('expiresAt', '>', now)
        .where('active', '==', true)
        .limit(1)
        .get();

      return !snapshot.empty;
    } catch (error) {
      logger.error('Error verifying access session:', error);
      return false;
    }
  },

  /**
   * Get all exclusive content available to a verified token holder
   * @param {string} walletAddress - The wallet address
   * @returns {Promise<Array>} - Array of content with access status
   */
  async getExclusiveContent(walletAddress) {
    try {
      // Get all active content
      const snapshot = await db.collection('content')
        .where('status', '==', 'active')
        .where('metadata.accessLevel', '==', 'token_gated')
        .get();

      const content = [];
      for (const doc of snapshot.docs) {
        const data = doc.data();
        const hasAccess = await this.verifyTokenAccess(data.contentId, walletAddress);
        const hasSession = hasAccess && await this.verifyAccessSession(walletAddress, data.contentId);

        content.push({
          contentId: data.contentId,
          originalName: data.originalName,
          contentType: data.contentType,
          category: data.metadata?.contentType || 'video',
          size: data.size,
          hasAccess,
          hasActiveSession: hasSession,
          createdAt: data.createdAt?.toDate?.() || null,
          // Never expose the storage URL
          thumbnailUrl: data.metadata?.thumbnailUrl || null,
          title: data.metadata?.title || data.originalName,
          description: data.metadata?.description || null
        });
      }

      return content;
    } catch (error) {
      logger.error('Error getting exclusive content:', error);
      throw new Error('Failed to get exclusive content');
    }
  },

  validateSignedUrl(url) {
    try {
      const urlObj = new URL(url);
      const params = urlObj.searchParams;

      const contentId = params.get('contentId');
      const timestamp = parseInt(params.get('timestamp'));
      const signature = params.get('signature');
      const expires = parseInt(params.get('expires'));
      const wallet = params.get('wallet');

      if (!contentId || !timestamp || !signature || !expires || !wallet) {
        return null;
      }

      // Check if URL has expired
      if (Date.now() > expires) {
        return null;
      }

      // Verify signature
      const isValid = contentSecurity.verifyContentSignature(
        contentId,
        timestamp,
        signature,
        wallet
      );

      if (!isValid) {
        return null;
      }

      return {
        contentId,
        timestamp,
        wallet,
        expires
      };
    } catch (error) {
      console.error('Error validating signed URL:', error);
      return null;
    }
  }
};

export default contentService;