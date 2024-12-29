import React, { useState, useEffect } from 'react';
import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { getModelURL } from '../../utils/modelStorage';
import { useScroll } from 'framer-motion';
import * as THREE from 'three';

const Model3D = () => {
  const groupRef = useRef();
  const glowRef = useRef();
  const { scrollYProgress } = useScroll();
  const [modelUrl, setModelUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadModel = async () => {
      try {
        const url = await getModelURL('durk-model.glb');
        setModelUrl(url);
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading model:', error);
        setIsLoading(false);
      }
    };

    loadModel();
  }, []);

  const gltf = useLoader(GLTFLoader, modelUrl || '');

  useFrame((state, delta) => {
    if (groupRef.current) {
      // Rotate based on scroll position with smooth damping
      const targetRotation = scrollYProgress.get() * Math.PI * 4;
      groupRef.current.rotation.y += (targetRotation - groupRef.current.rotation.y) * 0.1;
      
      // Add gentle floating motion
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime) * 0.1;
    }

    // Animate materials
    Object.values(gltf.scene.children).forEach(child => {
      if (child.isMesh) {
        if (child.material) {
          if (child.material.emissive) {
            child.material.emissiveIntensity = 0.5 + Math.sin(state.clock.elapsedTime * 2) * 0.2;
          }
        }
      }
    });

    // Pulsating glow effect
    if (glowRef.current) {
      const intensity = 0.8 + Math.sin(state.clock.elapsedTime * 2) * 0.3;
      glowRef.current.intensity = intensity;
    }
  });

  // Initial model setup
  useEffect(() => {
    if (gltf.scene) {
      gltf.scene.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          if (child.material) {
            child.material.emissive = new THREE.Color(0x00ffff);
            child.material.emissiveIntensity = 0.5;
          }
        }
      });
    }
  }, [gltf]);

  // Clean up GLTF resources
  useEffect(() => {
    return () => {
      Object.values(gltf.scene.children).forEach(node => {
        if (node.geometry) node.geometry.dispose();
      });
    };
  }, [gltf]);

  if (isLoading || !modelUrl) {
    return null;
  }

  return (
    <group ref={groupRef}>
      {/* Main model */}
      <primitive 
        object={gltf.scene} 
        scale={0.005}
        position={[0, 0, 0]}
      />
      
      {/* Holographic grid effect */}
      <mesh position={[0, -1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[4, 4, 30, 30]} />
        <meshStandardMaterial
          color="#00ffff"
          wireframe
          transparent
          opacity={0.15}
        />
      </mesh>

      {/* Point light for glow effect */}
      <pointLight
        ref={glowRef}
        color="#00ffff"
        intensity={0.8}
        distance={5}
        decay={2}
        position={[0, 1, 0]}
      />
    </group>
  );
};

export default Model3D;
