import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MeshStandardMaterial } from 'three';
import { TorusKnotGeometry } from 'three';

export default function CrownModel({ scrollProgress }) {
  const meshRef = useRef();
  
  // Create a shiny gold material
  const material = new MeshStandardMaterial({
    color: '#FFD700',
    metalness: 0.9,
    roughness: 0.1,
  });

  useFrame((state, delta) => {
    // Auto-rotation based on scroll
    meshRef.current.rotation.y = scrollProgress * Math.PI * 2;
    
    // Add slight floating animation
    meshRef.current.position.y = Math.sin(state.clock.elapsedTime) * 0.1;
  });

  return (
    <mesh ref={meshRef} material={material}>
      <torusKnotGeometry args={[1, 0.3, 128, 16, 2, 3]} />
    </mesh>
  );
}
