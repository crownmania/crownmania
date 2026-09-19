import express from 'express';
import { verificationService } from '../services/verificationService.js';
import { twoFactorService } from '../services/twoFactorService.js';
import { authenticateWallet, getNonceHandler } from '../middleware/auth.js';
import { sendClaimConfirmationEmail } from '../config/email.js';
import { db } from '../config/firebase.js';
import { sendScanAttemptEmail, sendCodeEntryEmail, sendClaimAttemptEmail, sendAdminSMS } from '../services/notificationService.js';
import { serialNumberLimiter, claimLimiter, emailVerificationLimiter } from '../middleware/rateLimiter.js';
import { validateSerialNumber, validateWallet } from '../middleware/validation.js';
const router = express.Router();

/**
 * @route GET /api/verification/nonce
 * @desc Get a nonce for secure message signing
 * @access Public
 */
router.get('/nonce', getNonceHandler);

/**
 * @route POST /api/verification/verify-serial
 * @desc Verify a product serial number
 * @access Public
 */
router.post('/verify-serial', serialNumberLimiter, validateSerialNumber, async (req, res) => {
  try {
    const { serialNumber } = req.body;

    if (!serialNumber) {
      return res.status(400).json({ error: 'Serial number is required' });
    }

    const result = await verificationService.verifySerialNumber(serialNumber);

    // Send admin email notification
    sendCodeEntryEmail(serialNumber, {
      ip: req.ip || req.headers['x-forwarded-for'],
      userAgent: req.headers['user-agent'],
      verified: result.verified,
      productName: result.product?.name
    }).catch(err => console.error('Notification error:', err));

    // Send admin SMS notification
    sendAdminSMS(
      `🔔 CrownMania: Code ${serialNumber.substring(0, 8)}... was ${result.verified ? '✅ verified' : '❌ failed'}${result.product?.name ? ` (${result.product.name})` : ''} at ${new Date().toLocaleTimeString()}`
    ).catch(err => console.error('SMS notification error:', err));

    res.json(result);
  } catch (error) {
    console.error('Error verifying serial number:', error);
    res.status(500).json({ error: error.message || 'Server error during verification' });
  }
});

/**
 * @route GET /api/verification/verify-product/:id
 * @desc Verify a product by its ID (for QR code scanning)
 * @access Public
 */
router.get('/verify-product/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    const result = await verificationService.verifyProductById(id, type);

    // Send admin email notification
    sendScanAttemptEmail(id, 'qr_scan', {
      ip: req.ip || req.headers['x-forwarded-for'],
      userAgent: req.headers['user-agent'],
      verified: result.verified,
      productName: result.product?.name
    }).catch(err => console.error('Notification error:', err));

    // Send admin SMS notification
    sendAdminSMS(
      `📱 CrownMania: QR scan ${id.substring(0, 8)}... ${result.verified ? '✅ verified' : '❌ failed'}${result.product?.name ? ` (${result.product.name})` : ''}`
    ).catch(err => console.error('SMS notification error:', err));

    res.json(result);
  } catch (error) {
    console.error('Error verifying product:', error);
    res.status(500).json({ error: error.message || 'Server error during verification' });
  }
});

/**
 * @route POST /api/verification/claim/request-code
 * @desc Send an email verification code required to claim a product
 * @access Public (rate limited)
 */
router.post('/claim/request-code', emailVerificationLimiter, validateSerialNumber, async (req, res) => {
  try {
    const { serialNumber, email } = req.body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ error: 'A valid email address is required' });
    }

    // The serial must exist and be unclaimed before a code is issued
    const claimCodeDoc = await db.collection('claimCodes').doc(serialNumber.toLowerCase().trim()).get();
    if (!claimCodeDoc.exists) {
      return res.status(404).json({ error: 'Invalid serial number' });
    }
    const claimCodeData = claimCodeDoc.data();
    if (claimCodeData.claimed || claimCodeData.claimedBy) {
      return res.status(409).json({ error: 'This product has already been claimed' });
    }

    await twoFactorService.sendClaimEmailCode(serialNumber, email);
    res.json({ sent: true, message: 'Verification code sent' });
  } catch (error) {
    console.error('Error sending claim verification code:', error);
    const message = error.message || 'Server error while sending verification code';
    const status = message.includes('Too many') ? 429 : 500;
    res.status(status).json({ error: message });
  }
});

/**
 * @route POST /api/verification/claim
 * @desc Claim a product to a wallet address
 * @access Private (authenticated wallet + verified email code)
 */
router.post('/claim', claimLimiter, validateWallet, authenticateWallet, async (req, res) => {
  try {
    const { productId, walletAddress, signature, message, email, verificationCode } = req.body;

    if (!productId || !walletAddress) {
      return res.status(400).json({ error: 'Product ID and wallet address are required' });
    }

    if (!email || !verificationCode) {
      return res.status(400).json({ error: 'Email verification is required to claim. Request a code first.' });
    }

    // Verify the email code before attempting the claim
    try {
      await twoFactorService.verifyClaimEmailCode(productId, email, verificationCode);
    } catch (verifyError) {
      return res.status(400).json({ error: verifyError.message });
    }

    const result = await verificationService.claimProduct(productId, walletAddress, signature, message);

    // Record the verified claimant email on the claim record
    if (result.success) {
      db.collection('claimCodes').doc(productId.toLowerCase())
        .update({ claimedByEmail: email.toLowerCase().trim() })
        .catch(err => console.error('Failed to record claimant email:', err));
    }

    // Send admin email notification for claim attempt
    sendClaimAttemptEmail({
      claimCodeId: productId,
      walletAddress,
      claimEmail: email,
      success: result.success,
      edition: result.edition,
      ip: req.ip || req.headers['x-forwarded-for']
    }).catch(err => console.error('Claim notification error:', err));

    // Send admin SMS notification for claim
    sendAdminSMS(
      result.success
        ? `🎉 CrownMania: NFT CLAIMED! Edition #${result.edition}/500 by ${walletAddress.substring(0, 8)}...`
        : `⚠️ CrownMania: NFT claim FAILED for ${productId.substring(0, 8)}... by ${walletAddress.substring(0, 8)}...`
    ).catch(err => console.error('SMS claim notification error:', err));

    // Send confirmation email if email is provided
    if (email && result.success) {
      try {
        await sendClaimConfirmationEmail(email, {
          productName: result.productName || 'Lil Durk 10-inch Resin Figure',
          serialNumber: productId,
          walletAddress: walletAddress,
          tokenId: result.tokenId,
          editionNumber: result.edition,
          claimDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        });
      } catch (emailError) {
        console.error('Failed to send claim confirmation email:', emailError);
        // Don't fail the claim if email fails
      }
    }

    res.json(result);
  } catch (error) {
    console.error('Error claiming product:', error);
    res.status(500).json({ error: error.message || 'Server error during claim' });
  }
});


/**
 * @route GET /api/verification/wallet-tokens/:walletAddress
 * @desc Get all tokens owned by a wallet address
 * @access Public (wallet address is public; read-only token list)
 *
 * NOTE: Previously required wallet-signature auth from req.body, but GET
 * requests cannot carry a body in browsers/axios. This endpoint returns the
 * same data that is already public on-chain for the given wallet.
 */
router.get('/wallet-tokens/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;

    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address is required' });
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({ error: 'Invalid wallet address format' });
    }

    const result = await verificationService.getWalletTokens(walletAddress);
    res.json(result);
  } catch (error) {
    console.error('Error getting wallet tokens:', error);
    res.status(500).json({ error: error.message || 'Server error while retrieving tokens' });
  }
});

/**
 * @route GET /api/verification/transfer-status/:serialNumber
 * @desc Check NFT transfer status for a given serial number
 * @access Public
 */
router.get('/transfer-status/:serialNumber', async (req, res) => {
  try {
    const { serialNumber } = req.params;

    if (!serialNumber) {
      return res.status(400).json({ error: 'Serial number is required' });
    }

    if (!/^[a-fA-F0-9]{32}$|^[A-Z0-9]{6,20}$/.test(serialNumber)) {
      return res.status(400).json({ error: 'Invalid serial number format' });
    }

    // Import db from firebase config
    const { db } = await import('../config/firebase.js');

    const collectible = await db.collection('collectibles')
      .where('serialNumber', '==', serialNumber.toLowerCase())
      .limit(1)
      .get();

    if (collectible.empty) {
      return res.json({
        status: 'not_claimed',
        message: 'This product has not been claimed yet'
      });
    }

    const data = collectible.docs[0].data();

    return res.json({
      status: data.nftTransferred ? 'transferred' : 'pending',
      edition: data.edition,
      totalEditions: data.totalEditions || 500,
      transactionHash: data.transactionHash || null,
      contractAddress: data.contractAddress || process.env.NFT_CONTRACT_ADDRESS || process.env.THIRDWEB_NFT_CONTRACT || null,
      tokenId: data.blockchainTokenId || data.tokenId || null,
      ownerId: data.ownerId,
      claimDate: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : null,
      retryCount: data.retryCount || 0,
      lastRetryError: data.lastRetryError || null,
      message: data.nftTransferred
        ? 'NFT successfully transferred to wallet'
        : 'NFT transfer pending - will be retried automatically'
    });
  } catch (error) {
    console.error('Error checking transfer status:', error);
    res.status(500).json({ error: error.message || 'Server error while checking transfer status' });
  }
});

export { router as verificationRouter };
