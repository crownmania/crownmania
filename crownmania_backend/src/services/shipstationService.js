import axios from 'axios';
import logger from '../config/logger.js';

/**
 * ShipStation integration service.
 *
 * Two halves:
 *   1. Push orders INTO ShipStation at purchase time, so labels can be bought
 *      in bulk from the ShipStation dashboard.
 *   2. Receive SHIP_NOTIFY webhooks when a label is created, fetch the shipment
 *      (tracking number + carrier), and mark the order shipped.
 *
 * Required env vars:
 *   SHIPSTATION_API_KEY, SHIPSTATION_API_SECRET
 * Optional env vars (used to pre-fill package so labels can be bought faster):
 *   SHIPSTATION_PACKAGE_WEIGHT_OZ, SHIPSTATION_PACKAGE_LENGTH,
 *   SHIPSTATION_PACKAGE_WIDTH, SHIPSTATION_PACKAGE_HEIGHT
 *
 * ShipStation's SHIP_NOTIFY webhook does NOT contain the shipment data — it
 * posts a `resource_url` pointer that must be fetched with API credentials.
 */

const SHIPSTATION_BASE = 'https://ssapi.shipstation.com';

const isConfigured = () =>
    Boolean(process.env.SHIPSTATION_API_KEY && process.env.SHIPSTATION_API_SECRET);

const client = () => axios.create({
    baseURL: SHIPSTATION_BASE,
    auth: {
        username: process.env.SHIPSTATION_API_KEY,
        password: process.env.SHIPSTATION_API_SECRET
    },
    headers: { 'Content-Type': 'application/json' },
    timeout: 30000
});

/**
 * Map a Stripe-shaped shipping address to ShipStation's address object.
 * Stripe gives: { name, line1, line2, city, state, postal_code, country }
 * ShipStation wants: { name, street1, street2, city, state, postalCode, country, residential }
 */
const toShipStationAddress = (addr = {}) => ({
    name: addr.name || 'Customer',
    street1: addr.line1 || '',
    street2: addr.line2 || '',
    city: addr.city || '',
    state: addr.state || '',
    postalCode: addr.postal_code || '',
    country: addr.country || 'US',
    residential: true
});

/**
 * Optional package details pulled from env so the user doesn't configure
 * weight/dimensions on every label.
 */
const packageDetails = () => {
    const weightOz = process.env.SHIPSTATION_PACKAGE_WEIGHT_OZ;
    if (!weightOz) return {};

    const details = {
        weight: { value: Number(weightOz), units: 'ounces' }
    };

    const L = process.env.SHIPSTATION_PACKAGE_LENGTH;
    const W = process.env.SHIPSTATION_PACKAGE_WIDTH;
    const H = process.env.SHIPSTATION_PACKAGE_HEIGHT;
    if (L && W && H) {
        details.dimensions = {
            units: 'inches',
            length: Number(L),
            width: Number(W),
            height: Number(H)
        };
    }
    return details;
};

/**
 * Push a paid order into ShipStation as awaiting_shipment.
 * Safe to call on fulfillment — failures are logged, never thrown, so a
 * ShipStation outage can never break a customer's purchase.
 * @param {object} order - The created order record
 * @returns {Promise<number|null>} ShipStation orderId, or null on failure
 */
export const pushOrderToShipStation = async (order) => {
    if (!isConfigured()) {
        logger.warn('ShipStation not configured — order not pushed', { orderId: order.id });
        return null;
    }

    try {
        const payload = {
            orderNumber: order.id,
            orderKey: order.id,
            orderDate: (order.createdAt?.toDate?.() || new Date()).toISOString(),
            orderStatus: 'awaiting_shipment',
            customerEmail: order.customerEmail || undefined,
            billTo: toShipStationAddress(order.shippingAddress),
            shipTo: toShipStationAddress(order.shippingAddress),
            items: (order.items || []).map((item, i) => ({
                sku: item.productId || `ITEM-${i}`,
                name: item.name || 'Crownmania Collectible',
                quantity: item.quantity || 1,
                unitPrice: item.unitPrice ? item.unitPrice / 100 : (item.price ? item.price / 100 : 0)
            })),
            internalNotes: `Stripe session ${order.stripeSessionId || 'n/a'}`,
            ...packageDetails()
        };

        const res = await client().post('/orders/createorder', payload);
        logger.info('Order pushed to ShipStation', {
            orderId: order.id,
            shipstationOrderId: res.data?.orderId
        });
        return res.data?.orderId ?? null;
    } catch (error) {
        logger.error('Failed to push order to ShipStation', {
            orderId: order.id,
            status: error.response?.status,
            detail: error.response?.data || error.message
        });
        return null;
    }
};

/**
 * Register the SHIP_NOTIFY webhook with ShipStation.
 * Run once from scripts/setupShipstation.js — ShipStation keeps it active.
 * @param {string} targetUrl - Public URL ShipStation should POST to
 */
export const subscribeWebhook = async (targetUrl) => {
    if (!isConfigured()) throw new Error('ShipStation credentials not configured');

    const res = await client().post('/v1/webhooks/subscribe', {
        target_url: targetUrl,
        event: 'SHIP_NOTIFY',
        friendly_name: 'crownmania-fulfillment'
    });

    logger.info('ShipStation webhook subscribed', { targetUrl, response: res.data });
    return res.data;
};

/**
 * List current webhook subscriptions (for diagnostics).
 */
export const listWebhooks = async () => {
    if (!isConfigured()) throw new Error('ShipStation credentials not configured');
    const res = await client().get('/v1/webhooks');
    return res.data;
};

/**
 * Validate that a webhook's resource_url actually points at ShipStation before
 * fetching it. ShipStation sends only { resource_url, resource_type } — we fetch
 * that URL ourselves, so we must not fetch arbitrary hosts (SSRF guard).
 */
export const isValidResourceUrl = (resourceUrl) => {
    try {
        const u = new URL(resourceUrl);
        return u.protocol === 'https:' && u.hostname === 'ssapi.shipstation.com';
    } catch {
        return false;
    }
};

/**
 * Fetch shipment data for a webhook's resource_url.
 * @param {string} resourceUrl - The URL ShipStation POSTed to us
 * @returns {Promise<object>} The shipments payload ({ shipments: [...] })
 */
export const fetchShipments = async (resourceUrl) => {
    if (!isConfigured()) throw new Error('ShipStation credentials not configured');
    if (!isValidResourceUrl(resourceUrl)) {
        throw new Error(`Refusing to fetch non-ShipStation URL: ${resourceUrl}`);
    }
    const res = await client().get(resourceUrl);
    return res.data;
};

/**
 * Map a ShipStation carrierCode to the carriers getTrackingUrl understands.
 * ShipStation uses 'dhl_express', 'dhl_global_mail', 'ups', 'fedex', 'usps', etc.
 */
export const mapCarrierCode = (carrierCode) => {
    const code = String(carrierCode || '').toLowerCase();
    // ShipStation's USPS labels come through as 'stamps_com' (Endicia) — the
    // tracking number is still USPS, so map it to the usps tracking URL.
    if (code.startsWith('usps') || code === 'stamps_com') return 'usps';
    if (code.startsWith('ups')) return 'ups';
    if (code.startsWith('fedex')) return 'fedex';
    if (code.startsWith('dhl')) return 'dhl';
    return code || null;
};

export default {
    isConfigured,
    pushOrderToShipStation,
    subscribeWebhook,
    listWebhooks,
    isValidResourceUrl,
    fetchShipments,
    mapCarrierCode
};
