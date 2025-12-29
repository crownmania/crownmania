import { initializeApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'demo-api-key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'demo.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'demo-project',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'demo-project.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '000000000000',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:000000000000:web:0000000000000000',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-XXXXXXXXXX'
};

// Check if we have real Firebase config
const hasValidConfig = import.meta.env.VITE_FIREBASE_API_KEY && 
                       import.meta.env.VITE_FIREBASE_PROJECT_ID;

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize core services (these work without full config)
const auth = getAuth(app);
const storage = getStorage(app);
const db = getFirestore(app);
const functions = getFunctions(app);

// Analytics and Messaging are optional - only initialize with valid config
let analytics = null;
let messaging = null;

if (hasValidConfig && typeof window !== 'undefined') {
  try {
    // Dynamically import analytics to avoid SSR issues
    import('firebase/analytics').then(({ getAnalytics }) => {
      try {
        analytics = getAnalytics(app);
        if (import.meta.env.DEV) {
          console.log('Firebase Analytics initialized');
        }
      } catch (err) {
        console.warn('Analytics initialization skipped:', err.message);
      }
    }).catch(() => {
      console.warn('Analytics module not available');
    });

    // Messaging requires service worker support
    if ('serviceWorker' in navigator) {
      import('firebase/messaging').then(({ getMessaging }) => {
        try {
          messaging = getMessaging(app);
          navigator.serviceWorker
            .register('/firebase-messaging-sw.js')
            .then((registration) => {
              console.log('Service Worker registered with scope:', registration.scope);
            })
            .catch((error) => {
              console.warn('Service Worker registration failed:', error.message);
            });
        } catch (err) {
          console.warn('Messaging initialization skipped:', err.message);
        }
      }).catch(() => {
        console.warn('Messaging module not available');
      });
    }
  } catch (err) {
    console.warn('Optional Firebase services skipped:', err.message);
  }
} else if (!hasValidConfig) {
  console.warn('Firebase: Running in demo mode. Set VITE_FIREBASE_* env vars for full functionality.');
}

export {
  app,
  auth,
  storage,
  db,
  analytics,
  messaging,
  functions
};
