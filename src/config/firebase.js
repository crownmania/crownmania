import { initializeApp } from 'firebase/app';
import { getStorage, ref, listAll } from 'firebase/storage';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Storage with custom settings
const storage = getStorage(app);

// Initialize Firestore
const db = getFirestore(app);

// Debug logging
console.log('Firebase Storage bucket:', storage.app.options.storageBucket);

// Test storage connection
const testStorage = async () => {
  try {
    const storageRef = ref(storage);
    console.log('Storage reference created:', storageRef.fullPath);
    
    const modelsDirRef = ref(storage, 'models');
    console.log('Models directory reference:', modelsDirRef.fullPath);
    
    const list = await listAll(modelsDirRef);
    console.log('Models directory contents:', list.items.map(item => item.fullPath));
  } catch (error) {
    console.error('Storage test failed:', error);
  }
};

testStorage();

export { storage, db };
