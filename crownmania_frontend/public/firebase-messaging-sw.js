importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

// Firebase config - these are public web config values (safe to expose)
firebase.initializeApp({
  apiKey: "AIzaSyCWUFvCqGeCTYPZ5RNTE5JRdg8044lay94",
  authDomain: "sonorous-crane-440603-s6.firebaseapp.com",
  projectId: "sonorous-crane-440603-s6",
  storageBucket: "sonorous-crane-440603-s6.firebasestorage.app",
  messagingSenderId: "4886730691",
  appId: "1:515434599532:web:c803494515474ffa053449",
  measurementId: "G-KGLV8Y6S5G"
});

const messaging = firebase.messaging();

// Handle background messages
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
