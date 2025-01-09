import { storage } from '../config/firebase';
import { ref, getDownloadURL } from 'firebase/storage';

const modelCache = new Map();

export const loadModelFromStorage = async (modelPath) => {
  try {
    // Check cache first
    if (modelCache.has(modelPath)) {
      return modelCache.get(modelPath);
    }

    // Get download URL from Firebase Storage
    const modelRef = ref(storage, `models/${modelPath}`);
    const url = await getDownloadURL(modelRef);
    
    // Cache the URL
    modelCache.set(modelPath, url);
    
    return url;
  } catch (error) {
    console.error(`Error loading model ${modelPath}:`, error);
    
    // Fallback to local development path if in development
    if (process.env.NODE_ENV === 'development') {
      const localPath = `/src/assets/models/${modelPath}`;
      console.log('Falling back to local path:', localPath);
      return localPath;
    }
    
    throw error;
  }
};
