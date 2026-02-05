import { useState, useEffect, Suspense, lazy, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import styled, { keyframes, css } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { FaLock, FaCheck, FaTimes, FaSpinner, FaWallet, FaSignOutAlt, FaCube, FaChevronLeft, FaChevronRight, FaKeyboard, FaQrcode, FaDiscord, FaGift, FaTag, FaInfoCircle, FaCopy, FaExternalLinkAlt, FaExchangeAlt, FaTwitter, FaInstagram, FaYoutube, FaTiktok } from 'react-icons/fa';

import useWeb3Auth from '../hooks/useWeb3Auth';
import { verificationAPI } from '../services/api';
import { DurkModel } from './3d/DurkModel';
import crownLogo from '../assets/crown_logo_white.svg';

// Firebase Storage image URLs
const DURK_PREVIEW_IMG = 'https://firebasestorage.googleapis.com/v0/b/sonorous-crane-440603-s6.firebasestorage.app/o/images%2Fdurktoy7.webp?alt=media';
const DURK_FACE_IMG = 'https://firebasestorage.googleapis.com/v0/b/sonorous-crane-440603-s6.firebasestorage.app/o/images%2Fdurktoy2.webp?alt=media';
const DURK_FRONT_IMG = 'https://firebasestorage.googleapis.com/v0/b/sonorous-crane-440603-s6.firebasestorage.app/o/images%2Fdurktoy1.webp?alt=media';
const DURK_BACK_IMG = 'https://firebasestorage.googleapis.com/v0/b/sonorous-crane-440603-s6.firebasestorage.app/o/images%2Fdurktoy3.webp?alt=media';
const DURK_BACKGROUND_IMG = 'https://firebasestorage.googleapis.com/v0/b/sonorous-crane-440603-s6.firebasestorage.app/o/images%2Fdurktoy4.webp?alt=media';

// Animations
const packAPunchGlow = keyframes`
  0%, 100% { 
    box-shadow: 0 0 20px rgba(0, 255, 136, 0.2), 0 0 40px rgba(0, 255, 136, 0.1);
    border-color: rgba(0, 255, 136, 0.3);
  }
  50% { 
    box-shadow: 0 0 30px rgba(0, 122, 255, 0.3), 0 0 60px rgba(0, 122, 255, 0.15);
    border-color: rgba(0, 122, 255, 0.5);
  }
`;

// Toast notification
const ToastContainer = styled(motion.div)`
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  background: var(--vault-accent);
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 50px;
  font-family: var(--font-secondary);
  font-weight: 500;
  font-size: 0.9rem;
  z-index: 1000;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

// Modal overlay
const ModalOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 1, 5, 0.85);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
  padding: 2rem;
`;

const ModalContent = styled(motion.div)`
  background: var(--bg-vault);
  backdrop-filter: var(--glass-blur);
  border: var(--glass-border);
  border-radius: 24px;
  padding: 2.5rem;
  max-width: 480px;
  width: 100%;
  box-shadow: var(--vault-shadow);
  
  h3 {
    font-family: var(--font-primary);
    color: white;
    font-size: 1.2rem;
    margin-bottom: 1.5rem;
    letter-spacing: 0.15em;
  }
`;

const ModalInput = styled.input`
  width: 100%;
  padding: 1rem 1.25rem;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  color: white;
  font-family: var(--font-secondary);
  font-size: 0.95rem;
  margin-bottom: 1rem;
  transition: all 0.2s ease;
  
  &:focus {
    outline: none;
    border-color: var(--vault-accent);
    background: rgba(0, 0, 0, 0.5);
  }
  
  &:read-only {
    cursor: default;
    opacity: 0.8;
  }
`;

const ModalButtonRow = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
`;

// ============================================
// STYLED COMPONENTS
// ============================================

const VaultSection = styled.section`
  min-height: 100vh;
  background: linear-gradient(
    to bottom,
    transparent 0%,
    rgba(0, 0, 0, 0.6) 2%,
    rgba(0, 0, 0, 0.6) 98%,
    transparent 100%
  );
  color: white;
  padding: 4rem 2rem;
  position: relative;
  overflow-x: hidden;
  
  /* Dynamic Theme Overrides */
  --vault-accent: ${props => props.$themeColor || '#00f2ff'};
  --vault-glow: ${props => props.$themeGlow || 'rgba(0, 242, 255, 0.4)'};
  --bg-vault: ${props => props.$themeBg || 'rgba(0, 5, 15, 0.5)'};
`;

const LogoWatermark = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 80%;
  max-width: 1000px;
  opacity: 0.02;
  pointer-events: none;
  z-index: 0;
  
  img {
    width: 100%;
    height: auto;
  }
`;

const MainTitle = styled.div`
  text-align: center;
  margin-bottom: 4rem;
  position: relative;
  z-index: 1;

  h1 {
    font-size: clamp(2.5rem, 6vw, 4rem);
    font-family: var(--font-primary);
    margin-bottom: 0.75rem;
    letter-spacing: 0.2em;
    color: white;
    text-shadow: 0 0 8px rgba(255, 255, 255, 0.25), 0 0 16px rgba(255, 255, 255, 0.15);
  }

  .subtitle {
    font-size: 0.85rem;
    color: var(--vault-accent);
    letter-spacing: 0.4em;
    font-family: var(--font-secondary);
    text-transform: uppercase;
    font-weight: 500;
    text-shadow: 0 0 6px rgba(255, 255, 255, 0.15);
  }
`;

const Panel = styled(motion.div)`
  background: var(--bg-vault);
  backdrop-filter: var(--glass-blur);
  border: var(--glass-border);
  border-radius: 20px;
  padding: 1.75rem;
  position: relative;
  box-shadow: var(--vault-shadow);
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
  }
`;

const TopPanelsRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  max-width: 1400px;
  margin: 0 auto 2rem;
  position: relative;
  z-index: 1;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const ControlDeckRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 2rem;
  max-width: 1440px;
  margin: 0 auto 2rem;
  position: relative;
  z-index: 1;
  align-items: flex-start;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const CharacterTitlePanel = styled(Panel)`
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 2rem;
  
  h2 {
    font-size: 3rem;
    line-height: 1;
    margin-bottom: 0.5rem;
    font-style: italic;
    color: white;
    font-weight: 700;
    white-space: nowrap;
    text-shadow: 0 0 8px rgba(255, 255, 255, 0.2), 0 0 16px rgba(255, 255, 255, 0.1);
  }
  
  h3 {
    font-size: 1rem;
    color: var(--vault-accent);
    margin-bottom: 1.5rem;
    opacity: 0.9;
    font-weight: 500;
    white-space: nowrap;
    text-shadow: 0 0 6px rgba(255, 255, 255, 0.1);
  }
  
  .status {
    font-family: var(--font-secondary);
    font-size: 0.8rem;
    color: rgba(255,255,255,0.4);
    display: flex;
    align-items: center;
    gap: 0.5rem;
    text-transform: uppercase;
    letter-spacing: 0.2em;
    font-weight: 700;
    margin-top: auto;
    
    &.active {
      color: var(--vault-success);
    }
  }
`;

const ArtistDetails = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem 1.5rem;
  margin-bottom: 1.5rem;
`;

const ArtistDetailItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  
  .label {
    font-family: var(--font-secondary);
    font-size: 0.65rem;
    color: rgba(255, 255, 255, 0.4);
    text-transform: uppercase;
    letter-spacing: 0.15em;
    font-weight: 600;
  }
  
  .value {
    font-family: var(--font-primary);
    font-size: 0.95rem;
    color: white;
  }
`;

const SocialMediaLinks = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

const SocialIcon = styled.a`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.6);
  font-size: 1.1rem;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  text-decoration: none;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: var(--vault-accent);
    color: var(--vault-accent);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(65, 105, 225, 0.3);
  }
  
  &.twitter:hover {
    border-color: #1DA1F2;
    color: #1DA1F2;
    box-shadow: 0 4px 12px rgba(29, 161, 242, 0.3);
  }
  
  &.instagram:hover {
    border-color: #E1306C;
    color: #E1306C;
    box-shadow: 0 4px 12px rgba(225, 48, 108, 0.3);
  }
  
  &.youtube:hover {
    border-color: #FF0000;
    color: #FF0000;
    box-shadow: 0 4px 12px rgba(255, 0, 0, 0.3);
  }
  
  &.tiktok:hover {
    border-color: #00F2EA;
    color: #00F2EA;
    box-shadow: 0 4px 12px rgba(0, 242, 234, 0.3);
  }
`;

const CharacterSelectSection = styled.div`
  width: 100%;
  height: 100%;
  position: relative;
  z-index: 1;
`;

const SelectGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  grid-template-rows: repeat(2, 1fr);
  gap: 0; /* No gap - boxes touch each other */
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.95);
  border-radius: 0;
  overflow: hidden;
  box-shadow: 0 0 40px rgba(0, 0, 0, 0.5);
  align-self: stretch;
  padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.05);
  
  @media (max-width: 768px) {
    grid-template-columns: repeat(4, 1fr);
  }

  @media (max-width: 500px) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

const SelectSlot = styled.div`
  background: rgba(5, 5, 25, 0.95);
  position: relative;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  aspect-ratio: 1.2;

  &:hover {
    background: rgba(10, 10, 35, 0.7);
    
    img {
      transform: scale(1.08);
    }
  }

  ${props => props.$active && css`
    background: rgba(15, 15, 40, 0.8);
    
    &::after {
      content: '';
      position: absolute;
      inset: 0;
      border: 2px solid ${props.$verified ? 'var(--vault-success)' : 'var(--vault-accent)'};
      box-shadow: inset 0 0 15px ${props.$verified ? 'rgba(52, 199, 89, 0.4)' : 'rgba(65, 105, 225, 0.3)'},
                  0 0 15px ${props.$verified ? 'rgba(52, 199, 89, 0.4)' : 'rgba(65, 105, 225, 0.3)'};
      pointer-events: none;
      z-index: 2;
    }
  `}

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: ${props => props.$verified ? 1 : 0.6};
    filter: ${props => props.$verified ? 'none saturate(1.1)' : 'grayscale(100%) contrast(1.2)'};
    transition: all 1.5s cubic-bezier(0.16, 1, 0.3, 1);
  }
`;

const UnknownAvatar = styled.div`
  font-family: var(--font-primary);
  font-size: 1.2rem;
  color: rgba(255, 255, 255, 0.1);
  user-select: none;
  opacity: 0.5;
`;

const VaultContent = styled.div`
  position: relative;
  transition: all 0.5s ease;
  /* Grayscale is applied to individual image components, not the whole vault */
  /* This keeps UI elements (buttons, borders, text) colorful */
`;

const IdentityPanel = styled(Panel)`
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 2rem 2.5rem;
  z-index: 1;
  height: 100%;
`;

const IdentityInfo = styled.div`
  display: flex;
  flex-direction: column;
`;

const IdentityName = styled.h2`
  font-family: var(--font-primary);
  font-size: 2.2rem;
  color: white;
  margin: 0;
  letter-spacing: 0.1em;
  line-height: 1.1;
`;

const IdentityTagline = styled.span`
  font-family: var(--font-secondary);
  font-size: 0.8rem;
  color: var(--vault-accent);
  text-transform: uppercase;
  letter-spacing: 0.3em;
  margin-top: 0.75rem;
  font-weight: 600;
`;

const MiddleRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1.2fr; 
  gap: 2rem;
  max-width: 1440px;
  margin: 0 auto 3rem;
  position: relative;
  z-index: 1;
  align-items: stretch;

  @media (max-width: 1200px) {
    grid-template-columns: 1fr 1.2fr;
    
    > div:nth-child(3) {
      grid-column: 1 / -1;
    }
  }

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const IDCard = styled(Panel)`
  padding: 0;
  height: 100%;
  border: var(--glass-border);
  transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1);

  ${props => props.$owned && css`
    border-color: rgba(52, 199, 89, 0.3);
    box-shadow: 0 0 40px rgba(52, 199, 89, 0.1);
  `}
`;

const IDImageContainer = styled.div`
  flex: 1;
  position: relative;
  display: flex;
  background: rgba(0,0,0,0.1);
  min-height: 600px;
`;

const IDImageHalf = styled.div`
  width: 50%;
  height: 100%;
  position: relative;
  border-right: 1px solid rgba(255,255,255,0.03);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  
  &:last-child {
    border-right: none;
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    padding: 0;
    filter: ${props => props.$verified ? 'none saturate(1.1)' : 'grayscale(100%) contrast(1.1) brightness(0.8)'};
    transition: filter 1.5s cubic-bezier(0.16, 1, 0.3, 1);
  }
`;

const CyclingImage = styled.img`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: ${props => props.$active ? 1 : 0};
  transition: opacity 0.8s ease-in-out;
  z-index: ${props => props.$active ? 1 : 0};
`;

const IDFooter = styled.div`
  background: #000;
  padding: 0.75rem 0.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  justify-content: center;
  align-items: center;
  
  .series-label {
    font-family: var(--font-primary);
    font-size: 0.8rem;
    color: white;
    letter-spacing: 0.2em;
    text-transform: uppercase;
  }
`;

// Sponsorship Banner Carousel
const scrollAnimation = keyframes`
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
`;

const SponsorBanner = styled.div`
  width: 100%;
  max-width: 1400px;
  margin: 2rem auto;
  padding: 1rem 0;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  overflow: hidden;
  position: relative;
`;

const SponsorTrack = styled.div`
  display: flex;
  align-items: center;
  gap: 4rem;
  animation: ${scrollAnimation} 30s linear infinite;
  width: fit-content;
  
  &:hover {
    animation-play-state: paused;
  }
`;

const SponsorItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: rgba(255, 255, 255, 0.5);
  font-family: var(--font-secondary);
  font-size: 0.85rem;
  font-weight: 600;
  white-space: nowrap;
  transition: all 0.3s ease;
  
  &:hover {
    color: white;
  }
  
  img {
    height: 24px;
    width: auto;
    opacity: 0.6;
    filter: grayscale(100%) brightness(1.5);
    transition: all 0.3s ease;
  }
  
  &:hover img {
    opacity: 1;
    filter: grayscale(0%) brightness(1);
  }
`;

const ComingSoonOverlay = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
  color: var(--vault-accent);
  font-family: var(--font-primary);
  font-size: 0.75rem;
  letter-spacing: 0.1em;
  padding: 1rem;
  opacity: 1;
  z-index: 5;
  text-align: center;
  transition: all 0.3s ease;
  pointer-events: none;
  
  .name {
    font-size: 0.9rem;
    margin-bottom: 0.4rem;
    color: white;
  }
  
  .status {
    font-size: 0.6rem;
    color: var(--vault-accent);
    letter-spacing: 0.3em;
    opacity: 0.8;
  }
`;

const DetailsPanel = styled(Panel)`
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
`;

const DetailHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-family: var(--font-primary);
  color: var(--vault-accent);
  font-size: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
`;

const DetailGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const DetailItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;

  label {
    font-family: var(--font-secondary);
    font-size: 0.7rem;
    color: rgba(255, 255, 255, 0.4);
    text-transform: uppercase;
    letter-spacing: 0.15em;
    font-weight: 600;
  }

  div {
    font-family: var(--font-primary);
    font-size: 1.3rem;
    color: white;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    
    &.highlight {
      color: var(--vault-success);
      text-shadow: 0 0 15px rgba(52, 199, 89, 0.2);
    }
    
    &.dim {
      color: rgba(255, 255, 255, 0.2);
    }
  }
`;

// Token Address Display Styles
const TokenAddressContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
`;

const TokenAddress = styled.span`
  font-family: var(--font-secondary);
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
  font-family: monospace;
  letter-spacing: 0.05em;
`;

const CopyButton = styled.button`
  background: transparent;
  border: none;
  color: var(--vault-accent);
  cursor: pointer;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  
  &:hover {
    color: white;
    transform: scale(1.1);
  }
`;

// Asset Details Card Styles
const AssetTitle = styled.h2`
  font-family: var(--font-primary);
  font-size: 1.4rem;
  color: white;
  margin: 0 0 0.25rem 0;
  letter-spacing: 0.1em;
  line-height: 1.2;
  white-space: nowrap;
  overflow: visible;
  text-shadow: 0 0 8px rgba(255, 255, 255, 0.2), 0 0 16px rgba(255, 255, 255, 0.1);
`;

const AssetSubtitle = styled.h3`
  font-family: var(--font-secondary);
  font-size: 0.85rem;
  color: var(--vault-accent);
  margin: 0 0 1.5rem 0;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  font-weight: 600;
  text-shadow: 0 0 6px rgba(255, 255, 255, 0.1);
`;

const OwnerBadge = styled.div`
  background: ${props => props.$owned ? 'rgba(52, 199, 89, 0.08)' : 'rgba(255, 59, 48, 0.08)'};
  border: 1px solid ${props => props.$owned ? 'var(--vault-success)' : 'var(--vault-error)'};
  color: ${props => props.$owned ? 'var(--vault-success)' : 'var(--vault-error)'};
  padding: 1rem;
  border-radius: 12px;
  text-align: center;
  font-family: var(--font-primary);
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  margin-top: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  transition: all 0.3s ease;
`;

const ModelViewerPanel = styled(Panel)`
  padding: 0;
  height: 100%;
  min-height: 480px;
  display: flex;
  flex-direction: column;
`;

const ModelHeader = styled.div`
  padding: 1.25rem 1.75rem;
  background: rgba(0,0,0,0.2);
  border-bottom: 1px solid rgba(255,255,255,0.05);
  display: flex;
  justify-content: space-between;
  align-items: center;

  h3 {
    font-family: var(--font-primary);
    color: white;
    margin: 0;
    font-size: 0.9rem;
    letter-spacing: 0.15em;
  }
`;

const ModelCanvas = styled.div`
  flex: 1;
  position: relative;
  background: radial-gradient(circle at center, rgba(0, 122, 255, 0.03), transparent 75%);
  transition: filter 0.5s ease;
  filter: ${props => props.$locked ? 'grayscale(100%) contrast(1.2)' : 'none'};
`;

const ExclusivePanel = styled(Panel)`
  max-width: 1400px;
  margin: 0 auto;
  padding: 3rem;
  background: var(--bg-vault);
  border: 1px solid var(--vault-border);
  border-radius: 24px;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  gap: 2rem;
  transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);
  
  ${props => props.$unlocked && css`
    border-color: rgba(52, 199, 89, 0.2);
    background: linear-gradient(180deg, rgba(8, 20, 15, 0.7) 0%, rgba(5, 12, 10, 0.8) 100%);
  `}
`;

const ExclusiveContent = styled.div`
  max-width: 800px;
  
  h2 {
    font-family: var(--font-primary);
    font-size: 2rem;
    margin-bottom: 1.25rem;
    color: ${props => props.$unlocked ? 'var(--vault-success)' : 'white'};
    letter-spacing: 0.15em;
  }
  
  p {
    font-family: var(--font-secondary);
    font-size: 1.05rem;
    line-height: 1.6;
    margin-bottom: 1rem;
    color: rgba(255, 255, 255, 0.5);
    font-weight: 400;
  }

  .highlight {
    color: var(--vault-accent);
    font-weight: 600;
  }
`;

const LockIconLarge = styled.div`
  font-size: 3rem;
  color: rgba(255, 255, 255, 0.05);
  margin-bottom: 0.5rem;
  transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);
  
  ${props => props.$unlocked && css`
    color: var(--vault-success);
    filter: drop-shadow(0 0 20px rgba(52, 199, 89, 0.3));
    transform: translateY(-5px);
  `}
`;

const PanelTitle = styled.h3`
  font-family: var(--font-primary);
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: var(--vault-accent);
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  justify-content: space-between;
  width: 100%;
`;

const WelcomePanel = styled(Panel)`
  padding: 2rem;
`;

const SerialInput = styled.input`
  width: 100%;
  padding: 1rem 1.25rem;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  color: white;
  margin-bottom: 1.25rem;
  font-family: var(--font-secondary);
  font-size: 1rem;
  transition: all 0.3s ease;
  
  &:focus { 
    outline: none; 
    border-color: var(--vault-accent);
    background: rgba(0, 0, 0, 0.6);
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.2);
  }
`;

const ActionButton = styled(motion.button)`
  padding: 1rem 1.5rem;
  border-radius: 12px;
  font-family: var(--font-primary);
  font-size: 0.85rem;
  width: 100%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  letter-spacing: 0.1em;
  
  ${props => props.$primary ? css`
    background: var(--vault-accent); 
    color: white;
    box-shadow: 0 4px 15px rgba(0, 122, 255, 0.2);
  ` : css`
    background: transparent; 
    border: 1px solid var(--vault-border); 
    color: white;
    
    &:hover {
      background: rgba(255, 255, 255, 0.05);
      border-color: rgba(255, 255, 255, 0.2);
    }
  `}
  
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    transform: none !important;
  }
`;

const StatusMessage = styled(motion.div)`
  margin-top: 1.25rem;
  font-family: var(--font-secondary);
  font-size: 0.9rem;
  font-weight: 500;
  color: ${props => props.$status === 'success' ? 'var(--vault-success)' : 'var(--vault-error)'};
  display: flex;
  align-items: center;
  gap: 0.6rem;
`;

const WelcomeText = styled.p`
  color: rgba(255,255,255,0.5);
  font-size: 0.95rem;
  margin-bottom: 2rem;
  font-family: var(--font-secondary);
  line-height: 1.6;
`;

// ============================================
// LOCAL STORAGE CONSTANTS
// ============================================
const VERIFIED_SERIALS_KEY = 'crownmania_verified_serials';
const VERIFICATION_EXPIRY_DAYS = 30;

// ============================================
// MAIN COMPONENT
// ============================================
export default function Vault() {
  const navigate = useNavigate();
  const { isInitialized, isWeb3Available, user, isLoading, login, logout, getAddress } = useWeb3Auth();
  const isVaultLocked = !isInitialized || !user;

  const [walletAddress, setWalletAddress] = useState('');
  const [userTokens, setUserTokens] = useState([]);
  const [serialNumber, setSerialNumber] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [currentEdition, setCurrentEdition] = useState(null);

  // Persistent verification state
  const [verifiedSerials, setVerifiedSerials] = useState([]);
  const [isPersistentlyVerified, setIsPersistentlyVerified] = useState(false);

  // UI State
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferAddress, setTransferAddress] = useState('');

  // Theme state - Royal Blue primary
  const [currentTheme, setCurrentTheme] = useState('blue');
  const themes = {
    blue: { color: '#4169E1', glow: 'rgba(65, 105, 225, 0.4)', bg: 'rgba(0, 5, 25, 0.5)' },
    green: { color: '#34C759', glow: 'rgba(52, 199, 89, 0.4)', bg: 'rgba(5, 15, 5, 0.5)' },
    pink: { color: '#FF2D55', glow: 'rgba(255, 45, 85, 0.4)', bg: 'rgba(15, 5, 10, 0.5)' }
  };

  // ============================================
  // LOCAL STORAGE OPERATIONS
  // ============================================

  // Load verified serials from localStorage on mount
  const loadVerifiedSerialsFromStorage = useCallback(() => {
    try {
      const stored = localStorage.getItem(VERIFIED_SERIALS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const now = Date.now();
          const expiryMs = VERIFICATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

          // Filter out expired entries
          const validSerials = parsed.filter(item => {
            if (!item.verifiedAt) return false;
            const age = now - new Date(item.verifiedAt).getTime();
            return age < expiryMs;
          });

          // Update storage if some entries were removed
          if (validSerials.length !== parsed.length) {
            localStorage.setItem(VERIFIED_SERIALS_KEY, JSON.stringify(validSerials));
          }

          setVerifiedSerials(validSerials);

          // Check if we have any valid verified serials for the current product
          const hasValidVerification = validSerials.some(item =>
            item.productId === 'lil-durk-figure' || !item.productId
          );

          if (hasValidVerification && validSerials.length > 0) {
            setIsPersistentlyVerified(true);
            // Restore verification result from the most recent valid serial
            const mostRecent = validSerials[validSerials.length - 1];
            setVerificationResult({
              status: 'success',
              message: 'Product verified from previous session',
              editionNumber: mostRecent.editionNumber,
              productId: mostRecent.productId || 'lil-durk-figure',
              tokenAddress: mostRecent.tokenAddress,
              claimDate: mostRecent.claimDate
            });
            if (mostRecent.editionNumber) {
              setCurrentEdition(mostRecent.editionNumber);
            }
          }

          return validSerials;
        }
      }
    } catch (err) {
      console.error('Error loading verified serials from localStorage:', err);
    }
    return [];
  }, []);

  // Save verified serial to localStorage
  const saveVerifiedSerialToStorage = useCallback((serialData) => {
    try {
      const stored = localStorage.getItem(VERIFIED_SERIALS_KEY);
      const existing = stored ? JSON.parse(stored) : [];

      // Check if this serial already exists
      const existingIndex = existing.findIndex(item => item.serialNumber === serialData.serialNumber);

      let updated;
      if (existingIndex >= 0) {
        // Update existing entry
        updated = [...existing];
        updated[existingIndex] = { ...existing[existingIndex], ...serialData, verifiedAt: new Date().toISOString() };
      } else {
        // Add new entry
        updated = [...existing, { ...serialData, verifiedAt: new Date().toISOString() }];
      }

      localStorage.setItem(VERIFIED_SERIALS_KEY, JSON.stringify(updated));
      setVerifiedSerials(updated);
    } catch (err) {
      console.error('Error saving verified serial to localStorage:', err);
    }
  }, []);

  // Clear all verified serials from localStorage
  const clearVerifiedSerialsFromStorage = useCallback(() => {
    try {
      localStorage.removeItem(VERIFIED_SERIALS_KEY);
      setVerifiedSerials([]);
      setIsPersistentlyVerified(false);
    } catch (err) {
      console.error('Error clearing verified serials from localStorage:', err);
    }
  }, []);

  // ============================================
  // EFFECTS
  // ============================================

  // Load verified serials from localStorage on mount
  useEffect(() => {
    loadVerifiedSerialsFromStorage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  // ID Card image cycling state
  const [frontImageIndex, setFrontImageIndex] = useState(0);
  const [detailImageIndex, setDetailImageIndex] = useState(0);

  // Front images: alternate between front and back views
  const frontImages = [DURK_FRONT_IMG, DURK_BACK_IMG];

  // Detail images: cycle through different up-close detail images
  const detailImages = [DURK_PREVIEW_IMG, DURK_FACE_IMG, DURK_FRONT_IMG, DURK_BACKGROUND_IMG];

  // Front image cycling - swap every 7 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setFrontImageIndex((prev) => (prev + 1) % frontImages.length);
    }, 7000);
    return () => clearInterval(interval);
  }, []);

  // Detail image cycling - change every 7 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setDetailImageIndex((prev) => (prev + 1) % detailImages.length);
    }, 7000);
    return () => clearInterval(interval);
  }, []);

  // Fetch wallet data when authenticated
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        if (isInitialized && user) {
          const address = await getAddress();
          if (address && isMounted) {
            setWalletAddress(address);
            try {
              const result = await verificationAPI.getWalletTokens(address);
              if (isMounted) {
                const tokens = result.tokens || [];
                setUserTokens(tokens);

                // Check if wallet has tokens and auto-unlock vault
                const durkToken = tokens.find(t => t.productId === 'lil-durk-figure');
                if (durkToken) {
                  setCurrentEdition(durkToken.edition || durkToken.editionNumber);

                  // Merge with localStorage - save token info as verified serial
                  const tokenVerification = {
                    serialNumber: `wallet_${address}_${durkToken.tokenAddress || durkToken.productId}`,
                    tokenAddress: durkToken.tokenAddress,
                    editionNumber: durkToken.edition || durkToken.editionNumber,
                    productId: durkToken.productId,
                    verifiedAt: new Date().toISOString(),
                    source: 'wallet'
                  };
                  saveVerifiedSerialToStorage(tokenVerification);
                  setIsPersistentlyVerified(true);
                }
              }
            } catch (err) {
              console.error('Error fetching tokens:', err);
              if (isMounted) setUserTokens([]);
            }
          }
        } else if (isMounted) {
          // Clear wallet-specific state when user disconnects
          // Note: We keep localStorage verification intact for recurring visitors
          setWalletAddress('');
          setUserTokens([]);
          setCurrentEdition(null);
          // Don't clear verificationResult here to allow persistent verification to remain
        }
      } catch (err) {
        console.error('Error in Vault data fetch:', err);
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [isInitialized, user, getAddress, saveVerifiedSerialToStorage]);

  // Check if user owns a character
  const isOwned = useCallback((characterId) => {
    if (!userTokens || userTokens.length === 0) return false;
    return userTokens.some(token => token.productId === characterId);
  }, [userTokens]);

  // Derived state - asset is verified if:
  // 1. First-time correct product code entry, OR
  // 2. Recurring visitor with verified serial in localStorage, OR  
  // 3. Wallet connection with owned tokens
  const isAssetVerified = verificationResult?.status === 'success' ||
    isPersistentlyVerified ||
    isOwned('lil-durk-figure');
  const displayEdition = verificationResult?.editionNumber || currentEdition;

  const handleConnect = async () => {
    await login();
  };

  const handleDisconnect = async () => {
    await logout();
    setWalletAddress('');
    setUserTokens([]);
    setCurrentEdition(null);
    setVerificationResult(null);
  };

  const handleVerify = async () => {
    if (!serialNumber.trim()) return;
    setIsVerifying(true);
    setVerificationResult(null);

    try {
      // Call verification API
      const result = await verificationAPI.verifySerial(serialNumber.trim());

      if (result.valid) {
        const editionNum = result.editionNumber || result.edition;
        const productId = result.productId || 'lil-durk-figure';

        setVerificationResult({
          status: 'success',
          message: 'Product verified successfully!',
          editionNumber: editionNum,
          productId: productId,
          tokenAddress: result.tokenAddress || result.contractAddress,
          claimDate: result.claimDate || new Date().toISOString()
        });

        // Save to localStorage for persistence
        saveVerifiedSerialToStorage({
          serialNumber: serialNumber.trim(),
          tokenAddress: result.tokenAddress || result.contractAddress,
          editionNumber: editionNum,
          productId: productId,
          claimDate: result.claimDate || new Date().toISOString(),
          source: 'manual_entry'
        });

        setIsPersistentlyVerified(true);

        // Show success toast
        showToastMessage('✓ Product Verified Successfully!');
      } else {
        setVerificationResult({
          status: 'error',
          message: result.message || 'Invalid product code'
        });
      }
    } catch (err) {
      setVerificationResult({
        status: 'error',
        message: err.message || 'Verification failed'
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // Format wallet/token address for display (first 6 + ... + last 4)
  const formatAddress = (address) => {
    if (!address || address.length < 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Format date for display
  const formatClaimDate = (dateString) => {
    if (!dateString) return '---';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }) + ' at ' + date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const handleCopyTokenAddress = () => {
    if (verificationResult?.tokenAddress) {
      navigator.clipboard.writeText(verificationResult.tokenAddress);
      showToastMessage('Token address copied to clipboard!');
    }
  };

  const showToastMessage = (message) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleCopyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      showToastMessage('Address copied to clipboard!');
      setShowAddressModal(false);
    }
  };

  const handleViewOnPolygon = () => {
    if (walletAddress) {
      window.open(`https://polygonscan.com/address/${walletAddress}`, '_blank');
    }
  };

  const handleTransfer = () => {
    // Transfer not implemented yet - show coming soon
    showToastMessage('Transfer feature coming soon!');
    setShowTransferModal(false);
  };

  const isDurkOwned = isOwned('lil-durk-figure');

  return (
    <VaultSection
      id="vault"
      $themeColor={themes[currentTheme].color}
      $themeGlow={themes[currentTheme].glow}
      $themeBg={themes[currentTheme].bg}
    >
      <LogoWatermark>
        <img src={crownLogo} alt="" aria-hidden="true" />
      </LogoWatermark>

      <MainTitle>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          THE VAULT
        </motion.h1>
        <motion.div
          className="subtitle"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          viewport={{ once: true }}
        >
          Secure Phygital Asset Repository
        </motion.div>
      </MainTitle>

      <VaultContent $verified={isAssetVerified} $locked={isVaultLocked}>
        {/* Reordering and removing ternary logic */}
        <TopPanelsRow>
          {/* 1. Verify Panel (Left) */}
          <Panel
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <PanelTitle style={{ fontSize: '1.2rem', color: 'white', justifyContent: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <FaLock size={20} /> VERIFY & AUTHENTICATE
              </div>
              <ActionButton
                style={{ width: 'auto', padding: '0.4rem 0.8rem', fontSize: '0.7rem' }}
                onClick={() => showToastMessage('Camera access required on mobile device')}
              >
                <FaQrcode /> SCAN QR CODE
              </ActionButton>
            </PanelTitle>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                <SerialInput
                  type="text"
                  placeholder="Enter Product Code"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                />
                <ActionButton
                  $primary
                  onClick={handleVerify}
                  disabled={isVerifying || !serialNumber}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isVerifying ? <FaSpinner className="spin" /> : <FaCheck />}
                  VERIFY CODE
                </ActionButton>
              </div>
              {verificationResult && (
                <StatusMessage
                  $status={verificationResult.status}
                  style={{ marginTop: 0, flex: 1, padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}
                >
                  {verificationResult.status === 'success' ? <FaCheck /> : <FaTimes />}
                  {verificationResult.message}
                </StatusMessage>
              )}
            </div>
            {verificationResult?.status === 'success' && verificationResult?.tokenAddress && (
              <TokenAddressContainer>
                <TokenAddress>{formatAddress(verificationResult.tokenAddress)}</TokenAddress>
                <CopyButton onClick={handleCopyTokenAddress} title="Copy token address">
                  <FaCopy size={14} />
                </CopyButton>
              </TokenAddressContainer>
            )}
          </Panel>

          {/* 2. Connection Panel (Right) */}
          <IdentityPanel
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            <PanelTitle style={{ fontSize: '1.2rem', color: 'white', justifyContent: 'flex-start' }}>
              <FaWallet size={20} /> VAULT CONNECTION
            </PanelTitle>
            <IdentityInfo>
              <div style={{ width: '100%', textAlign: 'center', marginBottom: '1.5rem' }}>
                {!isVaultLocked ? (
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>Connected: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</p>
                ) : (
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>Connect wallet to view your owned assets.</p>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                {isVaultLocked ? (
                  <ActionButton
                    $primary
                    onClick={handleConnect}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    style={{ maxWidth: '300px' }}
                  >
                    <FaWallet /> CONNECT
                  </ActionButton>
                ) : (
                  <>
                    <ActionButton
                      onClick={() => setShowAddressModal(true)}
                      style={{ padding: '0.5rem 1rem', width: 'auto', fontSize: '0.75rem' }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <FaInfoCircle /> VIEW ARCHIVE
                    </ActionButton>
                    <ActionButton
                      onClick={handleDisconnect}
                      style={{ padding: '0.5rem 1rem', width: 'auto', fontSize: '0.75rem', borderColor: 'var(--vault-error)', color: 'var(--vault-error)' }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <FaSignOutAlt /> SEAL
                    </ActionButton>
                  </>
                )}
              </div>
            </IdentityInfo>
          </IdentityPanel>
        </TopPanelsRow>

        <ControlDeckRow>
          {/* Row 2 Left: Character Title */}
          <CharacterTitlePanel
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <h2>LIL DURK</h2>
            <h3>American Chicago Rapper</h3>
            <ArtistDetails>
              <ArtistDetailItem>
                <span className="label">Origin</span>
                <span className="value">Chicago</span>
              </ArtistDetailItem>
              <ArtistDetailItem>
                <span className="label">Birthday</span>
                <span className="value">Oct 19, 1992</span>
              </ArtistDetailItem>
              <ArtistDetailItem>
                <span className="label">Height</span>
                <span className="value">5'7"</span>
              </ArtistDetailItem>
              <ArtistDetailItem>
                <span className="label">Weight</span>
                <span className="value">159 lbs</span>
              </ArtistDetailItem>
            </ArtistDetails>
            <SocialMediaLinks>
              <SocialIcon
                href="https://twitter.com/lildurk"
                target="_blank"
                rel="noopener noreferrer"
                className="twitter"
                title="Follow on Twitter"
              >
                <FaTwitter />
              </SocialIcon>
              <SocialIcon
                href="https://instagram.com/lildurk"
                target="_blank"
                rel="noopener noreferrer"
                className="instagram"
                title="Follow on Instagram"
              >
                <FaInstagram />
              </SocialIcon>
              <SocialIcon
                href="https://youtube.com/@lildurk"
                target="_blank"
                rel="noopener noreferrer"
                className="youtube"
                title="Subscribe on YouTube"
              >
                <FaYoutube />
              </SocialIcon>
              <SocialIcon
                href="https://tiktok.com/@lildurk"
                target="_blank"
                rel="noopener noreferrer"
                className="tiktok"
                title="Follow on TikTok"
              >
                <FaTiktok />
              </SocialIcon>
            </SocialMediaLinks>
            <div className={`status ${isAssetVerified ? 'active' : ''}`}>
              {isAssetVerified ? <FaCheck /> : <FaLock />}
              {isAssetVerified ? 'ASSET VERIFIED' : 'ASSET LOCKED'}
            </div>
          </CharacterTitlePanel>

          {/* Row 2 Right: Grid */}
          <CharacterSelectSection>
            <SelectGrid $verified={isAssetVerified}>
              <SelectSlot
                $active={true}
                $owned={isDurkOwned}
                $verified={isAssetVerified}
                $locked={isVaultLocked}
              >
                <img src={DURK_FACE_IMG} alt="Lil Durk" />
              </SelectSlot>
              <SelectSlot
                key={1}
                $active={false}
                $owned={false}
                $locked={true}
                onMouseEnter={() => setCurrentTheme('green')}
                onMouseLeave={() => setCurrentTheme('blue')}
              >
                <ComingSoonOverlay>
                  <div className="status">COMING SOON</div>
                </ComingSoonOverlay>
              </SelectSlot>
              <SelectSlot
                key={2}
                $active={false}
                $owned={false}
                $locked={true}
                onMouseEnter={() => setCurrentTheme('pink')}
                onMouseLeave={() => setCurrentTheme('blue')}
              >
                <ComingSoonOverlay>
                  <div className="status">COMING SOON</div>
                </ComingSoonOverlay>
              </SelectSlot>
              {[...Array(9)].map((_, i) => (
                <SelectSlot
                  key={i + 3}
                  $active={false}
                  $owned={false}
                  $locked={true}
                  style={{ cursor: 'default' }}
                >
                  <UnknownAvatar>?</UnknownAvatar>
                </SelectSlot>
              ))}
            </SelectGrid>
          </CharacterSelectSection>
        </ControlDeckRow>

        <MiddleRow>
          {/* ROW 3: ID, Details, 3D Viewer */}
          <IDCard
            $owned={isDurkOwned}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <IDImageContainer>
              {/* 5. Fix ID Card to show Back/Front side-by-side */}
              <IDImageHalf $label="BACK VIEW" $verified={isAssetVerified} $owned={isDurkOwned} $locked={isVaultLocked}>
                <img
                  src={DURK_PREVIEW_IMG}
                  alt="Back View"
                  style={{ height: '100%', objectFit: 'contain', width: '100%' }}
                />
              </IDImageHalf>
              <IDImageHalf $label="FRONT VIEW" $verified={isAssetVerified} $owned={isDurkOwned} $locked={isVaultLocked}>
                <img
                  src={DURK_FRONT_IMG}
                  alt="Front View"
                  style={{ height: '100%', objectFit: 'contain', width: '100%' }}
                />
              </IDImageHalf>
            </IDImageContainer>
            <IDFooter>
              <div className="series-label">LIL DURK SERIES 01</div>
            </IDFooter>
          </IDCard>

          <DetailsPanel
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <AssetTitle>Digital Collectible</AssetTitle>
              <img src={crownLogo} alt="Crownmania" style={{ height: '28px', width: 'auto', opacity: 0.9 }} />
            </div>
            <AssetSubtitle style={{ fontFamily: 'var(--font-primary)', fontWeight: 400, textAlign: 'center' }}>Collectible details</AssetSubtitle>
            <DetailGrid>
              <DetailItem>
                <label>Collection Name</label>
                <div style={{ fontSize: '1.5rem' }}>LIL DURK: Free The Voice</div>
              </DetailItem>
              <DetailItem>
                <label>Token Address</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className={verificationResult?.tokenAddress ? '' : 'dim'} style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>
                    {verificationResult?.tokenAddress ? formatAddress(verificationResult.tokenAddress) : '0x...'}
                  </span>
                  {verificationResult?.tokenAddress && (
                    <CopyButton onClick={handleCopyTokenAddress} title="Copy token address" style={{ padding: '0.1rem' }}>
                      <FaCopy size={12} />
                    </CopyButton>
                  )}
                </div>
              </DetailItem>
              <DetailItem>
                <label>Edition</label>
                <div className={displayEdition ? 'highlight' : 'dim'}>
                  {displayEdition ? `#${displayEdition} / 500` : '---'}
                </div>
              </DetailItem>
              <DetailItem>
                <label>Date Claimed</label>
                <div className={verificationResult?.claimDate ? 'highlight' : 'dim'}>
                  {verificationResult?.claimDate ? formatClaimDate(verificationResult.claimDate) : '---'}
                </div>
              </DetailItem>
              <DetailItem>
                <label>Verified On</label>
                <div className={(verificationResult?.verifiedAt || verifiedSerials.find(s => s.productId === 'lil-durk-figure')?.verifiedAt) ? 'highlight' : 'dim'}>
                  {(() => {
                    const verifiedAt = verificationResult?.verifiedAt || verifiedSerials.find(s => s.productId === 'lil-durk-figure')?.verifiedAt;
                    return verifiedAt ? formatClaimDate(verifiedAt) : 'Not Verified';
                  })()}
                </div>
              </DetailItem>
            </DetailGrid>
            <div style={{ marginTop: 'auto' }}>
              <label style={{
                fontFamily: 'var(--font-secondary)',
                fontSize: '0.7rem',
                color: 'rgba(255, 255, 255, 0.4)',
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                fontWeight: 600,
                marginBottom: '0.5rem',
                display: 'block'
              }}>Status</label>
              <OwnerBadge $owned={isAssetVerified}>
                {isAssetVerified ? <FaCheck /> : <FaLock />}
                {isAssetVerified ? 'VERIFIED' : 'UNVERIFIED'}
              </OwnerBadge>
            </div>
          </DetailsPanel>

          <ModelViewerPanel>
            <ModelHeader>
              <h3>
                <FaCube size={14} /> 3D VIEWER
              </h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <ActionButton
                  style={{ padding: '0.4rem 0.8rem', width: 'auto', fontSize: '0.7rem' }}
                  onClick={() => showToastMessage('Controls: Rotation (Drag), Zoom (Scroll)')}
                >
                  <FaKeyboard />
                </ActionButton>
              </div>
            </ModelHeader>
            <ModelCanvas $locked={!isAssetVerified}>
              <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 0.5, 8], fov: 50 }}>
                <ambientLight intensity={0.7} />
                <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1.2} castShadow />
                <pointLight position={[-10, -10, -10]} intensity={0.5} />
                <pointLight position={[0, 5, 5]} intensity={0.3} />

                <Suspense fallback={null}>
                  <group position={[0, -1.8, 0]}>
                    <DurkModel isUnlocked={isAssetVerified} />
                  </group>
                  <Environment preset="city" />
                </Suspense>

                <OrbitControls
                  autoRotate={true}
                  autoRotateSpeed={15.0}
                  enableZoom={true}
                  enablePan={false}
                  minDistance={4}
                  maxDistance={15}
                  minPolarAngle={Math.PI / 6}
                  maxPolarAngle={Math.PI / 1.8}
                />
              </Canvas>
            </ModelCanvas>
          </ModelViewerPanel>
        </MiddleRow>

        <ExclusivePanel
          $unlocked={isAssetVerified}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ flexDirection: 'column', gap: '1.5rem', justifyContent: 'flex-start', paddingTop: '2rem' }}
        >
          <h3 style={{ fontFamily: 'var(--font-primary)', fontSize: '1.2rem', color: 'white', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
            EXCLUSIVE ACCESS & UNLOCKABLES
          </h3>
          <p style={{ fontFamily: 'var(--font-secondary)', fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)', maxWidth: '600px', margin: '0 0 1.5rem 0' }}>
            Verified digital collectible owners will gain access to Exclusive Utilities and Unlockables. Includes early access to content, exclusive merchandise, concert tickets, and future airdrops.
          </p>

          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', justifyContent: 'center', width: '100%', maxWidth: '800px' }}>
            <ActionButton
              style={{ justifyContent: 'space-between', flex: 1, minWidth: '200px' }}
              onClick={() => setShowTransferModal(true)}
              disabled={!isDurkOwned}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <FaExchangeAlt /> LEGACY TRANSFER
              </span>
              {!isDurkOwned && <FaLock size={12} />}
            </ActionButton>
            <ActionButton
              style={{ justifyContent: 'space-between', flex: 1, minWidth: '200px' }}
              onClick={() => window.open('https://discord.gg/crownmania', '_blank')}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <FaDiscord /> COLLECTOR ACCESS
              </span>
              <FaCheck size={12} color="var(--vault-success)" />
            </ActionButton>
            <ActionButton
              style={{ justifyContent: 'space-between', flex: 1, minWidth: '200px' }}
              disabled={!isDurkOwned}
              onClick={() => showToastMessage('Airdrops coming soon!')}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <FaGift /> VAULT REWARDS
              </span>
              {!isDurkOwned && <FaLock size={12} />}
            </ActionButton>
          </div>
        </ExclusivePanel>
      </VaultContent>

      {/* Address / Vault Info Modal */}
      <AnimatePresence>
        {showAddressModal && (
          <ModalOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAddressModal(false)}
          >
            <ModalContent
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <h3>VAULT IDENTITY</h3>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', marginBottom: '1.5rem', fontFamily: 'var(--font-secondary)' }}>
                Your unique identity archive address on the secure ledger.
              </p>
              <ModalInput
                readOnly
                value={walletAddress}
              />
              <div style={{ display: 'flex', gap: '1rem' }}>
                <ActionButton $primary onClick={handleCopyAddress} style={{ flex: 1 }}>
                  <FaCopy /> COPY ADDRESS
                </ActionButton>
                <ActionButton onClick={handleViewOnPolygon} style={{ flex: 1 }}>
                  <FaExternalLinkAlt /> EXPLORE
                </ActionButton>
              </div>
            </ModalContent>
          </ModalOverlay>
        )}
      </AnimatePresence>

      {/* Transfer Modal */}
      <AnimatePresence>
        {showTransferModal && (
          <ModalOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowTransferModal(false)}
          >
            <ModalContent
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <h3>TRANSFER FRAGMENT</h3>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', marginBottom: '1.5rem', fontFamily: 'var(--font-secondary)' }}>
                Enter the destination vault address to transfer ownership.
              </p>
              <ModalInput
                placeholder="0x..."
                value={transferAddress}
                onChange={(e) => setTransferAddress(e.target.value)}
              />
              <ModalButtonRow>
                <ActionButton $primary onClick={handleTransfer} style={{ flex: 1 }}>
                  INITIATE TRANSFER
                </ActionButton>
                <ActionButton onClick={() => setShowTransferModal(false)} style={{ flex: 1 }}>
                  CANCEL
                </ActionButton>
              </ModalButtonRow>
            </ModalContent>
          </ModalOverlay>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showToast && (
          <ToastContainer
            initial={{ y: 50, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 50, opacity: 0, scale: 0.9 }}
          >
            {toastMessage}
          </ToastContainer>
        )}
      </AnimatePresence>
    </VaultSection >
  );
}
