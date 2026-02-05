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
  overflow: hidden;
  
  /* Inherit Vault-like transparency to show global background */
  background: linear-gradient(
    to bottom,
    transparent 0%,
    rgba(0, 0, 0, 0.6) 10%,
    rgba(0, 0, 0, 0.6) 90%,
    transparent 100%
  );

  /* Vault Theme Variables for consistency */
  --vault-accent: #4169E1;
  --vault-glow: rgba(65, 105, 225, 0.4);
  --bg-vault: rgba(0, 5, 25, 0.5);
  --glass-blur: blur(10px);
  --glass-border: 1px solid rgba(255, 255, 255, 0.1);
  --vault-shadow: 0 8px 32px 0 rgba( 0, 0, 0, 0.37 );
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
    text-shadow: 0 0 10px rgba(255, 255, 255, 0.3), 0 0 20px rgba(255, 255, 255, 0.15);
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

/* Updated VisionCard to match Vault Panel aesthetics with Matrix retained */
const VisionCard = styled(motion.div)`
  background: var(--bg-vault);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: var(--glass-border);
  border-radius: 20px;
  padding: 3rem 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  position: relative;
  box-shadow: var(--vault-shadow);
  overflow: hidden;
  transition: all 0.4s ease;

  /* Subtle top border shine like Vault panels */
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
  }

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
  position: relative;
  z-index: 2;
`;

const CardTitle = styled.h3`
  font-family: var(--font-secondary);
  font-size: 1.25rem;
  font-weight: 700;
  color: #fff;
  margin-bottom: 1rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  position: relative;
  z-index: 2;
`;

const CardDescription = styled.p`
  font-family: var(--font-secondary);
  font-size: 0.9rem;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.6);
  max-width: 240px;
  position: relative;
  z-index: 2;
`;

const VisionManifesto = styled(motion.div)`
  max-width: 900px;
  margin: 0 auto;
  z-index: 2;
  position: relative;
  text-align: center; /* Centered text for the vision */
`;

const ManifestoParagraph = styled(motion.p)`
  font-family: var(--font-secondary);
  font-size: clamp(1rem, 2.5vw, 1.2rem);
  line-height: 1.8;
  color: rgba(255, 255, 255, 0.85);
  margin-bottom: 2.5rem;
  font-weight: 400;
  letter-spacing: 0.02em;
  text-align: left; /* Keep paragraphs left-aligned for readability usually, but user prompt implies a flow. Vault uses centered/left mix. Let's stick to left or center. Centered is more "manifesto" like. */
  text-align: center;

  strong {
    color: var(--vault-accent);
    font-weight: 700;
  }
`;

const MatrixOverlay = styled.div`
  position: absolute;
  inset: 0;
  opacity: 0.15; /* Kept subtle */
  filter: grayscale(1);
  pointer-events: none;
  z-index: 1; 
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
          <strong>CrownMania is where real life meets the digital world.</strong>
        </ManifestoParagraph>

        <ManifestoParagraph
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
        >
          It was created for people who don’t just want to look at collectibles — they want
          to own a piece of a moment, a voice, a story that matters to them. Whether it’s
          an artist who got them through dark days, a figure that represents resilience,
          or a symbol of where they came from, CrownMania turns that connection into
          something real you can hold and something digital that proves it’s yours.
        </ManifestoParagraph>

        <ManifestoParagraph
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
        >
          Every CrownMania collectible is more than a figure.
          It’s a <strong>limited-edition artifact tied to a Digital Crown</strong> — a permanent
          record of ownership on the blockchain that lives beyond the box, beyond resale,
          and beyond time. When you scan your physical collectible, you’re not just checking
          if it’s real… you’re unlocking its story, and your place in it.
        </ManifestoParagraph>

        <ManifestoParagraph
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
        >
          We believe the future of collectibles isn’t about speculation or hype.
          It’s about <strong>belonging, authenticity, and culture that lives on.</strong>
        </ManifestoParagraph>

        <ManifestoParagraph
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
        >
          CrownMania gives people a new way to connect with the artists, creators, and
          icons they believe in — not just by watching from the outside, but by owning
          their crown in the mania.
        </ManifestoParagraph>
      </VisionManifesto>
    </AboutSection>
  );
}
