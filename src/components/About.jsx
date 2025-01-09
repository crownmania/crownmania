import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import BlockchainMatrix from './BlockchainMatrix';
import CobeGlobe from './CobeGlobe';

const AboutSection = styled.section`
  min-height: 100vh;
  background: var(--dark-blue);
  color: white;
  padding: 2rem;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const MainTitle = styled.div`
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  padding: 2rem;
  margin-bottom: 2rem;
  text-align: center;

  h1 {
    font-size: 3rem;
    font-family: 'Designer', sans-serif;
    margin-bottom: 0.5rem;
    font-weight: bold;
  }

  .subtitle {
    font-size: 0.8rem;
    opacity: 0.8;
    letter-spacing: 0.1em;
    font-family: 'Avenir Next', sans-serif;
    text-transform: uppercase;
  }
`;

const WindowsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
  max-width: 1200px;
  width: 100%;
`;

const Window = styled.div`
  aspect-ratio: 1;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  backdrop-filter: blur(10px);
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.2);
`;

const GlobeWindow = styled(Window)`
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    right: 0;
    width: 100%;
    height: 100%;
    background: radial-gradient(
      circle at bottom right,
      rgba(0, 102, 255, 0.1),
      transparent 70%
    );
    pointer-events: none;
    animation: pulse 4s ease-in-out infinite;
  }

  @keyframes pulse {
    0% { opacity: 0.3; }
    50% { opacity: 0.6; }
    100% { opacity: 0.3; }
  }
`;

const ContentContainer = styled.div`
  /* Add styles for ContentContainer if needed */
`;

export default function About() {
  return (
    <AboutSection id="about">
      <MainTitle>
        <h1>THE STORY</h1>
        <div className="subtitle">DISCOVER • LEARN • UNDERSTAND</div>
      </MainTitle>

      <ContentContainer style={{ marginTop: "120px" }}>
        <WindowsContainer>
          <Window>
            {/* First window content */}
          </Window>
          
          <Window>
            <BlockchainMatrix />
          </Window>
          
          <GlobeWindow>
            <CobeGlobe />
          </GlobeWindow>
        </WindowsContainer>
      </ContentContainer>
    </AboutSection>
  );
}
