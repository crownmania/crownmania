import React, { useState } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { FaLock } from 'react-icons/fa';

import { useNavigate } from 'react-router-dom';
import { PRODUCTS } from '../data/productData';
import { startCheckout } from '../utils/checkout';

const ShopSection = styled.section`
  padding: 4rem 2rem 5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  overflow: hidden;
  
  /* Transparent to show halftone dot wave background */
  background: transparent;

  /* Vault Theme Variables for consistency */
  --vault-accent: #4169E1;
  --bg-vault: rgba(0, 5, 25, 0.5);
  --glass-blur: blur(10px);
  --glass-border: 1px solid rgba(255, 255, 255, 0.1);
  --vault-shadow: 0 8px 32px 0 rgba( 0, 0, 0, 0.37 );
`;

const MainTitle = styled.div`
  text-align: center;
  margin-bottom: 2.5rem;
  z-index: 2;

  h1 {
    font-size: clamp(2rem, 5vw, 2.75rem);
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
  display: flex;
  gap: 1.5rem;
  width: 100%;
  max-width: 1200px;
  z-index: 2;

  /* Horizontal scroll strip on narrower screens instead of stacking tall */
  @media (max-width: 900px) {
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
    padding: 0 1rem 1rem;
    scrollbar-width: thin;

    &::-webkit-scrollbar {
      height: 4px;
    }

    &::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.2);
      border-radius: 2px;
    }
  }
`;

const ShopCard = styled(motion.div)`
  flex: 1 1 0;
  min-width: 0;
  background: var(--bg-vault);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: var(--glass-border);
  border-radius: 20px;
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  cursor: pointer;
  position: relative;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  box-shadow: var(--vault-shadow);

  /* Subtle top border shine */
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
  }

  &:hover {
    transform: translateY(-6px);
    border-color: var(--vault-accent);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);

    img {
      transform: scale(1.05);
    }
  }

  @media (max-width: 900px) {
    flex: 0 0 320px;
    scroll-snap-align: center;
  }
`;

const ModelPreview = styled.div`
  flex: 0 0 auto;
  width: 110px;
  aspect-ratio: 1/1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.3);

  img {
    width: 90%;
    height: 90%;
    object-fit: contain;
    transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
    filter: drop-shadow(0 10px 20px rgba(0,0,0,0.5));
  }
`;

const CardBody = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.35rem;
`;

const ProductTitle = styled.h3`
  font-family: var(--font-secondary);
  font-size: 0.85rem;
  font-weight: 600;
  color: white;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  line-height: 1.3;
`;

const ProductPrice = styled.div`
  font-family: var(--font-secondary);
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--vault-accent);
  letter-spacing: 0.05em;
`;

const ActionBar = styled.div`
  width: 100%;
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
`;

const ActionButton = styled(motion.button)`
  flex: 1;
  background: ${props => props.$primary ? 'var(--vault-accent)' : 'rgba(255, 255, 255, 0.05)'};
  border: 1px solid ${props => props.$primary ? 'transparent' : 'rgba(255, 255, 255, 0.2)'};
  color: ${props => props.$primary ? '#000' : '#fff'};
  padding: 0.65rem 0.75rem;
  border-radius: 8px;
  font-family: var(--font-secondary);
  font-size: 0.7rem;
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

export default function Shop() {
  const navigate = useNavigate();
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const handleBuyClick = async (e, product) => {
    e.stopPropagation();
    if (product.comingSoon || !product.id) return;

    setIsCheckingOut(true);
    try {
      await startCheckout(product.id);
    } catch (error) {
      console.error('Checkout error:', error);
      alert(error.message || 'Checkout failed. Please try again.');
    } finally {
      setIsCheckingOut(false);
    }
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
            onClick={() => product.slug && navigate(`/shop/${product.slug}`)}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            <ModelPreview>
              {product.comingSoon ? (
                <FaLock size={20} style={{ opacity: 0.3 }} />
              ) : (
                <img src={product.mainImage} alt={product.name} />
              )}
            </ModelPreview>

            <CardBody>
              <ProductTitle>{product.name || 'Available Soon'}</ProductTitle>
              <ProductPrice>{product.comingSoon ? '—' : product.price || '$300.00'}</ProductPrice>

              <ActionBar>
                <ActionButton
                  $primary
                  disabled={product.comingSoon || isCheckingOut}
                  onClick={(e) => handleBuyClick(e, product)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {product.comingSoon ? 'LOCKED' : isCheckingOut ? 'PROCESSING...' : 'SHOP NOW'}
                </ActionButton>
              </ActionBar>
            </CardBody>
          </ShopCard>
        ))}
      </WindowsContainer>
    </ShopSection>
  );
}
