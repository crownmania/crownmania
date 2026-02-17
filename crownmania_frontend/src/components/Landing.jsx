import styled from 'styled-components';
import { motion } from 'framer-motion';
import crownLogo from '../assets/crown_logo_white.svg';

const LandingSection = styled.section`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  text-align: center;
  padding: 2rem;
`;

const MainTitle = styled(motion.h1)`
  font-family: var(--font-primary);
  font-size: clamp(2.16rem, 5.76vw, 3.96rem);
  color: white;
  margin: 0;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  line-height: 1.1;
  text-shadow:
    0 0 10px rgba(255, 255, 255, 0.3),
    0 0 30px rgba(255, 255, 255, 0.15),
    0 0 60px rgba(255, 255, 255, 0.05);
`;

const Tagline = styled(motion.p)`
  font-family: var(--font-secondary);
  font-size: clamp(0.48rem, 1.2vw, 0.66rem);
  color: rgba(255, 255, 255, 0.6);
  letter-spacing: 0.3em;
  text-transform: uppercase;
  margin-top: 0.9rem;
  font-weight: 400;
`;

const LogoContainer = styled(motion.div)`
  margin-top: 1.5rem;

  img {
    width: 48px;
    height: auto;
    opacity: 0.9;
    filter:
      drop-shadow(0 0 8px rgba(255, 255, 255, 0.25))
      drop-shadow(0 0 20px rgba(255, 255, 255, 0.1));
  }
`;

export default function Landing() {
  return (
    <LandingSection id="home">
      <MainTitle
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
      >
        CROWNMANIA
      </MainTitle>

      <Tagline
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 1 }}
      >
        Revolutionizing Collectibles, Connecting The World
      </Tagline>

      <LogoContainer
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 1 }}
      >
        <img src={crownLogo} alt="CrownMania" />
      </LogoContainer>
    </LandingSection>
  );
}
