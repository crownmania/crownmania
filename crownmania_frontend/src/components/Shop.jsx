import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

import { useNavigate } from 'react-router-dom';
import { getStorageURL, preloadFiles } from "../utils/storageUtils";
import LoadingSpinner from "./common/LoadingSpinner";
import { PRODUCTS } from '../data/productData';

const ShopSection = styled.section`
  min-height: 100vh;
  padding: 8rem 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  background: radial-gradient(circle at 50% 10%, rgba(200, 0, 0, 0.05) 0%, transparent 50%);
  overflow: hidden;
`;

const MainTitle = styled.div`
  text-align: center;
  margin-bottom: 4rem;
  z-index: 2;

  h1 {
    font-size: clamp(2.5rem, 8vw, 4rem);
    font-family: var(--font-primary);
    margin-bottom: 0.5rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: white;
    text-shadow: 0 0 10px rgba(255, 255, 255, 0.3), 0 0 20px rgba(255, 255, 255, 0.15);
  }

  .subtitle {
    font-size: 0.9rem;
    color: var(--vault-accent);
    letter-spacing: 0.4em;
    font-family: var(--font-secondary);
    text-transform: uppercase;
    font-weight: 600;
    opacity: 0.8;
  }
`;

const WindowsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2.5rem;
  width: 100%;
  max-width: 1200px;
  z-index: 2;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 2rem;
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    padding: 0 1rem;
  }
`;

const ShopCard = styled(motion.div)`
  background: var(--vault-bg);
  border-radius: 20px;
  backdrop-filter: blur(var(--vault-blur));
  -webkit-backdrop-filter: blur(var(--vault-blur));
  border: 1px solid var(--vault-border);
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  position: relative;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 50% 0%, rgba(200, 0, 0, 0.1), transparent 70%);
    opacity: 0;
    transition: opacity 0.4s ease;
  }

  &:hover {
    transform: translateY(-10px);
    border-color: var(--vault-accent);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4), 0 0 20px rgba(200, 0, 0, 0.15);
    
    &::before {
      opacity: 1;
    }

    img {
      transform: scale(1.05) translateY(-5px);
    }
  }
`;

const ModelPreview = styled.div`
  width: 100%;
  aspect-ratio: 1/1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  margin-bottom: 1.5rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  overflow: hidden;

  img {
    width: 90%;
    height: 90%;
    object-fit: contain;
    transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
    filter: drop-shadow(0 10px 20px rgba(0,0,0,0.5));
  }

  &:first-of-type {
    box-shadow: inset 0 0 20px rgba(0,0,0,0.3);
  }
`;

const ProductTitle = styled.h3`
  font-family: var(--font-secondary);
  font-size: 1rem;
  font-weight: 600;
  color: white;
  margin: 0.5rem 0;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  text-align: center;
`;

const ProductPrice = styled.div`
  font-family: var(--font-secondary);
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--vault-accent);
  margin-bottom: 1.5rem;
  letter-spacing: 0.05em;
`;

const ActionBar = styled.div`
  width: 100%;
  display: flex;
  gap: 1rem;
  margin-top: auto;
`;

const ActionButton = styled(motion.button)`
  flex: 1;
  background: ${props => props.$primary ? 'var(--vault-accent)' : 'rgba(255, 255, 255, 0.05)'};
  border: 1px solid ${props => props.$primary ? 'transparent' : 'rgba(255, 255, 255, 0.2)'};
  color: ${props => props.$primary ? '#000' : '#fff'};
  padding: 0.8rem 1rem;
  border-radius: 8px;
  font-family: var(--font-secondary);
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.3s ease;

  &:hover:not(:disabled) {
    background: ${props => props.$primary ? '#fff' : 'rgba(255, 255, 255, 0.1)'};
    border-color: ${props => props.$primary ? 'transparent' : 'var(--vault-accent)'};
    color: #000;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ExpandedOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
`;

const ExpandedContent = styled(motion.div)`
  width: 100%;
  max-width: 1100px;
  background: var(--vault-bg);
  border: 1px solid var(--vault-border);
  border-radius: 24px;
  overflow: hidden;
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  max-height: 90vh;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    max-height: 95vh;
    overflow-y: auto;
  }
`;

const GallerySection = styled.div`
  position: relative;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 500px;

  @media (max-width: 900px) {
    min-height: 400px;
  }
`;

const SidePanel = styled.div`
  padding: 3rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  border-left: 1px solid var(--vault-border);

  @media (max-width: 900px) {
    border-left: none;
    border-top: 1px solid var(--vault-border);
    padding: 2rem;
  }
`;

const CloseIconButton = styled(motion.button)`
  position: absolute;
  top: 2rem;
  right: 2rem;
  background: var(--vault-bg);
  border: 1px solid var(--vault-border);
  color: white;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 2001;
  font-size: 1.5rem;

  &:hover {
    border-color: var(--vault-accent);
    color: var(--vault-accent);
  }
`;

const GalleryNav = styled(motion.button)`
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;

  &:hover {
    background: var(--vault-accent);
    color: #000;
  }

  &.left { left: 1.5rem; }
  &.right { right: 1.5rem; }
`;

const ComingSoonBadge = styled.div`
  font-family: var(--font-secondary);
  font-size: 0.7rem;
  color: var(--vault-accent);
  text-transform: uppercase;
  letter-spacing: 0.3em;
  padding: 0.5rem 1rem;
  background: rgba(200, 0, 0, 0.05);
  border: 1px solid rgba(200, 0, 0, 0.2);
  border-radius: 20px;
  margin-top: 1rem;
`;


export default function Shop() {
  const navigate = useNavigate();
  const [selectedWindow, setSelectedWindow] = useState(null);
  const [loadingImages, setLoadingImages] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    setLoadingImages(false);
  }, []);

  // Reset image index when modal closes or product changes
  useEffect(() => {
    setCurrentImageIndex(0);
  }, [selectedWindow]);

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
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          THE SHOP
        </motion.h1>
        <motion.div
          className="subtitle"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          viewport={{ once: true }}
        >
          THE COLLECTION
        </motion.div>
      </MainTitle>

      <WindowsContainer>
        {PRODUCTS.map((product, index) => (
          <ShopCard
            key={product.id}
            layoutId={`window-${product.id}`}
            onClick={() => !product.comingSoon && setSelectedWindow(product)}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <ModelPreview>
              {product.comingSoon ? (
                <ComingSoonBadge>AVAILABLE SOON</ComingSoonBadge>
              ) : (
                <img src={product.mainImage} alt={product.name} />
              )}
            </ModelPreview>

            <ProductTitle>{product.name}</ProductTitle>
            <ProductPrice>{product.comingSoon ? '—' : product.price || '$299.99'}</ProductPrice>

            <ActionBar>
              <ActionButton
                $primary
                disabled={product.comingSoon}
                onClick={(e) => handleBuyClick(e, product)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {product.comingSoon ? 'LOCKED' : 'ACQUIRE NOW'}
              </ActionButton>
              {!product.comingSoon && (
                <ActionButton
                  style={{ width: '44px', flex: 'none' }}
                  onClick={() => setSelectedWindow(product)}
                >
                  <FaChevronRight />
                </ActionButton>
              )}
            </ActionBar>
          </ShopCard>
        ))}
      </WindowsContainer>

      <AnimatePresence>
        {selectedWindow && (
          <ExpandedOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedWindow(null)}
          >
            <CloseIconButton
              onClick={() => setSelectedWindow(null)}
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
            >
              ×
            </CloseIconButton>

            <ExpandedContent
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
            >
              <GallerySection>
                {selectedWindow.galleryImages && selectedWindow.galleryImages.length > 1 && (
                  <>
                    <GalleryNav
                      className="left"
                      onClick={() => setCurrentImageIndex(prev =>
                        prev === 0 ? selectedWindow.galleryImages.length - 1 : prev - 1
                      )}
                    >
                      <FaChevronLeft />
                    </GalleryNav>
                    <GalleryNav
                      className="right"
                      onClick={() => setCurrentImageIndex(prev =>
                        prev === selectedWindow.galleryImages.length - 1 ? 0 : prev + 1
                      )}
                    >
                      <FaChevronRight />
                    </GalleryNav>
                  </>
                )}

                <AnimatePresence mode="wait">
                  <motion.img
                    key={currentImageIndex}
                    src={selectedWindow.galleryImages ? selectedWindow.galleryImages[currentImageIndex] : selectedWindow.mainImage}
                    alt={selectedWindow.name}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    transition={{ duration: 0.3 }}
                    style={{ maxHeight: '80%', maxWidth: '80%', objectFit: 'contain' }}
                  />
                </AnimatePresence>
              </GallerySection>

              <SidePanel>
                <div style={{ marginBottom: '2rem' }}>
                  <ComingSoonBadge style={{ display: 'inline-block', marginBottom: '1rem' }}>
                    SERIES 1 / ASSET 001
                  </ComingSoonBadge>
                  <h2 style={{
                    fontFamily: 'var(--font-primary)',
                    fontSize: '2.5rem',
                    marginBottom: '1rem',
                    lineHeight: 1.1
                  }}>
                    {selectedWindow.name}
                  </h2>
                  <p style={{
                    color: 'rgba(255,255,255,0.6)',
                    lineHeight: 1.6,
                    fontSize: '0.95rem'
                  }}>
                    {selectedWindow.description || 'Premium 10-inch hand-painted resin figure. Includes a unique Certificate of Authenticity and digital identity vault access.'}
                  </p>
                </div>

                <div style={{ marginBottom: '2.5rem' }}>
                  <div style={{ fontSize: '0.8rem', opacity: 0.5, marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                    Current Value
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--vault-accent)' }}>
                    {selectedWindow.price || '$299.99'}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <ActionButton
                    $primary
                    style={{ padding: '1.2rem', fontSize: '0.9rem' }}
                    onClick={(e) => handleBuyClick(e, selectedWindow)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    ACQUIRE FRAGMENT
                  </ActionButton>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    fontSize: '0.75rem',
                    opacity: 0.5
                  }}>
                    <FaLock size={10} /> SECURE CHECKOUT VIA STRIPE
                  </div>
                </div>
              </SidePanel>
            </ExpandedContent>
          </ExpandedOverlay>
        )}
      </AnimatePresence>
    </ShopSection>
  );
}
