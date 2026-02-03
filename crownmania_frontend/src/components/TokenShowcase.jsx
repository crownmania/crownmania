import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';

const ShowcaseSection = styled.section`
  width: 100%;
  padding: 4rem 2rem;
  background: transparent;
  position: relative;
  z-index: 1;
`;

const TokenGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
  
  @media (max-width: 1200px) {
    grid-template-columns: repeat(3, 1fr);
  }
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }
  
  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const TokenCard = styled(motion.div)`
  background: transparent;
  border: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  
  &:hover {
    transform: translateY(-5px);
  }
`;

const TokenImageContainer = styled.div`
  width: 100%;
  aspect-ratio: 0.75;
  border-radius: 12px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
`;

const TokenImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  
  ${TokenCard}:hover & {
    transform: scale(1.05);
  }
`;

const TokenShowcase = () => {
  // Using local images from public folder
  const tokens = [
    {
      id: 1,
      image: 'https://firebasestorage.googleapis.com/v0/b/sonorous-crane-440603-s6.firebasestorage.app/o/images%2FGenerated%20Image%20January%2016%2C%202026%20-%202_50AM.jpeg?alt=media'
    },
    {
      id: 2,
      image: 'https://firebasestorage.googleapis.com/v0/b/sonorous-crane-440603-s6.firebasestorage.app/o/images%2FGenerated%20Image%20January%2016%2C%202026%20-%203_36AM.jpeg?alt=media'
    },
    {
      id: 3,
      image: 'https://firebasestorage.googleapis.com/v0/b/sonorous-crane-440603-s6.firebasestorage.app/o/images%2FGenerated%20Image%20January%2016%2C%202026%20-%208_55AM%20(1).jpeg?alt=media'
    },
    {
      id: 4,
      image: 'https://firebasestorage.googleapis.com/v0/b/sonorous-crane-440603-s6.firebasestorage.app/o/images%2FGenerated%20Image%20January%2017%2C%202026%20-%201_11AM.jpeg?alt=media'
    },
    {
      id: 5,
      image: 'https://firebasestorage.googleapis.com/v0/b/sonorous-crane-440603-s6.firebasestorage.app/o/images%2FGenerated%20Image%20January%2015%2C%202026%20-%206_00PM%20(1).jpeg?alt=media'
    },
    {
      id: 6,
      image: '/images/Generated Image January 17, 2026 - 2_39PM.jpeg'
    },
    {
      id: 7,
      image: '/images/Generated Image February 03, 2026 - 9_07AM.jpeg'
    }
  ];

  return (
    <ShowcaseSection>
      <TokenGrid>
        {tokens.map((token, index) => (
          <TokenCard
            key={token.id}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
          >
            <TokenImageContainer>
              <TokenImage 
                src={token.image} 
                alt={`Token ${token.id}`}
                loading="lazy"
              />
            </TokenImageContainer>
          </TokenCard>
        ))}
      </TokenGrid>
    </ShowcaseSection>
  );
};

export default TokenShowcase;
