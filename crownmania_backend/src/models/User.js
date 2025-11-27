import { db } from '../config/firebase.js';
import logger from '../config/logger.js';

class User {
  constructor(data) {
    this.id = data.id;
    this.email = data.email;
    this.walletAddress = data.walletAddress;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = new Date();
  }

  static async create(data) {
    try {
      const user = new User(data);
      await db.collection('users').doc(user.id).set({
        email: user.email,
        walletAddress: user.walletAddress,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      });
      return user;
    } catch (error) {
      logger.error('Error creating user:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const doc = await db.collection('users').doc(id).get();
      if (!doc.exists) return null;
      return new User({ id: doc.id, ...doc.data() });
    } catch (error) {
      logger.error('Error finding user:', error);
      throw error;
    }
  }

  static async findByWallet(walletAddress) {
    try {
      const snapshot = await db.collection('users')
        .where('walletAddress', '==', walletAddress)
        .limit(1)
        .get();
      if (snapshot.empty) return null;
      const doc = snapshot.docs[0];
      return new User({ id: doc.id, ...doc.data() });
    } catch (error) {
      logger.error('Error finding user by wallet:', error);
      throw error;
    }
  }
}

export default User;
