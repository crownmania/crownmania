import { storage } from '../config/firebase';
import { ref, listAll } from '@firebase/storage';

export async function testStorageAccess() {
  try {
    console.log('Testing Firebase Storage access...');
    
    // Test models directory
    const modelsRef = ref(storage, 'models');
    const modelsResult = await listAll(modelsRef);
    console.log('Models directory contents:', modelsResult.items.map(item => item.fullPath));
    
    // Test images directory
    const imagesRef = ref(storage, 'images');
    const imagesResult = await listAll(imagesRef);
    console.log('Images directory contents:', imagesResult.items.map(item => item.fullPath));
    
    return {
      models: modelsResult.items.map(item => item.fullPath),
      images: imagesResult.items.map(item => item.fullPath)
    };
  } catch (error) {
    console.error('Storage test failed:', error);
    return {
      error: error.message,
      code: error.code
    };
  }
}
