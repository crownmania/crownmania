import React, { useRef, useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';

import blueprint from '../assets/crownmania_blueprint.svg';

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
  
  @media (max-width: 480px) {
    transform: scale(0.85);
  }
  
  @media (max-width: 375px) {
    transform: scale(0.75);
  }
`;



const MainTagline = styled(motion.h1)`
  font-size: clamp(0.7rem, 3.5vw, 2.5rem);
  font-family: 'Designer', sans-serif;
  font-style: italic;
  color: white;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
  margin-bottom: 0.5rem;
  text-align: center;
  white-space: nowrap;
`;

const SubTagline = styled(motion.h2)`
  font-size: 2vw;
  font-family: 'Designer', sans-serif;
  color: white;
  text-transform: uppercase;
  letter-spacing: 0;
  opacity: 0.8;
  line-height: 1.4;
  text-align: center;
  white-space: nowrap;
  
  @media (min-width: 768px) {
    font-size: 0.8rem;
    letter-spacing: 0.05em;
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

export default function Landing() {
  return (
    <LandingSection id="landing">
      <ContentWrapper>
        <MainTagline
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
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
        <BuyButton style={{ marginTop: '2rem' }}>BUY NOW</BuyButton>
      </ContentWrapper>
    </LandingSection>
  );
}