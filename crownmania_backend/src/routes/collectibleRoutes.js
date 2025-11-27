import express from 'express';
import { authenticateUser } from '../middleware/auth.js';
import { serialNumberLimiter } from '../middleware/rateLimiter.js';
import { validateSerialNumber } from '../middleware/validation.js';
import * as collectibleController from '../controllers/collectibleController.js';

const router = express.Router();

// Public routes
router.post(
  '/verify',
  serialNumberLimiter,
  validateSerialNumber,
  collectibleController.verifySerialNumber
);

// Protected routes
router.use(authenticateUser);
router.post('/claim', collectibleController.claimCollectible);
router.post('/mint', collectibleController.mintNFT);

export default router;
