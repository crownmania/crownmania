import { stripe, shipstationApi } from '../config/payment.js';
import { sgMail, EMAIL_TEMPLATES, EMAIL_CONFIG } from '../config/email.js';
import Order from '../models/Order.js';
import logger from '../config/logger.js';
export const createOrder = async (req, res) => {
  try {
    const {
      items,
      shippingAddress
    } = req.body;
    const userId = req.user.uid;

    // Calculate order total
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: total * 100,
      // Convert to cents
      currency: 'usd',
      metadata: {
        userId
      }
    });

    // Create order in database
    const order = await Order.create({
      userId,
      items,
      total,
      shippingAddress,
      stripePaymentId: paymentIntent.id
    });
    res.json({
      orderId: order.id,
      clientSecret: paymentIntent.client_secret
    });
  } catch (error) {
    logger.error('Error creating order:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};
export const confirmOrder = async (req, res) => {
  try {
    const {
      orderId
    } = req.params;
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        error: 'Order not found'
      });
    }

    // Create order in ShipStation
    const shipstationOrder = await shipstationApi.post('/orders/createorder', {
      orderNumber: order.id,
      orderDate: order.createdAt,
      orderStatus: 'awaiting_shipment',
      customerUsername: order.userId,
      customerEmail: req.user.email,
      billTo: order.shippingAddress,
      shipTo: order.shippingAddress,
      items: order.items.map(item => ({
        sku: item.id,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.price
      }))
    });

    // Update order with ShipStation ID
    order.shipstationOrderId = shipstationOrder.data.orderId;
    await order.updateStatus('paid');

    // Send order confirmation email
    await sgMail.send({
      to: req.user.email,
      from: EMAIL_CONFIG.from,
      templateId: EMAIL_TEMPLATES.ORDER_CONFIRMATION,
      dynamicTemplateData: {
        orderId: order.id,
        orderDate: order.createdAt,
        items: order.items,
        total: order.total,
        shippingAddress: order.shippingAddress
      }
    });
    res.json({
      message: 'Order confirmed successfully'
    });
  } catch (error) {
    logger.error('Error confirming order:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};
export const updateShipping = async (req, res) => {
  try {
    const {
      orderId
    } = req.params;
    const {
      trackingNumber,
      carrier
    } = req.body;
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        error: 'Order not found'
      });
    }

    // Update tracking information
    await order.updateTracking(trackingNumber);
    await order.updateStatus('shipped');

    // Send shipping confirmation email
    await sgMail.send({
      to: req.user.email,
      from: EMAIL_CONFIG.from,
      templateId: EMAIL_TEMPLATES.SHIPPING_CONFIRMATION,
      dynamicTemplateData: {
        orderId: order.id,
        trackingNumber,
        carrier,
        shippingAddress: order.shippingAddress
      }
    });
    res.json({
      message: 'Shipping information updated'
    });
  } catch (error) {
    logger.error('Error updating shipping:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};
export const getOrders = async (req, res) => {
  try {
    const userId = req.user.uid;
    const orders = await Order.findByUser(userId);
    res.json(orders);
  } catch (error) {
    logger.error('Error getting orders:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
};