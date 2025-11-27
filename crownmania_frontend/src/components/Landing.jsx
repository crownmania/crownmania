import React, { useRef, useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Canvas } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import { DurkModel } from './3d/DurkModel';

const LandingSection = styled.section`
  height: 100vh;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  background: transparent;
  overflow: hidden;
  background-image: url('/blueprint.svg');
  background-size: cover;
  background-position: center;
`;

const ContentWrapper = styled.div`
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  margin-top: 15vh;
  text-align: center;
`;

const MainTagline = styled(motion.h1)`
  font-size: clamp(1.5rem, 3vw, 3rem);
  font-family: 'Designer', sans-serif;
  font-style: italic;
  color: white;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
  margin-bottom: 0.5rem;
  white-space: nowrap;
`;

const SubTagline = styled(motion.h2)`
  font-size: clamp(0.6rem, 1vw, 0.8rem);
  font-family: 'Avenir Next', sans-serif;
  color: white;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  opacity: 0.9;
  max-width: 800px;
  line-height: 1.4;
`;

const ModelContainer = styled.div`
  width: 100%;
  height: 80vh;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 2rem;
  padding: 2rem;
  overflow: visible;
`;

const ModelWrapper = styled.div`
  width: 100%;
  height: 100%;
  max-width: 600px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: visible;

  canvas {
    height: 100% !important;
    max-height: none !important;
  }
`;

const BuyButton = styled.button`
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 0.4rem 1rem;
  border-radius: 4px;
  font-family: 'Designer', sans-serif;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: -8rem;
  z-index: 2;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: scale(1.05);
  }
`;

export default function Landing() {
  const modelRef = useRef();
  const [scrollRotation, setScrollRotation] = useState(0);
  const containerRef = useRef();

  useEffect(() => {
    const handleScroll = () => {
      // Simple rotation based on window scroll position
      const scrolled = window.scrollY;
      const rotation = (scrolled * 0.005) % (Math.PI * 2); // Adjust 0.005 to control rotation speed
      setScrollRotation(rotation);
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial position
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <LandingSection id="landing">
      <ContentWrapper>
        <MainTagline
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          INNOVATE • COLLECT • CONNECT
        </MainTagline>
        <SubTagline
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
        >
          REVOLUTIONIZING COLLECTIBLES TO CONNECT THE WORLD
        </SubTagline>
      </ContentWrapper>
      
      <ModelContainer ref={containerRef}>
        <ModelWrapper>
          <Canvas 
            camera={{ 
              position: [0, 0, 15],
              fov: 25,
              near: 0.1,
              far: 1000
            }}
            style={{ 
              overflow: 'visible',
              height: '100%',
              maxHeight: 'none'
            }}
          >
            <ambientLight intensity={0.5} />
            <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
            <pointLight position={[-10, -10, -10]} />
            <group ref={modelRef} rotation={[0, scrollRotation, 0]}>
              <DurkModel />
            </group>
            <Environment preset="city" />
          </Canvas>
        </ModelWrapper>
        <BuyButton>BUY NOW</BuyButton>
      </ModelContainer>
    </LandingSection>
  );
}
