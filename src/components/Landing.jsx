import React, { useEffect } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import ModelViewer from './ModelViewer';

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

const ModelContainer = styled.div`
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  z-index: 1;
`;

const ContentWrapper = styled.div`
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  text-align: center;
  padding: 2rem;
  margin-top: -15vh; /* Move content up by 15% of viewport height */
  position: relative; /* Add position relative for better control */
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

export default function Landing() {
  useEffect(() => {
    async function checkStorage() {
      try {
        const result = await testStorageAccess();
        console.log('Storage test results:', result);
        
        if (result.error) {
          console.error('Storage test error:', result.error);
        } else {
          console.log('Models found:', result.models);
          console.log('Images found:', result.images);
        }
      } catch (error) {
        console.error('Storage test failed:', error);
      }
    }
    
    checkStorage();
  }, []);

  return (
    <LandingSection>
      <ModelContainer>
        <ModelViewer />
      </ModelContainer>
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
    </LandingSection>
  );
}
