importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

// Firebase config - these are public web config values (safe to expose)
firebase.initializeApp({
  apiKey: "AIzaSyBJoY_1QhxYpvVTcBw4lJxqNNjNn9qJD9g",
  authDomain: "sonorous-crane-440603-s6.firebaseapp.com",
  projectId: "sonorous-crane-440603-s6",
  storageBucket: "sonorous-crane-440603-s6.appspot.com",
  messagingSenderId: "515434599532",
  appId: "1:515434599532:web:3a4b5c6d7e8f9a0b1c2d3e"
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
