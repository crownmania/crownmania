import express from 'express';
import { authenticateUser } from '../middleware/auth.js';
import { apiLimiter } from '../middleware/rateLimiter.js';
import { validateOrder } from '../middleware/validation.js';
import * as orderController from '../controllers/orderController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticateUser);
router.use(apiLimiter);

router.post('/', validateOrder, orderController.createOrder);
router.post('/:orderId/confirm', orderController.confirmOrder);
router.patch('/:orderId/shipping', orderController.updateShipping);
router.get('/', orderController.getOrders);

export default router;
