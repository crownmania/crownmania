import 'dotenv/config';
import { db } from '../src/config/firebase.js';

const orders = await db.collection('orders').orderBy('createdAt', 'desc').limit(5).get();
console.log('Recent orders:', orders.size);

for (const doc of orders.docs) {
  const d = doc.data();
  console.log('---');
  console.log('ID:', doc.id);
  console.log('Email:', d.customerEmail);
  console.log('Status:', d.status);
  console.log('Payment:', d.paymentStatus);
  console.log('Total:', d.total);
  console.log('Serials:', d.allocatedSerials?.length || 0, d.allocatedSerials);
  console.log('Shipping:', JSON.stringify(d.shippingAddress));
  console.log('Created:', d.createdAt?.toDate?.()?.toISOString?.() || d.createdAt);
}

if (orders.empty) {
  console.log('No orders yet — webhook may not have fired.');
}

const available = await db.collection('inventory')
  .where('productId', '==', 'lil-durk-figure')
  .where('status', '==', 'available')
  .count().get();
const allocated = await db.collection('inventory')
  .where('productId', '==', 'lil-durk-figure')
  .where('status', '==', 'allocated')
  .count().get();

console.log('---');
console.log('Inventory available:', available.data().count, '| allocated:', allocated.data().count);

process.exit(0);
