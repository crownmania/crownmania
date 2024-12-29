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

export const getModelURL = async (modelName) => {
  try {
    const modelRef = ref(storage, `models/${modelName}`);
    const downloadURL = await getDownloadURL(modelRef);
    return downloadURL;
  } catch (error) {
    console.error('Error getting model URL:', error);
    throw error;
  }
};
