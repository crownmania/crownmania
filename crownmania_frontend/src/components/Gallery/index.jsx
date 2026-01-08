import React, { useState, useEffect, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion } from 'framer-motion';

const scroll = keyframes`
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(-50%);
  }
`;

const GallerySection = styled.section`
  width: 100%;
  min-height: 60vh;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem 0;
  background: rgba(0, 0, 0, 0.3);
  
  @media (max-width: 768px) {
    min-height: auto;
    padding: 1rem 0;
  }
`;

const GalleryTitle = styled.div`
  text-align: center;
  margin-bottom: 2rem;
  
  h2 {
    font-family: 'Designer', sans-serif;
    font-size: clamp(1.5rem, 4vw, 2.5rem);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: white;
    text-shadow: var(--title-glow);
  }
  
  .subtitle {
    font-family: 'Source Sans Pro', sans-serif;
    font-size: 0.85rem;
    color: rgba(255, 255, 255, 0.7);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-top: 0.5rem;
  }
`;

const CarouselWrapper = styled.div`
  width: 100%;
  overflow: hidden;
  mask-image: linear-gradient(
    to right,
    transparent,
    black 10%,
    black 90%,
    transparent
  );
`;

const CarouselTrack = styled.div`
  display: flex;
  width: fit-content;
  animation: ${scroll} 30s linear infinite;
  
  &:hover {
    animation-play-state: paused;
  }
`;

const GalleryImage = styled.img`
  width: 350px;
  height: 450px;
  object-fit: cover;
  margin: 0 1rem;
  border-radius: 12px;
  filter: brightness(0.9);
  transition: all 0.3s ease;
  
  &:hover {
    filter: brightness(1.1);
    transform: scale(1.02);
  }
  
  @media (max-width: 768px) {
    width: 280px;
    height: 360px;
    margin: 0 0.5rem;
  }
`;

// Product images - duplicate for infinite scroll effect
const images = [
  { src: '/images/product1.webp', alt: 'Lil Durk Figure - Front' },
  { src: '/images/product2.webp', alt: 'Lil Durk Figure - Back' },
  { src: '/images/product3.webp', alt: 'Lil Durk Figure - Full' },
  { src: '/images/product1.webp', alt: 'Lil Durk Figure - Front' },
  { src: '/images/product2.webp', alt: 'Lil Durk Figure - Back' },
  { src: '/images/product3.webp', alt: 'Lil Durk Figure - Full' },
];

export default function Gallery() {
  return (
    <GallerySection id="gallery">
      <GalleryTitle>
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          THE GALLERY
        </motion.h2>
        <motion.div
          className="subtitle"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          Explore the Collection
        </motion.div>
      </GalleryTitle>

      <CarouselWrapper>
        <CarouselTrack>
          {/* Double the images for seamless loop */}
          {[...images, ...images].map((img, index) => (
            <GalleryImage
              key={index}
              src={img.src}
              alt={img.alt}
              loading="lazy"
            />
          ))}
        </CarouselTrack>
      </CarouselWrapper>
    </GallerySection>
  );
}