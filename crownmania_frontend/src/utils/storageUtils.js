import { storage } from '../config/firebase';
import { ref, uploadBytes, getDownloadURL, listAll } from '@firebase/storage';

// Cache for storing URLs with expiration - Extended to 24 hours for better performance
const urlCache = new Map();
const CACHE_EXPIRY = 1000 * 60 * 60 * 24; // 24 hours

// Cache for storing preloaded images
const imageCache = new Map();

// Enable/disable debug logging
const DEBUG_LOGGING = false;

// Helper for controlled logging
const log = (message, ...args) => {
  if (DEBUG_LOGGING) {
    console.log(`[Storage] ${message}`, ...args);
  }
};

// Helper for error logging (always log errors)
const logError = (message, ...args) => {
  console.error(`[Storage Error] ${message}`, ...args);
};

/**
 * Preload an image with priority and size control
 * @param {string} url - Image URL to preload
 * @param {object} options - Options for preloading
 * @param {number} options.priority - Priority (1-5, with 1 being highest)
 * @param {number} options.width - Optional width to request (for URLs that support it) 
 * @returns {Promise} Promise that resolves when image is loaded
 */
const preloadImage = (url, options = { priority: 3, width: null }) => {
  // If already in cache, return resolved promise
  if (imageCache.has(url)) {
    return Promise.resolve(url);
  }
  
  // Add width parameter if specified and URL is from Firebase storage
  let loadUrl = url;
  if (options.width && url.includes('firebasestorage.googleapis.com')) {
    loadUrl = url.includes('?') ? `${url}&w=${options.width}` : `${url}?w=${options.width}`;
  }
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      imageCache.set(url, img);
      resolve(url);
    };
    img.onerror = reject;
    
    // Set importance based on priority
    if ('importance' in img) {
      if (options.priority === 1) img.importance = 'high';
      else if (options.priority === 2) img.importance = 'high';
      else if (options.priority >= 4) img.importance = 'low';
      else img.importance = 'auto';
    }
    
    img.src = loadUrl;
  });
};

/**
 * Get a download URL for a file from Firebase Storage with caching and preloading
 * @param {string} path - Full path to file in storage (e.g., 'models/durk.gltf')
 * @param {boolean|object} preload - Whether to preload the image or preload options
 * @returns {Promise<string>} Download URL
 */
export const getStorageURL = async (path, preload = false) => {
  try {
    log('Getting storage URL for:', path);

    // Check cache first
    if (urlCache.has(path)) {
      const cached = urlCache.get(path);
      if (Date.now() - cached.timestamp < CACHE_EXPIRY) {
        log('Using cached URL');
        return cached.url;
      }
      log('Cache expired');
      urlCache.delete(path);
    }

    // Create storage reference
    const fileRef = ref(storage, path);

    // Get the download URL
    const url = await getDownloadURL(fileRef);

    // Cache the URL
    urlCache.set(path, {
      url,
      timestamp: Date.now()
    });

    // Save to localStorage for persistent caching
    try {
      const storedCache = JSON.parse(localStorage.getItem('storageUrlCache') || '{}');
      storedCache[path] = { url, timestamp: Date.now() };
      localStorage.setItem('storageUrlCache', JSON.stringify(storedCache));
    } catch (err) {
      // Ignore localStorage errors
    }

    // Preload the image if requested
    if (preload) {
      try {
        const preloadOptions = typeof preload === 'object' ? preload : { priority: 3 };
        await preloadImage(url, preloadOptions);
        log('Preloaded asset:', path);
      } catch (error) {
        console.warn('Failed to preload asset:', path);
      }
    }

    return url;
  } catch (error) {
    logError('Error getting storage URL:', path, error);
    throw error;
  }
};

// Load cached URLs from localStorage on initialization
try {
  const storedCache = JSON.parse(localStorage.getItem('storageUrlCache') || '{}');
  const now = Date.now();
  Object.entries(storedCache).forEach(([path, { url, timestamp }]) => {
    if (now - timestamp < CACHE_EXPIRY) {
      urlCache.set(path, { url, timestamp });
    }
  });
  log(`Loaded ${urlCache.size} cached URLs from localStorage`);
} catch (err) {
  // Ignore localStorage errors
}

/**
 * Preload multiple files from Firebase Storage with prioritization
 * @param {Array<string|object>} items - Array of file paths or objects with path and priority
 * @returns {Promise<Array>} Array of URLs
 */
export const preloadFiles = async (items) => {
  // Sort by priority if provided
  const sortedItems = [...items].sort((a, b) => {
    const priorityA = typeof a === 'object' ? (a.priority || 3) : 3;
    const priorityB = typeof b === 'object' ? (b.priority || 3) : 3;
    return priorityA - priorityB;
  });
  
  const results = [];
  
  // Process in batches of 3 for better performance
  const batchSize = 3;
  for (let i = 0; i < sortedItems.length; i += batchSize) {
    const batch = sortedItems.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (item) => {
        try {
          const path = typeof item === 'object' ? item.path : item;
          const preloadOptions = typeof item === 'object' ? 
            { priority: item.priority || 3, width: item.width } : true;
          
          return await getStorageURL(path, preloadOptions);
        } catch (error) {
          console.warn(`Failed to preload ${typeof item === 'object' ? item.path : item}`);
          return null;
        }
      })
    );
    results.push(...batchResults);
    
    // Small delay between batches to prevent overwhelming the network
    if (i + batchSize < sortedItems.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results.filter(url => url !== null);
};

/**
 * List all files in a storage folder with efficient caching
 * @param {string} folder - Folder name (e.g., 'models', 'images', 'videos')
 * @param {boolean} useCache - Whether to use cached results if available
 * @returns {Promise<Array>} Array of file metadata
 */
export const listFiles = async (folder, useCache = true) => {
  // Cache key for this folder
  const cacheKey = `folderListing:${folder}`;
  
  // Check memory cache first
  if (useCache && urlCache.has(cacheKey)) {
    const cached = urlCache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_EXPIRY) {
      log(`Using cached file listing for ${folder}`);
      return cached.files;
    }
  }
  
  try {
    log(`Listing files in ${folder}`);
    
    const folderRef = ref(storage, folder);
    const result = await listAll(folderRef);
    
    // Process files in batches of 5 for better performance
    const batchSize = 5;
    const files = [];
    
    for (let i = 0; i < result.items.length; i += batchSize) {
      const batch = result.items.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(async (item) => {
          try {
            const url = await getStorageURL(item.fullPath);
            return {
              name: item.name,
              fullPath: item.fullPath,
              url,
              type: getFileType(item.name),
              size: 'unknown' // We could implement size detection if needed
            };
          } catch (error) {
            logError(`Error getting URL for ${item.fullPath}`, error);
            return null;
          }
        })
      );
      
      files.push(...batchResults.filter(f => f !== null));
      
      // Add small delay between batches to prevent overwhelming network
      if (i + batchSize < result.items.length) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
    
    // Cache the result
    urlCache.set(cacheKey, { 
      files, 
      timestamp: Date.now() 
    });
    
    return files;
  } catch (error) {
    logError(`Error listing files in ${folder}`, error);
    throw error;
  }
};

/**
 * Get file type based on extension
 * @param {string} filename - The filename
 * @returns {string} The file type
 */
const getFileType = (filename) => {
  const ext = filename.split('.').pop().toLowerCase();
  
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return 'image';
  if (['mp4', 'webm', 'mov'].includes(ext)) return 'video';
  if (['glb', 'gltf'].includes(ext)) return 'model';
  if (['mp3', 'wav', 'ogg'].includes(ext)) return 'audio';
  
  return 'other';
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

/**
 * Clear expired items from all caches
 * @param {boolean} clearImages - Whether to also clear the image cache
 * @returns {number} Number of items cleared
 */
export const clearExpiredCache = (clearImages = false) => {
  const now = Date.now();
  let cleared = 0;
  
  // Clear memory cache
  for (const [path, { timestamp }] of urlCache.entries()) {
    if (now - timestamp > CACHE_EXPIRY) {
      urlCache.delete(path);
      cleared++;
    }
  }
  
  // Clear image cache if requested
  if (clearImages) {
    const imageCleared = imageCache.size;
    imageCache.clear();
    cleared += imageCleared;
  }
  
  // Update localStorage cache
  try {
    const storedCache = JSON.parse(localStorage.getItem('storageUrlCache') || '{}');
    let localStorageCleared = 0;
    
    Object.keys(storedCache).forEach(path => {
      if (now - storedCache[path].timestamp > CACHE_EXPIRY) {
        delete storedCache[path];
        localStorageCleared++;
      }
    });
    
    localStorage.setItem('storageUrlCache', JSON.stringify(storedCache));
    cleared += localStorageCleared;
  } catch (err) {
    // Ignore localStorage errors
  }
  
  log(`Cleared ${cleared} expired cache items`);
  return cleared;
};

/**
 * Clear all caches
 * @param {boolean} clearLocalStorage - Whether to also clear the localStorage cache
 */
export const clearCache = (clearLocalStorage = true) => {
  urlCache.clear();
  imageCache.clear();
  
  if (clearLocalStorage) {
    try {
      localStorage.removeItem('storageUrlCache');
    } catch (err) {
      // Ignore localStorage errors
    }
  }
  
  log('All caches cleared');
};

/**
 * Verify storage setup and return available resources
 * @returns {Promise<object>} Verification results
 */
export const verifyStorageSetup = async () => {
  try {
    log('Verifying storage setup');
    
    // Check models directory
    const modelFiles = await listStorageFiles('models');
    
    // Check images directory
    const imageFiles = await listStorageFiles('images');
    
    // Automatically preload critical resources in the background
    if (imageFiles.length > 0) {
      // Preload first 3 images with high priority
      const criticalImages = imageFiles.slice(0, 3).map(path => ({
        path,
        priority: 1 // High priority
      }));
      
      // Silently preload in the background
      preloadFiles(criticalImages).catch(() => {});
    }
    
    return {
      modelsFound: modelFiles,
      imagesFound: imageFiles,
      bucket: storage.app.options.storageBucket,
      timestamp: Date.now()
    };
  } catch (error) {
    logError('Storage verification failed', error);
    return {
      error: error.message,
      bucket: storage.app.options.storageBucket
    };
  }
};
