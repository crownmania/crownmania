import { db, adminStorage } from '../config/firebase.js';
import { contentSecurity } from '../utils/contentSecurity.js';

// Use firebase-admin storage bucket instead of client-side Firebase Storage

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

      // Make file publicly readable and get URL
      await file.makePublic();
      const downloadURL = `https://storage.googleapis.com/${adminStorage.name}/${storagePath}`;

      // Store content metadata in Firestore
      const contentDocRef = db.collection('content').doc(contentId);
      await contentDocRef.set({
        contentId: contentId,
        storagePath: storagePath,
        originalName: fileName,
        contentType: contentType,
        size: fileBuffer.length,
        downloadURL: downloadURL,
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

      // Generate signed URL using Firebase's built-in signed URLs
      // Note: Firebase Storage doesn't have built-in signed URLs like AWS S3,
      // so we'll use a custom approach with time-limited tokens
      const timestamp = Date.now();
      const expiresAt = timestamp + (expiryMinutes * 60 * 1000);

      // Generate access signature
      const signature = contentSecurity.generateContentSignature(
        contentId,
        timestamp,
        walletAddress
      );

      // Create signed URL with parameters
      const baseUrl = contentData.downloadURL.split('?')[0]; // Remove any existing params
      const signedUrl = `${baseUrl}?contentId=${contentId}&timestamp=${timestamp}&signature=${signature}&expires=${expiresAt}&wallet=${walletAddress}`;

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

      // Check if wallet owns the required token
      const tokenDoc = await db.collection('collectibles').doc(tokenId).get();
      if (!tokenDoc.exists) {
        return false;
      }

      const tokenData = tokenDoc.data();
      return tokenData.ownerId === walletAddress;
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