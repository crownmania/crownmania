import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import BlockchainMatrix from './BlockchainMatrix';
import CobeGlobe from './CobeGlobe';

import { FaShieldAlt, FaLink, FaCrown } from 'react-icons/fa';

const AboutSection = styled.section`
  min-height: 100vh;
  padding: 10rem 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  background: radial-gradient(circle at 50% 90%, rgba(200, 0, 0, 0.08) 0%, transparent 60%);
  overflow: hidden;
`;

const MainTitle = styled.div`
  text-align: center;
  margin-bottom: 6rem;
  z-index: 2;

  h1 {
    font-size: clamp(3rem, 10vw, 5rem);
    font-family: var(--font-primary);
    margin-bottom: 1rem;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: white;
    text-shadow: 0 0 20px rgba(255, 255, 255, 0.8), 0 0 40px rgba(255, 255, 255, 0.5), 0 0 60px rgba(255, 255, 255, 0.3);
    line-height: 1;
  }

  .subtitle {
    font-size: 0.9rem;
    color: var(--vault-accent);
    letter-spacing: 0.5em;
    font-family: var(--font-secondary);
    text-transform: uppercase;
    font-weight: 700;
    opacity: 0.9;
  }
`;

const VisionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 3rem;
  width: 100%;
  max-width: 1200px;
  margin-bottom: 8rem;
  z-index: 2;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 2rem;
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const VisionCard = styled(motion.div)`
  background: var(--vault-bg);
  border: 1px solid var(--vault-border);
  border-radius: 24px;
  padding: 3rem 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  backdrop-filter: blur(var(--vault-blur));
  -webkit-backdrop-filter: blur(var(--vault-blur));
  position: relative;
  overflow: hidden;
  transition: all 0.4s ease;

  &:hover {
    border-color: var(--vault-accent);
    transform: translateY(-5px);
    box-shadow: 0 15px 35px rgba(0, 0, 0, 0.3);
    
    .icon-wrapper {
      transform: scale(1.1) rotate(5deg);
      color: var(--vault-accent);
    }
  }
`;

const IconWrapper = styled.div`
  font-size: 2.5rem;
  color: rgba(255, 255, 255, 0.4);
  margin-bottom: 2rem;
  transition: all 0.4s ease;
`;

const CardTitle = styled.h3`
  font-family: var(--font-secondary);
  font-size: 1.25rem;
  font-weight: 700;
  color: #fff;
  margin-bottom: 1rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
`;

const CardDescription = styled.p`
  font-family: var(--font-secondary);
  font-size: 0.9rem;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.6);
  max-width: 240px;
`;

const VisionManifesto = styled(motion.div)`
  max-width: 900px;
  margin: 0 auto;
  z-index: 2;
  position: relative;

  &::before {
    content: '"';
    position: absolute;
    top: -4rem;
    left: -2rem;
    font-size: 10rem;
    font-family: var(--font-primary);
    color: var(--vault-accent);
    opacity: 0.1;
  }
`;

const ManifestoParagraph = styled(motion.p)`
  font-family: var(--font-secondary);
  font-size: clamp(1.1rem, 3vw, 1.35rem);
  line-height: 1.9;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 3rem;
  font-weight: 400;
  letter-spacing: 0.02em;

  strong {
    color: var(--vault-accent);
    font-weight: 700;
  }

  span.highlight {
    background: linear-gradient(120deg, rgba(200, 0, 0, 0.2) 0%, rgba(200, 0, 0, 0.2) 100%);
    background-repeat: no-repeat;
    background-size: 100% 0.3em;
    background-position: 0 88%;
  }
`;

const MatrixOverlay = styled.div`
  position: absolute;
  inset: 0;
  opacity: 0.15;
  filter: grayscale(1);
  pointer-events: none;
`;

export default function About() {
  return (
    <AboutSection id="about">
      <MainTitle>
        <motion.h1
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          THE VISION
        </motion.h1>
        <motion.div
          className="subtitle"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          viewport={{ once: true }}
        >
          INNOVATE • COLLECT • CONNECT
        </motion.div>
      </MainTitle>

      <VisionGrid>
        <VisionCard
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
        >
          <MatrixOverlay>
            <BlockchainMatrix />
          </MatrixOverlay>
          <IconWrapper className="icon-wrapper">
            <FaShieldAlt />
          </IconWrapper>
          <CardTitle>AUTHENTICITY</CardTitle>
          <CardDescription>
            Guaranteed proof of ownership and verified provenance through secure
            blockchain ledger technology.
          </CardDescription>
        </VisionCard>

        <VisionCard
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
        >
          <MatrixOverlay>
            <BlockchainMatrix />
          </MatrixOverlay>
          <IconWrapper className="icon-wrapper">
            <FaCrown />
          </IconWrapper>
          <CardTitle>EXCLUSIVE ACCESS</CardTitle>
          <CardDescription>
            Your key to loyalty rewards, VIP experiences, and high-fidelity
            digital assets in the identity vault.
          </CardDescription>
        </VisionCard>

        <VisionCard
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 }}
        >
          <MatrixOverlay>
            <BlockchainMatrix />
          </MatrixOverlay>
          <IconWrapper className="icon-wrapper">
            <FaLink />
          </IconWrapper>
          <CardTitle>HYBRID ECONOMY</CardTitle>
          <CardDescription>
            Bridging the gap between luxury physical collectibles and the
            evolving digital ownership landscape.
          </CardDescription>
        </VisionCard>
      </VisionGrid>

      <VisionManifesto>
        <ManifestoParagraph
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          CrownMania is where <span className="highlight">culture meets the ledger</span>.
          It was created for people who don’t just want to look at collectibles — they want
          to own a piece of a moment, a voice, a story that matters.
        </ManifestoParagraph>

        <ManifestoParagraph
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
        >
          Every Genesis fragment is more than a figure. It’s a <strong>limited-edition artifact</strong>
          tied to a permanent record on the blockchain. When you scan your physical
          collectible, you’re not just checking if it’s real… you’re <span className="highlight">unlocking its history</span>.
        </ManifestoParagraph>

        <ManifestoParagraph
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          style={{ textAlign: 'center', fontSize: '1.5rem', fontFamily: 'var(--font-primary)' }}
        >
          AUTHENTICITY. CULTURE. THE FUTURE.
        </ManifestoParagraph>
      </VisionManifesto>
    </AboutSection>
  );
}
