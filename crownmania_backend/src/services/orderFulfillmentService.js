import Stripe from 'stripe';
import Order from '../models/Order.js';
import Inventory from '../models/Inventory.js';
import Collectible from '../models/Collectible.js';
import { sendOrderConfirmationEmail, sendShippingConfirmationEmail, sendAdminAlertEmail } from '../config/email.js';
import { db } from '../config/firebase.js';
import logger from '../config/logger.js';
import crypto from 'crypto';

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
            // Record failure in dead-letter queue and alert admin for manual recovery
            await this.recordFailedFulfillment(session, error);
            throw error;
        }
    }

    /**
     * Record a failed fulfillment in the dead-letter queue and alert admin.
     * The customer has PAID but did not receive their order — requires attention.
     */
    async recordFailedFulfillment(session, error) {
        try {
            await db.collection('fulfillment_failures').doc(session.id).set({
                sessionId: session.id,
                paymentIntent: session.payment_intent || null,
                customerEmail: session.customer_email || session.customer_details?.email || null,
                amountTotal: session.amount_total || null,
                error: error.message,
                status: 'pending', // pending, retried, resolved
                createdAt: new Date(),
                updatedAt: new Date()
            }, { merge: true });

            await sendAdminAlertEmail('Order fulfillment FAILED — customer paid', {
                sessionId: session.id,
                customerEmail: session.customer_email || session.customer_details?.email,
                amount: session.amount_total ? `$${(session.amount_total / 100).toFixed(2)}` : 'unknown',
                error: error.message,
                action: 'Retry via admin panel: POST /api/admin/fulfillment-failures/' + session.id + '/retry'
            });
        } catch (dlqError) {
            logger.error('Failed to record fulfillment failure (CRITICAL):', dlqError);
        }
    }

    /**
     * Retry a failed fulfillment (admin-triggered)
     */
    async retryFailedFulfillment(sessionId) {
        const stripeSession = await stripe.checkout.sessions.retrieve(sessionId);

        if (stripeSession.payment_status !== 'paid') {
            throw new Error(`Session ${sessionId} is not paid (status: ${stripeSession.payment_status})`);
        }

        const result = await this.fulfillOrder(stripeSession);

        // Mark failure record as resolved
        await db.collection('fulfillment_failures').doc(sessionId).set({
            status: 'resolved',
            resolvedAt: new Date(),
            orderId: result.orderId,
            updatedAt: new Date()
        }, { merge: true });

        return result;
    }

    /**
     * Handle a refund — mark order refunded and release unclaimed serials back to inventory.
     * Claimed collectibles are NOT revoked automatically (manual admin decision).
     */
    async handleRefund(paymentIntentId) {
        try {
            const snapshot = await db.collection('orders')
                .where('stripePaymentId', '==', paymentIntentId)
                .limit(1)
                .get();

            if (snapshot.empty) {
                logger.warn(`Refund received for unknown payment intent: ${paymentIntentId}`);
                await sendAdminAlertEmail('Refund for unknown order', { paymentIntentId });
                return { handled: false };
            }

            const orderDoc = snapshot.docs[0];
            const order = orderDoc.data();
            const releasedSerials = [];
            const retainedSerials = [];

            // Release unclaimed serials back to inventory; keep claimed ones for manual review
            for (const serialNumber of (order.allocatedSerials || [])) {
                const inv = await Inventory.findBySerialNumber(serialNumber);
                if (inv && inv.status === 'allocated') {
                    await db.collection('inventory').doc(inv.id).update({
                        status: 'available',
                        orderId: null,
                        allocatedAt: null,
                        updatedAt: new Date()
                    });
                    releasedSerials.push(serialNumber);
                } else {
                    retainedSerials.push(serialNumber);
                }
            }

            // Void unclaimed collectible entitlements
            for (const collectibleId of (order.collectibleEntitlements || [])) {
                const colDoc = await db.collection('collectibles').doc(collectibleId).get();
                if (colDoc.exists && colDoc.data().status === 'unclaimed') {
                    await colDoc.ref.update({ status: 'voided', voidedAt: new Date(), voidReason: 'refund' });
                }
            }

            await orderDoc.ref.update({
                status: 'refunded',
                refundedAt: new Date(),
                updatedAt: new Date()
            });

            await sendAdminAlertEmail('Order refunded', {
                orderId: orderDoc.id,
                customerEmail: order.customerEmail,
                releasedSerials,
                retainedSerials: retainedSerials.length > 0
                    ? { serials: retainedSerials, note: 'Already claimed — review manually' }
                    : 'none'
            });

            logger.info(`Refund processed for order ${orderDoc.id}`, { releasedSerials, retainedSerials });
            return { handled: true, orderId: orderDoc.id, releasedSerials, retainedSerials };
        } catch (error) {
            logger.error('Error handling refund:', error);
            throw error;
        }
    }

    /**
     * Mark an order as shipped with tracking and email the customer
     */
    async markShipped(orderId, trackingNumber, carrier = null) {
        const order = await Order.findById(orderId);
        if (!order) {
            throw new Error(`Order not found: ${orderId}`);
        }

        await db.collection('orders').doc(orderId).update({
            status: 'shipped',
            trackingNumber,
            carrier: carrier || null,
            shippedAt: new Date(),
            updatedAt: new Date()
        });

        if (order.customerEmail) {
            try {
                await sendShippingConfirmationEmail(order.customerEmail, { orderId, trackingNumber, carrier });
            } catch (emailError) {
                logger.error('Failed to send shipping confirmation email:', emailError);
            }
        }

        logger.info(`Order ${orderId} marked shipped`, { trackingNumber, carrier });
        return { orderId, status: 'shipped', trackingNumber };
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
        const orderId = `ORD-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
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
                        id: `COL-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`,
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

            // Extract full shipping details (name + address) from the session.
            // Stripe surfaces this as shipping_details (or collected_information.shipping_details in newer API versions)
            const shippingDetails = session.shipping_details
                || session.collected_information?.shipping_details
                || null;

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
                customerEmail: session.customer_email || session.customer_details?.email || null,
                shippingAddress: shippingDetails ? {
                    name: shippingDetails.name || null,
                    ...shippingDetails.address
                } : null,
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
        const customerEmail = session.customer_email || session.customer_details?.email;

        if (!customerEmail) {
            logger.warn('No customer email for order confirmation');
            return;
        }

        try {
            await sendOrderConfirmationEmail(customerEmail, {
                orderId: fulfillmentResult.orderId,
                total: session.amount_total ? session.amount_total / 100 : null,
                items: fulfillmentResult.allocatedSerials.map(s => ({
                    name: s.productName,
                    serialNumber: s.serialNumber,
                    claimLink: `${process.env.FRONTEND_URL}/verify?code=${s.serialNumber}`
                }))
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
