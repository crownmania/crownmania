import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getFunctions } from 'firebase-admin/functions';
import { getMessaging } from 'firebase-admin/messaging';
import { readFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Helper function to parse private key from environment variable
function parsePrivateKey(key) {
  if (!key) return null;

  // Remove surrounding quotes if present
  let parsed = key.replace(/^["']|["']$/g, '');

  // Handle various escaped newline formats
  parsed = parsed.replace(/\\n/g, '\n');

  return parsed;
}

// Try to load service account from JSON file first, then fall back to env vars
function getServiceAccount() {
  // Check for JSON file in config directory
  const jsonPath = join(__dirname, 'serviceAccountKey.json');

  if (existsSync(jsonPath)) {
    console.log('📁 Loading Firebase credentials from serviceAccountKey.json');
    const jsonContent = readFileSync(jsonPath, 'utf8');
    return JSON.parse(jsonContent);
  }

  // Fall back to environment variables
  console.log('🔧 Loading Firebase credentials from environment variables');

  const serviceAccount = {
    type: 'service_account',
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: parsePrivateKey(process.env.FIREBASE_PRIVATE_KEY),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
    client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
  };

  // Debug: Log which env vars are set (without revealing values)
  console.log('Firebase config check:', {
    hasProjectId: !!process.env.FIREBASE_PROJECT_ID,
    hasPrivateKeyId: !!process.env.FIREBASE_PRIVATE_KEY_ID,
    hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
    hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL,
    hasClientId: !!process.env.FIREBASE_CLIENT_ID,
    hasClientCertUrl: !!process.env.FIREBASE_CLIENT_CERT_URL,
    hasStorageBucket: !!process.env.FIREBASE_STORAGE_BUCKET
  });

  return serviceAccount;
}

const serviceAccount = getServiceAccount();

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET
  });
  console.log('✅ Firebase Admin initialized successfully');
} catch (error) {
  console.error('Firebase admin initialization error:', error.message);
  console.error('\n💡 TIP: Copy your Firebase service account JSON file to:');
  console.error(`   ${join(__dirname, 'serviceAccountKey.json')}`);
  console.error('\nOr fix the FIREBASE_PRIVATE_KEY in your .env file.');
  throw error;
}

// Initialize services - using 'crownmania' named database (Native mode)
// The default database is in Datastore mode, so we use a named database
const db = getFirestore(admin.app(), 'crownmania');
const functions = getFunctions();
const messaging = getMessaging();

console.log('📊 Using Firestore database: crownmania');

// Configure Firestore settings
db.settings({ ignoreUndefinedProperties: true });

export { admin, db, functions, messaging };
