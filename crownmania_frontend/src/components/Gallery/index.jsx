import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { getStorageURL } from '../../utils/storageUtils';

const GallerySection = styled.section`
  width: 100%;
  height: 100vh;
  position: relative;
  overflow: hidden;
  background: black;
`;

const SlideContainer = styled(motion.div)`
  width: 100%;
  height: 100%;
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const SlideImage = styled(motion.img)`
  width: 100%;
  height: 100%;
  object-fit: cover;
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

  useEffect(() => {
    const loadImages = async () => {
      try {
        // Load your images here
        const imageUrls = await Promise.all([
          getStorageURL('gallery/image1.jpg'),
          getStorageURL('gallery/image2.jpg'),
          getStorageURL('gallery/image3.jpg'),
          // Add more images as needed
        ]);
        setImages(imageUrls);
      } catch (error) {
        console.error('Error loading gallery images:', error);
      }
    };
    loadImages();
  }, []);

  const paginate = (newDirection) => {
    const newIndex = currentIndex + newDirection;
    if (newIndex >= 0 && newIndex < images.length) {
      setPage([page + newDirection, newDirection]);
      setCurrentIndex(newIndex);
    }
  };

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
            <SlideImage
              src={images[currentIndex]}
              alt={`Gallery image ${currentIndex + 1}`}
              draggable="false"
            />
          </SlideContainer>
        )}
      </AnimatePresence>

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
    </GallerySection>
  );
}
