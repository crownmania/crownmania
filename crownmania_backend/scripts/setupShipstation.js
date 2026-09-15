import 'dotenv/config';
import { db } from '../src/config/firebase.js';
import shipstationService from '../src/services/shipstationService.js';

/**
 * One-time ShipStation setup.
 *
 * Usage:
 *   SHIPSTATION_API_KEY=... SHIPSTATION_API_SECRET=... node scripts/setupShipstation.js
 *
 * Does three things:
 *   1. Verifies credentials against the ShipStation API
 *   2. Subscribes the SHIP_NOTIFY webhook to this backend
 *   3. Pushes any existing paid orders into ShipStation as awaiting_shipment
 *
 * The webhook target defaults to the production domain; override with
 * SHIPSTATION_WEBHOOK_URL if testing against a tunnel.
 */

const WEBHOOK_URL = process.env.SHIPSTATION_WEBHOOK_URL
    || 'https://api.crownmania.com/api/shipstation/webhook';

if (!shipstationService.isConfigured()) {
    console.error('SHIPSTATION_API_KEY and SHIPSTATION_API_SECRET must be set.');
    console.error('Get them from ShipStation → Account → API Settings.');
    process.exit(1);
}

// 1. Verify credentials — listWebhooks doubles as an auth check.
console.log('Verifying credentials...');
const existing = await shipstationService.listWebhooks();
console.log(`✅ Authenticated. ${existing?.webhooks?.length ?? 0} webhook(s) already registered.`);
for (const w of existing?.webhooks || []) {
    console.log(`   - ${w.name || w.friendly_name || 'unnamed'} → ${w.target_url} (${w.event})`);
}

// 2. Subscribe the shipment webhook (idempotent — ShipStation dedupes by URL+event).
const alreadySubscribed = (existing?.webhooks || []).some(
    w => w.target_url === WEBHOOK_URL && w.event === 'SHIP_NOTIFY'
);
if (alreadySubscribed) {
    console.log(`✅ Webhook already subscribed to ${WEBHOOK_URL}`);
} else {
    console.log(`Subscribing SHIP_NOTIFY → ${WEBHOOK_URL} ...`);
    const res = await shipstationService.subscribeWebhook(WEBHOOK_URL);
    console.log('✅ Webhook subscribed:', JSON.stringify(res));
}

// 3. Backfill existing paid orders into ShipStation.
console.log('\nBackfilling paid orders...');
const orders = await db.collection('orders')
    .where('status', 'in', ['paid', 'processing'])
    .get();

if (orders.empty) {
    console.log('No paid orders to push.');
} else {
    for (const doc of orders.docs) {
        const order = doc.data();
        if (order.shipstationOrderId) {
            console.log(`   ${doc.id}: already in ShipStation (${order.shipstationOrderId})`);
            continue;
        }
        const ssId = await shipstationService.pushOrderToShipStation({
            id: doc.id,
            ...order,
            createdAt: order.createdAt
        });
        if (ssId) {
            await doc.ref.update({ shipstationOrderId: ssId });
            console.log(`   ${doc.id}: pushed → ShipStation order ${ssId}`);
        } else {
            console.log(`   ${doc.id}: FAILED to push (see logs)`);
        }
    }
}

console.log('\nDone.');
process.exit(0);
