import React, { useState, useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';
import { getModelURL } from '../../utils/modelStorage';
import { useScroll } from 'framer-motion';
import * as THREE from 'three';

const gltfLoader = new GLTFLoader();
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('/draco/');
gltfLoader.setDRACOLoader(dracoLoader);

const Model3D = () => {
  const groupRef = useRef();
  const glowRef = useRef();
  const { scrollYProgress } = useScroll();
  const [modelUrl, setModelUrl] = useState(null);
  const [scene, setScene] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadUrl = async () => {
      try {
        const url = await getModelURL('durk-model2.glb');
        if (cancelled) return;
        setModelUrl(url);
      } catch (error) {
        if (cancelled) return;
        if (import.meta.env.DEV) console.warn('Model3D: could not resolve model URL:', error.message);
        setIsLoading(false);
      }
    };

    loadUrl();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!modelUrl) return;

    let cancelled = false;

    gltfLoader.load(
      modelUrl,
      (gltf) => {
        if (cancelled) return;
        gltf.scene.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material) {
              child.material.emissive = new THREE.Color(0x00a3ff);
              child.material.emissiveIntensity = 0.5;
            }
          }
        });
        setScene(gltf.scene);
        setIsLoading(false);
      },
      undefined,
      (error) => {
        if (cancelled) return;
        if (import.meta.env.DEV) console.warn('Model3D: could not load model:', error.message);
        setIsLoading(false);
      }
    );

    return () => {
      cancelled = true;
    };
  }, [modelUrl]);

  useFrame((state) => {
    if (groupRef.current) {
      const targetRotation = scrollYProgress.get() * Math.PI * 4;
      groupRef.current.rotation.y += (targetRotation - groupRef.current.rotation.y) * 0.1;
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime) * 0.1;
    }

    if (scene) {
      scene.traverse((child) => {
        if (child.isMesh && child.material && child.material.emissive) {
          child.material.emissiveIntensity = 0.5 + Math.sin(state.clock.elapsedTime * 2) * 0.2;
        }
      });
    }

    if (glowRef.current) {
      glowRef.current.intensity = 0.8 + Math.sin(state.clock.elapsedTime * 2) * 0.3;
    }
  });

  if (isLoading || !scene) {
    return null;
  }

  return (
    <group ref={groupRef}>
      <primitive
        object={scene}
        scale={0.005}
        position={[0, 0, 0]}
      />

      <mesh position={[0, -1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[4, 4, 30, 30]} />
        <meshStandardMaterial
          color="#00a3ff"
          wireframe
          transparent
          opacity={0.15}
        />
      </mesh>

      <pointLight
        ref={glowRef}
        color="#00a3ff"
        intensity={0.8}
        distance={5}
        decay={2}
        position={[0, 1, 0]}
      />
    </group>
  );
};

export default Model3D;
