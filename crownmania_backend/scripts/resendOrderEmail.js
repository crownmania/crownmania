import 'dotenv/config';
import { db } from '../src/config/firebase.js';
import { sendOrderConfirmationEmail } from '../src/config/email.js';

const orderId = process.argv[2] || 'ORD-1787366912909-8517d0c31493';

const doc = await db.collection('orders').doc(orderId).get();
if (!doc.exists) {
  console.error('Order not found:', orderId);
  process.exit(1);
}

const order = doc.data();

// Serials are physical stickers applied at random, so the email shows
// product names/quantities only — never a database serial or claim link.
const items = (order.items || []).map(item => ({
  name: item.name || 'Lil Durk Collectible Figure',
  quantity: item.quantity || 1
}));

try {
  await sendOrderConfirmationEmail(order.customerEmail, {
    orderId,
    total: order.total || null,
    items
  });
  console.log(`✅ Order confirmation resent to ${order.customerEmail} for ${orderId}`);
} catch (err) {
  console.error('❌ Failed to send:', err.message);
  process.exit(1);
}
process.exit(0);
