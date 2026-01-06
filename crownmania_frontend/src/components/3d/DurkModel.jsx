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

  // Apply premium material to all meshes
  useEffect(() => {
    if (gltf.scene) {
      gltf.scene.traverse((child) => {
        if (child.isMesh) {
          // Create a premium metallic material
          child.material = new THREE.MeshStandardMaterial({
            color: new THREE.Color('#B8860B'), // Medium dark gold
            metalness: 0.6,
            roughness: 0.25,
            envMapIntensity: 1.2,
          });
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
    }
  }, [gltf.scene]);

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
function PlaceholderFigure({ isUnlocked = false }) {
  const groupRef = useRef();
  const [unlockProgress, setUnlockProgress] = useState(isUnlocked ? 1 : 0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Handle unlock animation
  useEffect(() => {
    if (isUnlocked && !isAnimating) {
      setIsAnimating(true);
      // Animate from grayscale to color over 2 seconds
      const startTime = Date.now();
      const duration = 2000;

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        setUnlockProgress(progress);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          setIsAnimating(false);
        }
      };

      requestAnimationFrame(animate);
    }
  }, [isUnlocked, isAnimating]);

  useFrame((state) => {
    if (groupRef.current) {
      // Slower rotation when locked, faster when unlocked
      const rotationSpeed = isUnlocked ? 1.0 : 0.5;
      groupRef.current.rotation.y = state.clock.elapsedTime * rotationSpeed;

      // Add slight floating animation when unlocked
      if (isUnlocked) {
        groupRef.current.position.y = -0.5 + Math.sin(state.clock.elapsedTime * 2) * 0.05;
      } else {
        groupRef.current.position.y = -0.5;
      }
    }
  });

  // Calculate grayscale and color interpolation
  const getMaterialProps = (baseColor, emissiveColor = null, emissiveIntensity = 0) => {
    // Convert base color to HSL for interpolation
    const baseColorObj = new THREE.Color(baseColor);
    const baseHSL = baseColorObj.getHSL({ h: 0, s: 0, l: 0 });

    // Grayscale version (saturation = 0)
    const grayscaleHSL = { h: baseHSL.h, s: 0, l: baseHSL.l };

    // Interpolate between grayscale and full color
    const currentH = grayscaleHSL.h + (baseHSL.h - grayscaleHSL.h) * unlockProgress;
    const currentS = grayscaleHSL.s + (baseHSL.s - grayscaleHSL.s) * unlockProgress;
    const currentL = grayscaleHSL.l + (baseHSL.l - grayscaleHSL.l) * unlockProgress;

    const interpolatedColor = new THREE.Color().setHSL(currentH, currentS, currentL);

    return {
      color: interpolatedColor,
      emissive: emissiveColor ? new THREE.Color(emissiveColor).multiplyScalar(unlockProgress) : undefined,
      emissiveIntensity: emissiveIntensity * unlockProgress
    };
  };

  // Create a stylized silhouette figure
  return (
    <group ref={groupRef} position={[0, -0.5, 0]}>
      {/* Base/Pedestal */}
      <mesh position={[0, -1.5, 0]}>
        <cylinderGeometry args={[0.8, 1, 0.3, 32]} />
        <meshStandardMaterial
          {...getMaterialProps("#1a1a2e", "#00ff88", 0.1)}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {/* Body */}
      <mesh position={[0, 0, 0]}>
        <capsuleGeometry args={[0.4, 1.2, 8, 16]} />
        <meshStandardMaterial
          {...getMaterialProps("#0f0f23")}
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
          {...getMaterialProps("#0f0f23")}
          metalness={0.7}
          roughness={0.3}
        />
      </mesh>

      {/* Crown accent */}
      <mesh position={[0, 1.5, 0]}>
        <torusGeometry args={[0.25, 0.05, 16, 32]} />
        <meshStandardMaterial
          {...getMaterialProps("#ffd700", "#ffa500", 0.3)}
          metalness={1}
          roughness={0.2}
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
              {...getMaterialProps("#ffd700", "#ffa500", 0.3)}
              metalness={1}
              roughness={0.2}
            />
          </mesh>
        );
      })}

      {/* Glow ring around base */}
      <mesh position={[0, -1.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1, 0.03, 16, 64]} />
        <meshStandardMaterial
          {...getMaterialProps("#00c8ff", "#00c8ff", 0.8)}
          transparent
          opacity={0.7}
        />
      </mesh>

      {/* Unlock particle effects */}
      {isAnimating && (
        <group>
          {[...Array(20)].map((_, i) => {
            const angle = (i / 20) * Math.PI * 2;
            const radius = 2;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            const delay = i * 0.1;

            return (
              <mesh
                key={i}
                position={[x, Math.sin(Date.now() * 0.01 + delay) * 0.5, z]}
                scale={[0.05, 0.05, 0.05]}
              >
                <sphereGeometry args={[1, 8, 8]} />
                <meshBasicMaterial
                  color="#00ff88"
                  transparent
                  opacity={0.8 - (i * 0.04)}
                />
              </mesh>
            );
          })}
        </group>
      )}
    </group>
  );
}

export function DurkModel({ usePlaceholder = false, isUnlocked = false }) {
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

        // Go directly to Firebase Storage (skip local check as Vercel SPA returns HTML for missing files)
        if (storage) {
          console.log('Attempting to fetch model from Firebase Storage...');

          // Common path variations to try
          const modelPaths = [
            'models/durk-model.glb',
            'models/Durk_Model.glb',
            'models/durk.glb',
            'models/LilDurk.glb',
            '3d-models/durk-model.glb',
            'durk-model.glb',
            'models/lil-durk-figure.glb'
          ];

          for (const path of modelPaths) {
            try {
              console.log(`Trying Firebase path: ${path}`);
              const modelRef = ref(storage, path);
              const url = await getDownloadURL(modelRef);
              console.log(`Successfully loaded model from: ${path}`);
              setModelUrl(url);
              setIsLoading(false);
              return;
            } catch (pathErr) {
              console.log(`Path not found: ${path}`);
            }
          }

          throw new Error('Model not found in any Firebase Storage path');
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
    return <PlaceholderFigure isUnlocked={isUnlocked} />;
  }

  return (
    <Suspense fallback={<Loader />}>
      <Model url={modelUrl} />
    </Suspense>
  );
}