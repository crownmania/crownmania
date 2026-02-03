import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import crownLogo from '../assets/crown_logo_white.svg';

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
  padding-top: 80px; /* Header offset */
`;

const ContentWrapper = styled.div`
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
  width: 100%;
  max-width: 1200px;
  gap: 2rem;
`;

const MainTagline = styled(motion.h1)`
  font-family: var(--font-primary);
  font-size: clamp(3rem, 10vw, 6.5rem);
  color: white;
  text-transform: uppercase;
  letter-spacing: 0.25em;
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.3), 0 0 20px rgba(255, 255, 255, 0.15);
  margin-bottom: 0.5rem;
  line-height: 1.1;
  font-weight: normal;
`;

const SubTagline = styled(motion.h2)`
  font-size: clamp(0.9rem, 2vw, 1.2rem);
  font-family: var(--font-secondary);
  color: white;
  text-transform: uppercase;
  letter-spacing: 0.45em;
  font-weight: 500;
  line-height: 1.8;
  max-width: 800px;
  margin: 0 auto;
  opacity: 0.9;
`;

const LogoButton = styled(motion.button)`
  background: transparent;
  border: none;
  cursor: pointer;
  margin-top: 1rem;
  z-index: 2;
  padding: 0;
  
  img {
    width: 65px;
    height: 65px;
    filter: drop-shadow(0 0 15px rgba(255, 255, 255, 0.3));
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  }
  
  &:hover img {
    filter: drop-shadow(0 0 30px rgba(255, 255, 255, 0.6));
    transform: scale(1.15) translateY(-8px);
  }
`;

export default function Landing() {
  const scrollToGallery = () => {
    const gallerySection = document.getElementById('gallery');
    if (gallerySection) {
      gallerySection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <LandingSection id="landing">
      <ContentWrapper>
        <MainTagline
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
        >
          CROWNMANIA
        </MainTagline>

        <SubTagline
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          Revolutionizing Collectibles. <br />
          Connecting the World.
        </SubTagline>

        <LogoButton
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 1, ease: [0.16, 1, 0.3, 1] }}
          onClick={scrollToGallery}
          aria-label="Scroll to gallery"
        >
          <img src={crownLogo} alt="Crownmania Logo" />
        </LogoButton>
      </ContentWrapper>
    </LandingSection>
  );
}
