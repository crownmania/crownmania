import Stripe from 'stripe';
import Order from '../models/Order.js';
import Inventory from '../models/Inventory.js';
import Collectible from '../models/Collectible.js';
import { sgMail, EMAIL_TEMPLATES, EMAIL_CONFIG } from '../config/email.js';
import { db } from '../config/firebase.js';
import logger from '../config/logger.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Order Fulfillment Service
 * Handles the complete flow from Stripe payment to collectible entitlement
 */
class OrderFulfillmentService {

    /**
     * Main entry point - fulfill an order from a completed Stripe checkout session
     * @param {Object} session - Stripe checkout session object
     * @returns {Object} Fulfillment result
     */
    async fulfillOrder(session) {
        const sessionId = session.id;

        try {
            // Idempotency check - skip if already processed
            const existingOrder = await this.findOrderBySessionId(sessionId);
            if (existingOrder) {
                logger.info(`Order already fulfilled for session: ${sessionId}`);
                return {
                    success: true,
                    orderId: existingOrder.id,
                    message: 'Order already processed',
                    skipped: true
                };
            }

            // Retrieve line items from Stripe
            const lineItems = await this.getSessionLineItems(sessionId);
            if (!lineItems || lineItems.length === 0) {
                throw new Error(`No line items found for session: ${sessionId}`);
            }

            // Create order and allocate serials in a transaction
            const result = await this.createOrderWithSerials(session, lineItems);

            // Send confirmation email
            await this.sendConfirmationEmail(session, result);

            logger.info(`Order fulfilled successfully: ${result.orderId}`, {
                sessionId,
                allocatedSerials: result.allocatedSerials.length
            });

            return {
                success: true,
                orderId: result.orderId,
                allocatedSerials: result.allocatedSerials,
                message: 'Order fulfilled successfully'
            };

        } catch (error) {
            logger.error(`Order fulfillment failed for session ${sessionId}:`, error);
            throw error;
        }
    }

    /**
     * Retrieve line items from a Stripe checkout session
     */
    async getSessionLineItems(sessionId) {
        try {
            const lineItems = await stripe.checkout.sessions.listLineItems(sessionId, {
                expand: ['data.price.product']
            });

            return lineItems.data.map(item => ({
                productId: item.price?.product?.metadata?.productId || item.price?.product?.id,
                name: item.description || item.price?.product?.name,
                quantity: item.quantity,
                unitPrice: item.price?.unit_amount,
                currency: item.price?.currency
            }));
        } catch (error) {
            logger.error('Error retrieving line items:', error);
            throw error;
        }
    }

    /**
     * Create order and allocate serials atomically
     */
    async createOrderWithSerials(session, lineItems) {
        const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const allocatedSerials = [];
        const collectibleEntitlements = [];

        try {
            // Calculate total
            const total = lineItems.reduce(
                (sum, item) => sum + (item.unitPrice * item.quantity),
                0
            ) / 100; // Convert cents to dollars

            // Allocate serials for each line item
            for (const item of lineItems) {
                for (let i = 0; i < item.quantity; i++) {
                    // Allocate serial from inventory
                    const inventory = await Inventory.allocateSerial(item.productId, orderId);
                    allocatedSerials.push({
                        serialNumber: inventory.serialNumber,
                        productId: item.productId,
                        productName: item.name
                    });

                    // Create collectible entitlement
                    const collectible = await Collectible.create({
                        id: `COL-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                        serialNumber: inventory.serialNumber,
                        ownerId: null, // Will be set when user claims via wallet
                        status: 'unclaimed',
                        metadata: {
                            productId: item.productId,
                            productName: item.name,
                            orderId: orderId,
                            purchaseDate: new Date().toISOString()
                        }
                    });

                    collectibleEntitlements.push(collectible.id);
                }
            }

            // Create the order record
            const order = await Order.create({
                id: orderId,
                userId: session.customer || session.customer_email || null,
                items: lineItems,
                total: total,
                status: 'paid',
                stripeSessionId: session.id,
                stripePaymentId: session.payment_intent,
                allocatedSerials: allocatedSerials.map(s => s.serialNumber),
                collectibleEntitlements: collectibleEntitlements,
                entitlementStatus: 'allocated',
                customerEmail: session.customer_email,
                shippingAddress: session.shipping_details?.address || null,
                createdAt: new Date()
            });

            return {
                orderId: order.id,
                allocatedSerials,
                collectibleEntitlements
            };

        } catch (error) {
            // Log the failure - in production, would need rollback logic
            logger.error('Error creating order with serials:', {
                orderId,
                error: error.message,
                allocatedSerials: allocatedSerials.length
            });
            throw error;
        }
    }

    /**
     * Send order confirmation email with claim codes
     */
    async sendConfirmationEmail(session, fulfillmentResult) {
        const customerEmail = session.customer_email;

        if (!customerEmail) {
            logger.warn('No customer email for order confirmation');
            return;
        }

        try {
            // Check if SendGrid is configured
            if (!sgMail || !EMAIL_CONFIG?.from) {
                logger.warn('SendGrid not configured, skipping confirmation email');
                return;
            }

            await sgMail.send({
                to: customerEmail,
                from: EMAIL_CONFIG.from,
                templateId: EMAIL_TEMPLATES.ORDER_CONFIRMATION,
                dynamicTemplateData: {
                    orderId: fulfillmentResult.orderId,
                    orderDate: new Date().toLocaleDateString(),
                    items: fulfillmentResult.allocatedSerials.map(s => ({
                        name: s.productName,
                        serialNumber: s.serialNumber,
                        claimLink: `${process.env.FRONTEND_URL}/verify?code=${s.serialNumber}`
                    })),
                    totalItems: fulfillmentResult.allocatedSerials.length
                }
            });

            logger.info(`Confirmation email sent to ${customerEmail}`);
        } catch (error) {
            // Don't fail the order if email fails
            logger.error('Failed to send confirmation email:', error);
        }
    }

    /**
     * Find order by Stripe session ID (for idempotency)
     */
    async findOrderBySessionId(sessionId) {
        try {
            const snapshot = await db.collection('orders')
                .where('stripeSessionId', '==', sessionId)
                .limit(1)
                .get();

            if (snapshot.empty) return null;

            const doc = snapshot.docs[0];
            return { id: doc.id, ...doc.data() };
        } catch (error) {
            logger.error('Error finding order by session:', error);
            throw error;
        }
    }

    /**
     * Get fulfillment status for a session
     */
    async getFulfillmentStatus(sessionId) {
        const order = await this.findOrderBySessionId(sessionId);

        if (!order) {
            return { fulfilled: false, order: null };
        }

        return {
            fulfilled: true,
            orderId: order.id,
            status: order.status,
            entitlementStatus: order.entitlementStatus,
            allocatedSerials: order.allocatedSerials?.length || 0
        };
    }
}

// Export singleton instance
export const orderFulfillmentService = new OrderFulfillmentService();
export default OrderFulfillmentService;
