import { admin, db } from '../config/firebase.js';
import logger from '../config/logger.js';
import { ethers } from 'ethers';
import crypto from 'crypto';

// ============================================
// Firebase Token Authentication
// ============================================
export const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

// ============================================
// Wallet Signature Authentication with Replay Protection
// ============================================

// Configuration
const SIGNATURE_MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes
const NONCE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const EXPECTED_MESSAGE_PREFIX = 'Crownmania Authentication';

// In-memory nonce store (use Redis in production for multi-instance deployments)
const usedNonces = new Map();

// Clean up expired nonces periodically
setInterval(() => {
  const now = Date.now();
  for (const [nonce, timestamp] of usedNonces.entries()) {
    if (now - timestamp > NONCE_EXPIRY_MS) {
      usedNonces.delete(nonce);
    }
  }
}, 60 * 1000); // Clean every minute

/**
 * Parse and validate the signed message format
 * Expected format:
 * "Crownmania Authentication\nTimestamp: 1234567890\nNonce: abc123\nAction: claim"
 */
const parseSignedMessage = (message) => {
  const lines = message.split('\n');
  const parsed = {};

  for (const line of lines) {
    if (line.startsWith(EXPECTED_MESSAGE_PREFIX)) {
      parsed.prefix = EXPECTED_MESSAGE_PREFIX;
    } else if (line.startsWith('Timestamp:')) {
      parsed.timestamp = parseInt(line.replace('Timestamp:', '').trim(), 10);
    } else if (line.startsWith('Nonce:')) {
      parsed.nonce = line.replace('Nonce:', '').trim();
    } else if (line.startsWith('Action:')) {
      parsed.action = line.replace('Action:', '').trim();
    } else if (line.startsWith('Wallet:')) {
      parsed.wallet = line.replace('Wallet:', '').trim();
    }
  }

  return parsed;
};

/**
 * Validate message timestamp to prevent replay attacks
 */
const validateTimestamp = (timestamp) => {
  if (!timestamp || isNaN(timestamp)) {
    return { valid: false, error: 'Missing or invalid timestamp in message' };
  }

  const now = Date.now();
  const age = now - timestamp;

  if (age < 0) {
    // Timestamp is in the future (clock skew or manipulation)
    return { valid: false, error: 'Invalid timestamp: message is from the future' };
  }

  if (age > SIGNATURE_MAX_AGE_MS) {
    return { valid: false, error: 'Signature expired: please sign a new message' };
  }

  return { valid: true };
};

/**
 * Validate nonce has not been used before
 */
const validateNonce = (nonce) => {
  if (!nonce || typeof nonce !== 'string' || nonce.length < 8) {
    return { valid: false, error: 'Missing or invalid nonce in message' };
  }

  if (usedNonces.has(nonce)) {
    return { valid: false, error: 'Nonce already used: replay attack detected' };
  }

  return { valid: true };
};

/**
 * Mark nonce as used
 */
const markNonceUsed = (nonce) => {
  usedNonces.set(nonce, Date.now());
};

/**
 * Generate a new nonce for client to use
 */
export const generateNonce = () => {
  return crypto.randomBytes(16).toString('hex');
};

/**
 * Authenticate wallet with signature verification and replay protection
 * 
 * SECURITY FEATURES:
 * 1. Verifies signature matches wallet address
 * 2. Validates message format
 * 3. Checks timestamp is within allowed window (prevents old signatures)
 * 4. Validates nonce hasn't been used (prevents replay attacks)
 */
export const authenticateWallet = async (req, res, next) => {
  try {
    const { signature, message, walletAddress } = req.body;

    // Validate required fields
    if (!signature || !message || !walletAddress) {
      return res.status(400).json({ 
        error: 'Signature, message, and wallet address are required' 
      });
    }

    // Validate wallet address format
    if (!ethers.isAddress(walletAddress)) {
      return res.status(400).json({ error: 'Invalid wallet address format' });
    }

    // Verify the signature using ethers (v6)
    let recoveredAddress;
    try {
      recoveredAddress = ethers.verifyMessage(message, signature);
    } catch (sigError) {
      logger.warn('Signature verification failed:', sigError.message);
      return res.status(401).json({ error: 'Invalid signature format' });
    }

    // Check recovered address matches claimed address
    if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      logger.warn(`Address mismatch: recovered ${recoveredAddress}, claimed ${walletAddress}`);
      return res.status(401).json({ error: 'Signature does not match wallet address' });
    }

    // Parse and validate message format
    const parsedMessage = parseSignedMessage(message);

    // Validate message has correct prefix
    if (parsedMessage.prefix !== EXPECTED_MESSAGE_PREFIX) {
      return res.status(400).json({ 
        error: 'Invalid message format: missing authentication prefix' 
      });
    }

    // Validate timestamp (prevents old signatures from being reused)
    const timestampValidation = validateTimestamp(parsedMessage.timestamp);
    if (!timestampValidation.valid) {
      logger.warn(`Timestamp validation failed: ${timestampValidation.error}`);
      return res.status(401).json({ error: timestampValidation.error });
    }

    // Validate nonce (prevents replay attacks)
    const nonceValidation = validateNonce(parsedMessage.nonce);
    if (!nonceValidation.valid) {
      logger.warn(`Nonce validation failed for wallet ${walletAddress}: ${nonceValidation.error}`);
      return res.status(401).json({ error: nonceValidation.error });
    }

    // Mark nonce as used BEFORE processing the request
    markNonceUsed(parsedMessage.nonce);

    // Attach wallet info to request
    req.wallet = walletAddress.toLowerCase();
    req.walletAction = parsedMessage.action;
    
    logger.info(`Wallet authenticated: ${walletAddress.substring(0, 10)}...`);
    next();
  } catch (error) {
    logger.error('Wallet authentication error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
};

/**
 * Generate a nonce endpoint - call this before requesting signature
 */
export const getNonceHandler = (req, res) => {
  const nonce = generateNonce();
  const timestamp = Date.now();
  
  res.json({
    nonce,
    timestamp,
    messageTemplate: `${EXPECTED_MESSAGE_PREFIX}\nTimestamp: ${timestamp}\nNonce: ${nonce}\nAction: {ACTION}\nWallet: {WALLET_ADDRESS}`,
    expiresIn: SIGNATURE_MAX_AGE_MS / 1000 // seconds
  });
};

/**
 * Optional middleware: Authenticate with either Firebase token OR wallet signature
 */
export const authenticateAny = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  // Try Firebase token first
  if (authHeader?.startsWith('Bearer ')) {
    return authenticateUser(req, res, next);
  }
  
  // Try wallet signature
  if (req.body.signature && req.body.message && req.body.walletAddress) {
    return authenticateWallet(req, res, next);
  }
  
  return res.status(401).json({ 
    error: 'Authentication required: provide Bearer token or wallet signature' 
  });
};