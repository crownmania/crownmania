import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import BlockchainMatrix from './BlockchainMatrix';
import CobeGlobe from './CobeGlobe';

const AboutSection = styled.section`
  min-height: 100vh;
  color: white;
  padding: 2rem;
  position: relative;
`;

const MainTitle = styled.div`
  position: absolute;
  top: 2rem;
  left: 50%;
  transform: translateX(-50%);
  padding: 1rem;
  text-align: center;
  width: 100%;

  h1 {
    font-size: clamp(1.8rem, 6vw, 3rem);
    font-family: 'Designer', sans-serif;
    margin-bottom: 0.5rem;
    font-weight: bold;
    text-shadow: var(--title-glow);
  }

  .subtitle {
    font-size: clamp(0.7rem, 2vw, 0.9rem);
    opacity: 0.7;
    letter-spacing: 0.4em;
    font-family: 'Avenir Next', sans-serif;
    text-transform: uppercase;
    font-weight: 500;
  }
`;

const WindowsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
  padding: 2rem;
  margin-top: 8rem;
  
  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    padding: 1rem;
    gap: 1rem;
  }
`;

const Window = styled.div`
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 2rem;
  height: 400px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10px);
`;

const GlobeWindow = styled(Window)`
  canvas {
    width: 100% !important;
    height: 100% !important;
  }
`;

const WindowTitle = styled.h3`
  font-family: 'Designer', sans-serif;
  font-size: clamp(1.2rem, 4vw, 1.8rem);
  color: white;
  margin-bottom: 1rem;
  text-align: center;
  position: relative;
  z-index: 2;
`;

const WindowSubtitle = styled.p`
  font-family: 'Avenir Next', sans-serif;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.7);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  line-height: 1.6;
  text-align: center;
  max-width: 90%;
  margin: 0 auto;
  position: relative;
  z-index: 2;
`;

const WindowContent = styled.div`
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  padding: 2rem;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(5px);
  border-radius: inherit;
`;

const MatrixBackground = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0.15;
  z-index: 1;
  border-radius: inherit;
  overflow: hidden;
`;

const VisionParagraph = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
  margin-top: 4rem;

  p {
    font-family: 'Avenir Next', sans-serif;
    font-size: 1.1rem;
    line-height: 1.8;
    color: rgba(255, 255, 255, 0.8);
    margin-bottom: 2rem;
    font-weight: 400;
  }
`;

const ContentContainer = styled.div`
  /* Add styles for ContentContainer if needed */
`;

export default function About() {
  return (
    <AboutSection id="about">
      <MainTitle>
        <h1>THE VISION</h1>
        <div className="subtitle">INNOVATE • COLLECT • CONNECT</div>
      </MainTitle>

      <ContentContainer style={{ marginTop: "0px" }}>
        <WindowsContainer>
          <Window>
            <MatrixBackground>
              <BlockchainMatrix />
            </MatrixBackground>
            <WindowContent>
              <WindowTitle>EXCLUSIVE ACCESS</WindowTitle>
              <WindowSubtitle>
                EXCLUSIVE PERKS - YOUR KEY TO LOYALTY REWARDS, VIP EXPERIENCES, AND MORE.
              </WindowSubtitle>
            </WindowContent>
          </Window>

          <Window>
            <MatrixBackground>
              <BlockchainMatrix />
            </MatrixBackground>
            <WindowContent>
              <WindowTitle>AUTHENTICITY</WindowTitle>
              <WindowSubtitle>
                GUARANTEED PROOF OF OWNERSHIP AND AUTHENTICITY THROUGH BLOCKCHAIN TECHNOLOGY.
              </WindowSubtitle>
            </WindowContent>
          </Window>

          <Window>
            <MatrixBackground>
              <BlockchainMatrix />
            </MatrixBackground>
            <WindowContent>
              <WindowTitle>CONNECTION</WindowTitle>
              <WindowSubtitle>
                BRIDGING PHYSICAL & DIGITAL - EXPERIENCE THE SEAMLESS LINK BETWEEN REAL-WORLD COLLECTIBLES AND THE DIGITAL FUTURE.
              </WindowSubtitle>
            </WindowContent>
          </Window>
        </WindowsContainer>

        <VisionParagraph>
          <p>
            CrownMania is a revolutionary platform that bridges the gap between physical collectibles and the digital world through cutting-edge blockchain technology.
            Born from the vision to transform how fans connect with their favorite artists and cultural icons, CrownMania represents the future of collectibles.
            By combining limited-edition physical figures with authenticated digital ownership, we're creating a seamless ecosystem where collectors can truly own,
            trade, and experience their passion in ways never before possible. This futuristic approach not only ensures authenticity and provenance but also
            opens up entirely new possibilities for fan engagement, from exclusive experiences to community-driven storytelling.
            CrownMania is set to revolutionize the collectibles industry by making it more accessible, transparent, and immersive than ever before.
          </p>
        </VisionParagraph>
      </ContentContainer>
    </AboutSection>
  );
}