import { db } from '../config/firebase.js';
import logger from '../config/logger.js';

class Collectible {
  constructor(data) {
    this.id = data.id;
    this.serialNumber = data.serialNumber;
    this.tokenId = data.tokenId;
    this.ownerId = data.ownerId;
    this.status = data.status || 'unclaimed'; // unclaimed, claimed, minted
    this.metadata = data.metadata || {};
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = new Date();
  }

  static async create(data) {
    try {
      const collectible = new Collectible(data);
      await db.collection('collectibles').doc(collectible.id).set({
        serialNumber: collectible.serialNumber,
        tokenId: collectible.tokenId,
        ownerId: collectible.ownerId,
        status: collectible.status,
        metadata: collectible.metadata,
        createdAt: collectible.createdAt,
        updatedAt: collectible.updatedAt
      });
      return collectible;
    } catch (error) {
      logger.error('Error creating collectible:', error);
      throw error;
    }
  }

  static async findBySerialNumber(serialNumber) {
    try {
      const snapshot = await db.collection('collectibles')
        .where('serialNumber', '==', serialNumber)
        .limit(1)
        .get();
      if (snapshot.empty) return null;
      const doc = snapshot.docs[0];
      return new Collectible({ id: doc.id, ...doc.data() });
    } catch (error) {
      logger.error('Error finding collectible:', error);
      throw error;
    }
  }

  static async findByOwner(ownerId) {
    try {
      const snapshot = await db.collection('collectibles')
        .where('ownerId', '==', ownerId)
        .get();
      return snapshot.docs.map(doc => new Collectible({ id: doc.id, ...doc.data() }));
    } catch (error) {
      logger.error('Error finding collectibles by owner:', error);
      throw error;
    }
  }

  async updateStatus(status) {
    try {
      this.status = status;
      this.updatedAt = new Date();
      await db.collection('collectibles').doc(this.id).update({
        status: this.status,
        updatedAt: this.updatedAt
      });
      return this;
    } catch (error) {
      logger.error('Error updating collectible status:', error);
      throw error;
    }
  }
}

export default Collectible;
