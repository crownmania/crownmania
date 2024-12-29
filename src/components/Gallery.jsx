import React, { useRef, useEffect } from 'react';
import styled from 'styled-components';
import { motion, useAnimationFrame } from 'framer-motion';
import ImageLoader from './Gallery/ImageLoader';

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

const ProductImage = styled(ImageLoader)`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const products = [
  { id: 1, image: '/images/product1.jpg', alt: 'Product 1' },
  { id: 2, image: '/images/product2.jpg', alt: 'Product 2' },
  { id: 3, image: '/images/product3.jpg', alt: 'Product 3' },
  { id: 4, image: '/images/product4.jpg', alt: 'Product 4' },
  { id: 5, image: '/images/product5.jpg', alt: 'Product 5' },
  // Duplicate products for infinite scroll
  { id: 6, image: '/images/product1.jpg', alt: 'Product 1' },
  { id: 7, image: '/images/product2.jpg', alt: 'Product 2' },
  { id: 8, image: '/images/product3.jpg', alt: 'Product 3' },
  { id: 9, image: '/images/product4.jpg', alt: 'Product 4' },
  { id: 10, image: '/images/product5.jpg', alt: 'Product 5' },
];

const Gallery = () => {
  const trackRef = useRef(null);
  const progressRef = useRef(0);
  const speedRef = useRef(0.5);

  useAnimationFrame((time) => {
    if (!trackRef.current) return;

    progressRef.current += speedRef.current;
    
    if (progressRef.current >= 100) {
      progressRef.current = 0;
    }

    const x = -(progressRef.current * 1);
    trackRef.current.style.transform = `translateX(${x}px)`;
  });

  return (
    <GallerySection>
      <ProductsContainer>
        <CarouselTrack ref={trackRef}>
          {products.map((product) => (
            <ProductCard key={product.id}>
              <ProductImage
                src={product.image}
                alt={product.alt}
              />
            </ProductCard>
          ))}
        </CarouselTrack>
      </ProductsContainer>
    </GallerySection>
  );
};

export default Gallery;
