import { motion } from 'framer-motion';
import styled from 'styled-components';

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

const ShopButton = styled(motion.button)`
  padding: 1rem 2rem;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  font-size: clamp(0.9rem, 2vw, 1rem);
  font-weight: bold;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.3s ease;
  margin-bottom: 15vh;
  backdrop-filter: blur(10px);
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.2);
  position: relative;
  overflow: hidden;

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

  &:hover {
    border-color: var(--light-blue);
    color: var(--light-blue);
    transform: translateY(-2px);
    box-shadow: 0 5px 25px rgba(0, 102, 255, 0.2);
  }
`;

export default function Landing() {
  const handleShopClick = () => {
    document.getElementById('shop').scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <LandingSection className="blueprint-bg">
      <ContentWrapper>
        <MainTagline
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          INNOVATE · COLLECT · CONNECT
        </MainTagline>
        <SubTagline
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          REVOLUTIONIZING COLLECTIBLES TO CONNECT THE WORLD
        </SubTagline>
      </ContentWrapper>

      <ShopButton
        onClick={handleShopClick}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        Shop Now
      </ShopButton>
    </LandingSection>
  );
}
