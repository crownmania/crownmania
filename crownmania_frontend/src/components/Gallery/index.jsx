import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { getStorageURL } from '../../utils/storageUtils';

const GallerySection = styled.section`
  width: 100%;
  min-height: 60vh;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  
  @media (max-width: 768px) {
    min-height: auto;
  }
`;

const ImagesContainer = styled.div`
  width: 100%;
  max-width: 100vw;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  overflow: hidden;
  
  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const GalleryImage = styled.img`
  flex: 1;
  min-width: 0;
  max-width: 33.33%;
  height: 500px;
  object-fit: cover;
  filter: brightness(0.95);
  
  @media (max-width: 768px) {
    max-width: 100%;
    width: 100%;
    height: 250px;
  }
`;

const NavigationButton = styled.button`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: white;
  padding: 1rem;
  cursor: pointer;
  z-index: 10;
  font-family: 'Designer', sans-serif;
  font-size: 1.5rem;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  &.prev {
    left: 2rem;
  }

  &.next {
    right: 2rem;
  }
`;

const SlideCounter = styled.div`
  position: absolute;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  color: white;
  font-family: 'Designer', sans-serif;
  font-size: 1rem;
  z-index: 10;
  background: rgba(0, 0, 0, 0.5);
  padding: 0.5rem 1rem;
  border-radius: 4px;
`;

const slideVariants = {
  enter: (direction) => ({
    x: direction > 0 ? 1000 : -1000,
    opacity: 0
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1
  },
  exit: (direction) => ({
    zIndex: 0,
    x: direction < 0 ? 1000 : -1000,
    opacity: 0
  })
};

export default function Gallery() {
  return (
    <GallerySection id="gallery">
      <ImagesContainer>
        <GalleryImage
          src="/images/product3.webp"
          alt="Standing full-body figure"
        />
        <GalleryImage
          src="/images/product2.webp"
          alt="Back tattoo"
        />
        <GalleryImage
          src="/images/product1.webp"
          alt="Face"
        />
      </ImagesContainer>
    </GallerySection>
  );
}