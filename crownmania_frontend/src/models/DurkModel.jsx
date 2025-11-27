import React, { useEffect, useState } from 'react';
import { useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { loadModelFromStorage } from '../utils/modelLoader';

export function DurkModel() {
  const [modelUrl, setModelUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadModel = async () => {
      try {
        console.log('Starting model load process...');
        const modelPath = 'durk-model.glb';
        console.log('Model reference created:', `models/${modelPath}`);
        
        const url = await loadModelFromStorage(modelPath);
        console.log('Successfully got model URL:', url);
        
        setModelUrl(url);
      } catch (err) {
        console.error('Error loading model:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    loadModel();
  }, []);

  // Show loading state
  if (loading || !modelUrl) {
    console.log('Rendering loading state');
    return null;
  }

  // Show error state
  if (error) {
    console.error('Error in DurkModel:', error);
    return null;
  }

  // Load and render the model
  const gltf = useLoader(GLTFLoader, modelUrl);
  
  return (
    <primitive 
      object={gltf.scene} 
      scale={[1, 1, 1]}
      position={[0, 0, 0]}
    />
  );
}
