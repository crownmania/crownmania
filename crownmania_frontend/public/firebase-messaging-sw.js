importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

// Firebase web config values are injected at build time via the main app.
// The service worker receives the config via a message from the main thread.
// Fallback: if no config is received, messaging won't initialize (safe default).

let isInitialized = false;

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'FIREBASE_CONFIG' && !isInitialized) {
    firebase.initializeApp(event.data.config);
    isInitialized = true;

    const messaging = firebase.messaging();
    messaging.onBackgroundMessage((payload) => {
      console.log('Received background message:', payload);

      const notificationTitle = payload.notification?.title || 'New notification';
      const notificationOptions = {
        body: payload.notification?.body || '',
        icon: '/crown_logo_white.svg',
        badge: '/crown_logo_white.svg',
        data: payload.data
      };

      return self.registration.showNotification(notificationTitle, notificationOptions);
    });
  }
});
