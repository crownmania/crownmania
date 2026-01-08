import { db } from '../config/firebase.js';
import { sendVerificationEmail, sendClaimConfirmationEmail } from '../config/email.js';
import crypto from 'crypto';
import { contentSecurity } from '../utils/contentSecurity.js';
import { transferNFTToWallet, checkNFTOwnership } from './thirdwebService.js';

/**
 * Service for managing collectible verification and token claiming
 */
export const verificationService = {
  /**
   * Verify a product by its serial number
   * @param {string} serialNumber - The product serial number
   * @returns {Promise<{verified: boolean, product: object|null, message: string}>}
   */
  verifySerialNumber: async (serialNumber) => {
    try {
      // The serial number is actually the claimCodeId (32-char hex)
      // Look up the claim code first
      const claimCodeRef = db.collection('claimCodes').doc(serialNumber.toLowerCase());
      const claimCodeDoc = await claimCodeRef.get();

      if (!claimCodeDoc.exists) {
        return {
          verified: false,
          product: null,
          message: 'Product not found. This may be counterfeit or the serial number is incorrect.'
        };
      }

      const claimCodeData = claimCodeDoc.data();

      // Get the product data
      const productRef = db.collection('products').doc(claimCodeData.productId);
      const productDoc = await productRef.get();

      if (!productDoc.exists) {
        return {
          verified: false,
          product: null,
          message: 'Product configuration error. Please contact support.'
        };
      }

      const productData = productDoc.data();

      // Check if the code has already been claimed
      if (claimCodeData.claimed || claimCodeData.claimedBy) {
        return {
          verified: true,
          claimed: true,
          product: {
            id: serialNumber,
            productId: claimCodeData.productId,
            name: productData.name,
            type: productData.type,
            imageUrl: productData.imageUrl || productData.images?.[0],
            claimedBy: claimCodeData.claimedBy,
            claimedAt: claimCodeData.claimedAt
          },
          message: 'Product is authentic but digital token has already been claimed.'
        };
      }

      return {
        verified: true,
        claimed: false,
        product: {
          id: serialNumber,
          productId: claimCodeData.productId,
          name: productData.name,
          type: productData.type,
          description: productData.description,
          imageUrl: productData.imageUrl || productData.images?.[0],
          modelUrl: productData.modelUrl
        },
        message: 'Product verified successfully.'
      };
    } catch (error) {
      console.error('Error verifying serial number:', error);
      throw new Error('Failed to verify product');
    }
  },

  /**
   * Verify a claim code from QR scan (looks up claimCodes collection, then gets product)
   * @param {string} claimCodeId - The unique claim code ID from the QR sticker
   * @param {string} productType - The product type (optional validation)
   * @param {string} clientIP - Client IP address for audit logging
   * @returns {Promise<{verified: boolean, product: object|null, message: string}>}
   */
  verifyProductById: async (claimCodeId, productType, clientIP = '') => {
    try {
      // Sanitize input
      const sanitizedCodeId = contentSecurity.sanitizeInput(claimCodeId);

      // Log verification attempt
      contentSecurity.logSecurityEvent('serial_verification_attempt', {
        claimCodeId: sanitizedCodeId?.substring(0, 8) + '...', // Only log first 8 chars
        productType,
        method: 'qr_scan'
      }, clientIP);

      // First, look up the claim code
      const claimCodeRef = db.collection('claimCodes').doc(sanitizedCodeId.toLowerCase());
      const claimCodeDoc = await claimCodeRef.get();

      if (!claimCodeDoc.exists) {
        // Log failed verification
        contentSecurity.logSecurityEvent('serial_verification_failed', {
          claimCodeId: sanitizedCodeId?.substring(0, 8) + '...',
          reason: 'code_not_found',
          productType
        }, clientIP);

        return {
          verified: false,
          product: null,
          message: 'Invalid code. This may be counterfeit or the QR code is damaged.'
        };
      }

      const claimCodeData = claimCodeDoc.data();

      // Check if already claimed
      if (claimCodeData.claimed || claimCodeData.claimedBy) {
        // Get product info for display even if claimed
        const productRef = db.collection('products').doc(claimCodeData.productId);
        const productDoc = await productRef.get();
        const productData = productDoc.exists ? productDoc.data() : {};

        return {
          verified: true,
          claimed: true,
          product: {
            id: claimCodeId,
            productId: claimCodeData.productId,
            name: productData.name || 'Crownmania Collectible',
            type: productData.type,
            description: productData.description,
            imageUrl: productData.imageUrl || productData.images?.[0],
            edition: claimCodeData.edition,
            totalEditions: 500,
            claimedBy: claimCodeData.claimedBy,
            claimedAt: claimCodeData.claimedAt
          },
          message: 'This product is authentic but has already been claimed.'
        };
      }

      // Get the product details
      const productRef = db.collection('products').doc(claimCodeData.productId);
      const productDoc = await productRef.get();

      if (!productDoc.exists) {
        return {
          verified: false,
          product: null,
          message: 'Product configuration error. Please contact support.'
        };
      }

      const productData = productDoc.data();

      // Optionally verify product type matches
      if (productType && productData.type !== parseInt(productType)) {
        return {
          verified: false,
          product: null,
          message: 'Product type mismatch. This QR code may have been tampered with.'
        };
      }

      return {
        verified: true,
        claimed: false,
        product: {
          id: claimCodeId,  // The claim code ID (for claiming)
          productId: claimCodeData.productId,
          name: productData.name,
          type: productData.type,
          description: productData.description,
          imageUrl: productData.imageUrl || productData.images?.[0],
          modelUrl: productData.modelUrl
        },
        message: 'Product verified successfully. Ready to claim your Digital Twin NFT!'
      };
    } catch (error) {
      console.error('Error verifying claim code:', error);
      throw new Error('Failed to verify product');
    }
  },

  /**
   * Claim a product to a wallet address by claim code ID
   * @param {string} claimCodeId - The unique claim code ID from QR sticker
   * @param {string} walletAddress - The wallet address to claim to
   * @param {string} signature - Signed proof of ownership
   * @param {string} message - The signed message
   * @param {string} clientIP - Client IP address for audit logging
   * @returns {Promise<{success: boolean, tokenId: string|null, message: string}>}
   */
  claimProduct: async (claimCodeId, walletAddress, signature, message, clientIP = '') => {
    try {
      // Sanitize inputs
      const sanitizedCodeId = contentSecurity.sanitizeInput(claimCodeId);
      const sanitizedWallet = contentSecurity.sanitizeInput(walletAddress);

      // Log claim attempt
      contentSecurity.logSecurityEvent('nft_claim_attempt', {
        claimCodeId: sanitizedCodeId?.substring(0, 8) + '...',
        walletAddress: sanitizedWallet?.substring(0, 10) + '...',
        hasSignature: !!signature,
        hasMessage: !!message
      }, clientIP, sanitizedWallet);

      // Look up the claim code
      const claimCodeRef = db.collection('claimCodes').doc(sanitizedCodeId.toLowerCase());
      const claimCodeDoc = await claimCodeRef.get();

      if (!claimCodeDoc.exists) {
        // Log failed claim
        contentSecurity.logSecurityEvent('nft_claim_failed', {
          claimCodeId: sanitizedCodeId?.substring(0, 8) + '...',
          walletAddress: sanitizedWallet?.substring(0, 10) + '...',
          reason: 'invalid_claim_code'
        }, clientIP, sanitizedWallet);

        return {
          success: false,
          tokenId: null,
          message: 'Invalid claim code'
        };
      }

      const claimCodeData = claimCodeDoc.data();

      // Check if already claimed
      if (claimCodeData.claimed || claimCodeData.claimedBy) {
        return {
          success: false,
          tokenId: null,
          message: 'This product has already been claimed'
        };
      }

      // Get product details
      const productRef = db.collection('products').doc(claimCodeData.productId);
      const productDoc = await productRef.get();
      const productData = productDoc.exists ? productDoc.data() : {};

      // Get next edition number using atomic counter
      const counterRef = db.collection('counters').doc(claimCodeData.productId);
      let editionNumber;

      await db.runTransaction(async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        if (counterDoc.exists) {
          editionNumber = (counterDoc.data().currentEdition || 0) + 1;
          transaction.update(counterRef, { currentEdition: editionNumber });
        } else {
          editionNumber = 1;
          transaction.set(counterRef, { currentEdition: 1, totalEditions: 500 });
        }
      });

      // Create Collectible record (source of truth for owned items)
      const tokenId = `NFT-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      const collectibleRef = db.collection('collectibles').doc();
      await collectibleRef.set({
        serialNumber: claimCodeId,
        productId: claimCodeData.productId,
        ownerId: walletAddress,
        status: 'claimed',
        tokenId: tokenId,
        edition: editionNumber,
        totalEditions: 500,
        productName: productData.name,
        productType: productData.type,
        signature: signature || null,
        message: message || null,
        metadata: {
          name: `${productData.name || 'Crownmania Collectible'} #${editionNumber}`,
          description: productData.description,
          image: productData.imageUrl || productData.images?.[0],
          modelUrl: productData.modelUrl
        },
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Mark claim code as claimed with edition number
      await claimCodeRef.update({
        claimed: true,
        tokenId: tokenId,
        edition: editionNumber,
        claimedBy: walletAddress,
        claimedAt: new Date()
      });

      // Transfer the actual NFT on Polygon via Thirdweb
      let nftTransferResult = null;
      try {
        nftTransferResult = await transferNFTToWallet(walletAddress);
        console.log('NFT Transfer successful:', nftTransferResult);

        // Update collectible with blockchain transaction info
        await collectibleRef.update({
          blockchainTokenId: nftTransferResult.tokenId,
          transactionHash: nftTransferResult.transactionHash,
          contractAddress: nftTransferResult.contractAddress,
          nftTransferred: true
        });
      } catch (nftError) {
        console.error('NFT Transfer failed (claim still recorded):', nftError.message);
        // The claim is still valid, but NFT transfer failed
        // This can be retried later
        await collectibleRef.update({
          nftTransferError: nftError.message,
          nftTransferred: false
        });
      }

      return {
        success: true,
        tokenId: tokenId,
        blockchainTokenId: nftTransferResult?.tokenId || null,
        transactionHash: nftTransferResult?.transactionHash || null,
        edition: editionNumber,
        totalEditions: 500,
        productName: productData.name,
        nftTransferred: !!nftTransferResult,
        message: nftTransferResult
          ? `NFT transferred successfully! You own Edition #${editionNumber} of 500. TX: ${nftTransferResult.transactionHash?.substring(0, 10)}...`
          : `Claim recorded! NFT transfer pending - Edition #${editionNumber} of 500.`
      };

      // Note: Email notification would be sent here if user email is available
      // The frontend can trigger this via a separate endpoint if needed

    } catch (error) {
      console.error('Error claiming product:', error);
      throw new Error('Failed to claim product');
    }
  },

  /**
   * Generate a time-limited verification token for email verification
   * @param {string} serialNumber - The product serial number
   * @param {string} email - The email to verify against
   * @returns {Promise<{success: boolean, message: string}>}
   */
  generateEmailVerification: async (serialNumber, email) => {
    try {
      // Verify the serial number first
      const { verified, product } = await verificationService.verifySerialNumber(serialNumber);

      if (!verified || !product) {
        return { success: false, message: 'Invalid serial number' };
      }

      // Get product details from Firestore to verify the email
      const productRef = db.collection('products').doc(product.id);
      const productDoc = await productRef.get();
      const productData = productDoc.data();

      // Verify that the email matches the purchase email
      if (productData.purchaseEmail.toLowerCase() !== email.toLowerCase()) {
        return {
          success: false,
          message: 'Email does not match the purchase record'
        };
      }

      // Generate a secure verification token (valid for 15 minutes)
      const token = crypto.randomBytes(32).toString('hex');
      const expiryTime = new Date();
      expiryTime.setMinutes(expiryTime.getMinutes() + 15);

      // Store the token in Firestore
      await db.collection('verificationTokens').add({
        token,
        serialNumber,
        email,
        expiryTime,
        createdAt: new Date(),
        used: false
      });

      // Send verification email
      await sendVerificationEmail(email, token, serialNumber);

      return {
        success: true,
        message: 'Verification email sent. Please check your inbox.'
      };
    } catch (error) {
      console.error('Error generating email verification:', error);
      throw new Error('Failed to generate email verification');
    }
  },

  /**
   * Verify a token sent via email
   * @param {string} token - The verification token
   * @returns {Promise<{success: boolean, serialNumber: string|null, message: string}>}
   */
  verifyToken: async (token) => {
    try {
      // Find the token in Firestore
      const tokenRef = db.collection('verificationTokens');
      const snapshot = await tokenRef.where('token', '==', token).where('used', '==', false).get();

      if (snapshot.empty) {
        return {
          success: false,
          serialNumber: null,
          message: 'Invalid or expired token'
        };
      }

      // Get the token data
      const tokenDoc = snapshot.docs[0];
      const tokenData = tokenDoc.data();

      // Check if token has expired
      const expiryTime = tokenData.expiryTime.toDate();
      if (expiryTime < new Date()) {
        return {
          success: false,
          serialNumber: null,
          message: 'Token has expired'
        };
      }

      // Mark token as used
      await tokenRef.doc(tokenDoc.id).update({ used: true });

      return {
        success: true,
        serialNumber: tokenData.serialNumber,
        message: 'Token verified successfully'
      };
    } catch (error) {
      console.error('Error verifying token:', error);
      throw new Error('Failed to verify token');
    }
  },

  /**
   * Issue a token to the user after successful verification
   * @param {string} serialNumber - The verified serial number
   * @param {string} walletAddress - The wallet address to issue the token to
   * @returns {Promise<{success: boolean, tokenId: string|null, message: string}>}
   */
  issueToken: async (serialNumber, walletAddress) => {
    try {
      // Find the product in Firestore
      const productRef = db.collection('products');
      const snapshot = await productRef.where('serialNumber', '==', serialNumber).get();

      if (snapshot.empty) {
        return {
          success: false,
          tokenId: null,
          message: 'Product not found'
        };
      }

      // Get the product data
      const productDoc = snapshot.docs[0];
      const productData = productDoc.data();

      // Check if token has already been claimed
      if (productData.tokenClaimed) {
        return {
          success: false,
          tokenId: null,
          message: 'Token has already been claimed for this product'
        };
      }

      // Create a token record in Firestore (in a real-world scenario, this would involve blockchain operations)
      const tokenRef = await db.collection('tokens').add({
        productId: productDoc.id,
        serialNumber,
        walletAddress,
        modelUrl: productData.modelUrl,
        productName: productData.name,
        issuedAt: new Date(),
        metadata: {
          name: `${productData.name} #${serialNumber.slice(-6)}`,
          description: productData.description,
          image: productData.imageUrl
        }
      });

      // Mark the product as claimed
      await productRef.doc(productDoc.id).update({
        tokenClaimed: true,
        tokenId: tokenRef.id,
        claimedBy: walletAddress,
        claimedAt: new Date()
      });

      return {
        success: true,
        tokenId: tokenRef.id,
        message: 'Token issued successfully'
      };
    } catch (error) {
      console.error('Error issuing token:', error);
      throw new Error('Failed to issue token');
    }
  },

  /**
   * Get all tokens owned by a wallet address
   * @param {string} walletAddress - The wallet address to check
   * @returns {Promise<Array>} - Array of token objects
   */
  getWalletTokens: async (walletAddress) => {
    try {
      // Find all collectibles owned by the wallet address
      const collectiblesRef = db.collection('collectibles');
      const snapshot = await collectiblesRef.where('ownerId', '==', walletAddress).get();

      if (snapshot.empty) {
        return [];
      }

      // Map the collectibles to a user-friendly format
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          productId: data.productId,
          productName: data.productName,
          serialNumber: data.serialNumber,
          tokenId: data.tokenId,
          modelUrl: data.metadata?.modelUrl || data.modelUrl,
          imageUrl: data.metadata?.image,
          issuedAt: data.createdAt ? data.createdAt.toDate() : new Date(),
          metadata: data.metadata
        };
      });
    } catch (error) {
      console.error('Error getting wallet tokens:', error);
      throw new Error('Failed to get wallet tokens');
    }
  }
};

export default verificationService;