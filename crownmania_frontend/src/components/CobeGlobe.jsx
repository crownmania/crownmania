import React, { useEffect, useRef } from 'react';
import createGlobe from 'cobe';
import styled from 'styled-components';

const GlobeContainer = styled.div`
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  
  canvas {
    width: 100% !important;
    height: 100% !important;
    transform: scale(1.5) translateX(20%) translateY(20%);
  }
`;

const GlowOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(
    circle at bottom right,
    rgba(0, 255, 255, 0.2),
    transparent 70%
  );
  animation: pulse 4s ease-in-out infinite;
  pointer-events: none;

  @keyframes pulse {
    0% { opacity: 0.3; }
    50% { opacity: 0.6; }
    100% { opacity: 0.3; }
  }
`;

export default function CobeGlobe() {
  const canvasRef = useRef();
  const locationRef = useRef([40.7128, -74.0060]);
  const pointerInteracting = useRef(null);
  const pointerInteractionMovement = useRef(0);
  
  useEffect(() => {
    let phi = 0;
    let width = 0;
    
    const onResize = () => {
      width = canvasRef.current.offsetWidth;
    }
    window.addEventListener('resize', onResize);
    onResize();
    
    const globe = createGlobe(canvasRef.current, {
      devicePixelRatio: 2,
      width: width * 2,
      height: width * 2,
      phi: 0,
      theta: 0.3,
      dark: 1,
      diffuse: 1.2,
      mapSamples: 16000,
      mapBrightness: 6,
      baseColor: [0.1, 0.1, 0.2],
      markerColor: [0, 0.4, 1],
      glowColor: [0, 0.4, 1],
      markers: [
        { location: [40.7128, -74.0060], size: 0.1 }, // New York
      ],
      onRender: (state) => {
        state.phi = phi
        phi += 0.005
        state.width = width * 2
        state.height = width * 2
      }
    });

    return () => {
      globe.destroy();
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <GlobeContainer>
      <canvas
        ref={canvasRef}
        style={{
          contain: 'layout paint size',
          opacity: 1,
          transition: 'opacity 1s ease',
        }}
      />
      <GlowOverlay />
    </GlobeContainer>
  );
}
