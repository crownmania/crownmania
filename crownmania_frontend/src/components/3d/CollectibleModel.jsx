import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function CollectibleModel({ isLocked = true }) {
  const groupRef = useRef();
  const glowRef = useRef();
  
  useFrame((state, delta) => {
    // Continuous slow rotation when locked, interactive rotation when unlocked
    if (isLocked && groupRef.current) {
      groupRef.current.rotation.y += delta * 0.5;
    }
    
    // Pulsating glow effect
    if (glowRef.current) {
      const intensity = 0.5 + Math.sin(state.clock.elapsedTime * 2) * 0.3;
      glowRef.current.intensity = intensity;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Placeholder geometry */}
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          color="#0066FF"
          metalness={0.8}
          roughness={0.2}
          emissive="#0066FF"
          emissiveIntensity={isLocked ? 0.2 : 0.5}
        />
      </mesh>
      
      {/* Base platform */}
      <mesh position={[0, -0.6, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.7, 0.7, 0.1, 32]} />
        <meshStandardMaterial
          color="#0066FF"
          metalness={0.9}
          roughness={0.1}
          transparent
          opacity={0.3}
        />
      </mesh>
      
      {/* Glow effect */}
      <pointLight
        ref={glowRef}
        color="#0066FF"
        intensity={0.5}
        distance={5}
        decay={2}
        position={[0, 1, 2]}
      />
    </group>
  );
}
