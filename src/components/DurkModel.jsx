import React, { useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useStorageModel } from '../hooks/useStorageModel';

export function DurkModel({ ...props }) {
  const group = useRef();
  const { url, loading, error } = useStorageModel('models/durk-bottle.glb');
  const { nodes, materials } = useGLTF(url || null);

  // Add a gentle rotation animation
  useFrame((state) => {
    if (group.current) {
      group.current.rotation.y += 0.005;
    }
  });

  if (loading || !url) return null;
  if (error) {
    console.error('Error loading model:', error);
    return null;
  }

  return (
    <group ref={group} {...props} dispose={null}>
      <primitive object={nodes.Scene} />
    </group>
  );
}

// We'll preload the model once the URL is available in the component
