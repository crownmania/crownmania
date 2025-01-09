import React, { useRef, useEffect, useState } from 'react';
import styled from 'styled-components';
import { motion, useAnimationFrame } from 'framer-motion';
import { getStorageURL } from '../utils/storageUtils';
import LoadingSpinner from './common/LoadingSpinner';

const GallerySection = styled.section`
  min-height: 100vh;
  position: relative;
  overflow: hidden;
  padding: 6rem 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ProductsContainer = styled.div`
  position: relative;
  width: 100%;
  max-width: 1400px;
  height: 70vh;
  display: flex;
  align-items: center;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 24px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.2);
  padding: 2rem;
`;

const CarouselTrack = styled.div`
  display: flex;
  gap: 4rem;
  position: absolute;
`;

const ProductCard = styled(motion.div)`
  flex: 0 0 300px;
  height: 400px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  overflow: hidden;
  position: relative;
  cursor: pointer;
  transition: transform 0.3s ease;

  &:hover {
    transform: scale(1.05);
  }
`;

const Gallery = () => {
  const [images, setImages] = useState({});
  const [loading, setLoading] = useState(true);
  const trackRef = useRef(null);
  const progressRef = useRef(0);

  useEffect(() => {
    const loadImages = async () => {
      setLoading(true);
      const imageUrls = {};
      try {
        for (let i = 1; i <= 5; i++) {
          try {
            // Try loading .webp first
            console.log(`Attempting to load product${i}.webp for gallery`);
            let url = await getStorageURL(`images/product${i}.webp`);
            
            if (!url) {
              // Fallback to .jpg
              console.log(`Falling back to product${i}.jpg for gallery`);
              url = await getStorageURL(`images/product${i}.jpg`);
            }

            if (url) {
              imageUrls[i] = url;
              console.log(`Successfully loaded gallery image ${i}:`, url);
            }
          } catch (error) {
            console.error(`Error loading gallery image ${i}:`, error);
          }
        }
      } finally {
        setLoading(false);
      }
      setImages(imageUrls);
    };

    loadImages();
  }, []);

  useAnimationFrame((time) => {
    if (!trackRef.current) return;
    progressRef.current = (time * 0.05) % (trackRef.current.scrollWidth - window.innerWidth);
    trackRef.current.style.transform = `translateX(-${progressRef.current}px)`;
  });

  return (
    <GallerySection id="gallery">
      <ProductsContainer>
        <CarouselTrack ref={trackRef}>
          {loading ? (
            <LoadingSpinner />
          ) : (
            Object.entries(images).map(([id, url]) => (
              <ProductCard key={id}>
                <img 
                  src={url} 
                  alt={`Product ${id}`}
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'cover' 
                  }}
                />
              </ProductCard>
            ))
          )}
        </CarouselTrack>
      </ProductsContainer>
    </GallerySection>
  );
};

export default Gallery;
