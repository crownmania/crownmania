import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, PresentationControls } from '@react-three/drei';
import styled from 'styled-components';
import { DurkModel } from './DurkModel';

const ModelContainer = styled.div`
  width: 300px;
  height: 300px;
  position: relative;
  cursor: grab;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 12px;
  overflow: hidden;
  
  &:active {
    cursor: grabbing;
  }
`;

const LoadingContainer = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: var(--light-blue);
  font-family: 'Avenir Next', sans-serif;
  font-size: 0.9rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
`;

const LoadingSpinner = styled.div`
  width: 24px;
  height: 24px;
  border: 2px solid rgba(0, 102, 255, 0.1);
  border-top-color: var(--light-blue);
  border-radius: 50%;
  animation: spin 1s linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

const Fallback = () => (
  <LoadingContainer>
    <LoadingSpinner />
    <span>Loading Model...</span>
  </LoadingContainer>
);

export default function ModelViewer() {
  return (
    <ModelContainer>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={<Fallback />}>
          <PresentationControls
            global
            config={{ mass: 2, tension: 500 }}
            snap={{ mass: 4, tension: 300 }}
            rotation={[0, 0.3, 0]}
            polar={[-Math.PI / 3, Math.PI / 3]}
            azimuth={[-Math.PI / 1.4, Math.PI / 2]}
          >
            <DurkModel scale={0.02} position={[0, 0, 0]} />
          </PresentationControls>
          <Environment preset="city" />
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1} />
        </Suspense>
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          minPolarAngle={Math.PI / 2}
          maxPolarAngle={Math.PI / 2}
        />
      </Canvas>
    </ModelContainer>
  );
}
