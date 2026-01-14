import express from 'express';
import Stripe from 'stripe';
import { authenticateUser } from '../middleware/auth.js';
import { orderFulfillmentService } from '../services/orderFulfillmentService.js';
import logger from '../config/logger.js';

const router = express.Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Server-side product catalog with verified prices (in cents)
// IMPORTANT: Always use server-side prices, never trust client-provided prices
const PRODUCT_CATALOG = {
  'durk-pendant': {
    name: 'Durk Pendant',
    price: 29900, // $299.00 in cents
    images: []
  },
  'crown-ring': {
    name: 'Crown Ring',
    price: 19900, // $199.00 in cents
    images: []
  },
  'chain-necklace': {
    name: 'Chain Necklace',
    price: 14900, // $149.00 in cents
    images: []
  }
};

/**
 * Validate cart items against server-side catalog
 * SECURITY: Never trust client-provided prices
 */
const validateAndPriceItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Invalid items: must be a non-empty array');
  }

  if (items.length > 10) {
    throw new Error('Too many items: maximum 10 items per order');
  }

  return items.map(item => {
    // Validate required fields
    if (!item.productId || typeof item.productId !== 'string') {
      throw new Error('Invalid item: missing or invalid productId');
    }

    const quantity = parseInt(item.quantity, 10);
    if (isNaN(quantity) || quantity < 1 || quantity > 99) {
      throw new Error('Invalid quantity: must be between 1 and 99');
    }

    // Look up product in server-side catalog
    const product = PRODUCT_CATALOG[item.productId];
    if (!product) {
      throw new Error(`Unknown product: ${item.productId}`);
    }

    // Return item with SERVER-SIDE price (ignore client price)
    return {
      productId: item.productId,
      name: product.name,
      price: product.price, // Use server price, NOT client price
      images: product.images,
      quantity: quantity
    };
  });
};

/**
 * @route POST /api/stripe/create-checkout-session
 * @desc Create a Stripe checkout session
 * @access Private - requires authentication (optional but recommended)
 */
router.post('/create-checkout-session', async (req, res) => {
  try {
    const { items, customerEmail } = req.body;

    // Validate and get server-side prices
    let validatedItems;
    try {
      validatedItems = validateAndPriceItems(items);
    } catch (validationError) {
      logger.warn('Stripe checkout validation failed:', validationError.message);
      return res.status(400).json({ error: validationError.message });
    }

    // Build line items with SERVER-SIDE prices
    const lineItems = validatedItems.map(item => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.name,
          images: item.images,
          metadata: {
            productId: item.productId
          }
        },
        unit_amount: item.price, // Server-verified price
      },
      quantity: item.quantity,
    }));

    // Calculate total for logging
    const total = validatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    logger.info(`Creating checkout session: ${validatedItems.length} items, total: $${(total / 100).toFixed(2)}`);

    // Create Stripe session with additional security options
    const sessionConfig = {
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/cancel`,
      // Prevent session from being used after 30 minutes
      expires_at: Math.floor(Date.now() / 1000) + (30 * 60),
      // Collect shipping address if needed
      // shipping_address_collection: { allowed_countries: ['US', 'CA'] },
    };

    // Add customer email if provided
    if (customerEmail && typeof customerEmail === 'string') {
      sessionConfig.customer_email = customerEmail.trim().toLowerCase();
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    logger.info(`Checkout session created: ${session.id}`);
    res.json({ id: session.id });
  } catch (error) {
    logger.error('Stripe checkout error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

/**
 * @route POST /api/stripe/webhook
 * @desc Handle Stripe webhooks for payment verification
 * @access Public (verified by Stripe signature)
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    logger.error('STRIPE_WEBHOOK_SECRET not configured');
    return res.status(500).json({ error: 'Webhook not configured' });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    logger.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      logger.info(`Payment successful for session: ${session.id}`);

      try {
        // Fulfill the order: create order record, allocate serials, send email
        const result = await orderFulfillmentService.fulfillOrder(session);
        logger.info(`Order fulfillment complete: ${result.orderId}`, {
          skipped: result.skipped,
          serialsAllocated: result.allocatedSerials?.length || 0
        });
      } catch (fulfillmentError) {
        // Log error but return 200 to acknowledge receipt
        // Stripe will retry if we return error, but we want to handle manually
        logger.error('Order fulfillment failed:', fulfillmentError);
        // Could add to a dead-letter queue for manual handling
      }
      break;

    case 'payment_intent.payment_failed':
      const paymentIntent = event.data.object;
      logger.warn(`Payment failed: ${paymentIntent.id}`);
      break;

    default:
      logger.debug(`Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
});

/**
 * @route GET /api/stripe/session/:sessionId
 * @desc Get checkout session details (for success page)
 * @access Public (limited info returned)
 */
router.get('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId || typeof sessionId !== 'string' || !sessionId.startsWith('cs_')) {
      return res.status(400).json({ error: 'Invalid session ID' });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Only return safe information
    res.json({
      id: session.id,
      status: session.status,
      payment_status: session.payment_status,
      customer_email: session.customer_email,
      amount_total: session.amount_total,
      currency: session.currency
    });
  } catch (error) {
    logger.error('Error retrieving session:', error);
    res.status(404).json({ error: 'Session not found' });
  }
});

export { router as stripeRouter };