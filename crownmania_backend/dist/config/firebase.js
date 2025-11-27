import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getFunctions } from 'firebase-admin/functions';
import { getMessaging } from 'firebase-admin/messaging';

// Initialize Firebase Admin
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET
});

// Initialize services
const db = getFirestore();
const functions = getFunctions();
const messaging = getMessaging();

// Configure Firestore settings
db.settings({
  ignoreUndefinedProperties: true
});
export { admin, db, functions, messaging };