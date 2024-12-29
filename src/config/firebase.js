import { initializeApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "REDACTED_FIREBASE_API_KEY_OLD",
  authDomain: "sonorous-crane-440603-s6.firebaseapp.com",
  projectId: "sonorous-crane-440603-s6",
  storageBucket: "sonorous-crane-440603-s6.appspot.com",
  messagingSenderId: "515434599532",
  appId: "1:515434599532:web:8b9b9b9b9b9b9b9b9b9b9b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const storage = getStorage(app);
