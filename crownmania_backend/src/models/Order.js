import { db } from '../config/firebase.js';
import logger from '../config/logger.js';

class Order {
  constructor(data) {
    this.id = data.id;
    this.userId = data.userId;
    this.items = data.items || [];
    this.total = data.total;
    this.status = data.status || 'pending'; // pending, paid, shipped, delivered
    this.shippingAddress = data.shippingAddress;
    this.trackingNumber = data.trackingNumber;
    this.stripePaymentId = data.stripePaymentId;
    this.stripeSessionId = data.stripeSessionId; // For webhook idempotency
    this.shipstationOrderId = data.shipstationOrderId;
    this.customerEmail = data.customerEmail;
    this.allocatedSerials = data.allocatedSerials || []; // Serial numbers allocated to this order
    this.collectibleEntitlements = data.collectibleEntitlements || []; // Collectible IDs created
    this.entitlementStatus = data.entitlementStatus || 'pending'; // pending, allocated, claimed
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = new Date();
  }

  static async create(data) {
    try {
      const order = new Order(data);
      await db.collection('orders').doc(order.id).set({
        userId: order.userId,
        items: order.items,
        total: order.total,
        status: order.status,
        shippingAddress: order.shippingAddress,
        trackingNumber: order.trackingNumber,
        stripePaymentId: order.stripePaymentId,
        stripeSessionId: order.stripeSessionId,
        shipstationOrderId: order.shipstationOrderId,
        customerEmail: order.customerEmail,
        allocatedSerials: order.allocatedSerials,
        collectibleEntitlements: order.collectibleEntitlements,
        entitlementStatus: order.entitlementStatus,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt
      });
      return order;
    } catch (error) {
      logger.error('Error creating order:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const doc = await db.collection('orders').doc(id).get();
      if (!doc.exists) return null;
      return new Order({ id: doc.id, ...doc.data() });
    } catch (error) {
      logger.error('Error finding order:', error);
      throw error;
    }
  }

  static async findByUser(userId) {
    try {
      const snapshot = await db.collection('orders')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .get();
      return snapshot.docs.map(doc => new Order({ id: doc.id, ...doc.data() }));
    } catch (error) {
      logger.error('Error finding orders by user:', error);
      throw error;
    }
  }

  async updateStatus(status) {
    try {
      this.status = status;
      this.updatedAt = new Date();
      await db.collection('orders').doc(this.id).update({
        status: this.status,
        updatedAt: this.updatedAt
      });
      return this;
    } catch (error) {
      logger.error('Error updating order status:', error);
      throw error;
    }
  }

  async updateTracking(trackingNumber) {
    try {
      this.trackingNumber = trackingNumber;
      this.updatedAt = new Date();
      await db.collection('orders').doc(this.id).update({
        trackingNumber: this.trackingNumber,
        updatedAt: this.updatedAt
      });
      return this;
    } catch (error) {
      logger.error('Error updating order tracking:', error);
      throw error;
    }
  }
}

export default Order;
