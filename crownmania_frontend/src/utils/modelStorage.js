import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';

export const uploadModel = async (file, modelName) => {
  try {
    const modelRef = ref(storage, `models/${modelName}`);
    const snapshot = await uploadBytes(modelRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading model:', error);
    throw error;
  }
};

const PUBLIC_BUCKET = 'sonorous-crane-440603-s6.firebasestorage.app';

export const getModelURL = async (modelName) => {
  try {
    const modelRef = ref(storage, `models/${modelName}`);
    const downloadURL = await getDownloadURL(modelRef);
    return downloadURL;
  } catch (error) {
    if (import.meta.env.DEV) console.warn('Error getting model URL:', error.message);
    return `https://firebasestorage.googleapis.com/v0/b/${PUBLIC_BUCKET}/o/${encodeURIComponent(`models/${modelName}`)}?alt=media`;
  }
};
