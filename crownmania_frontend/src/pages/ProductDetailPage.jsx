import React, { useState, useEffect } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaChevronLeft, FaChevronRight, FaLock } from 'react-icons/fa';

import { getProductBySlug } from '../data/productData';
import { startCheckout } from '../utils/checkout';

const PageWrapper = styled.div`
  min-height: 100vh;
  padding: 3rem 2rem 5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: transparent;

  --vault-accent: #4169E1;
  --bg-vault: rgba(0, 5, 25, 0.5);
  --glass-blur: blur(10px);
  --glass-border: 1px solid rgba(255, 255, 255, 0.1);

  @media (max-width: 768px) {
    padding: 2rem 1rem 4rem;
  }
`;

const Breadcrumb = styled.div`
  width: 100%;
  max-width: 1100px;
  margin-bottom: 1.5rem;
  font-family: var(--font-secondary);
  font-size: 0.75rem;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.4);

  a {
    color: rgba(255, 255, 255, 0.4);
    text-decoration: none;
    transition: color 0.3s ease;

    &:hover {
      color: var(--vault-accent);
    }
  }
`;

const Layout = styled.div`
  width: 100%;
  max-width: 1100px;
  background: var(--bg-vault);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: var(--glass-border);
  border-radius: 24px;
  overflow: hidden;
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  box-shadow: 0 0 50px rgba(0, 0, 0, 0.5);

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const GallerySection = styled.div`
  position: relative;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 520px;

  @media (max-width: 900px) {
    min-height: 360px;
  }
`;

const GalleryNav = styled.button`
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

const ThumbRow = styled.div`
  position: absolute;
  bottom: 1.25rem;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  z-index: 10;
`;

const Thumb = styled.button`
  width: 44px;
  height: 44px;
  padding: 0;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid ${props => props.$active ? 'var(--vault-accent)' : 'rgba(255, 255, 255, 0.15)'};
  opacity: ${props => props.$active ? 1 : 0.5};
  transition: all 0.3s ease;

  &:hover {
    opacity: 1;
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
`;

const SidePanel = styled.div`
  padding: 3rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  border-left: var(--glass-border);

  @media (max-width: 900px) {
    border-left: none;
    border-top: var(--glass-border);
    padding: 2rem;
  }
`;

const Badge = styled.div`
  display: inline-block;
  align-self: flex-start;
  font-family: var(--font-secondary);
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
  letter-spacing: 0.3em;
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  margin-bottom: 1rem;
`;

const Title = styled.h1`
  font-family: var(--font-primary);
  font-size: 2.5rem;
  line-height: 1.1;
  margin: 0 0 1rem;
  color: white;

  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const Description = styled.p`
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.6;
  font-size: 0.95rem;
  white-space: pre-line;
  margin: 0 0 2rem;
`;

const PriceLabel = styled.div`
  font-size: 0.8rem;
  opacity: 0.5;
  margin-bottom: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
`;

const Price = styled.div`
  font-size: 2rem;
  font-weight: 800;
  color: var(--vault-accent);
  margin-bottom: 2.5rem;
`;

const BuyButton = styled(motion.button)`
  width: 100%;
  background: var(--vault-accent);
  border: none;
  color: #000;
  padding: 1.2rem;
  border-radius: 8px;
  font-family: var(--font-secondary);
  font-size: 0.9rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  cursor: pointer;
  transition: background 0.3s ease;

  &:hover:not(:disabled) {
    background: #fff;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const SecureNote = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  opacity: 0.5;
  margin-top: 1rem;
`;

const ErrorNote = styled.div`
  color: #ff6b6b;
  font-size: 0.8rem;
  margin-top: 1rem;
  text-align: center;
`;

export default function ProductDetailPage() {
  const { slug } = useParams();
  const product = getProductBySlug(slug);

  const [imageIndex, setImageIndex] = useState(0);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!product) return;
    const previousTitle = document.title;
    document.title = `${product.name} — Crownmania`;
    return () => { document.title = previousTitle; };
  }, [product]);

  // Unknown slug: send them to the collection rather than a dead end, so ad
  // traffic from a mistyped or retired link still lands somewhere useful.
  if (!product) {
    return <Navigate to="/shop" replace />;
  }

  const images = product.galleryImages?.length ? product.galleryImages : [product.mainImage];

  const handleBuy = async () => {
    setError(null);
    setIsCheckingOut(true);
    try {
      await startCheckout(product.id);
    } catch (err) {
      console.error('Checkout error:', err);
      setError(err.message || 'Checkout failed. Please try again.');
      setIsCheckingOut(false);
    }
  };

  return (
    <PageWrapper>
      <Breadcrumb>
        <Link to="/">Crownmania</Link> / <Link to="/shop">The Shop</Link> / {product.name}
      </Breadcrumb>

      <Layout>
        <GallerySection>
          {images.length > 1 && (
            <>
              <GalleryNav
                className="left"
                aria-label="Previous image"
                onClick={() => setImageIndex(prev => (prev === 0 ? images.length - 1 : prev - 1))}
              >
                <FaChevronLeft />
              </GalleryNav>
              <GalleryNav
                className="right"
                aria-label="Next image"
                onClick={() => setImageIndex(prev => (prev === images.length - 1 ? 0 : prev + 1))}
              >
                <FaChevronRight />
              </GalleryNav>
            </>
          )}

          <AnimatePresence mode="wait">
            <motion.img
              key={imageIndex}
              src={images[imageIndex]}
              alt={product.name}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.3 }}
              style={{ maxHeight: '80%', maxWidth: '80%', objectFit: 'contain' }}
            />
          </AnimatePresence>

          {images.length > 1 && (
            <ThumbRow>
              {images.map((src, i) => (
                <Thumb
                  key={src}
                  $active={i === imageIndex}
                  aria-label={`View image ${i + 1}`}
                  onClick={() => setImageIndex(i)}
                >
                  <img src={src} alt="" loading="lazy" />
                </Thumb>
              ))}
            </ThumbRow>
          )}
        </GallerySection>

        <SidePanel>
          <Badge>SERIES 1 / ASSET 001</Badge>
          <Title>{product.name}</Title>
          <Description>{product.description}</Description>

          <PriceLabel>Current Value</PriceLabel>
          <Price>{product.price}</Price>

          <BuyButton
            onClick={handleBuy}
            disabled={isCheckingOut}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isCheckingOut ? 'Processing...' : 'Buy Now'}
          </BuyButton>
          <SecureNote>
            <FaLock size={10} /> SECURE CHECKOUT VIA STRIPE
          </SecureNote>
          {error && <ErrorNote>{error}</ErrorNote>}
        </SidePanel>
      </Layout>
    </PageWrapper>
  );
}
