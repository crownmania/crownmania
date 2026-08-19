import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { DurkModel } from './3d/DurkModel';
import { stripePromise } from '../config/paymentConfig';
import { getStorageURL } from '../utils/storageUtils';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

const PageContainer = styled.div`
  min-height: 100vh;
  background: black;
  color: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4rem 2rem;

  @media (max-width: 768px) {
    padding: 2rem 1rem;
  }
`;

const ProductContainer = styled.div`
  max-width: 1200px;
  width: 100%;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
  margin-top: 2rem;
  
  @media (max-width: 968px) {
    grid-template-columns: 1fr;
    gap: 2rem;
  }
`;

const ModelViewer = styled.div`
  height: 600px;
  background: radial-gradient(circle at center, rgba(200, 0, 0, 0.1) 0%, transparent 70%);
  border-radius: 20px;
  overflow: hidden;
  position: relative;
  border: 1px solid rgba(255, 255, 255, 0.05);

  @media (max-width: 768px) {
    height: 400px;
  }
`;

const ProductInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const ProductTitle = styled.h1`
  font-family: 'Designer', sans-serif;
  font-size: 2.5rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin: 0;
`;

const ProductPrice = styled.div`
  font-family: 'Designer', sans-serif;
  font-size: 2.22rem;
  color: var(--vault-accent);
  letter-spacing: 0.1em;

  @media (max-width: 768px) {
    font-size: 1.8rem;
  }
`;

const ProductDescription = styled.p`
  font-family: 'Avenir Next', sans-serif;
  font-size: 1rem;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.8);
`;

const Button = styled(motion.button)`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  padding: 1.2rem 2.5rem;
  font-family: 'Designer', sans-serif;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  cursor: pointer;
  border-radius: 8px;
  width: 100%;
  transition: all 0.4s cubic-bezier(0.165, 0.84, 0.44, 1);

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.3);
  }

  &.checkout {
    background: var(--vault-accent);
    border: none;
    box-shadow: 0 4px 15px rgba(200, 0, 0, 0.3);

    &:hover {
      background: #D00000;
      box-shadow: 0 6px 20px rgba(200, 0, 0, 0.5);
    }
    
    &:disabled {
      background: rgba(255, 255, 255, 0.1);
      cursor: not-allowed;
    }
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
`;

const ProductImages = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: auto auto;
  gap: 1rem;
  margin-top: 2rem;

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }

  img {
    width: 100%;
    height: 120px;
    object-fit: contain;
    object-position: center top;
    border-radius: 12px;
    cursor: pointer;
    border: 1px solid rgba(255, 255, 255, 0.05);
    transition: all 0.3s ease;
    background: rgba(0, 0, 0, 0.2);

    &:hover {
      transform: translateY(-5px);
      border-color: var(--vault-accent);
    }

    /* Fifth image spans 2 columns in the second row */
    &:nth-child(5) {
      grid-column: span 2;
      grid-row: 2;
    }
  }
`;

export default function ProductPage() {
  const [loading, setLoading] = useState(false);
  const [productImages, setProductImages] = useState([]);

  useEffect(() => {
    const loadImages = async () => {
      try {
        const urls = [];
        for (let i = 1; i <= 4; i++) {
          try {
            const url = await getStorageURL(`images/product${i}.webp`);
            if (url) urls.push(url);
          } catch (error) {
            console.error(`Error loading product image ${i}:`, error);
          }
        }
        setProductImages(urls);
      } catch (error) {
        console.error('Error loading product images:', error);
      }
    };
    loadImages();
  }, []);

  const handleAddToCart = () => {
    // Add to cart logic here
  };

  const handleCheckout = async () => {
    if (!stripePromise) {
      alert('Stripe is not configured. Payment features are disabled.');
      return;
    }

    setLoading(true);
    try {
      const stripe = await stripePromise;
      if (!stripe) throw new Error('Stripe not configured');

      const response = await fetch(`${API_BASE_URL}/api/stripe/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: [{ productId: 'lil-durk-figure', quantity: 1 }],
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Checkout session failed');
      }

      const session = await response.json();
      const result = await stripe.redirectToCheckout({
        sessionId: session.id,
      });

      if (result.error) {
        throw result.error;
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert(error.message || 'Checkout failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer>
      <ProductContainer>
        <div>
          <ModelViewer>
            <Canvas camera={{ position: [0, 0, 15], fov: 25 }}>
              <ambientLight intensity={0.5} />
              <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
              <pointLight position={[-10, -10, -10]} />
              <DurkModel />
              <Environment preset="city" />
              <OrbitControls enableZoom={false} />
            </Canvas>
          </ModelViewer>
          <ProductImages>
            {productImages.map((url, index) => (
              <img
                key={index}
                src={url}
                alt={`Product view ${index + 1}`}
                loading="lazy"
              />
            ))}
          </ProductImages>
        </div>
        <ProductInfo>
          <ProductTitle>Limited Edition: Lil Durk Collectible Figure</ProductTitle>
          <ProductPrice>$150.00</ProductPrice>
          <ProductDescription>
            Exclusive, limited-edition collectible figure featuring Lil Durk. Each piece is meticulously crafted with attention to detail, capturing the essence of the artist. This collector's item comes with a certificate of authenticity and is part of a limited production run.
          </ProductDescription>
          <ButtonGroup>
            <Button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleAddToCart}
            >
              Add to Cart
            </Button>
            <Button
              className="checkout"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCheckout}
              disabled={loading}
            >
              {loading ? 'Processing...' : 'Checkout'}
            </Button>
          </ButtonGroup>
        </ProductInfo>
      </ProductContainer>
    </PageContainer>
  );
}
