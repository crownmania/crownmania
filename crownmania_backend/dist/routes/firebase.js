import express from 'express';
import admin from 'firebase-admin';
import dotenv from 'dotenv';
dotenv.config();
const router = express.Router();

// Initialize Firebase Admin
if (!admin.apps.length) {
  const serviceAccount = {
    type: "service_account",
    project_id: "sonorous-crane-440603-s6",
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY,
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
  };
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET
  });
  console.log('Firebase Admin initialized successfully');
}
const bucket = admin.storage().bucket();

// Get signed URL for file upload
router.post('/get-upload-url', async (req, res) => {
  try {
    const {
      fileName,
      contentType
    } = req.body;
    const file = bucket.file(fileName);
    const [url] = await file.getSignedUrl({
      action: 'write',
      expires: Date.now() + 15 * 60 * 1000,
      // 15 minutes
      contentType
    });
    res.json({
      url
    });
  } catch (error) {
    console.error('Firebase error:', error);
    res.status(500).json({
      error: error.message
    });
  }
});

// Get signed URL for file download
router.get('/get-download-url/:fileName', async (req, res) => {
  try {
    const {
      fileName
    } = req.params;
    const file = bucket.file(fileName);
    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 60 * 60 * 1000 // 1 hour
    });
    res.json({
      url
    });
  } catch (error) {
    console.error('Firebase error:', error);
    res.status(500).json({
      error: error.message
    });
  }
});
export { router as firebaseRouter };