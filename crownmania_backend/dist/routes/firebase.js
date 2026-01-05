import express from 'express';
import { admin } from '../config/firebase.js';
const router = express.Router();

// Use the shared Admin app initialized in config/firebase.js
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