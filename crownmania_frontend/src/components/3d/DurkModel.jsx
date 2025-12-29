import React, { useEffect, useState, Suspense, useRef } from 'react';
import { useLoader, useFrame } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import { Html, Box, Sphere, RoundedBox } from '@react-three/drei';
import { storage } from '../../config/firebase';
import { ref, getDownloadURL } from '@firebase/storage';
import styled, { keyframes } from 'styled-components';
import * as THREE from 'three';

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

// Stylized placeholder figure when no model is available
function PlaceholderFigure() {
  const groupRef = useRef();

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.5;
    }
  });

  // Create a stylized silhouette figure
  return (
    <group ref={groupRef} position={[0, -0.5, 0]}>
      {/* Base/Pedestal */}
      <mesh position={[0, -1.5, 0]}>
        <cylinderGeometry args={[0.8, 1, 0.3, 32]} />
        <meshStandardMaterial
          color="#1a1a2e"
          metalness={0.8}
          roughness={0.2}
          emissive="#00ff88"
          emissiveIntensity={0.1}
        />
      </mesh>

      {/* Body */}
      <mesh position={[0, 0, 0]}>
        <capsuleGeometry args={[0.4, 1.2, 8, 16]} />
        <meshStandardMaterial
          color="#0f0f23"
          metalness={0.6}
          roughness={0.4}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Head */}
      <mesh position={[0, 1.1, 0]}>
        <sphereGeometry args={[0.35, 32, 32]} />
        <meshStandardMaterial
          color="#0f0f23"
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>

      {/* Crown accent */}
      <mesh position={[0, 1.5, 0]}>
        <torusGeometry args={[0.25, 0.05, 16, 32]} />
        <meshStandardMaterial
          color="#ffd700"
          metalness={1}
          roughness={0.2}
          emissive="#ffa500"
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* Crown spikes */}
      {[0, 1, 2, 3, 4].map((i) => {
        const angle = (i / 5) * Math.PI * 2;
        const x = Math.cos(angle) * 0.2;
        const z = Math.sin(angle) * 0.2;
        return (
          <mesh key={i} position={[x, 1.6, z]} rotation={[0, 0, 0]}>
            <coneGeometry args={[0.05, 0.2, 8]} />
            <meshStandardMaterial
              color="#ffd700"
              metalness={1}
              roughness={0.2}
              emissive="#ffa500"
              emissiveIntensity={0.3}
            />
          </mesh>
        );
      })}

      {/* Glow ring around base */}
      <mesh position={[0, -1.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1, 0.03, 16, 64]} />
        <meshStandardMaterial
          color="#00c8ff"
          emissive="#00c8ff"
          emissiveIntensity={0.8}
          transparent
          opacity={0.7}
        />
      </mesh>
    </group>
  );
}

export function DurkModel({ usePlaceholder = false }) {
  const [modelUrl, setModelUrl] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Skip loading if using placeholder
    if (usePlaceholder) {
      setIsLoading(false);
      return;
    }

    async function loadModel() {
      try {
        console.log('Starting model load process...');

        // First try local public folder
        const localUrl = '/models/durk-model.glb';
        try {
          const response = await fetch(localUrl, { method: 'HEAD' });
          if (response.ok) {
            console.log('Found local model');
            setModelUrl(localUrl);
            setIsLoading(false);
            return;
          }
        } catch (localErr) {
          console.log('Local model not found, trying Firebase...');
        }

        // Try Firebase Storage with timeout
        if (storage) {
          console.log('Attempting to fetch model from Firebase Storage...');
          const modelRef = ref(storage, 'models/durk-model.glb');

          // Set a 5-second timeout for the Firebase URL fetch
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Firebase load timeout')), 5000)
          );

          const url = await Promise.race([
            getDownloadURL(modelRef),
            timeoutPromise
          ]);

          console.log('Successfully got model URL from Firebase');
          setModelUrl(url);
        } else {
          throw new Error('Firebase storage not available');
        }
      } catch (err) {
        console.warn('Model loading failed, using placeholder:', err.message);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    loadModel();
  }, [usePlaceholder]);

  if (isLoading) {
    return <Loader />;
  }

  // If loading failed or using placeholder, show the stylized figure
  if (error || usePlaceholder || !modelUrl) {
    return <PlaceholderFigure />;
  }

  return (
    <Suspense fallback={<Loader />}>
      <Model url={modelUrl} />
    </Suspense>
  );
}
