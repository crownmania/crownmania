import React, { useState, useEffect, Suspense } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from "@react-three/drei";
import { DurkModel } from "./3d/DurkModel";
import { getStorageURL, preloadFiles } from "../utils/storageUtils";
import LoadingSpinner from "./common/LoadingSpinner";

const ShopSection = styled.section`
  min-height: 100vh;
  padding: 6rem 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
`;

const MainTitle = styled.div`
  position: absolute;
  top: 2rem;
  left: 50%;
  transform: translateX(-50%);
  padding: 1rem;
  text-align: center;

  h1 {
    font-size: 3rem;
    font-family: 'Designer', sans-serif;
    margin-bottom: 0.5rem;
    font-weight: bold;
  }

  .subtitle {
    font-size: 0.8rem;
    opacity: 0.8;
    letter-spacing: 0.1em;
    font-family: 'Avenir Next', sans-serif;
    text-transform: uppercase;
  }
`;

const WindowsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2rem;
  width: 100%;
  max-width: 1200px;
  margin-top: 8rem;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const ShopWindow = styled(motion.div)`
  aspect-ratio: 3/4;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.2);
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  cursor: pointer;
  overflow: hidden;
  position: relative;
  transition: all 0.3s ease;

  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    right: 0;
    width: 100%;
    height: 100%;
    background: radial-gradient(
      circle at bottom right,
      rgba(0, 102, 255, 0.1),
      transparent 70%
    );
    pointer-events: none;
    animation: pulse 4s ease-in-out infinite;
  }

  @keyframes pulse {
    0% { opacity: 0.3; }
    50% { opacity: 0.6; }
    100% { opacity: 0.3; }
  }

  &:hover {
    transform: translateY(-5px);
    border-color: var(--light-blue);
    box-shadow: 0 5px 30px rgba(0, 102, 255, 0.2);
  }
`;

const ModelWindow = styled(ShopWindow)`
  position: relative;
  height: 400px;
  
  canvas {
    width: 100% !important;
    height: 100% !important;
  }
`;

const ModelContainer = styled.div`
  width: 100%;
  height: 100%;
  position: relative;
  canvas {
    width: 100% !important;
    height: 100% !important;
  }
`;

const ExpandedWindow = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(20px);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const ProductInfo = styled(motion.div)`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.3);
  padding: 2rem;
  backdrop-filter: blur(10px);
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

const ProductTitle = styled.h3`
  font-family: 'Designer', sans-serif;
  font-size: 1rem;
  color: white;
  margin: 0.5rem 0;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  text-align: center;
`;

const ProductPrice = styled.div`
  font-family: 'Designer', sans-serif;
  font-size: 1.2rem;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 1rem;
  letter-spacing: 0.1em;
  text-align: center;
`;

const BuyButton = styled(motion.button)`
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  padding: 0.4rem 1rem;
  border-radius: 4px;
  font-family: 'Designer', sans-serif;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-top: 1rem;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: scale(1.05);
  }
`;

const ComingSoonText = styled.div`
  font-family: 'Avenir Next', sans-serif;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  width: 100%;
`;

const ComingSoonWindow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: white;
  font-size: 2rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  font-family: 'Designer', sans-serif;
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(
      circle at center,
      rgba(0, 102, 255, 0.1),
      transparent 70%
    );
    pointer-events: none;
    animation: pulse 4s ease-in-out infinite;
  }
`;

const CloseButton = styled(motion.button)`
  position: absolute;
  top: 2rem;
  right: 2rem;
  background: none;
  border: none;
  color: white;
  font-size: 2rem;
  cursor: pointer;
  z-index: 1001;
`;

const ErrorMessage = styled.p`
  font-size: 1.2rem;
  color: white;
  text-align: center;
  margin: 2rem;
`;

const ProductImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const ImageContainer = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const ComingSoonContainer = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const Window = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const ModelPreview = styled.div`
  width: 100%;
  height: 300px;
  position: relative;
  margin-bottom: 1rem;

  canvas {
    width: 100% !important;
    height: 100% !important;
  }
`;

export default function Shop() {
  const [selectedWindow, setSelectedWindow] = useState(null);
  const [productImages, setProductImages] = useState({});
  const [loadingImages, setLoadingImages] = useState(true);

  useEffect(() => {
    const loadImages = async () => {
      setLoadingImages(true);
      const imageUrls = {};
      
      try {
        for (let i = 1; i <= 5; i++) {
          try {
            // Try loading .webp first
            console.log(`Attempting to load product${i}.webp`);
            let url = await getStorageURL(`images/product${i}.webp`);
            
            if (!url) {
              // Fallback to .jpg
              console.log(`Falling back to product${i}.jpg`);
              url = await getStorageURL(`images/product${i}.jpg`);
            }

            if (url) {
              imageUrls[i] = url;
              console.log(`Successfully loaded product${i} image:`, url);
            } else {
              console.error(`Failed to load product${i} image in any format`);
            }
          } catch (error) {
            console.error(`Error loading product${i}:`, error);
          }
        }
      } finally {
        setLoadingImages(false);
      }
      setProductImages(imageUrls);
    };

    loadImages();
  }, []);

  const windows = [
    { 
      id: 'durk', 
      type: 'crown', 
      title: 'Limited Edition: Lil Durk Collectible Figure', 
      price: '$299.99' 
    },
    { 
      id: 2, 
      type: 'coming-soon', 
      title: 'Coming Soon', 
      price: '' 
    },
    { 
      id: 3, 
      type: 'coming-soon', 
      title: 'Coming Soon', 
      price: '' 
    }
  ];

  const ProductWindow = ({ type, imageId }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [imageError, setImageError] = useState(false);
    const [imageUrl, setImageUrl] = useState(null);

    useEffect(() => {
      const loadImage = async () => {
        if (!imageId) return;
        
        setIsLoading(true);
        setImageError(false);

        try {
          // Try loading .webp first
          console.log(`Attempting to load product${imageId}.webp`);
          const webpUrl = await getStorageURL(`images/product${imageId}.webp`);
          if (webpUrl) {
            console.log(`Successfully loaded product${imageId}.webp`);
            setImageUrl(webpUrl);
            return;
          }

          // Fallback to .jpg if .webp fails
          console.log(`Falling back to product${imageId}.jpg`);
          const jpgUrl = await getStorageURL(`images/product${imageId}.jpg`);
          if (jpgUrl) {
            console.log(`Successfully loaded product${imageId}.jpg`);
            setImageUrl(jpgUrl);
            return;
          }

          throw new Error('Both .webp and .jpg formats failed to load');
        } catch (error) {
          console.error(`Error loading image for product ${imageId}:`, error);
          setImageError(true);
        } finally {
          setIsLoading(false);
        }
      };

      loadImage();
    }, [imageId]);

    if (type === 'crown') {
      return (
        <ModelContainer>
          <Canvas
            camera={{ position: [0, 0, 5], fov: 45 }}
            style={{ background: 'transparent' }}
          >
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} />
            <Suspense fallback={<LoadingSpinner />}>
              <DurkModel />
            </Suspense>
          </Canvas>
        </ModelContainer>
      );
    }

    if (type === 'coming-soon') {
      return (
        <ComingSoonContainer>
          <ComingSoonText>Coming Soon</ComingSoonText>
        </ComingSoonContainer>
      );
    }

    return (
      <Window
        onClick={() => setSelectedWindow(type)}
        className={selectedWindow === type ? 'active' : ''}
      >
        {isLoading && <LoadingSpinner />}
        {!isLoading && !imageError && imageUrl && (
          <img
            src={imageUrl}
            alt={`Product ${imageId}`}
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'cover'
            }}
          />
        )}
        {(imageError || (!isLoading && !imageUrl)) && (
          <div style={{ 
            color: 'red', 
            textAlign: 'center',
            padding: '20px'
          }}>
            Failed to load image
          </div>
        )}
      </Window>
    );
  };

  const handleBuyClick = (e, window) => {
    e.stopPropagation();
    // Navigate to product page
    window.location.href = '/product/durk-figure';
  };

  return (
    <ShopSection id="shop">
      <MainTitle>
        <h1>THE COLLECTION</h1>
        <div className="subtitle">EXPLORE • SHOP</div>
      </MainTitle>

      <WindowsContainer>
        {windows.map((window, index) => (
          window.id === 'durk' ? (
            <ShopWindow
              key={window.id}
              $isFirst={index === 0}
              layoutId={`window-${window.id}`}
              onClick={() => setSelectedWindow(window)}
              initial={{ scale: 1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.3 }}
            >
              <ModelPreview>
                <Canvas camera={{ position: [0, 0, 15], fov: 25 }}>
                  <Suspense fallback={null}>
                    <ambientLight intensity={0.5} />
                    <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
                    <pointLight position={[-10, -10, -10]} />
                    <DurkModel />
                    <Environment preset="city" />
                    <OrbitControls enableZoom={false} />
                  </Suspense>
                </Canvas>
              </ModelPreview>
              <ProductTitle>Limited Edition: Lil Durk Collectible Figure</ProductTitle>
              <ProductPrice>$299.99</ProductPrice>
              <BuyButton
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => handleBuyClick(e, window)}
              >
                BUY NOW
              </BuyButton>
            </ShopWindow>
          ) : (
            <ShopWindow
              key={window.id}
              $isFirst={index === 0}
              layoutId={`window-${window.id}`}
              initial={{ scale: 1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.3 }}
            >
              <ComingSoonText>Coming Soon</ComingSoonText>
            </ShopWindow>
          )
        ))}
      </WindowsContainer>

      <AnimatePresence>
        {selectedWindow && (
          <ExpandedWindow
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <CloseButton onClick={() => setSelectedWindow(null)}>×</CloseButton>
            
            <motion.div layoutId={`window-${selectedWindow.id}`} style={{ width: '80%', height: '70%' }}>
              <ProductWindow type={selectedWindow.type} imageId={selectedWindow.imageId} />
            </motion.div>

            <ProductInfo
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {selectedWindow.type === 'crown' ? (
                <>
                  <div>
                    <ProductTitle>{selectedWindow.title}</ProductTitle>
                    <ProductPrice>{selectedWindow.price}</ProductPrice>
                  </div>
                  <BuyButton
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={(e) => handleBuyClick(e, selectedWindow)}
                  >
                    Buy Now
                  </BuyButton>
                </>
              ) : (
                <ComingSoonText>Coming Soon</ComingSoonText>
              )}
            </ProductInfo>
          </ExpandedWindow>
        )}
      </AnimatePresence>
    </ShopSection>
  );
}
