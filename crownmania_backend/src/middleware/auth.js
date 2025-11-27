import { admin } from '../config/firebase.js';
import logger from '../config/logger.js';

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

export const authenticateWallet = async (req, res, next) => {
  try {
    const { signature, message, walletAddress } = req.body;
    // TODO: Implement wallet signature verification
    req.wallet = walletAddress;
    next();
  } catch (error) {
    logger.error('Wallet authentication error:', error);
    res.status(401).json({ error: 'Invalid wallet signature' });
  }
};
