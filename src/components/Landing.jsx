import { motion } from 'framer-motion';
import styled from 'styled-components';
import ModelViewer from './ModelViewer';

const LandingSection = styled.section`
  height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  text-align: center;
  position: relative;
  padding: 15vh 2rem 5vh;
`;

const ContentWrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  margin-top: 10vh;
  position: relative;
  width: 100%;
  max-width: 1200px;
`;

const MainTagline = styled(motion.h1)`
  font-family: 'Designer', sans-serif;
  font-size: clamp(1.8rem, 5vw, 2.2rem);
  margin-bottom: 0.1rem;
  letter-spacing: 0.1em;
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
  white-space: nowrap;
  position: relative;
`;

const SubTagline = styled(motion.h2)`
  font-family: 'Avenir Next Regular', sans-serif;
  font-size: clamp(0.7rem, 2vw, 0.9rem);
  letter-spacing: 0.15em;
  margin: 0;
  margin-top: 0.1rem;
  white-space: nowrap;
  position: relative;
`;

const ModelWrapper = styled(motion.div)`
  margin: 2rem 0;
  transform-origin: center center;
`;

export default function Landing() {
  return (
    <LandingSection className="blueprint-bg">
      <ContentWrapper>
        <MainTagline
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          CROWN MANIA
        </MainTagline>
        <SubTagline
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
        >
          DIGITAL COLLECTIBLES
        </SubTagline>
        <ModelWrapper
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.4, ease: "easeOut" }}
        >
          <ModelViewer />
        </ModelWrapper>
      </ContentWrapper>
    </LandingSection>
  );
}
