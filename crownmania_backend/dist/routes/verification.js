import express from 'express';
import { verificationService } from '../services/verificationService.js';
import { authenticateWallet, getNonceHandler } from '../middleware/auth.js';
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
router.post('/verify-serial', async (req, res) => {
  try {
    const {
      serialNumber
    } = req.body;
    if (!serialNumber) {
      return res.status(400).json({
        error: 'Serial number is required'
      });
    }
    const result = await verificationService.verifySerialNumber(serialNumber);
    res.json(result);
  } catch (error) {
    console.error('Error verifying serial number:', error);
    res.status(500).json({
      error: error.message || 'Server error during verification'
    });
  }
});

/**
 * @route GET /api/verification/verify-product/:id
 * @desc Verify a product by its ID (for QR code scanning)
 * @access Public
 */
router.get('/verify-product/:id', async (req, res) => {
  try {
    const {
      id
    } = req.params;
    const {
      type
    } = req.query;
    if (!id) {
      return res.status(400).json({
        error: 'Product ID is required'
      });
    }
    const result = await verificationService.verifyProductById(id, type);
    res.json(result);
  } catch (error) {
    console.error('Error verifying product:', error);
    res.status(500).json({
      error: error.message || 'Server error during verification'
    });
  }
});

/**
 * @route POST /api/verification/claim
 * @desc Claim a product to a wallet address
 * @access Private (authenticated wallet)
 */
router.post('/claim', authenticateWallet, async (req, res) => {
  try {
    const {
      productId,
      walletAddress,
      signature,
      message
    } = req.body;
    if (!productId || !walletAddress) {
      return res.status(400).json({
        error: 'Product ID and wallet address are required'
      });
    }
    const result = await verificationService.claimProduct(productId, walletAddress, signature, message);
    res.json(result);
  } catch (error) {
    console.error('Error claiming product:', error);
    res.status(500).json({
      error: error.message || 'Server error during claim'
    });
  }
});

/**
 * @route POST /api/verification/request-email-verification
 * @desc Request email verification for a serial number
 * @access Public
 */
router.post('/request-email-verification', async (req, res) => {
  try {
    const {
      serialNumber,
      email
    } = req.body;
    if (!serialNumber || !email) {
      return res.status(400).json({
        error: 'Serial number and email are required'
      });
    }
    const result = await verificationService.generateEmailVerification(serialNumber, email);
    res.json(result);
  } catch (error) {
    console.error('Error requesting email verification:', error);
    res.status(500).json({
      error: error.message || 'Server error during email verification request'
    });
  }
});

/**
 * @route POST /api/verification/verify-token
 * @desc Verify a token received via email
 * @access Public
 */
router.post('/verify-token', async (req, res) => {
  try {
    const {
      token
    } = req.body;
    if (!token) {
      return res.status(400).json({
        error: 'Token is required'
      });
    }
    const result = await verificationService.verifyToken(token);
    res.json(result);
  } catch (error) {
    console.error('Error verifying token:', error);
    res.status(500).json({
      error: error.message || 'Server error during token verification'
    });
  }
});

/**
 * @route POST /api/verification/issue-token
 * @desc Issue a digital token for a verified product
 * @access Public
 */
router.post('/issue-token', async (req, res) => {
  try {
    const {
      serialNumber,
      walletAddress
    } = req.body;
    if (!serialNumber || !walletAddress) {
      return res.status(400).json({
        error: 'Serial number and wallet address are required'
      });
    }
    const result = await verificationService.issueToken(serialNumber, walletAddress);
    res.json(result);
  } catch (error) {
    console.error('Error issuing token:', error);
    res.status(500).json({
      error: error.message || 'Server error during token issuance'
    });
  }
});

/**
 * @route GET /api/verification/wallet-tokens/:walletAddress
 * @desc Get all tokens owned by a wallet address
 * @access Public
 */
router.get('/wallet-tokens/:walletAddress', async (req, res) => {
  try {
    const {
      walletAddress
    } = req.params;
    if (!walletAddress) {
      return res.status(400).json({
        error: 'Wallet address is required'
      });
    }
    const tokens = await verificationService.getWalletTokens(walletAddress);
    res.json({
      tokens
    });
  } catch (error) {
    console.error('Error getting wallet tokens:', error);
    res.status(500).json({
      error: error.message || 'Server error while retrieving tokens'
    });
  }
});
export { router as verificationRouter };