import { useState, useEffect } from 'react';
import { getDownloadURL, ref } from 'firebase/storage';
import { storage } from '../config/firebase';

export const useStorageModel = (modelPath) => {
  const [url, setUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchModel = async () => {
      try {
        setLoading(true);
        const modelRef = ref(storage, modelPath);
        const downloadUrl = await getDownloadURL(modelRef);
        setUrl(downloadUrl);
        setError(null);
      } catch (err) {
        console.error('Error loading model:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (modelPath) {
      fetchModel();
    }
  }, [modelPath]);

  return { url, loading, error };
};
