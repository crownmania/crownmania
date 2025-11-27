import React, { useState, useEffect, useMemo, useCallback } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { getStorageURL, preloadFiles } from '../utils/storageUtils';
import ImageLoader from './Gallery/ImageLoader';

const GallerySection = styled.section`
  width: 100%;
  height: 100vh;
  position: relative;
  overflow: hidden;
  background: black;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const SlideContainer = styled(motion.div)`
  width: 100%;
  height: 100%;
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const SlideWrapper = styled(motion.div)`
  width: 100%;
  height: 100%;
  position: relative;
`;

const LoadingIndicator = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 50px;
  height: 50px;
  border-radius: 50%;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: white;
  animation: spin 1s linear infinite;
  z-index: 1;
  
  @keyframes spin {
    to { transform: translate(-50%, -50%) rotate(360deg); }
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
  const [images, setImages] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [[page, direction], setPage] = useState([0, 0]);

  // Define image paths using useMemo to prevent recreation on each render
  const imagePaths = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => [
      `images/product${i + 1}.webp`,
      `images/product${i + 1}.jpg`
    ]).flat();
  }, []);

  // Load images efficiently with prioritization
  useEffect(() => {
    const loadImages = async () => {
      try {
        // Create prioritized image list with first images having higher priority
        const prioritizedPaths = imagePaths.map((path, index) => ({
          path,
          priority: Math.floor(index / 2) + 1, // First images get priority 1, then 2, etc.
          width: 1200 // Request optimal size from storage
        }));
        
        // First quickly get the first image to avoid blank screen
        const firstImage = await getStorageURL(prioritizedPaths[0].path, { priority: 1 });
        if (firstImage) {
          setImages([firstImage]);
        }
        
        // Then load the rest in the background
        const urls = await preloadFiles(prioritizedPaths);
        const validUrls = urls.filter(url => url !== null);
        if (validUrls.length > 0) {
          setImages(validUrls);
        }
      } catch (error) {
        console.error('Error loading gallery images:', error);
      }
    };
    loadImages();
  }, [imagePaths]);

  // Memoize the pagination function to prevent recreation on each render
  const paginate = useCallback((newDirection) => {
    const newIndex = currentIndex + newDirection;
    if (newIndex >= 0 && newIndex < images.length) {
      setPage([page + newDirection, newDirection]);
      setCurrentIndex(newIndex);
      
      // Preload the next image in the direction of navigation
      const nextIndex = newIndex + newDirection;
      if (nextIndex >= 0 && nextIndex < images.length) {
        // Silently preload the next image
        const img = new Image();
        img.src = images[nextIndex];
      }
    }
  }, [currentIndex, images, page]);

  return (
    <GallerySection id="gallery">
      <AnimatePresence initial={false} custom={direction}>
        {images.length > 0 && (
          <SlideContainer
            key={page}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 }
            }}
          >
            <SlideWrapper>
              {images.length > 0 ? (
                <ImageLoader
                  src={images[currentIndex]}
                  alt={`Gallery image ${currentIndex + 1}`}
                  sizes="(max-width: 768px) 100vw, 80vw"
                  className="slide-image"
                />
              ) : (
                <LoadingIndicator />
              )}
            </SlideWrapper>
          </SlideContainer>
        )}
      </AnimatePresence>

      {images.length > 1 && (
        <>
          <NavigationButton
            className="prev"
            onClick={() => paginate(-1)}
            disabled={currentIndex === 0}
          >
            ←
          </NavigationButton>
          
          <NavigationButton
            className="next"
            onClick={() => paginate(1)}
            disabled={currentIndex === images.length - 1}
          >
            →
          </NavigationButton>

          <SlideCounter>
            {currentIndex + 1} / {images.length}
          </SlideCounter>
        </>
      )}
    </GallerySection>
  );
}
