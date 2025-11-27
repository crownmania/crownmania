import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const NFT_MODEL_PATH = '/src/assets/models/juggernog.gltf';

export default function NFTModel() {
  const groupRef = useRef();
  
  useFrame((state, delta) => {
    // Gentle floating animation
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime) * 0.1;
      groupRef.current.rotation.y += delta * 0.2;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Placeholder NFT token */}
      <mesh>
        <cylinderGeometry args={[0.8, 0.8, 0.1, 32]} />
        <meshStandardMaterial
          color="#0066FF"
          metalness={0.9}
          roughness={0.1}
          emissive="#0066FF"
          emissiveIntensity={0.5}
        />
      </mesh>
      
      {/* Token details */}
      <mesh position={[0, 0.051, 0]}>
        <cylinderGeometry args={[0.6, 0.6, 0.1, 32]} />
        <meshStandardMaterial
          color="#FFFFFF"
          metalness={0.7}
          roughness={0.3}
          transparent
          opacity={0.8}
        />
      </mesh>
      
      {/* Glow effect */}
      <pointLight
        color="#0066FF"
        intensity={0.8}
        distance={3}
        decay={2}
        position={[0, 1, 0]}
      />
    </group>
  );
}
