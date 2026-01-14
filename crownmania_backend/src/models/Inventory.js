import { db } from '../config/firebase.js';
import logger from '../config/logger.js';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Inventory model for managing serial number pool.
 * Status transitions: available → allocated → claimed
 */
class Inventory {
    constructor(data) {
        this.id = data.id;
        this.serialNumber = data.serialNumber;
        this.productId = data.productId;
        this.status = data.status || 'available'; // available, allocated, claimed
        this.orderId = data.orderId || null;
        this.allocatedAt = data.allocatedAt || null;
        this.claimedAt = data.claimedAt || null;
        this.createdAt = data.createdAt || new Date();
        this.updatedAt = new Date();
    }

    /**
     * Create a new inventory item (serial number)
     */
    static async create(data) {
        try {
            const inventory = new Inventory(data);
            const docRef = db.collection('inventory').doc();
            inventory.id = docRef.id;

            await docRef.set({
                serialNumber: inventory.serialNumber,
                productId: inventory.productId,
                status: inventory.status,
                orderId: inventory.orderId,
                allocatedAt: inventory.allocatedAt,
                claimedAt: inventory.claimedAt,
                createdAt: inventory.createdAt,
                updatedAt: inventory.updatedAt
            });

            return inventory;
        } catch (error) {
            logger.error('Error creating inventory item:', error);
            throw error;
        }
    }

    /**
     * Bulk create inventory items from array (for seeding)
     */
    static async bulkCreate(items, batchSize = 500) {
        try {
            const results = [];
            for (let i = 0; i < items.length; i += batchSize) {
                const batch = db.batch();
                const chunk = items.slice(i, i + batchSize);

                for (const item of chunk) {
                    const docRef = db.collection('inventory').doc();
                    batch.set(docRef, {
                        serialNumber: item.serialNumber,
                        productId: item.productId || null,
                        status: 'available',
                        orderId: null,
                        allocatedAt: null,
                        claimedAt: null,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    });
                }

                await batch.commit();
                results.push(...chunk);
                logger.info(`Seeded ${Math.min(i + batchSize, items.length)} / ${items.length} inventory items`);
            }

            return results;
        } catch (error) {
            logger.error('Error bulk creating inventory:', error);
            throw error;
        }
    }

    /**
     * Allocate an available serial number to an order (atomic operation)
     * Uses random selection to prevent sequential guessing
     * @param {string} productId - Product to allocate serial for
     * @param {string} orderId - Order to allocate serial to
     * @returns {Inventory} Allocated inventory item
     */
    static async allocateSerial(productId, orderId) {
        try {
            return await db.runTransaction(async (transaction) => {
                // Query available serials for this product (or any product if null)
                let query = db.collection('inventory')
                    .where('status', '==', 'available')
                    .limit(10); // Get a small batch for random selection

                if (productId) {
                    query = db.collection('inventory')
                        .where('status', '==', 'available')
                        .where('productId', '==', productId)
                        .limit(10);
                }

                const snapshot = await transaction.get(query);

                if (snapshot.empty) {
                    throw new Error(`No available serial numbers for product: ${productId || 'any'}`);
                }

                // Random selection from available pool
                const docs = snapshot.docs;
                const randomIndex = Math.floor(Math.random() * docs.length);
                const selectedDoc = docs[randomIndex];
                const data = selectedDoc.data();

                // Update the selected serial to allocated status
                transaction.update(selectedDoc.ref, {
                    status: 'allocated',
                    orderId: orderId,
                    allocatedAt: new Date(),
                    updatedAt: new Date()
                });

                return new Inventory({
                    id: selectedDoc.id,
                    ...data,
                    status: 'allocated',
                    orderId: orderId,
                    allocatedAt: new Date()
                });
            });
        } catch (error) {
            logger.error('Error allocating serial:', error);
            throw error;
        }
    }

    /**
     * Mark an allocated serial as claimed
     */
    static async markClaimed(serialNumber) {
        try {
            const snapshot = await db.collection('inventory')
                .where('serialNumber', '==', serialNumber)
                .limit(1)
                .get();

            if (snapshot.empty) {
                throw new Error(`Serial number not found: ${serialNumber}`);
            }

            const doc = snapshot.docs[0];
            const data = doc.data();

            if (data.status !== 'allocated') {
                throw new Error(`Serial ${serialNumber} is not in allocated status (current: ${data.status})`);
            }

            await doc.ref.update({
                status: 'claimed',
                claimedAt: new Date(),
                updatedAt: new Date()
            });

            return new Inventory({
                id: doc.id,
                ...data,
                status: 'claimed',
                claimedAt: new Date()
            });
        } catch (error) {
            logger.error('Error marking serial as claimed:', error);
            throw error;
        }
    }

    /**
     * Find inventory item by serial number
     */
    static async findBySerialNumber(serialNumber) {
        try {
            const snapshot = await db.collection('inventory')
                .where('serialNumber', '==', serialNumber)
                .limit(1)
                .get();

            if (snapshot.empty) return null;

            const doc = snapshot.docs[0];
            return new Inventory({ id: doc.id, ...doc.data() });
        } catch (error) {
            logger.error('Error finding inventory by serial:', error);
            throw error;
        }
    }

    /**
     * Get count of available serials by product
     */
    static async getAvailableCount(productId = null) {
        try {
            let query = db.collection('inventory').where('status', '==', 'available');

            if (productId) {
                query = query.where('productId', '==', productId);
            }

            const snapshot = await query.count().get();
            return snapshot.data().count;
        } catch (error) {
            logger.error('Error getting available count:', error);
            throw error;
        }
    }

    /**
     * Get inventory items by order ID
     */
    static async findByOrderId(orderId) {
        try {
            const snapshot = await db.collection('inventory')
                .where('orderId', '==', orderId)
                .get();

            return snapshot.docs.map(doc => new Inventory({ id: doc.id, ...doc.data() }));
        } catch (error) {
            logger.error('Error finding inventory by order:', error);
            throw error;
        }
    }
}

export default Inventory;
