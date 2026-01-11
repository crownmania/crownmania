import React, { useRef, useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';

import blueprint from '../assets/crownmania_blueprint.svg';
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
  overflow: hidden;
`;

const ContentWrapper = styled.div`
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  margin-top: 0;
  text-align: center;
  width: 100%;
`;



const MainTagline = styled(motion.h1)`
  font-family: var(--font-primary);
  font-size: 2.8rem;
  color: white;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  text-shadow: 0 0 15px rgba(255, 255, 255, 0.6);
  margin-bottom: 1.2rem;
  text-align: center;
  line-height: 1.1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.8rem;

  @media (max-width: 600px) {
    flex-direction: column;
    font-size: 3.8rem;
    gap: 0.4rem;
    margin-bottom: 2rem;
    letter-spacing: 0.05em;
  }

  .dot {
    opacity: 0.5;
    font-size: 1.5rem;
    @media (max-width: 600px) {
      display: none;
    }
  }
`;

const SubTagline = styled(motion.h2)`
  font-size: 1.2rem;
  font-family: 'Designer', sans-serif;
  color: white;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.8;
  line-height: 1.4;
  text-align: center;
  max-width: 80vw;
  margin: 0 auto;
  
  @media (max-width: 600px) {
    font-size: 1rem;
    letter-spacing: 0.02em;
    max-width: 90vw;
  }
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

const LogoButton = styled.button`
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 2rem;
  z-index: 2;
  padding: 0;
  
  img {
    width: 60px;
    height: 60px;
    filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.3));
    transition: all 0.3s ease;
  }
  
  &:hover img {
    filter: drop-shadow(0 0 20px rgba(255, 255, 255, 0.6));
    transform: scale(1.1);
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
          transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
        >
          <span>INNOVATE</span>
          <span className="dot">•</span>
          <span>COLLECT</span>
          <span className="dot">•</span>
          <span>CONNECT</span>
        </MainTagline>
        <SubTagline
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
        >
          REVOLUTIONIZING COLLECTIBLES TO CONNECT THE WORLD
        </SubTagline>
        <LogoButton onClick={scrollToGallery} aria-label="Scroll to gallery">
          <img src={crownLogo} alt="Crownmania" />
        </LogoButton>
      </ContentWrapper>
    </LandingSection>
  );
}