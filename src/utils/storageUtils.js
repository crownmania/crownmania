import { storage } from '../config/firebase';
import { ref, uploadBytes, getDownloadURL, listAll } from '@firebase/storage';

// Cache for storing URLs with expiration
const urlCache = new Map();
const CACHE_EXPIRY = 1000 * 60 * 60; // 1 hour

// Image preloading cache
const imageCache = new Map();

/**
 * Preload an image
 * @param {string} url - Image URL to preload
 * @returns {Promise} Promise that resolves when image is loaded
 */
const preloadImage = (url) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      imageCache.set(url, img);
      resolve(url);
    };
    img.onerror = reject;
    img.src = url;
  });
};

/**
 * Get a download URL for a file from Firebase Storage with caching and preloading
 * @param {string} path - Full path to file in storage (e.g., 'models/durk.gltf')
 * @param {boolean} preload - Whether to preload the image
 * @returns {Promise<string>} Download URL
 */
export const getStorageURL = async (path, preload = false) => {
  try {
    console.log('Getting storage URL for:', path);

    // Check cache first
    if (urlCache.has(path)) {
      const cached = urlCache.get(path);
      if (Date.now() - cached.timestamp < CACHE_EXPIRY) {
        console.log('Returning cached URL for:', path);
        return cached.url;
      }
      console.log('Cache expired for:', path);
      urlCache.delete(path);
    }

    // Create storage reference
    const fileRef = ref(storage, path);
    console.log('Created storage reference:', fileRef.fullPath);

    // Get the download URL
    const url = await getDownloadURL(fileRef);
    console.log('Got download URL:', url);

    // Cache the URL
    urlCache.set(path, {
      url,
      timestamp: Date.now()
    });

    // Preload the image if requested
    if (preload) {
      try {
        await preloadImage(url);
        console.log('Preloaded image:', path);
      } catch (error) {
        console.warn('Failed to preload image:', path, error);
      }
    }

    return url;
  } catch (error) {
    console.error('Error getting storage URL:', path, error);
    throw error;
  }
};

/**
 * Preload multiple files from Firebase Storage
 * @param {Array<string>} paths - Array of file paths to preload
 * @returns {Promise<Array>} Array of URLs
 */
export const preloadFiles = async (paths) => {
  const urls = await Promise.all(
    paths.map(async (path) => {
      try {
        return await getStorageURL(path, true);
      } catch (error) {
        console.warn(`Failed to preload ${path}:`, error);
        return null;
      }
    })
  );
  return urls.filter(url => url !== null);
};

/**
 * List all files in a storage folder
 * @param {string} folder - Folder name (e.g., 'models', 'images', 'videos')
 * @returns {Promise<Array>} Array of file metadata
 */
export const listFiles = async (folder) => {
  try {
    console.log('Listing files in:', folder);
    console.log('Storage bucket:', storage.app.options.storageBucket);
    
    const folderRef = ref(storage, folder);
    console.log('Folder reference:', folderRef.toString());
    
    const result = await listAll(folderRef);
    
    // Get all file metadata and URLs
    const files = await Promise.all(
      result.items.map(async (item) => {
        const url = await getStorageURL(item.fullPath);
        urlCache.set(item.fullPath, { url, timestamp: Date.now() });
        
        return {
          name: item.name,
          fullPath: item.fullPath,
          url
        };
      })
    );
    
    return files;
  } catch (error) {
    console.error(`Error listing files in ${folder}:`, error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    throw error;
  }
};

/**
 * List all files in a storage folder
 * @param {string} folder - Folder name (e.g., 'models', 'images', 'videos')
 * @returns {Promise<Array>} Array of file paths
 */
export const listStorageFiles = async (path) => {
  try {
    console.log('Listing files in:', path);
    const folderRef = ref(storage, path);
    const result = await listAll(folderRef);
    console.log('Found files:', result.items.map(item => item.fullPath));
    const files = result.items.map(item => item.fullPath);
    return files;
  } catch (error) {
    console.error('Error listing files:', {
      path,
      errorCode: error.code,
      errorMessage: error.message
    });
    return [];
  }
};

/**
 * Upload a file to Firebase Storage
 * @param {File} file - File to upload
 * @param {string} folder - Folder name (e.g., 'models', 'images', 'videos')
 * @returns {Promise<string>} Download URL of uploaded file
 */
export const uploadFile = async (file, folder) => {
  try {
    // Validate file type based on folder
    const validTypes = {
      models: ['model/gltf-binary', 'model/gltf+json'],
      images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      videos: ['video/mp4', 'video/webm']
    };

    if (!validTypes[folder]?.includes(file.type)) {
      throw new Error(`Invalid file type for ${folder} folder`);
    }

    const fileRef = ref(storage, `${folder}/${file.name}`);
    await uploadBytes(fileRef, file);
    const url = await getStorageURLHelper(fileRef);
    
    // Cache the URL
    urlCache.set(`${folder}/${file.name}`, { url, timestamp: Date.now() });
    return url;
  } catch (error) {
    console.error(`Error uploading file to ${folder}:`, error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    throw error;
  }
};

const getStorageURLHelper = async (fileRef) => {
  try {
    const url = await getDownloadURL(fileRef);
    return url;
  } catch (error) {
    if (error.code === 'storage/object-not-found') {
      console.warn(`File not found in storage: ${fileRef.fullPath}`);
      // Return null instead of throwing to allow components to handle missing files gracefully
      return null;
    }
    throw error;
  }
};

// Clear expired items from the URL cache
export const clearExpiredCache = () => {
  const now = Date.now();
  for (const [path, { timestamp }] of urlCache.entries()) {
    if (now - timestamp > CACHE_EXPIRY) {
      urlCache.delete(path);
    }
  }
  imageCache.clear(); // Clear image cache as well
};

// Clear all caches
export const clearCache = () => {
  console.log('Clearing URL cache');
  urlCache.clear();
  imageCache.clear();
};

// Function to verify storage setup
export const verifyStorageSetup = async () => {
  try {
    console.log('Verifying storage setup...');
    console.log('Storage bucket:', storage.app.options.storageBucket);
    
    // Check models directory
    console.log('Checking models directory...');
    const modelFiles = await listStorageFiles('models');
    console.log('Models found:', modelFiles);

    // Check images directory
    console.log('Checking images directory...');
    const imageFiles = await listStorageFiles('images');
    console.log('Images found:', imageFiles);

    return {
      modelsFound: modelFiles,
      imagesFound: imageFiles,
      bucket: storage.app.options.storageBucket
    };
  } catch (error) {
    console.error('Storage verification failed:', error);
    return {
      error: error.message,
      bucket: storage.app.options.storageBucket
    };
  }
};
