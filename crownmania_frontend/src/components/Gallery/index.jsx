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
  min-height: auto;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0;
  background: transparent;
  
  @media (max-width: 768px) {
    padding: 0;
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
    font-family: 'Avenir Next', sans-serif;
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.6);
    text-transform: uppercase;
    letter-spacing: 0.3em;
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
  -webkit-mask-image: linear-gradient(
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
  animation: ${scroll} 40s linear infinite;
  will-change: transform;
  transform: translateZ(0);
  
  &:hover {
    animation-play-state: paused;
  }
  
  @media (max-width: 768px) {
    animation-duration: 25s;
  }
  
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

const GalleryImage = styled.img`
  width: 300px;
  height: 380px;
  object-fit: cover;
  margin: 0 0.75rem;
  border-radius: 12px;
  filter: brightness(0.9);
  transition: filter 0.3s ease;
  will-change: filter;
  
  &:hover {
    filter: brightness(1.1);
  }
  
  @media (max-width: 768px) {
    width: 200px;
    height: 260px;
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