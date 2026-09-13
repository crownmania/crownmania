import 'dotenv/config';
import { db } from '../src/config/firebase.js';
import { orderFulfillmentService } from '../src/services/orderFulfillmentService.js';
import { getTrackingUrl } from '../src/config/email.js';

// Usage: node scripts/markShipped.js <orderId> <trackingNumber> [carrier]
// Example: node scripts/markShipped.js ORD-123 9400111899223197428490 usps
const [orderId, trackingNumber, carrier] = process.argv.slice(2);

if (!orderId || !trackingNumber) {
  console.error('Usage: node scripts/markShipped.js <orderId> <trackingNumber> [carrier]');
  console.error('Carriers with clickable tracking links: usps, ups, fedex, dhl');
  process.exit(1);
}

const doc = await db.collection('orders').doc(orderId).get();
if (!doc.exists) {
  console.error('Order not found:', orderId);
  process.exit(1);
}

const order = doc.data();
if (order.status === 'shipped') {
  console.error(`Order already marked shipped (tracking: ${order.trackingNumber}). Aborting to avoid a duplicate email.`);
  process.exit(1);
}
if (order.status === 'refunded') {
  console.error('Order was refunded — not shipping.');
  process.exit(1);
}

if (carrier && !getTrackingUrl(carrier, trackingNumber)) {
  console.warn(`Note: "${carrier}" has no known tracking URL — the email will show the number without a clickable link.`);
}

console.log(`Order:    ${orderId}`);
console.log(`Customer: ${order.customerEmail}`);
console.log(`Ship to:  ${order.shippingAddress?.name}, ${order.shippingAddress?.line1}, ${order.shippingAddress?.city} ${order.shippingAddress?.state} ${order.shippingAddress?.postal_code}`);
console.log(`Tracking: ${trackingNumber}${carrier ? ` (${carrier})` : ''}`);

const result = await orderFulfillmentService.markShipped(orderId, trackingNumber, carrier || null);
console.log(`\n✅ Marked shipped and emailed ${order.customerEmail}`);
console.log(result);

process.exit(0);
