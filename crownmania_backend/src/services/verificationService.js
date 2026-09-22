import { db } from '../config/firebase.js';
import { sendClaimConfirmationEmail, sendAdminAlertEmail } from '../config/email.js';
import crypto from 'crypto';
import { contentSecurity } from '../utils/contentSecurity.js';
import { claimNFTToWallet, transferNFTToWallet, checkNFTOwnership } from './thirdwebService.js';
import signatureService from './signatureService.js';
import { queueService } from './queueService.js';
import logger from '../config/logger.js';

/**
 * Service for managing collectible verification and token claiming
 */
export const verificationService = {
  /**
   * Validate serial number / claim code format
   * Accepts 6-20 char alphanumeric (printed serials) or 32-char hex (claim code IDs)
   */
  SERIAL_FORMAT_REGEX: /^[a-fA-F0-9]{32}$|^[A-Z0-9]{6,20}$/,

  /**
   * Verify a product by its serial number
   * @param {string} serialNumber - The product serial number
   * @returns {Promise<{verified: boolean, product: object|null, message: string}>}
   */
  verifySerialNumber: async (serialNumber) => {
    try {
      // Validate serial format before DB lookup (prevents enumeration with garbage input)
      if (!verificationService.SERIAL_FORMAT_REGEX.test(serialNumber)) {
        return {
          verified: false,
          product: null,
          message: 'Invalid serial number format.'
        };
      }

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

      // Revoked codes are dead ends — do not confirm authenticity
      if (claimCodeData.revoked) {
        return {
          verified: false,
          product: null,
          message: 'This code is no longer valid. Please contact support.'
        };
      }

      // Check if the code has already been claimed
      if (claimCodeData.claimed || claimCodeData.claimedBy) {
        // Look up the collectible record for full token details
        const collectibleSnapshot = await db.collection('collectibles')
          .where('serialNumber', '==', serialNumber.toLowerCase())
          .limit(1)
          .get();

        const collectibleData = collectibleSnapshot.empty ? null : collectibleSnapshot.docs[0].data();

        return {
          valid: true,
          verified: true,
          claimed: true,
          product: {
            id: serialNumber,
            productId: claimCodeData.productId,
            name: productData.name,
            type: productData.type,
            imageUrl: productData.imageUrl || productData.images?.[0],
            claimedBy: claimCodeData.claimedBy,
            claimedAt: claimCodeData.claimedAt,
            edition: claimCodeData.edition,
            totalEditions: 500
          },
          tokenId: collectibleData?.blockchainTokenId || collectibleData?.tokenId || claimCodeData.blockchainTokenId || claimCodeData.tokenId || null,
          transactionHash: collectibleData?.transactionHash || claimCodeData.transactionHash || null,
          contractAddress: collectibleData?.contractAddress || process.env.NFT_CONTRACT_ADDRESS || process.env.THIRDWEB_NFT_CONTRACT || null,
          status: collectibleData?.status || 'claimed',
          nftTransferred: collectibleData?.nftTransferred === true || claimCodeData.tokenId ? true : false,
          claimDate: collectibleData?.createdAt?.toDate ? collectibleData.createdAt.toDate().toISOString() : new Date().toISOString(),
          message: 'Product is authentic and digital token has been claimed.'
        };
      }

      return {
        valid: true,
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
      logger.error('Error verifying serial number:', error);
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
      // Validate claim code format before DB lookup
      if (!verificationService.SERIAL_FORMAT_REGEX.test(claimCodeId)) {
        return {
          verified: false,
          product: null,
          message: 'Invalid claim code format.'
        };
      }

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

      // Revoked codes are dead ends — do not confirm authenticity
      if (claimCodeData.revoked) {
        return {
          verified: false,
          product: null,
          message: 'This code is no longer valid. Please contact support.'
        };
      }

      // Check if already claimed
      if (claimCodeData.claimed || claimCodeData.claimedBy) {
        // Get product info for display even if claimed
        const productRef = db.collection('products').doc(claimCodeData.productId);
        const productDoc = await productRef.get();
        const productData = productDoc.exists ? productDoc.data() : {};

        // Look up the collectible record for full token details
        const collectibleSnapshot = await db.collection('collectibles')
          .where('serialNumber', '==', sanitizedCodeId.toLowerCase())
          .limit(1)
          .get();

        const collectibleData = collectibleSnapshot.empty ? null : collectibleSnapshot.docs[0].data();

        return {
          valid: true,
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
            claimedAt: claimCodeData.claimedAt,
            claimDate: claimCodeData.claimedAt?.toDate ? claimCodeData.claimedAt.toDate().toISOString() : new Date().toISOString()
          },
          tokenId: collectibleData?.blockchainTokenId || collectibleData?.tokenId || claimCodeData.blockchainTokenId || claimCodeData.tokenId || null,
          transactionHash: collectibleData?.transactionHash || claimCodeData.transactionHash || null,
          contractAddress: collectibleData?.contractAddress || process.env.NFT_CONTRACT_ADDRESS || process.env.THIRDWEB_NFT_CONTRACT || null,
          status: collectibleData?.status || 'claimed',
          nftTransferred: collectibleData?.nftTransferred === true || claimCodeData.tokenId ? true : false,
          claimDate: collectibleData?.createdAt?.toDate ? collectibleData.createdAt.toDate().toISOString() :
            (claimCodeData.claimedAt?.toDate ? claimCodeData.claimedAt.toDate().toISOString() : new Date().toISOString()),
          message: 'This product is authentic and its digital token has been claimed.'
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
        valid: true,
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
      logger.error('Error verifying claim code:', error);
      throw new Error('Failed to verify product');
    }
  },

  /**
   * Claim a product to a wallet address by claim code ID
   * Uses a single Firestore transaction to prevent race conditions and duplicate claims.
   * @param {string} claimCodeId - The unique claim code ID from QR sticker
   * @param {string} walletAddress - The wallet address to claim to
   * @param {string} signature - Signed proof of ownership
   * @param {string} message - The signed message
   * @param {string} clientIP - Client IP address for audit logging
   * @returns {Promise<{success: boolean, tokenId: string|null, message: string}>}
   */
  claimProduct: async (claimCodeId, walletAddress, signature, message, clientIP = '', claimant = {}) => {
    try {
      // Sanitize inputs
      const sanitizedCodeId = contentSecurity.sanitizeInput(claimCodeId);
      const sanitizedWallet = contentSecurity.sanitizeInput(walletAddress);

      // Validate serial format (32-char hex for claim codes)
      if (!sanitizedCodeId || !/^[a-f0-9]{32}$/i.test(sanitizedCodeId)) {
        return {
          success: false,
          tokenId: null,
          message: 'Invalid serial number format'
        };
      }

      // Validate wallet address format
      if (!sanitizedWallet || !/^0x[a-fA-F0-9]{40}$/.test(sanitizedWallet)) {
        return {
          success: false,
          tokenId: null,
          message: 'Invalid wallet address format'
        };
      }

      // Signature already verified by authenticateWallet middleware,
      // which uses the getNonceHandler nonce system (in-memory).
      // signatureService.verifySignature uses a different Firestore-based
      // nonce system that is incompatible — calling it here always fails
      // because the nonce was never stored in Firestore.

      // Log claim attempt
      contentSecurity.logSecurityEvent('nft_claim_attempt', {
        claimCodeId: sanitizedCodeId?.substring(0, 8) + '...',
        walletAddress: sanitizedWallet?.substring(0, 10) + '...',
        hasSignature: !!signature,
        hasMessage: !!message
      }, clientIP, sanitizedWallet);

      // Generate token ID before transaction (no DB dependency)
      const tokenId = `NFT-${crypto.randomBytes(5).toString('hex').toUpperCase()}`;

      // Prepare document references
      const claimCodeRef = db.collection('claimCodes').doc(sanitizedCodeId.toLowerCase());
      const collectibleRef = db.collection('collectibles').doc();

      // Result object to be populated by transaction
      let claimResult = null;
      let claimCodeData = null;

      // Execute entire claim in a single atomic transaction
      await db.runTransaction(async (transaction) => {
        // Step 1: Get and validate claim code
        const claimCodeDoc = await transaction.get(claimCodeRef);

        if (!claimCodeDoc.exists) {
          contentSecurity.logSecurityEvent('nft_claim_failed', {
            claimCodeId: sanitizedCodeId?.substring(0, 8) + '...',
            walletAddress: sanitizedWallet?.substring(0, 10) + '...',
            reason: 'invalid_claim_code'
          }, clientIP, sanitizedWallet);

          throw new Error('CLAIM_ERROR:Invalid claim code');
        }

        claimCodeData = claimCodeDoc.data();

        // Step 2: Check if already claimed or revoked (race condition prevention)
        if (claimCodeData.revoked) {
          throw new Error('CLAIM_ERROR:This claim code is no longer valid');
        }
        if (claimCodeData.claimed || claimCodeData.claimedBy) {
          throw new Error('CLAIM_ERROR:This product has already been claimed');
        }

        // Step 3: Get product details
        const productRef = db.collection('products').doc(claimCodeData.productId);
        const productDoc = await transaction.get(productRef);

        if (!productDoc.exists) {
          throw new Error('CLAIM_ERROR:Product not found for the given claim code');
        }

        const productData = productDoc.data();
        const totalEditions = productData.totalEditions || 500;

        // Step 4: Get and increment edition counter atomically
        // Test codes skip this — they don't consume real edition numbers
        const counterRef = db.collection('counters').doc(claimCodeData.productId);
        const counterDoc = claimCodeData.isTestCode ? null : await transaction.get(counterRef);

        let editionNumber;
        if (claimCodeData.isTestCode) {
          editionNumber = null;
        } else if (counterDoc.exists) {
          const currentData = counterDoc.data();
          editionNumber = (currentData.currentEdition || 0) + 1;

          if (editionNumber > (currentData.totalEditions || totalEditions)) {
            throw new Error('CLAIM_ERROR:All editions for this product have been claimed');
          }

          transaction.update(counterRef, { currentEdition: editionNumber });
        } else {
          editionNumber = 1;
          transaction.set(counterRef, {
            currentEdition: 1,
            totalEditions: totalEditions
          });
        }

        // Step 5: Create Collectible record (source of truth for owned items)
        const collectibleData = {
          serialNumber: claimCodeId,
          productId: claimCodeData.productId,
          ownerId: walletAddress.toLowerCase(),
          status: 'claimed',
          tokenId: tokenId,
          edition: editionNumber,
          totalEditions: totalEditions,
          productName: productData.name,
          productType: productData.type,
          signature: signature || null,
          message: message || null,
          claimedByEmail: claimant.email || null,
          claimedByAuth: claimant.auth || null,
          metadata: {
            name: editionNumber
              ? `${productData.name || 'Crownmania Collectible'} #${editionNumber}`
              : `${productData.name || 'Crownmania Collectible'} (TEST)`,
            description: productData.description,
            image: productData.imageUrl || productData.images?.[0],
            modelUrl: productData.modelUrl
          },
          createdAt: new Date(),
          updatedAt: new Date()
        };
        transaction.set(collectibleRef, collectibleData);

        // Step 6: Mark claim code as claimed
        transaction.update(claimCodeRef, {
          claimed: true,
          tokenId: tokenId,
          edition: editionNumber,
          claimedBy: walletAddress.toLowerCase(),
          claimedByEmail: claimant.email || null,
          claimedByAuth: claimant.auth || null,
          claimedAt: new Date()
        });

        // Store result for use after transaction
        claimResult = {
          tokenId,
          editionNumber,
          totalEditions,
          productName: productData.name,
          collectibleId: collectibleRef.id
        };
      });

      // Test codes exercise the full claim flow without a real on-chain
      // transfer or customer-facing notifications — the mint pipeline is
      // already covered by production claims.
      if (claimCodeData?.isTestCode) {
        await collectibleRef.update({
          status: 'test_claimed',
          isTest: true,
          nftTransferred: false
        });
        claimResult.isTestCode = true;
      } else {
      // Transaction succeeded - now enqueue NFT transfer job (outside transaction)
      // Using queue ensures reliability with automatic retries
      try {
        const job = await queueService.enqueueTransfer({
          collectibleId: collectibleRef.id,
          toAddress: sanitizedWallet,
          tokenId: claimResult.editionNumber  // Edition number (for logging; actual token ID assigned on-chain by claim)
        });

        await collectibleRef.update({
          status: 'pending_transfer',
          transferEnqueuedAt: new Date()
        });

        if (job) {
          logger.info(`NFT transfer job enqueued for collectible ${collectibleRef.id}`);
        } else {
          // Redis queue unavailable — transfer directly (fire-and-forget so the
          // claim response returns immediately; the frontend polls transfer-status)
          logger.info(`Queue unavailable — transferring NFT directly for collectible ${collectibleRef.id}`);
          (async () => {
            try {
              const transferResult = await claimNFTToWallet(sanitizedWallet);
              await collectibleRef.update({
                nftTransferred: true,
                status: 'transferred',
                transactionHash: transferResult.transactionHash,
                contractAddress: transferResult.contractAddress,
                blockchainTokenId: transferResult.tokenId,
                transferredAt: new Date(),
                transferError: null
              });
              logger.info(`Direct NFT transfer succeeded for ${collectibleRef.id}: tx=${transferResult.transactionHash}`);
            } catch (transferErr) {
              logger.error(`Direct NFT transfer failed for ${collectibleRef.id}:`, transferErr);
              await collectibleRef.update({
                status: 'failed_transfer',
                transferError: transferErr.message,
                lastRetryError: transferErr.message
              }).catch(() => {});
            }
          })();
        }

      } catch (queueError) {
        logger.error('Failed to enqueue transfer job:', queueError);

        // Mark as failed but claim is still valid
        await collectibleRef.update({
          status: 'failed_transfer',
          transferError: queueError.message
        });
      }
      }

      // Mass-claim velocity check — the serial list is bearer-instrument data,
      // so a spike in claims is the earliest signal of scripted abuse.
      // Fire-and-forget; must never delay or fail the claim response.
      (async () => {
        try {
          const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
          const recent = await db.collection('collectibles')
            .where('createdAt', '>=', hourAgo)
            .get();
          const claimsLastHour = recent.size;
          // Alert on first crossing and each subsequent multiple of 10
          if (claimsLastHour === 8 || (claimsLastHour > 8 && claimsLastHour % 10 === 0)) {
            await sendAdminAlertEmail('Unusual claim activity', {
              'claims in last hour': claimsLastHour,
              'latest edition': claimResult.editionNumber,
              wallet: sanitizedWallet,
              'claim code': sanitizedCodeId,
              note: 'Claim velocity exceeds normal levels — verify these are legitimate box stickers, and use the admin panel revoke controls if they are not.'
            });
          }
        } catch (velocityErr) {
          logger.warn('Claim velocity check failed:', velocityErr.message);
        }
      })();

      return {
        success: true,
        collectibleId: collectibleRef.id,
        tokenId: claimResult.tokenId,
        edition: claimResult.editionNumber,
        editionNumber: claimResult.editionNumber,
        totalEditions: claimResult.totalEditions,
        productName: claimResult.productName,
        isTestCode: claimResult.isTestCode === true,
        status: 'pending_transfer',
        claimDate: new Date().toISOString(),
        message: 'Collectible claimed successfully. NFT transfer is being processed and will complete shortly.'
      };

    } catch (error) {
      // Handle known claim errors with user-friendly messages
      if (error.message?.startsWith('CLAIM_ERROR:')) {
        const userMessage = error.message.replace('CLAIM_ERROR:', '');
        return {
          success: false,
          tokenId: null,
          message: userMessage
        };
      }

      logger.error('Error claiming product:', error);
      throw error;
    }
  },

  /**
   * Get all tokens owned by a wallet address
   * @param {string} walletAddress - The wallet address to check
   * @returns {Promise<Array>} - Array of token objects
   */
  getWalletTokens: async (walletAddress) => {
    try {
      // Normalize wallet address for case-insensitive comparison
      const normalizedAddress = walletAddress.toLowerCase();

      // Find all collectibles owned by the wallet address
      const collectiblesRef = db.collection('collectibles');
      const snapshot = await collectiblesRef.where('ownerId', '==', normalizedAddress).get();

      if (snapshot.empty) {
        return { tokens: [], claimHistory: [], totalClaims: 0 };
      }

      // Find all claim codes ever claimed by this wallet (including transferred-away ones)
      let claimHistory = [];
      try {
        const claimCodesSnapshot = await db.collection('claimCodes')
          .where('claimedBy', '==', normalizedAddress)
          .get();
        claimHistory = claimCodesSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            // Serials are bearer credentials — never return them in full,
            // even for claimed codes, on this public endpoint.
            serialNumber: doc.id.slice(0, 8) + '…',
            productId: data.productId,
            edition: data.edition,
            tokenId: data.tokenId,
            claimedAt: data.claimedAt?.toDate ? data.claimedAt.toDate().toISOString() : null
          };
        });
      } catch (historyErr) {
        logger.warn('Could not load claim history:', historyErr.message);
      }

      // Map the collectibles to a user-friendly format
      const tokens = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          productId: data.productId,
          productName: data.productName,
          serialNumber: data.serialNumber ? data.serialNumber.slice(0, 8) + '…' : null,
          tokenId: data.blockchainTokenId || data.tokenId,
          edition: data.edition,
          editionNumber: data.edition,
          tokenAddress: data.contractAddress,
          transactionHash: data.transactionHash,
          status: data.status,
          nftTransferred: data.nftTransferred,
          modelUrl: data.metadata?.modelUrl || data.modelUrl,
          imageUrl: data.metadata?.image,
          issuedAt: data.createdAt ? data.createdAt.toDate() : new Date(),
          claimDate: data.claimedAt?.toDate ? data.claimedAt.toDate().toISOString() :
                      (data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString()),
          verifiedAt: data.claimedAt?.toDate ? data.claimedAt.toDate().toISOString() : null,
          metadata: data.metadata
        };
      });

      return {
        tokens,
        claimHistory,
        totalClaims: claimHistory.length
      };
    } catch (error) {
      logger.error('Error getting wallet tokens:', error);
      throw new Error('Failed to get wallet tokens');
    }
  }
};

export default verificationService;