import React, { useEffect, useState, Suspense } from 'react';
import { useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import { Html, Environment } from '@react-three/drei';
import { storage } from '../../config/firebase';
import { ref, getDownloadURL } from '@firebase/storage';
import styled, { keyframes } from 'styled-components';

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const LoaderSpinner = styled.div`
  width: 30px;
  height: 30px;
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-top: 2px solid rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  animation: ${spin} 1s linear infinite;
`;

function Loader() {
  return (
    <Html center>
      <LoaderSpinner />
    </Html>
  );
}

function Model({ url }) {
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
  
  const gltfLoader = new GLTFLoader();
  gltfLoader.setDRACOLoader(dracoLoader);
  
  const gltf = useLoader(GLTFLoader, url, (loader) => {
    loader.setDRACOLoader(dracoLoader);
  });

  return (
    <primitive 
      object={gltf.scene} 
      scale={[0.008, 0.008, 0.008]} 
      position={[0, -1, 0]} 
      rotation={[0, 0, 0]}
    />
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
        console.log('Successfully got model URL');
        setModelUrl(url);
      } catch (err) {
        console.error('Error in loadModel:', err);
        setError(err.message);
      }
    }

    loadModel();
  }, []);

  if (error) {
    console.error('Model loading error:', error);
    return (
      <Html center>
        <div style={{ color: 'red', background: 'rgba(0,0,0,0.8)', padding: '10px', borderRadius: '5px' }}>
          Error loading model
        </div>
      </Html>
    );
  }

  if (!modelUrl) {
    return <Loader />;
  }

  return (
    <Suspense fallback={<Loader />}>
      <Model url={modelUrl} />
    </Suspense>
  );
}
