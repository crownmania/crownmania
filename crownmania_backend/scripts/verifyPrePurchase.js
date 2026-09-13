import 'dotenv/config';
import { db } from '../src/config/firebase.js';

const base = 'https://crownmania-backend-production.up.railway.app';
const results = [];

function push(label, ok, detail = '') {
  results.push({ label, ok: Boolean(ok), detail });
}

async function run() {
  // 1. Health
  try {
    const r = await fetch(base + '/health');
    push('Health check', r.status === 200, `status ${r.status}`);
  } catch (e) {
    push('Health check', false, e.message);
  }

  // 2. Checkout session
  let sessionId;
  try {
    const r = await fetch(base + '/api/stripe/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{ productId: 'lil-durk-figure', quantity: 1 }],
        customerEmail: 'test@crownmania.com'
      })
    });
    const data = await r.json();
    sessionId = data.id;
    push('Create checkout', r.ok && data.id, `id ${data.id}, total ${data.amount_total}`);
  } catch (e) {
    push('Create checkout', false, e.message);
  }

  // 3. Session status
  try {
    const r = await fetch(base + '/api/stripe/session/' + sessionId);
    const data = await r.json();
    push('Session status', data.id === sessionId, `status ${data.status}, amount ${data.amount_total}`);
  } catch (e) {
    push('Session status', false, e.message);
  }

  // 4. Inventory
  const available = await db.collection('inventory')
    .where('productId', '==', 'lil-durk-figure')
    .where('status', '==', 'available')
    .count()
    .get();
  push('Inventory seeded', available.data().count > 0, `available: ${available.data().count}`);

  // 5. Orders
  const orders = await db.collection('orders').limit(1).get();
  push('Orders collection', true, `current orders: ${orders.size}`);

  // 6. Admin endpoint
  try {
    const r = await fetch(base + '/api/admin/orders');
    push('Admin orders', r.status === 401 || r.status === 200, `status ${r.status}`);
  } catch (e) {
    push('Admin orders', false, e.message);
  }

  // 7. Webhook
  try {
    const r = await fetch(base + '/api/stripe/webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}'
    });
    const text = await r.text();
    push('Webhook endpoint', r.status === 400 && text.includes('No stripe-signature'), `status ${r.status}`);
  } catch (e) {
    push('Webhook endpoint', false, e.message);
  }

  for (const { label, ok, detail } of results) {
    console.log(`${ok ? '✅' : '❌'} ${label.padEnd(22)} ${detail}`);
  }
  const failed = results.filter(r => !r.ok);
  if (failed.length) {
    console.log('\n❌ ' + failed.length + ' checks failed');
    process.exit(1);
  } else {
    console.log('\n✅ All systems green');
    process.exit(0);
  }
}

run();
