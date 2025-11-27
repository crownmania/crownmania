import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import styled from 'styled-components';
import { DurkModel } from './3d/DurkModel';

const CanvasContainer = styled.div`
  width: 100%;
  height: 100%;
  background: transparent;
`;

const LoadingContainer = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
`;

function LoadingFallback() {
  return (
    <Html center>
      <LoadingContainer>
        <div style={{
          color: 'white',
          background: 'rgba(0,0,0,0.7)',
          padding: '12px 24px',
          borderRadius: '8px',
          fontSize: '14px'
        }}>
          Loading Model...
        </div>
      </LoadingContainer>
    </Html>
  );
}

export default function ModelViewer() {
  return (
    <CanvasContainer>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <Suspense fallback={<LoadingFallback />}>
          <DurkModel />
          <OrbitControls 
            enableZoom={false}
            enablePan={false}
            autoRotate
            autoRotateSpeed={1}
          />
        </Suspense>
      </Canvas>
    </CanvasContainer>
  );
}
