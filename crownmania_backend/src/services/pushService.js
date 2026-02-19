/**
 * CrownMania Push Notification Service (Backend)
 * Uses Firebase Admin SDK to send push notifications via FCM
 */
import { db } from '../config/firebase.js';
import logger from '../config/logger.js';

// Lazy-import admin messaging to avoid issues if not configured
let adminMessaging = null;

async function getMessaging() {
    if (!adminMessaging) {
        try {
            const admin = await import('firebase-admin');
            const app = admin.default.apps.length
                ? admin.default.app()
                : null;
            if (app) {
                adminMessaging = admin.default.messaging(app);
            }
        } catch (e) {
            logger.warn('[Push] Firebase Admin messaging not available:', e.message);
        }
    }
    return adminMessaging;
}

/**
 * Send push notification to ALL registered push tokens
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Optional data payload
 */
export async function sendPushToAll(title, body, data = {}) {
    try {
        const msgService = await getMessaging();
        if (!msgService) {
            logger.warn('[Push] Messaging not available — skipping push');
            return;
        }

        const snapshot = await db.collection('pushTokens').get();
        if (snapshot.empty) {
            logger.info('[Push] No registered tokens — skipping');
            return;
        }

        const tokens = snapshot.docs.map(doc => doc.data().token);
        const invalidTokenIds = [];

        // Send to each token individually to handle failures gracefully
        const results = await Promise.allSettled(
            tokens.map(async (token, i) => {
                try {
                    await msgService.send({
                        token,
                        notification: { title, body },
                        data: { ...data, timestamp: new Date().toISOString() },
                        webpush: {
                            notification: {
                                icon: '/crown_logo_white.svg',
                                badge: '/crown_logo_white.svg',
                            },
                        },
                    });
                } catch (err) {
                    // Track invalid tokens for cleanup
                    if (
                        err.code === 'messaging/registration-token-not-registered' ||
                        err.code === 'messaging/invalid-registration-token'
                    ) {
                        invalidTokenIds.push(snapshot.docs[i].id);
                    }
                    throw err;
                }
            })
        );

        const sent = results.filter(r => r.status === 'fulfilled').length;
        logger.info(`[Push] Sent ${sent}/${tokens.length} notifications`);

        // Cleanup invalid tokens
        if (invalidTokenIds.length > 0) {
            const batch = db.batch();
            invalidTokenIds.forEach(id => batch.delete(db.collection('pushTokens').doc(id)));
            await batch.commit();
            logger.info(`[Push] Cleaned up ${invalidTokenIds.length} invalid tokens`);
        }
    } catch (error) {
        logger.error('[Push] Failed to send notifications:', error.message);
    }
}

/**
 * Send push notification for a new claim event
 */
export async function notifyNewClaim(edition, productName = 'Lil Durk Figure') {
    await sendPushToAll(
        '🎉 New Edition Claimed!',
        `Edition #${edition}/500 of the ${productName} has been claimed!`,
        { type: 'claim', edition: String(edition) }
    );
}

/**
 * Send push notification for content drops
 */
export async function notifyContentDrop(title, description) {
    await sendPushToAll(
        `🎁 New Drop: ${title}`,
        description || 'Check your Vault for the latest exclusive content!',
        { type: 'content_drop' }
    );
}

export default {
    sendPushToAll,
    notifyNewClaim,
    notifyContentDrop,
};
