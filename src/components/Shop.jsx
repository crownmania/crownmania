import { useState, useEffect, Suspense } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from "@react-three/drei";
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
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  padding: 2rem;
  margin-bottom: 2rem;
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

const Title = styled.h3`
  font-family: 'Designer', sans-serif;
  font-size: 1.2rem;
  color: white;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  text-shadow: 0 0 10px rgba(0, 102, 255, 0.3);
  text-align: center;
  
  @media (max-width: 768px) {
    font-size: 1rem;
  }
`;

const ExpandedTitle = styled(Title)`
  font-size: 1.4rem;
  margin-bottom: 1.5rem;
  text-align: center;
  
  @media (max-width: 768px) {
    font-size: 1.2rem;
    margin-bottom: 1rem;
  }
`;

const Price = styled.span`
  font-family: 'Designer', sans-serif;
  font-size: 1.6rem;
  color: var(--light-blue);
  margin-left: 1rem;
  text-shadow: 0 0 10px rgba(0, 102, 255, 0.3);
  
  @media (max-width: 768px) {
    font-size: 1.4rem;
  }
`;

const ComingSoonText = styled.div`
  font-family: 'Designer', sans-serif;
  font-size: 2rem;
  color: var(--light-blue);
  letter-spacing: 0.2em;
  text-transform: uppercase;
  opacity: 0.8;
  text-shadow: 0 0 10px rgba(0, 102, 255, 0.3);
  
  @media (max-width: 768px) {
    font-size: 1.6rem;
  }
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

const BuyButton = styled(motion.button)`
  font-size: 1.2rem;
  padding: 1rem 2rem;
  background: transparent;
  border: 1px solid var(--light-blue);
  color: var(--light-blue);
  cursor: pointer;
  border-radius: 8px;
  margin-top: 1rem;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  backdrop-filter: blur(10px);
  box-shadow: 0 0 20px rgba(0, 102, 255, 0.1);

  &:hover {
    background: rgba(0, 102, 255, 0.1);
    box-shadow: 0 0 30px rgba(0, 102, 255, 0.2);
    transform: translateY(-2px);
  }

  @media (max-width: 768px) {
    font-size: 1rem;
    padding: 0.8rem 1.6rem;
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
      id: 1, 
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
          <h3>Coming Soon</h3>
          <p>Stay tuned for more exciting products!</p>
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

  return (
    <ShopSection id="shop">
      <MainTitle>
        <h1>THE SHOP</h1>
        <div className="subtitle">BROWSE • SELECT • PURCHASE</div>
      </MainTitle>

      <WindowsContainer style={{ marginTop: "120px" }}>
        {windows.map((window, index) => (
          index === 0 ? (
            <ShopWindow
              key={window.id}
              $isFirst={true}
              whileHover={{ scale: 1.05 }}
              onClick={() => setSelectedWindow(window)}
            >
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
              <ExpandedTitle>Limited Edition: Lil Durk Collectible Figure</ExpandedTitle>
              <Price>$299.99</Price>
              <BuyButton
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Buy Now
              </BuyButton>
            </ShopWindow>
          ) : (
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
              <ComingSoonWindow>
                Coming Soon
              </ComingSoonWindow>
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
                    <ExpandedTitle>{selectedWindow.title}</ExpandedTitle>
                    <Price>{selectedWindow.price}</Price>
                  </div>
                  <BuyButton
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
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
