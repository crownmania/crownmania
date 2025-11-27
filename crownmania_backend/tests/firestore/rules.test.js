import {
  assertSucceeds,
  assertFails,
  initializeTestEnvironment,
  RulesTestEnvironment
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';

describe('Firestore Security Rules', () => {
  let testEnv;
  let adminDb;
  let userDb;
  let anonDb;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'demo-crownmania',
      firestore: {
        rules: readFileSync('firestore.rules', 'utf8'),
      },
    });

    // Get database instances for different auth states
    adminDb = testEnv.authenticatedContext('admin', { role: 'admin' }).firestore();
    userDb = testEnv.authenticatedContext('user123', { role: 'user' }).firestore();
    anonDb = testEnv.unauthenticatedContext().firestore();
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  describe('Users Collection', () => {
    it('allows users to read their own profile', async () => {
      const userProfile = userDb.collection('users').doc('user123');
      await assertSucceeds(userProfile.get());
    });

    it('prevents users from reading other profiles', async () => {
      const otherProfile = userDb.collection('users').doc('other123');
      await assertFails(otherProfile.get());
    });

    it('allows admins to read any profile', async () => {
      const anyProfile = adminDb.collection('users').doc('user123');
      await assertSucceeds(anyProfile.get());
    });

    it('prevents unauthorized updates to role field', async () => {
      const userProfile = userDb.collection('users').doc('user123');
      await assertFails(userProfile.update({ role: 'admin' }));
    });

    describe('Private Subcollection', () => {
      it('allows users to access their private data', async () => {
        const privateData = userDb
          .collection('users')
          .doc('user123')
          .collection('private')
          .doc('data');
        await assertSucceeds(privateData.get());
      });

      it('prevents access to others private data', async () => {
        const otherPrivateData = userDb
          .collection('users')
          .doc('other123')
          .collection('private')
          .doc('data');
        await assertFails(otherPrivateData.get());
      });
    });
  });

  describe('Collectibles Collection', () => {
    beforeEach(async () => {
      // Set up test data
      await adminDb.collection('collectibles').doc('test123').set({
        serialNumber: 'ABC123',
        status: 'unclaimed',
        ownerId: null
      });
    });

    it('allows public read access to collectibles', async () => {
      const collectible = anonDb.collection('collectibles').doc('test123');
      await assertSucceeds(collectible.get());
    });

    it('prevents non-admin users from creating collectibles', async () => {
      const newCollectible = userDb.collection('collectibles').doc('new123');
      await assertFails(newCollectible.set({
        serialNumber: 'NEW123',
        status: 'unclaimed'
      }));
    });

    it('allows owners to update specific fields', async () => {
      const collectible = userDb.collection('collectibles').doc('test123');
      await adminDb.collection('collectibles').doc('test123').update({
        ownerId: 'user123'
      });

      await assertSucceeds(collectible.update({
        nickname: 'My Collectible',
        customMetadata: { color: 'blue' }
      }));
    });

    it('prevents owners from updating restricted fields', async () => {
      const collectible = userDb.collection('collectibles').doc('test123');
      await adminDb.collection('collectibles').doc('test123').update({
        ownerId: 'user123'
      });

      await assertFails(collectible.update({
        status: 'minted',
        serialNumber: 'HACKED'
      }));
    });
  });

  describe('Orders Collection', () => {
    beforeEach(async () => {
      await adminDb.collection('orders').doc('order123').set({
        userId: 'user123',
        status: 'pending',
        items: [{ id: 'item1', quantity: 1 }]
      });
    });

    it('allows users to read their own orders', async () => {
      const order = userDb.collection('orders').doc('order123');
      await assertSucceeds(order.get());
    });

    it('prevents users from reading others orders', async () => {
      const otherOrder = userDb.collection('orders').doc('other123');
      await assertFails(otherOrder.get());
    });

    it('allows users to create orders for themselves', async () => {
      const newOrder = userDb.collection('orders').doc('new123');
      await assertSucceeds(newOrder.set({
        userId: 'user123',
        items: [{ id: 'item1', quantity: 1 }],
        status: 'pending'
      }));
    });

    it('prevents users from creating orders for others', async () => {
      const newOrder = userDb.collection('orders').doc('new123');
      await assertFails(newOrder.set({
        userId: 'other123',
        items: [{ id: 'item1', quantity: 1 }],
        status: 'pending'
      }));
    });

    it('allows users to update shipping address', async () => {
      const order = userDb.collection('orders').doc('order123');
      await assertSucceeds(order.update({
        shippingAddress: {
          street: '123 Main St',
          city: 'Anytown'
        }
      }));
    });

    it('prevents users from updating order status', async () => {
      const order = userDb.collection('orders').doc('order123');
      await assertFails(order.update({
        status: 'shipped'
      }));
    });
  });

  describe('System Config Collection', () => {
    it('allows authenticated users to read config', async () => {
      const config = userDb.collection('systemConfig').doc('settings');
      await assertSucceeds(config.get());
    });

    it('prevents unauthenticated access to config', async () => {
      const config = anonDb.collection('systemConfig').doc('settings');
      await assertFails(config.get());
    });

    it('allows only admins to update config', async () => {
      const config = adminDb.collection('systemConfig').doc('settings');
      await assertSucceeds(config.set({
        maintenanceMode: true
      }));

      const userConfig = userDb.collection('systemConfig').doc('settings');
      await assertFails(userConfig.set({
        maintenanceMode: true
      }));
    });
  });
});
