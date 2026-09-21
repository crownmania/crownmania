import { initializeApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';

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

// Storage is the only service needed on initial load.
const storage = getStorage(app);

// Auth, Firestore and Functions are lazy-loaded on first use so their code
// stays out of the initial firebase bundle.
let _auth = null;
let _db = null;
let _functions = null;

const getAuthInstance = async () => {
  if (!_auth) _auth = (await import('firebase/auth')).getAuth(app);
  return _auth;
};

const getDbInstance = async () => {
  if (!_db) _db = (await import('firebase/firestore')).getFirestore(app);
  return _db;
};

const getFunctionsInstance = async () => {
  if (!_functions) _functions = (await import('firebase/functions')).getFunctions(app);
  return _functions;
};

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
              // Send Firebase config to the service worker (avoids hardcoded keys in SW file)
              if (registration.active) {
                registration.active.postMessage({ type: 'FIREBASE_CONFIG', config: firebaseConfig });
              }
              navigator.serviceWorker.ready.then((reg) => {
                reg.active?.postMessage({ type: 'FIREBASE_CONFIG', config: firebaseConfig });
              });
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
  storage,
  analytics,
  messaging,
  getAuthInstance,
  getDbInstance,
  getFunctionsInstance
};
