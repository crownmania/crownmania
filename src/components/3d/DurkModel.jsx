import React, { useEffect, useState, Suspense } from 'react';
import { useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { Html, Environment } from '@react-three/drei';
import { storage } from '../../config/firebase';
import { ref, getDownloadURL } from '@firebase/storage';

function Loader() {
  return (
    <Html center>
      <div style={{ color: 'white', background: 'rgba(0,0,0,0.8)', padding: '10px', borderRadius: '5px' }}>
        Loading model...
      </div>
    </Html>
  );
}

export function DurkModel() {
  const [modelUrl, setModelUrl] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadModel() {
      try {
        console.log('Starting model load process...');
        const modelRef = ref(storage, 'models/durk-model.glb');
        console.log('Model reference created:', modelRef.fullPath);
        const url = await getDownloadURL(modelRef);
        console.log('Successfully got model URL:', url);
        setModelUrl(url);
      } catch (err) {
        console.error('Error in loadModel:', err);
        setError(err.message);
      }
    }

    loadModel();
  }, []);

  if (error) {
    console.log('Rendering error state:', error);
    return <Loader />;
  }

  if (!modelUrl) {
    console.log('Rendering loading state');
    return <Loader />;
  }

  return (
    <Suspense fallback={<Loader />}>
      <Environment preset="studio" />
      <Model url={modelUrl} />
    </Suspense>
  );
}

function Model({ url }) {
  const gltf = useLoader(GLTFLoader, url);

  return (
    <primitive
      object={gltf.scene}
      scale={[0.01, 0.01, 0.01]}
      position={[0, -1, 0]}
      rotation={[0, Math.PI / 4, 0]}
    />
  );
}
