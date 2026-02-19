/**
 * CrownMania Push Notification Service
 * Uses Firebase Cloud Messaging (FCM) — free unlimited notifications
 * Handles: permission requests, token management, foreground message display
 */

import { messaging } from '../config/firebase';

let fcmToken = null;
let onMessageCallback = null;

/**
 * Check if push notifications are supported
 */
export function isPushSupported() {
    return 'Notification' in window && 'serviceWorker' in navigator && messaging !== null;
}

/**
 * Get current notification permission status
 * @returns {'granted' | 'denied' | 'default'}
 */
export function getPermissionStatus() {
    if (!('Notification' in window)) return 'denied';
    return Notification.permission;
}

/**
 * Request notification permission and get FCM token
 * @returns {Promise<{success: boolean, token?: string, error?: string}>}
 */
export async function requestPushPermission() {
    if (!isPushSupported()) {
        return { success: false, error: 'Push notifications not supported in this browser' };
    }

    try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            return { success: false, error: 'Notification permission denied' };
        }

        // Get FCM token
        const { getToken } = await import('firebase/messaging');
        const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

        const token = await getToken(messaging, {
            vapidKey: vapidKey || undefined,
            serviceWorkerRegistration: await navigator.serviceWorker.ready,
        });

        fcmToken = token;
        console.log('[Push] FCM token obtained');

        // Save token to backend for server-side notifications
        await saveTokenToServer(token);

        return { success: true, token };
    } catch (error) {
        console.error('[Push] Failed to get token:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Save FCM token to backend for server-side push
 * @param {string} token
 */
async function saveTokenToServer(token) {
    try {
        const apiUrl = import.meta.env.VITE_API_URL || '';
        const response = await fetch(`${apiUrl}/api/notifications/register-push`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, platform: 'web' }),
        });

        if (!response.ok) {
            console.warn('[Push] Failed to register token with server');
        }
    } catch (error) {
        console.warn('[Push] Token registration skipped (server may not support it yet):', error.message);
    }
}

/**
 * Listen for foreground messages
 * @param {Function} callback - Called with { title, body, data } when message received
 */
export function onForegroundMessage(callback) {
    if (!messaging) return;

    onMessageCallback = callback;

    import('firebase/messaging').then(({ onMessage }) => {
        onMessage(messaging, (payload) => {
            console.log('[Push] Foreground message:', payload);

            const notification = {
                title: payload.notification?.title || 'CrownMania',
                body: payload.notification?.body || '',
                icon: '/crown_logo_white.svg',
                data: payload.data || {},
            };

            // Call custom handler
            if (onMessageCallback) {
                onMessageCallback(notification);
            }

            // Show toast notification in-app
            showInAppNotification(notification);
        });
    }).catch(() => {
        console.warn('[Push] Foreground message listener not available');
    });
}

/**
 * Show an in-app toast notification
 * @param {{ title: string, body: string }} notification
 */
function showInAppNotification(notification) {
    // Create notification toast element
    const toast = document.createElement('div');
    toast.className = 'cm-push-toast';
    toast.innerHTML = `
    <div class="cm-push-toast-content">
      <div class="cm-push-toast-title">${notification.title}</div>
      <div class="cm-push-toast-body">${notification.body}</div>
    </div>
  `;

    // Inject styles if not already present
    if (!document.getElementById('cm-push-styles')) {
        const style = document.createElement('style');
        style.id = 'cm-push-styles';
        style.textContent = `
      .cm-push-toast {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 99999;
        background: rgba(10, 15, 30, 0.95);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(65, 105, 225, 0.4);
        border-radius: 12px;
        padding: 16px 20px;
        min-width: 280px;
        max-width: 380px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 20px rgba(65, 105, 225, 0.15);
        animation: cmToastSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1),
                   cmToastSlideOut 0.3s ease 4.7s forwards;
        font-family: 'Bebas Neue', sans-serif;
      }
      .cm-push-toast-title {
        font-size: 1rem;
        font-weight: 700;
        color: #fff;
        letter-spacing: 0.05em;
        margin-bottom: 4px;
      }
      .cm-push-toast-body {
        font-family: 'Share Tech Mono', monospace;
        font-size: 0.85rem;
        color: rgba(255, 255, 255, 0.7);
        line-height: 1.4;
      }
      @keyframes cmToastSlideIn {
        from { transform: translateX(120%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes cmToastSlideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(120%); opacity: 0; }
      }
    `;
        document.head.appendChild(style);
    }

    document.body.appendChild(toast);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 5100);
}

/**
 * Get current FCM token
 */
export function getFCMToken() {
    return fcmToken;
}

export default {
    isPushSupported,
    getPermissionStatus,
    requestPushPermission,
    onForegroundMessage,
    getFCMToken,
};
