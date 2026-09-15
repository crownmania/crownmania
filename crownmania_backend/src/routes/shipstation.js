import express from 'express';
import shipstationService from '../services/shipstationService.js';
import { orderFulfillmentService } from '../services/orderFulfillmentService.js';
import { sendAdminAlertEmail } from '../config/email.js';
import logger from '../config/logger.js';
import { db } from '../config/firebase.js';

const router = express.Router();

/**
 * @route POST /api/shipstation/webhook
 * @desc Receive ShipStation SHIP_NOTIFY events and fulfil the order.
 *
 * ShipStation's webhook posts only { resource_url, resource_type } — the real
 * shipment data lives behind that URL and must be fetched with our API
 * credentials. We validate the host before fetching to prevent SSRF, and we
 * always answer 200 immediately so ShipStation doesn't retry while we work.
 */
router.post('/webhook', async (req, res) => {
    // Acknowledge immediately — ShipStation retries on non-2xx.
    res.status(200).json({ received: true });

    const { resource_url, resource_type } = req.body || {};
    if (resource_type !== 'SHIP_NOTIFY' || !resource_url) {
        return;
    }

    try {
        const data = await shipstationService.fetchShipments(resource_url);
        const shipments = data?.shipments || [];

        if (shipments.length === 0) {
            logger.info('ShipStation webhook delivered no shipments', { resource_url });
            return;
        }

        for (const shipment of shipments) {
            await processShipment(shipment).catch(err =>
                logger.error('Error processing ShipStation shipment', {
                    orderNumber: shipment?.orderNumber, error: err.message
                }));
        }
    } catch (error) {
        // Pass error.message, not the axios error object — the logger's
        // redactor mutates its argument and crashes on TLS internals.
        logger.error('ShipStation webhook handling failed:', error.message);
        await sendAdminAlertEmail('ShipStation webhook failed', {
            resource_url,
            error: error.message
        }).catch(() => {});
    }
});

async function processShipment(shipment) {
    const orderNumber = shipment.orderNumber;
    const trackingNumber = shipment.trackingNumber;
    const carrier = shipstationService.mapCarrierCode(shipment.carrierCode);

    if (!orderNumber || !trackingNumber) {
        logger.warn('ShipStation shipment missing orderNumber/trackingNumber', {
            orderNumber, trackingNumber
        });
        return;
    }

    const orderDoc = await db.collection('orders').doc(orderNumber).get();
    if (!orderDoc.exists) {
        logger.warn('ShipStation shipment for unknown order', { orderNumber });
        return;
    }

    const order = orderDoc.data();
    if (order.status === 'shipped' && order.trackingNumber === trackingNumber) {
        logger.info('Order already shipped with this tracking — skipping duplicate webhook', { orderNumber });
        return;
    }

    await orderFulfillmentService.markShipped(orderNumber, trackingNumber, carrier);
    logger.info('Order shipped via ShipStation webhook', { orderNumber, trackingNumber, carrier });
}

export default router;
