import React, { useState, useEffect, Suspense } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';

import { useNavigate } from 'react-router-dom';
import { getStorageURL, preloadFiles } from "../utils/storageUtils";
import LoadingSpinner from "./common/LoadingSpinner";
import { PRODUCTS } from '../data/productData';

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
  top: 4rem;
  left: 50%;
  transform: translateX(-50%);
  padding: 1rem;
  text-align: center;

  h1 {
    font-size: 3rem;
    font-family: 'Designer', sans-serif;
    margin-bottom: 0.5rem;
    font-weight: bold;
    text-shadow: var(--title-glow);
  }

  .subtitle {
    font-size: 0.8rem;
    opacity: 0.7;
    letter-spacing: 0.3em;
    font-family: 'Avenir Next', sans-serif;
    text-transform: uppercase;
    font-weight: 500;
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
  aspect-ratio: 1/1;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.2);
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.2);
  padding: 0;
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
  font-family: var(--font-secondary);
  font-size: 1rem;
  font-weight: 500;
  color: white;
  margin: 0.5rem 0;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  text-align: center;
`;

const ProductPrice = styled.div`
  font-family: var(--font-secondary);
  font-size: 1.3rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 1rem;
  letter-spacing: 0.02em;
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
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.3em;
  margin-top: 0.5rem;
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
  object-fit: contain;
  object-position: center center;
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
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  padding: 2rem 2rem 8rem 2rem; /* Top/Side padding, Large Bottom padding for info panel */
  display: flex;
  align-items: center;
  justify-content: center;

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    object-position: center center;
    filter: drop-shadow(0 10px 20px rgba(0,0,0,0.3));
    transition: transform 0.3s ease;
  }
`;

export default function Shop() {
  const navigate = useNavigate();
  const [selectedWindow, setSelectedWindow] = useState(null);
  const [loadingImages, setLoadingImages] = useState(true);

  useEffect(() => {
    setLoadingImages(false);
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
        <ImageContainer>
          <img
            src="/images/product1.webp"
            alt="Lil Durk Collectible Figure"
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        </ImageContainer>
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

  const handleBuyClick = (e, product) => {
    e.stopPropagation();
    // Redirect to Lil Durk's official store
    window.open('https://shop.lildurkofficial.com/products/lil-durk-resin-figure', '_blank', 'noopener,noreferrer');
  };

  return (
    <ShopSection id="shop">
      <MainTitle>
        <h1>THE COLLECTION</h1>
        <div className="subtitle">EXPLORE • SHOP</div>
      </MainTitle>

      <WindowsContainer>
        {PRODUCTS.map((product, index) => (
          <ShopWindow
            key={product.id}
            layoutId={`window-${product.id}`}
            onClick={() => !product.comingSoon && setSelectedWindow(product)}
            initial={{ scale: 1, opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: product.comingSoon ? 1 : 1.02 }}
            whileTap={{ scale: product.comingSoon ? 1 : 0.98 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            style={{ cursor: product.comingSoon ? 'default' : 'pointer' }}
          >
            <ModelPreview>
              {product.comingSoon ? (
                <ComingSoonText>COMING SOON</ComingSoonText>
              ) : (
                <img
                  src={product.mainImage}
                  alt={product.name}
                />
              )}
            </ModelPreview>
            {!product.comingSoon && <ProductTitle>{product.name}</ProductTitle>}
            {!product.comingSoon && (
              <BuyButton
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={(e) => handleBuyClick(e, product)}
              >
                VIEW PRODUCT
              </BuyButton>
            )}
          </ShopWindow>
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
              <div>
                <ProductTitle>{selectedWindow.name}</ProductTitle>
                {/* Prices hidden - customers purchase through external website */}
                {selectedWindow.comingSoon && (
                  <ProductPrice>Coming Soon</ProductPrice>
                )}
              </div>
              {!selectedWindow.comingSoon && (
                <BuyButton
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => handleBuyClick(e, selectedWindow)}
                >
                  View Product
                </BuyButton>
              )}
            </ProductInfo>
          </ExpandedWindow>
        )}
      </AnimatePresence>
    </ShopSection>
  );
}