import { useState, useEffect, Suspense, lazy, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import styled, { keyframes, css } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { FaLock, FaCheck, FaTimes, FaSpinner, FaWallet, FaSignOutAlt, FaCube, FaChevronLeft, FaChevronRight, FaKeyboard, FaQrcode, FaDiscord, FaGift, FaTag, FaInfoCircle, FaCopy, FaExternalLinkAlt, FaExchangeAlt, FaTwitter, FaInstagram, FaYoutube, FaTiktok, FaShieldAlt, FaArrowRight, FaExclamationTriangle, FaImages, FaBell, FaGem, FaVolumeUp, FaVolumeMute } from 'react-icons/fa';

import { playVerificationSuccess, playError, playUnlock, playClick, playRarityReveal, setSoundEnabled as setGlobalSound } from '../utils/soundEffects';
import { isPushSupported, getPermissionStatus, requestPushPermission, onForegroundMessage } from '../utils/pushNotifications';

import useWeb3Auth from '../hooks/useWeb3Auth';
import { verificationAPI, transferAPI } from '../services/api';
import crownLogo from '../assets/crown_logo_white.svg';
import blueprintBg from '../assets/crownmania_blueprint.svg';
import QRScanner from './QRScanner';

// Lazy load the 3D model for better performance
const DurkModel = lazy(() => import('./3d/DurkModel').then(module => ({ default: module.DurkModel })));

// Firebase Storage image URLs
const DURK_PREVIEW_IMG = 'https://firebasestorage.googleapis.com/v0/b/sonorous-crane-440603-s6.firebasestorage.app/o/images%2Fdurktoy7.webp?alt=media';
const DURK_FACE_IMG = 'https://firebasestorage.googleapis.com/v0/b/sonorous-crane-440603-s6.firebasestorage.app/o/images%2Fdurktoy2.webp?alt=media';
const DURK_FRONT_IMG = 'https://firebasestorage.googleapis.com/v0/b/sonorous-crane-440603-s6.firebasestorage.app/o/images%2Fdurktoy1.webp?alt=media';
const DURK_BACK_IMG = 'https://firebasestorage.googleapis.com/v0/b/sonorous-crane-440603-s6.firebasestorage.app/o/images%2Fdurktoy3.webp?alt=media';
const DURK_BACKGROUND_IMG = 'https://firebasestorage.googleapis.com/v0/b/sonorous-crane-440603-s6.firebasestorage.app/o/images%2Fdurktoy4.webp?alt=media';

// Product display mapping (expand as new characters launch)
const PRODUCT_NAMES = {
  'lil-durk-figure': { name: 'LIL DURK', subtitle: 'FREE THE VOICE' },
  'default': { name: 'CROWNMANIA', subtitle: 'DIGITAL COLLECTIBLE' }
};

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

const electricFlow = keyframes`
  0% { stroke-dashoffset: 1000; }
  100% { stroke-dashoffset: 0; }
`;

const diamondSweep = keyframes`
  0% { transform: translate(-50%, -50%) rotate(0deg) scale(0.5); opacity: 0; }
  50% { opacity: 0.8; }
  100% { transform: translate(-50%, -50%) rotate(180deg) scale(1.5); opacity: 0; }
`;

const rgbGlitch = keyframes`
  0% { transform: translate(0); text-shadow: -2px 0 #ff00c1, 2px 0 #00fff9; }
  25% { transform: translate(-2px, 2px); text-shadow: -2px -2px #ff00c1, 2px 2px #00fff9; }
  50% { transform: translate(2px, -2px); text-shadow: 2px 2px #ff00c1, -2px -2px #00fff9; }
  75% { transform: translate(-2px, -2px); text-shadow: -2px 2px #ff00c1, 2px -2px #00fff9; }
  100% { transform: translate(0); text-shadow: -2px 0 #ff00c1, 2px 0 #00fff9; }
`;

const glitchShake = keyframes`
  0% { transform: translate(0, 0); }
  20% { transform: translate(-2px, 2px); }
  40% { transform: translate(2px, -2px); }
  60% { transform: translate(-2px, -2px); }
  80% { transform: translate(2px, 2px); }
  100% { transform: translate(0, 0); }
`;

const glitchSettle = keyframes`
  0% { filter: blur(2px); opacity: 0.8; }
  100% { filter: blur(0); opacity: 1; text-shadow: 0 0 10px rgba(255, 255, 255, 0.5); }
`;

// Scanning beam animation
const scanBeam = keyframes`
  0% { top: 0; opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { top: 100%; opacity: 0; }
`;

const pulseGlow = keyframes`
  0%, 100% { box-shadow: 0 0 20px rgba(65, 105, 225, 0.3); }
  50% { box-shadow: 0 0 40px rgba(65, 105, 225, 0.6), 0 0 80px rgba(65, 105, 225, 0.2); }
`;

const rotateRing = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

// Rarity reveal animations
const diamondSparkle = keyframes`
  0% { text-shadow: 0 0 4px rgba(185, 242, 255, 0.2); transform: scale(0.8); opacity: 0; }
  30% { transform: scale(1.15); opacity: 1; }
  50% { text-shadow: 0 0 20px rgba(185, 242, 255, 0.8), 0 0 40px rgba(185, 242, 255, 0.4), 0 0 60px rgba(185, 242, 255, 0.2); }
  100% { text-shadow: 0 0 12px rgba(185, 242, 255, 0.4), 0 0 30px rgba(185, 242, 255, 0.15); transform: scale(1); opacity: 1; }
`;

const platinumShine = keyframes`
  0% { text-shadow: 0 0 4px rgba(229, 228, 226, 0.2); transform: scale(0.8); opacity: 0; }
  30% { transform: scale(1.1); opacity: 1; }
  50% { text-shadow: 0 0 18px rgba(229, 228, 226, 0.6), 0 0 35px rgba(229, 228, 226, 0.3); }
  100% { text-shadow: 0 0 12px rgba(229, 228, 226, 0.3); transform: scale(1); opacity: 1; }
`;

const goldGlow = keyframes`
  0% { text-shadow: 0 0 4px rgba(255, 215, 0, 0.2); transform: scale(0.8); opacity: 0; }
  30% { transform: scale(1.08); opacity: 1; }
  50% { text-shadow: 0 0 16px rgba(255, 215, 0, 0.6), 0 0 30px rgba(255, 215, 0, 0.3); }
  100% { text-shadow: 0 0 12px rgba(255, 215, 0, 0.3); transform: scale(1); opacity: 1; }
`;

const silverGleam = keyframes`
  0% { text-shadow: 0 0 4px rgba(192, 192, 192, 0.2); transform: scale(0.8); opacity: 0; }
  30% { transform: scale(1.05); opacity: 1; }
  50% { text-shadow: 0 0 12px rgba(192, 192, 192, 0.5); }
  100% { text-shadow: 0 0 8px rgba(192, 192, 192, 0.2); transform: scale(1); opacity: 1; }
`;

// Verify Modal Components
const VerifyModalContent = styled(motion.div)`
  background: linear-gradient(145deg, rgba(10, 12, 25, 0.98), rgba(5, 8, 20, 0.98));
  backdrop-filter: blur(20px);
  border: 1px solid rgba(65, 105, 225, 0.3);
  border-radius: 24px;
  padding: 2.5rem;
  max-width: 480px;
  width: 100%;
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.6), 0 0 40px rgba(65, 105, 225, 0.15);
  position: relative;
  overflow: hidden;
`;

const VerifyStepIndicator = styled.div`
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 2rem;
`;

const StepDot = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${props => props.$active ? 'var(--vault-accent)' : 'rgba(255, 255, 255, 0.15)'};
  box-shadow: ${props => props.$active ? '0 0 10px var(--vault-accent)' : 'none'};
  transition: all 0.3s ease;
`;

const VerifyTitle = styled.h3`
  font-family: var(--font-primary);
  color: white;
  font-size: 1.3rem;
  text-align: center;
  margin: 0 0 0.5rem 0;
  letter-spacing: 0.15em;
`;

const VerifySubtitle = styled.p`
  font-family: var(--font-secondary);
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.85rem;
  text-align: center;
  margin: 0 0 2rem 0;
`;

const ScanContainer = styled.div`
  position: relative;
  width: 100%;
  height: 180px;
  border: 1px solid rgba(65, 105, 225, 0.2);
  border-radius: 16px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.3);
  margin-bottom: 1.5rem;
  animation: ${pulseGlow} 2s ease-in-out infinite;
`;

const ScanLine = styled.div`
  position: absolute;
  left: 0;
  width: 100%;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(65, 105, 225, 0.8), var(--vault-accent), rgba(65, 105, 225, 0.8), transparent);
  box-shadow: 0 0 15px rgba(65, 105, 225, 0.6), 0 0 30px rgba(65, 105, 225, 0.3);
  animation: ${scanBeam} 2s ease-in-out infinite;
  z-index: 2;
`;

const ScanCodeDisplay = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-family: 'Courier New', monospace;
  font-size: 1.5rem;
  color: rgba(65, 105, 225, 0.8);
  letter-spacing: 0.3em;
  text-transform: uppercase;
  text-shadow: 0 0 10px rgba(65, 105, 225, 0.4);
`;

const ProgressBarContainer = styled.div`
  width: 100%;
  height: 4px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 1rem;
`;

const ProgressBarFill = styled.div`
  height: 100%;
  background: linear-gradient(90deg, var(--vault-accent), #00c8ff);
  border-radius: 2px;
  transition: width 0.1s linear;
  box-shadow: 0 0 10px rgba(65, 105, 225, 0.5);
`;

const ScanStatusText = styled.div`
  text-align: center;
  font-family: var(--font-secondary);
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.4);
  letter-spacing: 0.1em;
  text-transform: uppercase;
`;

const AnalyzeRing = styled.div`
  width: 100px;
  height: 100px;
  border: 3px solid rgba(65, 105, 225, 0.15);
  border-top: 3px solid var(--vault-accent);
  border-right: 3px solid rgba(65, 105, 225, 0.4);
  border-radius: 50%;
  animation: ${rotateRing} 1.2s linear infinite;
  margin: 2rem auto;
`;

const ResultIcon = styled(motion.div)`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 1.5rem auto;
  font-size: 2rem;
  background: ${props => props.$success
    ? 'linear-gradient(135deg, rgba(52, 199, 89, 0.2), rgba(52, 199, 89, 0.1))'
    : 'linear-gradient(135deg, rgba(255, 59, 48, 0.2), rgba(255, 59, 48, 0.1))'};
  border: 2px solid ${props => props.$success ? 'rgba(52, 199, 89, 0.5)' : 'rgba(255, 59, 48, 0.5)'};
  color: ${props => props.$success ? '#34C759' : '#FF3B30'};
  box-shadow: 0 0 30px ${props => props.$success ? 'rgba(52, 199, 89, 0.2)' : 'rgba(255, 59, 48, 0.2)'};
`;

const ResultMessage = styled.div`
  text-align: center;
  font-family: var(--font-secondary);
  font-size: 1rem;
  color: ${props => props.$success ? '#34C759' : '#FF3B30'};
  margin-bottom: 0.5rem;
  font-weight: 600;
`;

const ResultDetail = styled.div`
  text-align: center;
  font-family: var(--font-secondary);
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 1.5rem;
`;


// Toast notification
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
  background: transparent;
  color: white;
  padding: 4rem 2rem 8rem;
  position: relative;
  overflow-x: hidden;

  /* Dynamic Theme Overrides */
  --vault-accent: ${props => props.$themeColor || '#00f2ff'};
  --vault-glow: ${props => props.$themeGlow || 'rgba(0, 242, 255, 0.4)'};
  --bg-vault: ${props => props.$themeBg || 'rgba(0, 5, 15, 0.5)'};
`;

const ScanBeamLine = styled.div`
  position: absolute;
  left: 0;
  width: 100%;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--vault-accent), transparent);
  box-shadow: 0 0 15px var(--vault-accent);
  z-index: 10;
  opacity: 0.7;
  pointer-events: none;
  animation: ${scanBeam} 3s cubic-bezier(0.4, 0, 0.2, 1) infinite;
`;

const BlueprintBackground = styled.div`
  position: absolute;
  inset: 0;
  background-image: url(${blueprintBg});
  background-size: 600px;
  background-repeat: repeat;
  opacity: 0.06;
  pointer-events: none;
  z-index: 0;
  mask-image: radial-gradient(circle at center, black 40%, transparent 100%);
`;

const ElectricityOverlay = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  opacity: 0.3;
  
  svg {
    width: 100%;
    height: 100%;
    
    path {
      fill: none;
      stroke: var(--vault-accent);
      stroke-width: 1;
      stroke-dasharray: 20 200;
      animation: ${electricFlow} 3s linear infinite;
    }
  }
`;

const DiamondShimmer = styled.div`
position: absolute;
  top: 50%;
  left: 50%;
width: 100vmax;
height: 100vmax;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 60%);
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 0;
  mix-blend-mode: overlay;
  animation: ${diamondSweep} 8s ease-in-out infinite;
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

const AnimatedGlitchTitle = styled(motion.h1)`
  animation: ${rgbGlitch} 2.5s infinite;
`;

const GlitchTitleContainer = styled.div`
position: relative;
display: inline-block;
  
  h1 {
  position: relative;
  z-index: 1;
}
`;

const GlitchLayer = styled.h1`
  position: absolute!important;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0.8;
  z-index: 0!important;
  pointer-events: none;
  mix-blend-mode: screen;
  
  &.red {
    color: #ff00c1!important;
    animation: ${glitchShake} 0.4s cubic-bezier(.25, .46, .45, .94) both infinite;
    animation-delay: 0.1s;
    clip-path: polygon(0 0, 100% 0, 100% 33%, 0 33%);
  }
  
  &.blue {
    color: #00fff9!important;
    animation: ${glitchShake} 0.4s cubic-bezier(.25, .46, .45, .94) reverse both infinite;
    animation-delay: 0.2s;
    clip-path: polygon(0 67%, 100% 67%, 100% 100%, 0 100%);
  }
  
  &.green {
    color: #00ff00!important;
    animation: ${glitchShake} 0.4s cubic-bezier(.25, .46, .45, .94) both infinite;
    clip-path: polygon(0 33%, 100% 33%, 100% 67%, 0 67%);
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
align-items: stretch;

@media(max-width: 900px) {
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
align-items: stretch;

@media(max-width: 900px) {
  grid-template-columns: 1fr;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
`;

const CharacterTitlePanel = styled(Panel)`
display: flex;
flex-direction: column;
justify-content: flex-start;
padding: 1.5rem 1.75rem;
  
  h2 {
  font-size: 2.6rem;
  line-height: 1;
  margin-bottom: 0.3rem;
  font-style: italic;
  color: white;
  font-weight: 700;
  white-space: nowrap;
  text-shadow: 0 0 8px rgba(255, 255, 255, 0.2), 0 0 16px rgba(255, 255, 255, 0.1);
}
  
  h3 {
  font-size: 1.1rem;
  color: var(--vault-accent);
  margin-bottom: 0.75rem;
  opacity: 0.9;
  font-weight: 500;
  white-space: nowrap;
  text-shadow: 0 0 6px rgba(255, 255, 255, 0.1);
}
  
  .status {
  font-family: var(--font-secondary);
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.4);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  font-weight: 700;
    
    &.active {
    color: var(--vault-success);
  }
}
`;

const ArtistDetails = styled.div`
display: grid;
grid-template-columns: 1fr 1fr;
gap: 0.8rem 1.5rem;
margin-bottom: 1rem;
margin-top: 0.25rem;
`;

const ArtistDetailItem = styled.div`
display: flex;
flex-direction: column;
gap: 0.3rem;
  
  .label {
  font-family: var(--font-secondary);
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.45);
  text-transform: uppercase;
  letter-spacing: 0.15em;
  font-weight: 600;
}
  
  .value {
  font-family: var(--font-primary);
  font-size: 1.25rem;
  color: white;
  font-weight: 600;
}
`;

const SocialMediaLinks = styled.div`
display: flex;
gap: 0.75rem;
margin-top: 0.75rem;
padding-top: 0.75rem;
border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

const SocialIcon = styled.a`
width: 38px;
height: 38px;
border-radius: 50%;
background: rgba(255, 255, 255, 0.05);
border: 1px solid rgba(255, 255, 255, 0.1);
display: flex;
align-items: center;
justify-content: center;
color: rgba(255, 255, 255, 0.6);
font-size: 1rem;
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
height: auto;
position: relative;
z-index: 1;
display: flex;
gap: 1rem;
align-items: flex-start;

@media(max-width: 900px) {
  flex-direction: column;
  align-items: stretch;
  order: -1;
}
`;

const SelectGrid = styled.div`
display: grid;
grid-template-columns: repeat(4, 1fr);
grid-template-rows: repeat(2, 1fr);
gap: 0;
flex: 1;
border-radius: 0;
overflow: hidden;
padding: 0;
border: 1px solid rgba(255, 255, 255, 0.2);
position: relative;

@media(max-width: 900px) {
  grid-template-columns: repeat(4, 1fr);
  width: 100%;
}

@media(max-width: 500px) {
  grid-template-columns: repeat(4, 1fr);
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
aspect-ratio: 1;
border: 1px solid rgba(255, 255, 255, 0.1);
margin: -1px -1px 0 0; /* Overlap borders to prevent double-thickness */

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
  object-fit: contain;
  transform: scale(1.8);
  opacity: ${props => props.$verified ? 1 : 0.6};
  filter: ${props => props.$verified ? 'none saturate(1.1)' : 'grayscale(100%) contrast(1.1) brightness(0.85)'};
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

  &:hover img {
    transform: scale(2.5);
  }
`;



const CrownWeightModule = styled.div`
flex: 0 0 auto;
width: 280px;
align-self: stretch;
background: var(--bg-vault);
border: var(--glass-border);
border-radius: 20px;
position: relative;
display: flex;
flex-direction: column;
align-items: center;
justify-content: center;
overflow: hidden;
padding: 1.5rem;
box-shadow: var(--vault-shadow);
  
  &::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: url(${blueprintBg});
  background-size: 300px;
  opacity: 0.1;
  mix-blend-mode: overlay;
  border-radius: 20px;
}
  
  &::after {
  content: '';
  position: absolute;
  inset: 0;
  border: 1px solid rgba(65, 105, 225, 0.3);
  border-radius: 20px;
  pointer-events: none;
}

@media(max-width: 900px) {
  width: 100%;
  min-height: 220px;
  padding: 2rem;
  order: -2;
}
`;

const LogoBackground = styled.img`
position: absolute;
top: 50%;
left: 50%;
transform: translate(-50%, -50%);
width: 65%;
max-width: 180px;
opacity: 0.10;
pointer-events: none;
transition: all 1s ease;
  
  ${CrownWeightModule}: hover & {
  opacity: 0.18;
  transform: translate(-50%, -50%) scale(1.05);
}

@media(max-width: 900px) {
  width: 40%;
  max-width: 140px;
}

@media(max-width: 500px) {
  width: 35%;
  max-width: 120px;
}
  `;

const WeightDisplay = styled(motion.div)`
z-index: 2;
text-align: center;
display: flex;
flex-direction: column;
align-items: center;
`;

const WeightCounter = styled.div`
font-family: var(--font-primary);
font-size: 3.5rem;
color: #FFD700;
text-shadow: 0 0 20px rgba(255, 215, 0, 0.4), 0 0 40px rgba(255, 215, 0, 0.2);
line-height: 1;
margin-bottom: 0.5rem;
`;

const WeightLabel = styled.div`
font-family: var(--font-secondary);
font-size: 0.75rem;
letter-spacing: 0.25em;
color: rgba(255, 255, 255, 0.6);
text-transform: uppercase;
font-weight: 600;
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
grid-template-columns: 1fr 1fr 1fr;
gap: 2rem;
max-width: 1440px;
margin: 0 auto 3rem;
position: relative;
z-index: 1;
align-items: stretch;
overflow: visible;

@media(max-width: 1200px) {
  grid-template-columns: 1fr 1.2fr;
    
    > div: nth-child(3) {
    grid-column: 1 / -1;
  }
}

@media(max-width: 900px) {
  grid-template-columns: 1fr;
}
`;

const IDCard = styled(Panel)`
padding: 0;
height: 100%;
min-height: 500px;
display: flex;
flex-direction: column;
border: var(--glass-border);
transition: border-color 0.6s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.6s cubic-bezier(0.16, 1, 0.3, 1);
overflow: hidden;
position: relative;

  ${props => props.$owned && css`
    border-color: rgba(52, 199, 89, 0.3);
    box-shadow: 0 0 40px rgba(52, 199, 89, 0.1);
  `}

@media (max-width: 900px) {
  min-height: 500px;
}

@media (min-width: 901px) and (max-width: 1200px) {
  min-height: 600px;
}
`;

const IDImageContainer = styled.div`
flex: 1;
min-height: 0;
position: relative;
display: flex;
background: #000;
overflow: hidden;
border-radius: 0 0 20px 20px;
`;

const IDImageHalf = styled.div`
width: 50%;
height: 100%;
position: relative;
border-right: 1px solid rgba(255, 255, 255, 0.03);
overflow: hidden;
display: flex;
align-items: stretch;
justify-content: center;
padding: 0;
  
  &:last-child {
  border-right: none;
}

  img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center center;
  padding: 0;
  transform: scale(1);
  transform-origin: center center;
  filter: ${props => props.$verified ? 'none saturate(1.1)' : 'grayscale(100%) contrast(1.1) brightness(0.85)'};
  transition: filter 1.5s cubic-bezier(0.16, 1, 0.3, 1);
}
`;

const CyclingImage = styled.img`
position: absolute;
top: 0;
left: 0;
width: 100%;
height: 100%;
object-fit: contain;
opacity: ${props => props.$active ? 1 : 0};
transition: opacity 0.8s ease-in-out;
z-index: ${props => props.$active ? 1 : 0};
`;

const IDFooter = styled.div`
position: relative;
background: rgba(0, 0, 0, 0.9);
padding: 0.6rem 1.5rem;
border-top: 1px solid rgba(255, 255, 255, 0.1);
display: flex;
justify-content: center;
align-items: center;
z-index: 5;
flex-shrink: 0;
  
  .series-label {
  font-family: var(--font-primary);
  font-size: 0.85rem;
  color: white;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  font-weight: 800;
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
min-height: 500px;

@media (max-width: 900px) {
  min-height: 450px;
}
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
gap: 0.5rem;

  label {
  font-family: var(--font-secondary);
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.45);
  text-transform: uppercase;
  letter-spacing: 0.15em;
  font-weight: 600;
}

  div {
  font-family: var(--font-primary);
  font-size: 1.5rem;
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
    
    &.rarity-diamond {
    color: #b9f2ff;
    text-shadow: 0 0 12px rgba(185, 242, 255, 0.4), 0 0 30px rgba(185, 242, 255, 0.15);
  }
    &.rarity-platinum {
    color: #e5e4e2;
    text-shadow: 0 0 12px rgba(229, 228, 226, 0.3);
  }
    &.rarity-gold {
    color: #ffd700;
    text-shadow: 0 0 12px rgba(255, 215, 0, 0.3);
  }
    &.rarity-silver {
    color: #c0c0c0;
    text-shadow: 0 0 8px rgba(192, 192, 192, 0.2);
  }
}
`;

// Animated rarity text that plays a reveal animation
const RarityRevealText = styled.div`
display: flex;
align-items: center;
gap: 0.5rem;
font-family: var(--font-primary);
font-size: 1.5rem;
font-weight: 700;
letter-spacing: 0.05em;

${props => props.$tier === 'diamond' && css`
  color: #b9f2ff;
  animation: ${diamondSparkle} 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
`}

${props => props.$tier === 'platinum' && css`
  color: #e5e4e2;
  animation: ${platinumShine} 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
`}

${props => props.$tier === 'gold' && css`
  color: #ffd700;
  animation: ${goldGlow} 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
`}

${props => props.$tier === 'silver' && css`
  color: #c0c0c0;
  animation: ${silverGleam} 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
`}

.rarity-icon {
  font-size: 1.3rem;
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
font-size: 1.6rem;
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
padding: 1.1rem;
border-radius: 12px;
text-align: center;
font-family: var(--font-primary);
font-size: 1.1rem;
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
background: rgba(0, 0, 0, 0.2);
border-bottom: 1px solid rgba(255, 255, 255, 0.05);
display: flex;
justify-content: space-between;
align-items: center;

  h3 {
  font-family: var(--font-primary);
  color: white;
  margin: 0;
  font-size: 1.4rem;
  letter-spacing: 0.15em;
}
`;

const ModelCanvas = styled.div`
flex: 1;
position: relative;
background: radial-gradient(circle at center, rgba(0, 122, 255, 0.03), transparent 75%);
transition: filter 0.5s ease;
filter: ${props => props.$locked ? 'grayscale(100%) brightness(0.95)' : 'none'};
`;

const LoadingSpinner = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  color: rgba(255, 255, 255, 0.6);
  font-family: var(--font-secondary);
  font-size: 0.9rem;
  letter-spacing: 0.1em;
  
  svg {
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

// Optimized Image Component with progressive loading
const ImageWrapper = styled.div`
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.3);
  
  img {
    width: 100%;
    height: 100%;
    object-fit: inherit;
    object-position: inherit;
    transition: opacity 0.6s ease, filter 0.6s ease;
    opacity: ${props => props.$loaded ? 1 : 0};
    will-change: opacity;
  }
`;

const OptimizedImage = ({ src, alt, ...props }) => {
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    if (imgRef.current) observer.observe(imgRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <ImageWrapper ref={imgRef} $loaded={loaded}>
      {inView && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          width={400}
          height={400}
          fetchpriority="low"
          onLoad={() => setLoaded(true)}
          {...props}
        />
      )}
    </ImageWrapper>
  );
};

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
font-size: 1.4rem;
text-transform: uppercase;
letter-spacing: 0.15em;
color: var(--vault-accent);
margin-bottom: 1.5rem;
display: flex;
align-items: center;
gap: 0.75rem;
justify-content: space-between;
width: 100%;
flex-wrap: nowrap;

/* Title content wraps to 2 lines if needed; button stays right */
> div, > span {
  flex: 1;
  min-width: 0;
}

> button, > [class*="ActionButton"] {
  flex-shrink: 0;
  white-space: nowrap;
}

@media (max-width: 768px) {
  font-size: 1.1rem;
  gap: 0.5rem;
}
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
  transform: none!important;
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
color: rgba(255, 255, 255, 0.5);
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
// CINEMATIC OVERLAY COMPONENTS
// ============================================
const panAcross = keyframes`
0% { transform: scale(1.1) translate(0, 0); }
50% { transform: scale(1.1) translate(- 2%, -2%); }
100% { transform: scale(1.1) translate(0, 0); }
  `;

const OverlayContainer = styled(motion.div)`
position: fixed;
inset: 0;
z-index: 2000;
background: black;
display: flex;
align-items: center;
justify-content: center;
overflow: hidden;
`;

const OverlayBackground = styled(motion.div)`
position: absolute;
inset: 0;
opacity: 0.4;
background-image: url(${blueprintBg});
background-size: cover;
animation: ${panAcross} 20s ease -in -out infinite alternate;
`;

const OverlayContent = styled(motion.div)`
position: relative;
z-index: 2;
text-align: center;
display: flex;
flex-direction: column;
align-items: center;
gap: 2rem;
`;

const OverlayTitle = styled(motion.h1)`
font-family: var(--font-primary);
font-size: 5rem;
color: white;
margin: 0;
letter-spacing: 0.1em;
text-transform: uppercase;
position: relative;
  
  &::after {
  content: attr(data-text);
  position: absolute;
  left: 2px;
  text-shadow: -1px 0 red;
  top: 0;
  color: white;
  background: black;
  overflow: hidden;
  clip: rect(0, 900px, 0, 0);
  animation: ${rgbGlitch} 2s infinite linear alternate-reverse;
}
  
  &::before {
  content: attr(data-text);
  position: absolute;
  left: -2px;
  text-shadow: 1px 0 blue;
  top: 0;
  color: white;
  background: black;
  overflow: hidden;
  clip: rect(0, 900px, 0, 0);
  animation: ${rgbGlitch} 3s infinite linear alternate-reverse;
}

@media(max-width: 768px) {
  font-size: 3rem;
}
`;

const OverlaySubtitle = styled(motion.h2)`
font-family: var(--font-secondary);
font-size: 1.2rem;
color: var(--vault-accent);
letter-spacing: 0.5em;
text-transform: uppercase;
margin: 0;

@media(max-width: 768px) {
  font-size: 0.9rem;
  letter-spacing: 0.3em;
}
`;

const EnterButton = styled(motion.button)`
background: transparent;
border: 1px solid var(--vault-accent);
color: white;
padding: 1rem 3rem;
font-family: var(--font-primary);
font-size: 1rem;
letter-spacing: 0.2em;
cursor: pointer;
position: relative;
overflow: hidden;
transition: all 0.3s ease;
margin-top: 2rem;
z-index: 10;

  &::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(65, 105, 225, 0.4), transparent);
  transition: left 0.5s ease;
}

  &:hover {
  background: rgba(65, 105, 225, 0.1);
  box-shadow: 0 0 20px rgba(65, 105, 225, 0.3);
  border-color: white;
    
    &::before {
    left: 100%;
  }
}
`;

// ============================================
// MAIN COMPONENT
// ============================================
export default function Vault() {
  const navigate = useNavigate();
  const { isInitialized, isWeb3Available, user, isLoading, login, logout, getAddress, signMessageWithNonce, walletAddress: hookWalletAddress } = useWeb3Auth();
  const isVaultLocked = !isInitialized || !user;

  const [walletAddress, setWalletAddress] = useState('');
  const [userTokens, setUserTokens] = useState([]);
  const [serialNumber, setSerialNumber] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [currentEdition, setCurrentEdition] = useState(null);
  const [selectedToken, setSelectedToken] = useState(null);

  // Crown Weight Logic
  const [crownWeight, setCrownWeight] = useState(0);

  // Cinematic State
  const [showCinematic, setShowCinematic] = useState(false);

  // Verification Modal Flow State
  // Steps: 1=input, 2=scanning, 3=analyzing, 4=result
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [verifyStep, setVerifyStep] = useState(1);
  const [scanProgress, setScanProgress] = useState(0);
  const [showCrownInfoModal, setShowCrownInfoModal] = useState(false);

  useEffect(() => {
    // Load from local storage
    const saved = localStorage.getItem('crownmania_crown_weight');
    if (saved) {
      const parsed = JSON.parse(saved);
      setCrownWeight(parsed.weight || 0);
    }
  }, []);

  useEffect(() => {
    // If connected but no weight, init with 100 (Path B: Explorer)
    if (!isVaultLocked && crownWeight === 0) {
      const initial = 100;
      setCrownWeight(initial);
      localStorage.setItem('crownmania_crown_weight', JSON.stringify({
        weight: initial,
        history: [{ action: 'Crown Forged', points: 100, date: new Date().toISOString() }]
      }));
    }
  }, [isVaultLocked, crownWeight]);

  // Persistent verification state
  const [verifiedSerials, setVerifiedSerials] = useState([]);
  const [isPersistentlyVerified, setIsPersistentlyVerified] = useState(false);

  // UI State
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferAddress, setTransferAddress] = useState('');

  // Transfer Modal — multi-step state
  const [transferStep, setTransferStep] = useState(1); // 1=dest, 2=2fa, 3=confirm, 4=processing, 5=result
  const [transferDestination, setTransferDestination] = useState('');
  const [transfer2FAMethod, setTransfer2FAMethod] = useState('email');
  const [transfer2FACode, setTransfer2FACode] = useState('');
  const [transfer2FASent, setTransfer2FASent] = useState(false);
  const [transfer2FALoading, setTransfer2FALoading] = useState(false);
  const [transferError, setTransferError] = useState('');
  const [transferResult, setTransferResult] = useState(null);
  const [transferProcessing, setTransferProcessing] = useState(false);
  const transfer2FAInputRef = useRef(null);

  // Theme state-Royal Blue primary
  const [currentTheme, setCurrentTheme] = useState('blue');
  const [selectedCharacter, setSelectedCharacter] = useState(null); // null = Durk, 1-6 = Coming Soon slots
  const themes = {
    blue: { color: '#4169E1', glow: 'rgba(65, 105, 225, 0.4)', bg: 'rgba(0, 5, 25, 0.5)' },
    green: { color: '#34C759', glow: 'rgba(52, 199, 89, 0.4)', bg: 'rgba(5, 15, 5, 0.5)' },
    pink: { color: '#FF69B4', glow: 'rgba(255, 105, 180, 0.4)', bg: 'rgba(20, 5, 15, 0.5)' },
    darkRed: { color: '#CC0000', glow: 'rgba(204, 0, 0, 0.4)', bg: 'rgba(20, 2, 2, 0.5)' },
    orange: { color: '#FF8C00', glow: 'rgba(255, 140, 0, 0.4)', bg: 'rgba(20, 10, 0, 0.5)' },
    purple: { color: '#9B30FF', glow: 'rgba(155, 48, 255, 0.4)', bg: 'rgba(12, 3, 20, 0.5)' },
    yellow: { color: '#FFD700', glow: 'rgba(255, 215, 0, 0.4)', bg: 'rgba(20, 18, 0, 0.5)' },
  };
  // Map slot index → theme key
  const SLOT_THEMES = [null, 'green', 'pink', 'darkRed', 'orange', 'purple', 'yellow'];
  const isComingSoonSelected = selectedCharacter !== null;

  const handleSlotClick = (slotIndex) => {
    if (slotIndex === 0) {
      // Durk slot
      setSelectedCharacter(null);
      setCurrentTheme('blue');
    } else {
      setSelectedCharacter(slotIndex);
      setCurrentTheme(SLOT_THEMES[slotIndex] || 'blue');
    }
  };

  // Info popup state for panel explanations
  const [infoPopup, setInfoPopup] = useState(null); // 'verify' | 'vault' | 'collectible' | 'exclusive' | null
  const handleInfoClick = (panel) => setInfoPopup(infoPopup === panel ? null : panel);
  const INFO_TEXT = {
    verify: 'Scan or enter the unique serial code from your physical collectible to authenticate its digital twin on the blockchain.',
    vault: 'Your Vault is a secure digital locker powered by blockchain technology. Connect to claim, view, and manage your verified collectibles.',
    collectible: 'Each physical CrownMania collectible comes with a unique scannable QR code that links to its blockchain-verified digital twin, ensuring authenticity.',
    exclusive: 'Verified collectible owners unlock exclusive utilities — early access to content, limited merchandise, concert tickets, and future airdrops.',
  };

  // ========== FEATURE: Sound Design ==========
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('crownmania_sound');
    return saved !== null ? saved === 'true' : true;
  });

  useEffect(() => {
    setGlobalSound(soundEnabled);
    localStorage.setItem('crownmania_sound', String(soundEnabled));
  }, [soundEnabled]);

  // ========== FEATURE: Push Notifications ==========
  const [pushPermission, setPushPermission] = useState(getPermissionStatus());

  const handleEnablePush = async () => {
    const result = await requestPushPermission();
    setPushPermission(getPermissionStatus());
    if (result.success) {
      showToastMessage('🔔 Push notifications enabled!');
    }
  };

  useEffect(() => {
    // Listen for foreground push messages
    onForegroundMessage((notification) => {
      showToastMessage(`${notification.title}: ${notification.body}`);
    });
  }, []);

  // ========== FEATURE: Rarity Reveal Animation ==========
  const [rarityRevealed, setRarityRevealed] = useState(false);
  const prevRarityRef = useRef(null);

  // Auto-close info popup after 10 seconds
  useEffect(() => {
    if (!infoPopup) return;
    const timer = setTimeout(() => setInfoPopup(null), 10000);
    return () => clearTimeout(timer);
  }, [infoPopup]);

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
              tokenId: mostRecent.tokenId,
              transactionHash: mostRecent.transactionHash,
              claimDate: mostRecent.claimDate
            });
            setSelectedToken({
              productId: mostRecent.productId || 'lil-durk-figure',
              tokenAddress: mostRecent.tokenAddress,
              tokenId: mostRecent.tokenId,
              transactionHash: mostRecent.transactionHash,
              edition: mostRecent.editionNumber,
              editionNumber: mostRecent.editionNumber,
              claimDate: mostRecent.claimDate,
              verifiedAt: mostRecent.verifiedAt,
              nftTransferred: true
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

  // ID Card image carousel state
  const [idCardImageIndex, setIdCardImageIndex] = useState(0);

  // Gallery of Durk images for the ID Card carousel
  const idCardImages = [
    { src: DURK_FRONT_IMG, label: 'FRONT VIEW' },
    { src: DURK_BACK_IMG, label: 'BACK VIEW' },
    { src: DURK_PREVIEW_IMG, label: 'PREVIEW' },
    { src: DURK_FACE_IMG, label: 'CLOSE UP' },
    { src: DURK_BACKGROUND_IMG, label: 'DETAIL' },
  ];

  const handleIdCardPrev = () => setIdCardImageIndex((prev) => (prev - 1 + idCardImages.length) % idCardImages.length);
  const handleIdCardNext = () => setIdCardImageIndex((prev) => (prev + 1) % idCardImages.length);

  // Fetch wallet data when authenticated
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        if (isInitialized && user) {
          // Use hook's walletAddress if available, otherwise fetch via getAddress()
          let address = hookWalletAddress;
          if (!address) {
            address = await getAddress();
          }
          if (address && isMounted) {
            setWalletAddress(address);
            try {
              const result = await verificationAPI.getWalletTokens(address);
              if (isMounted) {
                const tokens = result.tokens || [];
                setUserTokens(tokens);

                // Check if wallet has tokens and auto-unlock vault
                if (tokens.length > 0) {
                  // Default select the first token; user can switch in the details panel
                  setSelectedToken(prev => prev || tokens[0]);
                  const durkToken = tokens.find(t => t.productId === 'lil-durk-figure') || tokens[0];
                  setCurrentEdition(durkToken.edition || durkToken.editionNumber);

                  // Merge with localStorage-save token info as verified serial
                  const tokenVerification = {
                    serialNumber: `wallet_${address}_${durkToken.tokenAddress || durkToken.productId} `,
                    tokenAddress: durkToken.tokenAddress,
                    tokenId: durkToken.tokenId,
                    transactionHash: durkToken.transactionHash,
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
          } else if (isMounted) {
            // Connected but no address yet — clear tokens but don't reset
            setUserTokens([]);
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
  }, [isInitialized, user, hookWalletAddress]); // eslint-disable-line react-hooks/exhaustive-deps

  // Check if user owns a character
  const isOwned = useCallback((characterId) => {
    if (!userTokens || userTokens.length === 0) return false;
    return userTokens.some(token => token.productId === characterId);
  }, [userTokens]);

  // Switch the active token the user is viewing
  const handleSelectToken = useCallback((token) => {
    setSelectedToken(token);
    setCurrentEdition(token.edition || token.editionNumber);
  }, []);

  // The active token can be the user's selected wallet token, or a manually verified token
  const activeToken = selectedToken || (verificationResult ? {
    productId: verificationResult.productId,
    tokenAddress: verificationResult.tokenAddress,
    tokenId: verificationResult.tokenId,
    transactionHash: verificationResult.transactionHash,
    edition: verificationResult.editionNumber,
    editionNumber: verificationResult.editionNumber,
    claimDate: verificationResult.claimDate,
    verifiedAt: verificationResult.verifiedAt,
    nftTransferred: !!verificationResult.tokenId
  } : null);

  // Derived state-asset is verified if:
  // 1. First-time correct product code entry, OR
  // 2. Recurring visitor with verified serial in localStorage, OR
  // 3. Wallet connection with owned tokens, OR
  // 4. Token record shows a successful transfer
  const isAssetVerified = verificationResult?.status === 'success' ||
    isPersistentlyVerified ||
    (userTokens && userTokens.length > 0) ||
    !!activeToken?.nftTransferred;

  // Display data can come from the selected wallet token or manual verification
  const displayEdition = activeToken?.edition || activeToken?.editionNumber || currentEdition;
  const displayTokenAddress = activeToken?.tokenAddress;
  const displayClaimDate = activeToken?.claimDate || activeToken?.verifiedAt;
  const displayVerifiedAt = verificationResult?.verifiedAt || verifiedSerials.find(s => s.productId === (activeToken?.productId || 'lil-durk-figure'))?.verifiedAt || activeToken?.verifiedAt || activeToken?.claimDate;
  const displayTransactionHash = activeToken?.transactionHash;
  const displayTokenId = activeToken?.tokenId;

  // Rarity tier based on edition number (music industry inspired)
  const getRarityTier = (edition) => {
    if (!edition) return null;
    const num = parseInt(edition);
    if (num <= 25) return { label: 'DIAMOND', icon: '💎', className: 'rarity-diamond' };
    if (num <= 100) return { label: 'PLATINUM', icon: '💿', className: 'rarity-platinum' };
    if (num <= 250) return { label: 'GOLD', icon: '🥇', className: 'rarity-gold' };
    return { label: 'SILVER', icon: '🥈', className: 'rarity-silver' };
  };
  const rarityTier = getRarityTier(displayEdition);

  const handleConnect = async () => {
    await login();
  };

  const handleDisconnect = async () => {
    await logout();
    setWalletAddress('');
    setUserTokens([]);
    setSelectedToken(null);
    setCurrentEdition(null);
    setVerificationResult(null);
    setIsPersistentlyVerified(false);
    clearVerifiedSerialsFromStorage();
  };

  const handleVerify = async (codeOverride) => {
    const code = (codeOverride || serialNumber).trim();
    if (!code) return;

    // Open verification modal and start flow
    setShowVerifyModal(true);
    setVerifyStep(2); // Jump to scanning
    setScanProgress(0);
    setIsVerifying(true);
    setVerificationResult(null);
    playUnlock(); // Sound: scan begins

    // Animate the scan progress bar
    const scanDuration = 2500;
    const scanStart = Date.now();
    const scanInterval = setInterval(() => {
      const elapsed = Date.now() - scanStart;
      const progress = Math.min((elapsed / scanDuration) * 100, 100);
      setScanProgress(progress);
      if (progress >= 100) clearInterval(scanInterval);
    }, 50);

    // Wait for scan animation
    await new Promise(resolve => setTimeout(resolve, scanDuration));
    clearInterval(scanInterval);
    setScanProgress(100);

    // Move to analyzing step
    setVerifyStep(3);

    // Actually call the API during "analyzing"
    let result = null;
    try {
      const apiResult = await verificationAPI.verifySerial(code);

      // Wait minimum 2s for the analyzing animation
      await new Promise(resolve => setTimeout(resolve, 2000));

      if (apiResult.valid) {
        const editionNum = apiResult.editionNumber || apiResult.edition;
        const productId = apiResult.productId || 'lil-durk-figure';

        result = {
          status: 'success',
          message: 'Product verified successfully!',
          editionNumber: editionNum,
          productId: productId,
          tokenAddress: apiResult.tokenAddress || apiResult.contractAddress,
          tokenId: apiResult.tokenId,
          transactionHash: apiResult.transactionHash,
          claimDate: apiResult.claimDate || new Date().toISOString()
        };

        saveVerifiedSerialToStorage({
          serialNumber: serialNumber.trim(),
          tokenAddress: apiResult.tokenAddress || apiResult.contractAddress,
          tokenId: apiResult.tokenId,
          transactionHash: apiResult.transactionHash,
          editionNumber: editionNum,
          productId: productId,
          claimDate: apiResult.claimDate || new Date().toISOString(),
          source: 'manual_entry'
        });

        setSelectedToken({
          productId,
          tokenAddress: apiResult.tokenAddress || apiResult.contractAddress,
          tokenId: apiResult.tokenId,
          transactionHash: apiResult.transactionHash,
          edition: editionNum,
          editionNumber: editionNum,
          claimDate: apiResult.claimDate || new Date().toISOString(),
          verifiedAt: new Date().toISOString(),
          nftTransferred: true
        });

        setIsPersistentlyVerified(true);
      } else {
        result = {
          status: 'error',
          message: apiResult.message || 'Invalid product code'
        };
      }
    } catch (err) {
      console.error('[Vault] Verification error:', err);
      // Wait minimum 1s even for errors
      await new Promise(resolve => setTimeout(resolve, 1000));
      result = {
        status: 'error',
        message: err.error || err.message || 'Verification failed'
      };
    }

    // Show result step
    setVerificationResult(result);
    setVerifyStep(4);
    setIsVerifying(false);

    // Auto-close after success and show toast
    if (result.status === 'success') {
      playVerificationSuccess(); // Sound: success chime
      showToastMessage('✓ Product Verified Successfully!');

      // Trigger rarity reveal animation + sound after a short delay
      const newRarity = getRarityTier(result.editionNumber);
      if (newRarity && prevRarityRef.current !== newRarity.label) {
        setRarityRevealed(false);
        setTimeout(() => {
          setRarityRevealed(true);
          playRarityReveal(newRarity.label);
          prevRarityRef.current = newRarity.label;
        }, 800);
      }

      setTimeout(() => {
        setShowVerifyModal(false);
        setVerifyStep(1);
      }, 4000);
    } else {
      playError(); // Sound: error buzz
    }
  };

  // Open verify modal from keyboard icon
  const openVerifyModal = () => {
    setShowVerifyModal(true);
    setVerifyStep(1);
    setVerificationResult(null);
    setScanProgress(0);
  };

  const closeVerifyModal = () => {
    if (isVerifying) return;
    setShowVerifyModal(false);
    setVerifyStep(1);
    setScanProgress(0);
  };

  // Format wallet/token address for display (first 6 + ... + last 4)
  const formatAddress = (address) => {
    if (!address || address.length < 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)} `;
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
    if (displayTokenAddress) {
      navigator.clipboard.writeText(displayTokenAddress);
      showToastMessage('Token address copied to clipboard!');
    }
  };

  const showToastMessage = (message) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleCopyAddress = () => {
    const addr = walletAddress || hookWalletAddress;
    if (addr) {
      navigator.clipboard.writeText(addr);
      showToastMessage('Address copied to clipboard!');
      setShowAddressModal(false);
    }
  };

  const handleViewOnPolygon = () => {
    const addr = walletAddress || hookWalletAddress;
    if (addr) {
      window.open(`https://polygonscan.com/address/${addr}`, '_blank');
    }
  };

  // ============================================
  // TRANSFER FLOW HANDLERS
  // ============================================

  const resetTransferState = useCallback(() => {
    setTransferStep(1);
    setTransferDestination('');
    setTransfer2FAMethod('email');
    setTransfer2FACode('');
    setTransfer2FASent(false);
    setTransfer2FALoading(false);
    setTransferError('');
    setTransferResult(null);
    setTransferProcessing(false);
  }, []);

  const openTransferModal = useCallback(() => {
    resetTransferState();
    setShowTransferModal(true);
  }, [resetTransferState]);

  const closeTransferModal = useCallback(() => {
    if (transferProcessing) return; // Don't close while processing
    setShowTransferModal(false);
    resetTransferState();
  }, [transferProcessing, resetTransferState]);

  // Step 1 → 2: Validate destination address
  const handleTransferStep1 = useCallback(() => {
    setTransferError('');
    const dest = transferDestination.trim();
    if (!dest) {
      setTransferError('Please enter a destination wallet address.');
      return;
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(dest)) {
      setTransferError('Invalid wallet address format. Must start with 0x and be 42 characters.');
      return;
    }
    if (dest.toLowerCase() === walletAddress.toLowerCase()) {
      setTransferError('Cannot transfer to the same wallet. Enter a different address.');
      return;
    }
    setTransferStep(2);
  }, [transferDestination, walletAddress]);

  // Step 2: Request 2FA code
  const handleRequest2FA = useCallback(async () => {
    setTransferError('');
    setTransfer2FALoading(true);
    try {
      await transferAPI.request2FA(walletAddress, transfer2FAMethod);
      setTransfer2FASent(true);
      showToastMessage(`Verification code sent via ${transfer2FAMethod}`);
      // Auto-focus the code input
      setTimeout(() => transfer2FAInputRef.current?.focus(), 100);
    } catch (err) {
      if (err.twoFactorRequired) {
        setTransferError('Two-factor authentication must be enabled before transferring. Enable 2FA in your account settings.');
      } else {
        setTransferError(err.error || err.message || 'Failed to send verification code.');
      }
    } finally {
      setTransfer2FALoading(false);
    }
  }, [walletAddress, transfer2FAMethod]);

  // Step 2 → 3: Validate 2FA code input
  const handleTransferStep2 = useCallback(() => {
    setTransferError('');
    const code = transfer2FACode.trim();
    if (!code || code.length !== 6 || !/^\d{6}$/.test(code)) {
      setTransferError('Please enter the 6-digit verification code.');
      return;
    }
    setTransferStep(3);
  }, [transfer2FACode]);

  // Step 3 → 4 → 5: Execute transfer
  const handleExecuteTransfer = useCallback(async () => {
    setTransferStep(4);
    setTransferProcessing(true);
    setTransferError('');

    try {
      // Get the collectible ID from the currently selected token
      const tokenToTransfer = selectedToken || userTokens[0];
      if (!tokenToTransfer) {
        throw { error: 'No collectible found to transfer.' };
      }
      const collectibleId = tokenToTransfer.collectibleId || tokenToTransfer.id || tokenToTransfer.tokenId;

      // Sign a message to prove wallet ownership
      const signResult = await signMessageWithNonce(
        `Authorize NFT transfer to ${transferDestination.trim()}`
      );
      if (!signResult || !signResult.signature) {
        throw { error: 'Wallet signature was rejected. Transfer cancelled.' };
      }

      // Execute the transfer
      const result = await transferAPI.executeTransfer({
        collectibleId,
        destinationAddress: transferDestination.trim(),
        twoFactorCode: transfer2FACode.trim(),
        twoFactorMethod: transfer2FAMethod,
        walletAddress,
        signature: signResult.signature,
        message: signResult.message,
      });

      setTransferResult(result);
      setTransferStep(5);
      showToastMessage('✓ NFT transferred successfully!');

      // Refresh user tokens after transfer
      try {
        const updated = await verificationAPI.getWalletTokens(walletAddress);
        setUserTokens(updated.tokens || []);
      } catch { /* ignore refresh error */ }
    } catch (err) {
      setTransferError(err.error || err.message || 'Transfer failed. Please try again.');
      setTransferStep(3); // Go back to confirmation
    } finally {
      setTransferProcessing(false);
    }
  }, [userTokens, transferDestination, transfer2FACode, transfer2FAMethod, walletAddress, signMessageWithNonce]);

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
      {/* Blueprint removed — using global BlueprintLayer from BackgroundBeams */}

      <MainTitle>
        <h1>THE VAULT</h1>
        <div className="subtitle">Secure Phygital Asset Repository</div>
      </MainTitle>

      <VaultContent $verified={isAssetVerified} $locked={isVaultLocked}>
        {/* Reordering and removing ternary logic */}
        <TopPanelsRow>
          {/* 1. Verify Panel (Left) */}
          <Panel
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            style={{ borderColor: themes[currentTheme].color }}
          >
            <PanelTitle style={{ color: 'white', justifyContent: 'flex-start', position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <FaLock size={20} /> VERIFY & AUTHENTICATE
              </div>
              <motion.button onClick={() => handleInfoClick('verify')} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', opacity: 0.15, padding: '2px', lineHeight: 1, position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)' }} whileHover={{ opacity: 0.8 }}><FaInfoCircle size={14} /></motion.button>
              <ActionButton
                $primary
                style={{
                  width: '100px', height: '100px', padding: '0.5rem',
                  fontSize: '0.65rem', flexDirection: 'column', gap: '0.25rem',
                  position: 'relative', overflow: 'hidden', borderRadius: '14px',
                  background: `linear-gradient(135deg, ${themes[currentTheme].color}33 0%, ${themes[currentTheme].color}66 50%, ${themes[currentTheme].color}33 100%)`,
                  border: `1px solid ${themes[currentTheme].color}`,
                  flexShrink: 0
                }}
                onClick={() => setShowQRScanner(true)}
              >
                {/* Watermark QR icon */}
                <FaQrcode size={60} style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', opacity: 0.12, pointerEvents: 'none' }} />
                <FaQrcode size={22} style={{ position: 'relative', zIndex: 1 }} />
                <span style={{ position: 'relative', zIndex: 1, lineHeight: 1.2, textAlign: 'center' }}>SCAN QR<br />CODE</span>
              </ActionButton>
            </PanelTitle>
            {infoPopup === 'verify' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: 'easeInOut' }} style={{ position: 'absolute', top: '0.5rem', left: '0.5rem', right: '0.5rem', zIndex: 10, background: 'rgba(8, 8, 20, 0.98)', backdropFilter: 'blur(16px)', border: `1px solid ${themes[currentTheme].color}66`, borderRadius: '12px', padding: '1rem 1.2rem', fontFamily: 'var(--font-secondary)', fontSize: '0.85rem', color: 'rgba(255,255,255,0.95)', lineHeight: 1.6, boxShadow: `0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 ${themes[currentTheme].color}22` }}>
                {INFO_TEXT.verify}
              </motion.div>
            )}
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
                  onClick={serialNumber ? handleVerify : openVerifyModal}
                  disabled={isVerifying}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    fontSize: '1rem',
                    padding: '1rem 2rem',
                    background: `linear-gradient(90deg, ${themes[currentTheme].color}33 0%, ${themes[currentTheme].color}66 50%, ${themes[currentTheme].color}33 100%)`,
                    border: `1px solid ${themes[currentTheme].color}`
                  }}
                >
                  {isVerifying ? <FaSpinner className="spin" /> : <FaShieldAlt />}
                  <span style={{ fontWeight: 800, letterSpacing: '0.05em' }}>{serialNumber ? 'VERIFY CODE' : 'ENTER CODE'}</span>
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
            style={{ borderColor: themes[currentTheme].color }}
          >
            <PanelTitle style={{ color: 'white', justifyContent: 'flex-start', position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <FaWallet size={20} /> VAULT CONNECTION
              </div>
              <motion.button onClick={() => handleInfoClick('vault')} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', opacity: 0.15, padding: '2px', lineHeight: 1, position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)' }} whileHover={{ opacity: 0.8 }}><FaInfoCircle size={14} /></motion.button>
            </PanelTitle>
            {infoPopup === 'vault' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: 'easeInOut' }} style={{ position: 'absolute', top: '0.5rem', left: '0.5rem', right: '0.5rem', zIndex: 10, background: 'rgba(8, 8, 20, 0.98)', backdropFilter: 'blur(16px)', border: `1px solid ${themes[currentTheme].color}66`, borderRadius: '12px', padding: '1rem 1.2rem', fontFamily: 'var(--font-secondary)', fontSize: '0.85rem', color: 'rgba(255,255,255,0.95)', lineHeight: 1.6, boxShadow: `0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 ${themes[currentTheme].color}22` }}>
                {INFO_TEXT.vault}
              </motion.div>
            )}
            <IdentityInfo>
              <div style={{ width: '100%', textAlign: 'center', marginBottom: '1.5rem' }}>
                {!isVaultLocked ? (
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>Connected: {(walletAddress || hookWalletAddress || '').slice(0, 6)}...{(walletAddress || hookWalletAddress || '').slice(-4)}</p>
                ) : (
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.1rem' }}>Create or connect your Crown to unlock the Vault.</p>
                )}
              </div>
              <div style={{ flex: 1 }}></div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: 'auto' }}>
                {isVaultLocked ? (
                  <ActionButton
                    $primary
                    onClick={handleConnect}
                    whileHover={{ scale: 1.05, boxShadow: '0 0 25px var(--vault-glow)' }}
                    whileTap={{ scale: 0.95 }}
                    style={{
                      width: '100%',
                      padding: '1rem 2rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1rem',
                      gap: '0.4rem',
                      background: `linear-gradient(90deg, ${themes[currentTheme].color}33 0%, ${themes[currentTheme].color}66 50%, ${themes[currentTheme].color}33 100%)`,
                      border: `1px solid ${themes[currentTheme].color}`
                    }}
                  >
                    <FaWallet size={18} />
                    <span style={{ fontWeight: 800, letterSpacing: '0.05em' }}>CONNECT<span style={{ margin: '0 0.3rem', opacity: 0.5 }}>|</span>CREATE</span>
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
                      <FaSignOutAlt /> Disconnect
                    </ActionButton>
                  </>
                )}
              </div>

              {/* Push Notifications + Sound Toggle */}
              {!isVaultLocked && (
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '0.75rem' }}>
                  {isPushSupported() && pushPermission !== 'granted' && (
                    <motion.button
                      onClick={handleEnablePush}
                      whileHover={{ scale: 1.03, opacity: 1 }}
                      whileTap={{ scale: 0.97 }}
                      style={{
                        flex: 1,
                        background: 'rgba(65, 105, 225, 0.08)',
                        border: '1px solid rgba(65, 105, 225, 0.25)',
                        borderRadius: '8px',
                        padding: '0.5rem',
                        color: 'rgba(255, 255, 255, 0.6)',
                        cursor: 'pointer',
                        fontFamily: 'var(--font-secondary)',
                        fontSize: '0.7rem',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                      }}
                    >
                      <FaBell size={11} /> ENABLE NOTIFICATIONS
                    </motion.button>
                  )}
                  {pushPermission === 'granted' && (
                    <div style={{
                      flex: 1,
                      background: 'rgba(52, 199, 89, 0.06)',
                      border: '1px solid rgba(52, 199, 89, 0.2)',
                      borderRadius: '8px',
                      padding: '0.5rem',
                      color: 'rgba(52, 199, 89, 0.6)',
                      fontFamily: 'var(--font-secondary)',
                      fontSize: '0.7rem',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      textAlign: 'center',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                    }}>
                      <FaBell size={11} /> NOTIFICATIONS ON
                    </div>
                  )}
                  <motion.button
                    onClick={() => { setSoundEnabled(!soundEnabled); playClick(); }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    style={{
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      padding: '0.5rem 0.75rem',
                      color: soundEnabled ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.2)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
                  >
                    {soundEnabled ? <FaVolumeUp size={13} /> : <FaVolumeMute size={13} />}
                  </motion.button>
                </div>
              )}
            </IdentityInfo>
          </IdentityPanel>
        </TopPanelsRow>

        {/* Wallet Mismatch Banner */}
        {!isVaultLocked && userTokens.length === 0 && walletAddress && isPersistentlyVerified && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              maxWidth: '1400px',
              margin: '0 auto 1.5rem',
              padding: '1rem 1.5rem',
              background: 'rgba(255, 159, 10, 0.08)',
              border: '1px solid rgba(255, 159, 10, 0.3)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              fontFamily: 'var(--font-secondary)',
              fontSize: '0.85rem',
              color: 'rgba(255, 255, 255, 0.7)',
              position: 'relative',
              zIndex: 1,
            }}
          >
            <FaExclamationTriangle style={{ color: '#FF9F0A', flexShrink: 0, fontSize: '1.1rem' }} />
            <div>
              <strong style={{ color: '#FF9F0A' }}>Wallet Mismatch</strong> — Your verified collectibles may be on a different wallet.
              Connect the wallet that owns your NFTs to view and manage them here.
            </div>
          </motion.div>
        )}

        <ControlDeckRow>
          {/* Row 2 Left: Character Title */}
          <CharacterTitlePanel
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            style={{ borderColor: themes[currentTheme].color }}
          >
            {isComingSoonSelected ? (
              <>
                <h2>COMING SOON</h2>
                <h3 style={{ color: themes[currentTheme].color }}>To Be Announced</h3>
                <ArtistDetails>
                  <ArtistDetailItem>
                    <span className="label">Origin</span>
                    <span className="value" style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>
                  </ArtistDetailItem>
                  <ArtistDetailItem>
                    <span className="label">Birthday</span>
                    <span className="value" style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>
                  </ArtistDetailItem>
                  <ArtistDetailItem>
                    <span className="label">Height</span>
                    <span className="value" style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>
                  </ArtistDetailItem>
                  <ArtistDetailItem>
                    <span className="label">Weight</span>
                    <span className="value" style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>
                  </ArtistDetailItem>
                </ArtistDetails>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <SocialMediaLinks style={{ visibility: 'hidden' }}>
                    <SocialIcon as="span" className="twitter"><FaTwitter /></SocialIcon>
                    <SocialIcon as="span" className="instagram"><FaInstagram /></SocialIcon>
                    <SocialIcon as="span" className="youtube"><FaYoutube /></SocialIcon>
                    <SocialIcon as="span" className="tiktok"><FaTiktok /></SocialIcon>
                  </SocialMediaLinks>
                  <div className="status" style={{ color: themes[currentTheme].color, borderColor: themes[currentTheme].color }}>
                    <FaLock /> ASSET LOCKED
                  </div>
                </div>
              </>
            ) : (
              <>
                <h2>LIL DURK</h2>
                <h3>American Rapper</h3>
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <SocialMediaLinks>
                    <SocialIcon href="https://twitter.com/lildurk" target="_blank" rel="noopener noreferrer" className="twitter" title="Follow on Twitter"><FaTwitter /></SocialIcon>
                    <SocialIcon href="https://instagram.com/lildurk" target="_blank" rel="noopener noreferrer" className="instagram" title="Follow on Instagram"><FaInstagram /></SocialIcon>
                    <SocialIcon href="https://youtube.com/@lildurk" target="_blank" rel="noopener noreferrer" className="youtube" title="Subscribe on YouTube"><FaYoutube /></SocialIcon>
                    <SocialIcon href="https://tiktok.com/@lildurk" target="_blank" rel="noopener noreferrer" className="tiktok" title="Follow on TikTok"><FaTiktok /></SocialIcon>
                  </SocialMediaLinks>
                  <div className={`status ${isAssetVerified ? 'active' : ''}`}>
                    {isAssetVerified ? <FaCheck /> : <FaLock />}
                    {isAssetVerified ? 'ASSET VERIFIED' : 'ASSET LOCKED'}
                  </div>
                </div>
              </>
            )}
          </CharacterTitlePanel>

          {/* Row 2 Right: Grid only */}
          <CharacterSelectSection>
            <SelectGrid $verified={isAssetVerified} style={{ borderColor: themes[currentTheme].color }}>
              {/* Slot 0: Lil Durk */}
              <SelectSlot
                $active={selectedCharacter === null}
                $owned={isDurkOwned}
                $verified={isAssetVerified}
                $locked={isVaultLocked}
                onClick={() => handleSlotClick(0)}
                style={{ cursor: 'pointer' }}
              >
                <img src={DURK_FACE_IMG} alt="Lil Durk" loading="lazy" decoding="async" />
                <motion.div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'radial-gradient(circle at center, rgba(65, 105, 225, 0.3) 0%, rgba(65, 105, 225, 0.1) 35%, transparent 65%)',
                    pointerEvents: 'none',
                    zIndex: 3,
                  }}
                  animate={{
                    opacity: [0, 0.8, 0],
                    scale: [0.6, 1.4, 0.6],
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
              </SelectSlot>
              {/* Slots 1-6: Coming Soon with unique colors */}
              {[1, 2, 3, 4, 5, 6].map((slotIdx) => (
                <SelectSlot
                  key={slotIdx}
                  $active={selectedCharacter === slotIdx}
                  $owned={false}
                  $locked={true}
                  onClick={() => handleSlotClick(slotIdx)}
                  style={{ cursor: 'pointer', borderColor: selectedCharacter === slotIdx ? themes[SLOT_THEMES[slotIdx]].color : undefined }}
                >
                  <ComingSoonOverlay $themeColor={themes[SLOT_THEMES[slotIdx]].color}>
                    <div className="status">COMING SOON</div>
                  </ComingSoonOverlay>
                </SelectSlot>
              ))}
              {/* Slot 7: Reserved */}
              <SelectSlot
                $active={false}
                $owned={false}
                $locked={true}
                style={{ cursor: 'default' }}
              >
                <ComingSoonOverlay>
                  <div className="status">COMING SOON</div>
                </ComingSoonOverlay>
              </SelectSlot>
            </SelectGrid>

            <CrownWeightModule style={{ borderColor: themes[currentTheme].color }}>
              <LogoBackground src={crownLogo} alt="" aria-hidden="true" />
              {!isVaultLocked ? (
                <WeightDisplay
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", bounce: 0.5 }}
                >
                  <WeightCounter>{crownWeight}</WeightCounter>
                  <WeightLabel>CROWN WEIGHT</WeightLabel>
                  {crownWeight === 100 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      style={{
                        fontSize: '0.65rem',
                        color: '#FFD700',
                        marginTop: '0.8rem',
                        letterSpacing: '0.1em',
                        borderTop: '1px solid rgba(255, 215, 0, 0.3)',
                        paddingTop: '0.5rem'
                      }}
                    >
                      YOUR CROWN HAS BEEN FORGED
                    </motion.div>
                  )}
                </WeightDisplay>
              ) : (
                <motion.div
                  style={{ textAlign: 'center', zIndex: 1, cursor: 'pointer' }}
                  onClick={() => setShowCrownInfoModal(true)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <h3 style={{
                    fontFamily: 'var(--font-primary)',
                    color: 'rgba(255,255,255,0.3)',
                    fontSize: '2rem',
                    margin: 0,
                    lineHeight: 1.3,
                    letterSpacing: '0.1em',
                    textShadow: '0 0 15px rgba(255,255,255,0.08)'
                  }}>
                    HOW HEAVY IS<br />YOUR CROWN?
                  </h3>
                </motion.div>
              )}
            </CrownWeightModule>
          </CharacterSelectSection>
        </ControlDeckRow>

        <MiddleRow style={{ gridTemplateRows: 'auto' }}>
          {isComingSoonSelected ? (
            <>
              {/* Coming Soon Placeholder - ID Card */}
              <IDCard
                $owned={false}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                style={{ borderColor: themes[currentTheme].color }}
              >
                <IDImageContainer style={{ position: 'relative' }}>
                  <div style={{
                    width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: `radial-gradient(circle at center, ${themes[currentTheme].color}15 0%, transparent 70%)`,
                  }}>
                    <div style={{ textAlign: 'center' }}>
                      <FaLock size={48} style={{ color: themes[currentTheme].color, opacity: 0.4, marginBottom: '1rem' }} />
                      <div style={{ fontFamily: 'var(--font-primary)', fontSize: '1.5rem', color: 'white', letterSpacing: '0.1em' }}>
                        COMING SOON
                      </div>
                      <div style={{ fontFamily: 'var(--font-secondary)', fontSize: '0.8rem', color: 'rgba(255,255,255,0.3)', marginTop: '0.5rem' }}>
                        New Character Reveal Pending
                      </div>
                    </div>
                  </div>
                </IDImageContainer>
                <IDFooter>
                  <div className="series-label" style={{ color: themes[currentTheme].color }}>?</div>
                </IDFooter>
              </IDCard>

              {/* Coming Soon Placeholder - Details */}
              <DetailsPanel
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                style={{ borderColor: themes[currentTheme].color }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <AssetTitle>Digital Collectible</AssetTitle>
                  <AssetSubtitle style={{ fontFamily: 'var(--font-primary)', fontWeight: 400, textAlign: 'center', marginBottom: '0.5rem' }}>Coming Soon</AssetSubtitle>
                  <img src={crownLogo} alt="Crownmania" style={{ height: '32px', width: 'auto', opacity: 0.9 }} />
                </div>
                <DetailGrid>
                  <DetailItem><label>Collection Name</label><div><span style={{ fontSize: '1.8rem', display: 'block', lineHeight: 1.2, color: 'white' }}>COMING SOON</span><span style={{ fontSize: '1.3rem', color: themes[currentTheme].color }}>To Be Announced</span></div></DetailItem>
                  <DetailItem><label>Token Address</label><div className="dim" style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>?</div></DetailItem>
                  <DetailItem><label>Edition</label><div className="dim">? / ???</div></DetailItem>
                  <DetailItem><label>Date Claimed</label><div className="dim">?</div></DetailItem>
                  <DetailItem><label>Verified On</label><div className="dim">?</div></DetailItem>
                </DetailGrid>
                <div style={{ marginTop: 'auto' }}>
                  <label style={{ fontFamily: 'var(--font-secondary)', fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 600, marginBottom: '0.5rem', display: 'block' }}>Status</label>
                  <OwnerBadge $owned={false} style={{ borderColor: themes[currentTheme].color, color: themes[currentTheme].color }}>
                    <FaLock /> UNREVEALED
                  </OwnerBadge>
                </div>
              </DetailsPanel>

              {/* Coming Soon Placeholder - 3D Viewer */}
              <ModelViewerPanel style={{ borderColor: themes[currentTheme].color }}>
                <ModelHeader>
                  <h3 style={{ color: 'white' }}><FaCube size={14} /> 3D VIEWER</h3>
                </ModelHeader>
                <ModelCanvas $locked={true} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px', background: `radial-gradient(circle at center, ${themes[currentTheme].color}10 0%, transparent 60%)` }}>
                  <motion.div
                    animate={{ scale: [0.9, 1.1, 0.9], opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    style={{ textAlign: 'center' }}
                  >
                    <FaCube size={64} style={{ color: themes[currentTheme].color, opacity: 0.3 }} />
                    <div style={{ fontFamily: 'var(--font-primary)', fontSize: '1rem', color: themes[currentTheme].color, opacity: 0.5, marginTop: '1rem', letterSpacing: '0.15em' }}>
                      MODEL PENDING
                    </div>
                  </motion.div>
                </ModelCanvas>
              </ModelViewerPanel>
            </>
          ) : (
            <>
              {/* ROW 3: ID, Details, 3D Viewer */}
              <IDCard
                $owned={isDurkOwned}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                style={{ borderColor: themes[currentTheme].color }}
              >
                <ModelHeader>
                  <h3 style={{ color: 'white' }}><FaImages size={14} /> GALLERY</h3>
                </ModelHeader>
                <IDImageContainer style={{ position: 'relative' }}>
                  {/* Single image carousel */}
                  <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
                    <OptimizedImage
                      src={idCardImages[idCardImageIndex].src}
                      alt={idCardImages[idCardImageIndex].label}
                      style={{
                        width: '100%', height: '100%', objectFit: 'cover', transform: 'scale(1.05)', transformOrigin: 'center 40%',
                        filter: isAssetVerified
                          ? 'saturate(1.15) contrast(1.05) brightness(1.02)'
                          : 'grayscale(100%) contrast(1.1) brightness(0.85)',
                        transition: 'filter 1.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.5s ease'
                      }}
                    />

                  </div>
                  {/* Left arrow */}
                  <button
                    onClick={handleIdCardPrev}
                    style={{
                      position: 'absolute', left: '6px', top: '50%', transform: 'translateY(-50%)', zIndex: 4,
                      background: 'rgba(0,0,0,0.6)', border: `1px solid ${themes[currentTheme].color}44`, borderRadius: '50%',
                      width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', cursor: 'pointer', fontSize: '0.8rem', transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = `${themes[currentTheme].color}66`; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.6)'; }}
                  >
                    <FaChevronLeft size={12} />
                  </button>
                  {/* Right arrow */}
                  <button
                    onClick={handleIdCardNext}
                    style={{
                      position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', zIndex: 4,
                      background: 'rgba(0,0,0,0.6)', border: `1px solid ${themes[currentTheme].color}44`, borderRadius: '50%',
                      width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', cursor: 'pointer', fontSize: '0.8rem', transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = `${themes[currentTheme].color}66`; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.6)'; }}
                  >
                    <FaChevronRight size={12} />
                  </button>
                </IDImageContainer>
              </IDCard>

              <DetailsPanel
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                style={{ borderColor: themes[currentTheme].color }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}><AssetTitle style={{ margin: 0 }}>Digital Collectible</AssetTitle></div>
                    <AssetSubtitle style={{ fontFamily: 'var(--font-primary)', fontWeight: 400, textAlign: 'left', marginBottom: 0 }}>Collectible details</AssetSubtitle>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                    <img src={crownLogo} alt="Crownmania" style={{ height: '48px', width: 'auto', opacity: 0.9 }} />
                    <motion.button onClick={() => handleInfoClick('collectible')} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', opacity: 0.15, padding: '2px', lineHeight: 1 }} whileHover={{ opacity: 0.8 }}><FaInfoCircle size={14} /></motion.button>
                  </div>
                </div>
                {infoPopup === 'collectible' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: 'easeInOut' }} style={{ position: 'absolute', top: '0.5rem', left: '0.5rem', right: '0.5rem', zIndex: 10, background: 'rgba(8, 8, 20, 0.98)', backdropFilter: 'blur(16px)', border: `1px solid ${themes[currentTheme].color}66`, borderRadius: '12px', padding: '1rem 1.2rem', fontFamily: 'var(--font-secondary)', fontSize: '0.85rem', color: 'rgba(255,255,255,0.95)', lineHeight: 1.6, boxShadow: `0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 ${themes[currentTheme].color}22` }}>
                    {INFO_TEXT.collectible}
                  </motion.div>
                )}
                {userTokens.length > 1 && (
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{
                      fontFamily: 'var(--font-secondary)',
                      fontSize: '0.7rem',
                      color: 'rgba(255,255,255,0.45)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.15em',
                      fontWeight: 600,
                      marginBottom: '0.5rem',
                      display: 'block'
                    }}>Select Collectible</label>
                    <select
                      value={userTokens.findIndex(t =>
                        (t.id && t.id === activeToken?.id) ||
                        (String(t.tokenId) === String(activeToken?.tokenId) && String(t.edition || t.editionNumber) === String(activeToken?.edition || activeToken?.editionNumber))
                      )}
                      onChange={(e) => handleSelectToken(userTokens[parseInt(e.target.value)])}
                      style={{
                        width: '100%',
                        padding: '0.6rem 0.75rem',
                        background: 'rgba(0,0,0,0.4)',
                        border: `1px solid ${themes[currentTheme].color}66`,
                        borderRadius: '8px',
                        color: 'white',
                        fontFamily: 'var(--font-secondary)',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        outline: 'none'
                      }}
                    >
                      {userTokens.map((token, i) => (
                        <option key={i} value={i} style={{ background: '#0a0a1a' }}>
                          {PRODUCT_NAMES[token.productId]?.name || token.productName || 'Unknown'} #{token.edition || token.editionNumber || token.tokenId} — Token #{token.tokenId}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <DetailGrid>
                  <DetailItem>
                    <label>Collection Name</label>
                    <div>
                      <span style={{ fontSize: '1.8rem', display: 'block', lineHeight: 1.2 }}>
                        {PRODUCT_NAMES[activeToken?.productId]?.name || activeToken?.productName || 'CROWNMANIA'}
                      </span>
                      <span style={{ fontSize: '1.3rem', color: 'rgba(255,255,255,0.7)' }}>
                        {PRODUCT_NAMES[activeToken?.productId]?.subtitle || 'DIGITAL COLLECTIBLE'}
                      </span>
                    </div>
                  </DetailItem>
                  <DetailItem>
                    <label>Token Address</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className={displayTokenAddress ? '' : 'dim'} style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>
                        {displayTokenAddress ? formatAddress(displayTokenAddress) : '0x...'}
                      </span>
                      {displayTokenAddress && (
                        <CopyButton onClick={handleCopyTokenAddress} title="Copy token address" style={{ padding: '0.1rem' }}>
                          <FaCopy size={12} />
                        </CopyButton>
                      )}
                    </div>
                  </DetailItem>
                  <DetailItem>
                    <label>Token ID</label>
                    <div className={displayTokenId ? 'highlight' : 'dim'} style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>
                      {displayTokenId ? displayTokenId : '—'}
                    </div>
                  </DetailItem>
                  <DetailItem>
                    <label>Transaction Hash</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <a
                        href={displayTransactionHash ? `https://polygonscan.com/tx/${displayTransactionHash}` : undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={displayTransactionHash ? 'highlight' : 'dim'}
                        style={{ fontFamily: 'monospace', fontSize: '0.9rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                      >
                        {displayTransactionHash ? formatAddress(displayTransactionHash) : '—'}
                        {displayTransactionHash && <FaExternalLinkAlt size={10} />}
                      </a>
                    </div>
                  </DetailItem>
                  <DetailItem>
                    <label>Edition</label>
                    <div className={displayEdition ? 'highlight' : 'dim'}>
                      {displayEdition ? `#${displayEdition} / 500` : '\u2014 / 500'}
                    </div>
                  </DetailItem>
                  <DetailItem>
                    <label>Rarity</label>
                    {rarityTier ? (
                      <RarityRevealText $tier={rarityTier.label.toLowerCase()} key={rarityTier.label}>
                        <span className="rarity-icon">{rarityTier.icon}</span> {rarityTier.label}
                      </RarityRevealText>
                    ) : (
                      <div className="dim" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FaLock size={14} /> UNASSIGNED
                      </div>
                    )}
                  </DetailItem>
                  <DetailItem>
                    <label>Date Claimed</label>
                    <div className={displayClaimDate ? 'highlight' : 'dim'}>
                      {displayClaimDate ? formatClaimDate(displayClaimDate) : '---'}
                    </div>
                  </DetailItem>
                  <DetailItem>
                    <label>Verified On</label>
                    <div className={displayVerifiedAt ? 'highlight' : 'dim'}>
                      {displayVerifiedAt ? formatClaimDate(displayVerifiedAt) : 'Not Verified'}
                    </div>
                  </DetailItem>
                </DetailGrid>

                <div style={{ marginTop: 'auto' }}>
                  <label style={{
                    fontFamily: 'var(--font-secondary)',
                    fontSize: '0.85rem',
                    color: 'rgba(255, 255, 255, 0.45)',
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

              <ModelViewerPanel style={{ borderColor: themes[currentTheme].color }}>
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
                <ModelCanvas $locked={isVaultLocked && !isAssetVerified}>
                  <Suspense fallback={
                    <LoadingSpinner>
                      <FaSpinner size={32} />
                      <span>LOADING 3D MODEL...</span>
                    </LoadingSpinner>
                  }>
                    <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 0.5, 8], fov: 50 }}>
                      <ambientLight intensity={0.7} />
                      <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1.2} castShadow />
                      <pointLight position={[-10, -10, -10]} intensity={0.5} />
                      <pointLight position={[0, 5, 5]} intensity={0.3} />
                      <Suspense fallback={null}>
                        <group position={[0, -1.8, 0]}>
                          <DurkModel isUnlocked={!isVaultLocked || isAssetVerified} />
                        </group>
                        <Environment preset="city" />
                      </Suspense>
                      <OrbitControls
                        autoRotate={true}
                        autoRotateSpeed={28.0}
                        enableZoom={true}
                        enablePan={false}
                        minDistance={4}
                        maxDistance={15}
                        minPolarAngle={Math.PI / 6}
                        maxPolarAngle={Math.PI / 1.8}
                      />
                    </Canvas>
                  </Suspense>
                </ModelCanvas>
              </ModelViewerPanel>
            </>
          )}
        </MiddleRow>

        <ExclusivePanel
          $unlocked={isAssetVerified}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ flexDirection: 'column', gap: '1.5rem', justifyContent: 'flex-start', paddingTop: '2rem', borderColor: themes[currentTheme].color }}
        >
          <h3 style={{ fontFamily: 'var(--font-primary)', fontSize: '1.2rem', color: 'white', textTransform: 'uppercase', letterSpacing: '0.15em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            EXCLUSIVE ACCESS & UNLOCKABLES
            <motion.button onClick={() => handleInfoClick('exclusive')} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', opacity: 0.15, padding: '2px', lineHeight: 1 }} whileHover={{ opacity: 0.8 }}><FaInfoCircle size={14} /></motion.button>
          </h3>
          {infoPopup === 'exclusive' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: 'easeInOut' }} style={{ position: 'absolute', top: '0.5rem', left: '0.5rem', right: '0.5rem', zIndex: 10, background: 'rgba(8, 8, 20, 0.98)', backdropFilter: 'blur(16px)', border: `1px solid ${themes[currentTheme].color}66`, borderRadius: '12px', padding: '1rem 1.2rem', fontFamily: 'var(--font-secondary)', fontSize: '0.85rem', color: 'rgba(255,255,255,0.95)', lineHeight: 1.6, boxShadow: `0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 ${themes[currentTheme].color}22` }}>
              {INFO_TEXT.exclusive}
            </motion.div>
          )}
          <p style={{ fontFamily: 'var(--font-secondary)', fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)', maxWidth: '600px', margin: '0 0 1.5rem 0' }}>
            Verified digital collectible owners will gain access to Exclusive Utilities and Unlockables. Includes early access to content, exclusive merchandise, concert tickets, and future airdrops.
          </p>

          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', justifyContent: 'center', width: '100%', maxWidth: '800px' }}>
            <ActionButton
              style={{ justifyContent: 'space-between', flex: 1, minWidth: '200px' }}
              onClick={openTransferModal}
              disabled={!isDurkOwned}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <FaExchangeAlt /> LEGACY TRANSFER
              </span>
              {!isDurkOwned && <FaLock size={12} />}
            </ActionButton>
            <ActionButton
              style={{ justifyContent: 'space-between', flex: 1, minWidth: '200px', opacity: 0.6, cursor: 'default' }}
              onClick={() => showToastMessage('Collector perks coming soon — stay tuned!')}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <FaGem /> EXCLUSIVE PERKS
              </span>
              <span style={{ fontSize: '0.6rem', letterSpacing: '0.12em', opacity: 0.6, border: '1px solid rgba(255,255,255,0.2)', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>SOON</span>
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

      {/* Crown Weight Info Modal */}
      <AnimatePresence>
        {showCrownInfoModal && (
          <ModalOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowCrownInfoModal(false)}
          >
            <ModalContent
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <h3><img src={crownLogo} alt="CrownMania" style={{ height: '24px', width: 'auto', verticalAlign: 'middle', marginRight: '0.5rem' }} /> CROWN WEIGHT</h3>
              <div style={{
                fontFamily: 'var(--font-secondary)',
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: '0.9rem',
                lineHeight: 1.7,
                textAlign: 'left'
              }}>
                <p style={{ marginBottom: '1rem' }}>
                  Your <span style={{ color: '#FFD700', fontWeight: 600 }}>Crown Weight</span> is a measure of your legacy within CrownMania. The heavier the crown, the greater your standing.
                </p>
                <p style={{ marginBottom: '1rem' }}>
                  Every collectible you verify, every piece you own, and every action you take adds weight to your crown. It's not just a number — it represents your commitment to the culture.
                </p>
                <div style={{
                  background: 'rgba(255, 215, 0, 0.06)',
                  border: '1px solid rgba(255, 215, 0, 0.15)',
                  borderRadius: '12px',
                  padding: '1rem 1.25rem',
                  marginBottom: '1rem'
                }}>
                  <div style={{ color: '#FFD700', fontFamily: 'var(--font-primary)', fontSize: '0.85rem', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>
                    HOW TO EARN WEIGHT
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
                    <div>🔐 <strong style={{ color: 'white' }}>Verify a collectible</strong> — Prove authenticity</div>
                    <div>💎 <strong style={{ color: 'white' }}>Own rare editions</strong> — Limited pieces carry more</div>
                    <div>🔗 <strong style={{ color: 'white' }}>Connect your wallet</strong> — Forge your crown</div>
                    <div>🏆 <strong style={{ color: 'white' }}>Complete your collection</strong> — Unlock elite status</div>
                    <div>🐦 <strong style={{ color: 'white' }}>Follow on Twitter</strong> — +20 CW (one time)</div>
                    <div>📸 <strong style={{ color: 'white' }}>Follow on Instagram</strong> — +30 CW (one time)</div>
                    <div>💬 <strong style={{ color: 'white' }}>Join the Discord</strong> — +50 CW (one time)</div>
                    <div>🎵 <strong style={{ color: 'white' }}>Follow on TikTok</strong> — +30 CW (one time)</div>
                  </div>
                </div>
                <p style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: '0.8rem', textAlign: 'center', margin: 0 }}>
                  The heavier your crown, the more exclusive rewards you unlock.
                </p>
              </div>
              <ActionButton
                onClick={() => setShowCrownInfoModal(false)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{ marginTop: '1.5rem' }}
              >
                GOT IT
              </ActionButton>
            </ModalContent>
          </ModalOverlay>
        )}
      </AnimatePresence>

      {/* Verification Flow Modal */}
      <AnimatePresence>
        {showVerifyModal && (
          <ModalOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeVerifyModal}
          >
            <VerifyModalContent
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.85, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0, y: 30 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            >
              {/* Step Indicator */}
              <VerifyStepIndicator>
                {[1, 2, 3, 4].map(s => (
                  <StepDot key={s} $active={verifyStep >= s} />
                ))}
              </VerifyStepIndicator>

              {/* STEP 1: Serial Number Input */}
              {verifyStep === 1 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <VerifyTitle>VERIFY COLLECTIBLE</VerifyTitle>
                  <VerifySubtitle>Enter your product code to authenticate your collectible</VerifySubtitle>

                  <SerialInput
                    placeholder="Enter serial number..."
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                    autoFocus
                    style={{ marginBottom: '1.5rem', textAlign: 'center', letterSpacing: '0.15em', fontSize: '1.1rem' }}
                  />

                  <ActionButton
                    $primary
                    onClick={handleVerify}
                    disabled={!serialNumber.trim()}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    style={{ width: '100%' }}
                  >
                    <FaShieldAlt /> INITIATE SCAN
                  </ActionButton>

                  <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                    <span
                      style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.75rem', cursor: 'pointer' }}
                      onClick={closeVerifyModal}
                    >
                      Cancel
                    </span>
                  </div>
                </motion.div>
              )}

              {/* STEP 2: Scanning Animation */}
              {verifyStep === 2 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <VerifyTitle>SCANNING CODE</VerifyTitle>
                  <VerifySubtitle>Authenticating your product serial number...</VerifySubtitle>

                  <ScanContainer>
                    <ScanLine />
                    <ScanCodeDisplay>{serialNumber.trim()}</ScanCodeDisplay>
                  </ScanContainer>

                  <ProgressBarContainer>
                    <ProgressBarFill style={{ width: `${scanProgress}%` }} />
                  </ProgressBarContainer>

                  <ScanStatusText>
                    {scanProgress < 30 && 'INITIALIZING SECURE CONNECTION...'}
                    {scanProgress >= 30 && scanProgress < 60 && 'QUERYING AUTHENTICATION DATABASE...'}
                    {scanProgress >= 60 && scanProgress < 90 && 'CROSS-REFERENCING SERIAL RECORDS...'}
                    {scanProgress >= 90 && 'FINALIZING SCAN...'}
                  </ScanStatusText>
                </motion.div>
              )}

              {/* STEP 3: Analyzing */}
              {verifyStep === 3 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <VerifyTitle>ANALYZING</VerifyTitle>
                  <VerifySubtitle>Verifying product authenticity and edition details...</VerifySubtitle>

                  <AnalyzeRing />

                  <ScanStatusText style={{ marginTop: '1.5rem' }}>
                    VALIDATING DIGITAL CERTIFICATE...
                  </ScanStatusText>
                </motion.div>
              )}

              {/* STEP 4: Result */}
              {verifyStep === 4 && verificationResult && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', damping: 20 }}
                >
                  <VerifyTitle>
                    {verificationResult.status === 'success' ? 'VERIFIED' : 'SCAN COMPLETE'}
                  </VerifyTitle>

                  <ResultIcon
                    $success={verificationResult.status === 'success'}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', delay: 0.2, damping: 15 }}
                  >
                    {verificationResult.status === 'success' ? <FaCheck /> : <FaTimes />}
                  </ResultIcon>

                  <ResultMessage $success={verificationResult.status === 'success'}>
                    {verificationResult.status === 'success' ? 'AUTHENTICATION SUCCESSFUL' : 'AUTHENTICATION FAILED'}
                  </ResultMessage>

                  <ResultDetail>
                    {verificationResult.message}
                  </ResultDetail>

                  {verificationResult.status === 'success' && verificationResult.editionNumber && (
                    <div style={{
                      textAlign: 'center',
                      padding: '1rem',
                      background: 'rgba(52, 199, 89, 0.08)',
                      borderRadius: '12px',
                      border: '1px solid rgba(52, 199, 89, 0.2)',
                      marginBottom: '1.5rem'
                    }}>
                      <span style={{
                        fontFamily: 'var(--font-primary)',
                        color: '#34C759',
                        fontSize: '1.2rem',
                        letterSpacing: '0.1em'
                      }}>
                        EDITION #{verificationResult.editionNumber}/500
                      </span>
                    </div>
                  )}

                  <ActionButton
                    onClick={closeVerifyModal}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    style={{ width: '100%' }}
                    $primary={verificationResult.status === 'success'}
                  >
                    {verificationResult.status === 'success' ? (
                      <><FaCheck /> CONTINUE TO VAULT</>
                    ) : (
                      <><FaArrowRight /> TRY AGAIN</>
                    )}
                  </ActionButton>
                </motion.div>
              )}
            </VerifyModalContent>
          </ModalOverlay>
        )}
      </AnimatePresence>

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
                value={walletAddress || hookWalletAddress || ''}
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

      {/* Transfer Modal — 5-Step Flow */}
      <AnimatePresence>
        {showTransferModal && (
          <ModalOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeTransferModal}
          >
            <ModalContent
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              style={{ maxWidth: transferStep === 5 ? '520px' : '480px' }}
            >
              {/* Step indicator */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                {[1, 2, 3].map(step => (
                  <div
                    key={step}
                    style={{
                      width: transferStep >= step ? '2rem' : '0.5rem',
                      height: '4px',
                      borderRadius: '2px',
                      background: transferStep >= step ? 'var(--vault-accent)' : 'rgba(255,255,255,0.1)',
                      transition: 'all 0.3s ease',
                    }}
                  />
                ))}
              </div>

              {/* ── Step 1: Destination Address ── */}
              {transferStep === 1 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <FaExchangeAlt /> EXTERNAL TRANSFER
                  </h3>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', marginBottom: '1.25rem', fontFamily: 'var(--font-secondary)', lineHeight: 1.6 }}>
                    Transfer your NFT to an external wallet (MetaMask, Trust Wallet, etc). This action is <strong style={{ color: 'var(--vault-error)' }}>permanent and irreversible</strong>.
                  </p>
                  <label style={{ fontFamily: 'var(--font-secondary)', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
                    Destination Wallet Address
                  </label>
                  <ModalInput
                    placeholder="0x..."
                    value={transferDestination}
                    onChange={(e) => { setTransferDestination(e.target.value); setTransferError(''); }}
                    onKeyDown={(e) => e.key === 'Enter' && handleTransferStep1()}
                    autoFocus
                  />
                  {transferError && (
                    <StatusMessage $status="error" style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}>
                      <FaTimes /> {transferError}
                    </StatusMessage>
                  )}
                  <ModalButtonRow>
                    <ActionButton $primary onClick={handleTransferStep1} style={{ flex: 2 }}>
                      CONTINUE <FaArrowRight size={12} />
                    </ActionButton>
                    <ActionButton onClick={closeTransferModal} style={{ flex: 1 }}>
                      CANCEL
                    </ActionButton>
                  </ModalButtonRow>
                </motion.div>
              )}

              {/* ── Step 2: 2FA Verification ── */}
              {transferStep === 2 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <FaShieldAlt /> IDENTITY VERIFICATION
                  </h3>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', marginBottom: '1.25rem', fontFamily: 'var(--font-secondary)', lineHeight: 1.6 }}>
                    For security, verify your identity with a 2FA code. The code is valid for <strong style={{ color: 'var(--vault-accent)' }}>20 minutes</strong>.
                  </p>

                  {!transfer2FASent ? (
                    <>
                      <label style={{ fontFamily: 'var(--font-secondary)', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
                        Verification Method
                      </label>
                      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
                        {['email', 'sms'].map(method => (
                          <ActionButton
                            key={method}
                            $primary={transfer2FAMethod === method}
                            onClick={() => setTransfer2FAMethod(method)}
                            style={{ flex: 1, padding: '0.75rem', fontSize: '0.8rem', textTransform: 'uppercase' }}
                          >
                            {method === 'email' ? '📧' : '📱'} {method}
                          </ActionButton>
                        ))}
                      </div>
                      <ActionButton
                        $primary
                        onClick={handleRequest2FA}
                        disabled={transfer2FALoading}
                      >
                        {transfer2FALoading ? <FaSpinner className="spin" /> : <FaShieldAlt />}
                        {transfer2FALoading ? 'SENDING...' : 'SEND VERIFICATION CODE'}
                      </ActionButton>
                    </>
                  ) : (
                    <>
                      <div style={{
                        padding: '0.75rem 1rem',
                        background: 'rgba(52, 199, 89, 0.08)',
                        border: '1px solid rgba(52, 199, 89, 0.2)',
                        borderRadius: '8px',
                        marginBottom: '1rem',
                        fontFamily: 'var(--font-secondary)',
                        fontSize: '0.8rem',
                        color: 'var(--vault-success)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <FaCheck /> Code sent via {transfer2FAMethod}. Check your {transfer2FAMethod === 'email' ? 'inbox' : 'messages'}.
                      </div>
                      <label style={{ fontFamily: 'var(--font-secondary)', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
                        Enter 6-digit code
                      </label>
                      <ModalInput
                        ref={transfer2FAInputRef}
                        placeholder="000000"
                        value={transfer2FACode}
                        onChange={(e) => { setTransfer2FACode(e.target.value.replace(/\D/g, '').slice(0, 6)); setTransferError(''); }}
                        onKeyDown={(e) => e.key === 'Enter' && handleTransferStep2()}
                        maxLength={6}
                        style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5em', fontFamily: 'monospace' }}
                      />
                      <button
                        onClick={() => { setTransfer2FASent(false); setTransfer2FACode(''); }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--vault-accent)',
                          fontFamily: 'var(--font-secondary)',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          padding: '0.5rem 0',
                          textDecoration: 'underline',
                          opacity: 0.8
                        }}
                      >
                        Didn't receive it? Send again
                      </button>
                    </>
                  )}

                  {transferError && (
                    <StatusMessage $status="error" style={{ marginTop: '0.75rem' }}>
                      <FaTimes /> {transferError}
                    </StatusMessage>
                  )}
                  <ModalButtonRow>
                    {transfer2FASent && (
                      <ActionButton $primary onClick={handleTransferStep2} style={{ flex: 2 }} disabled={transfer2FACode.length !== 6}>
                        VERIFY & CONTINUE <FaArrowRight size={12} />
                      </ActionButton>
                    )}
                    <ActionButton onClick={() => { setTransferStep(1); setTransferError(''); }} style={{ flex: 1 }}>
                      BACK
                    </ActionButton>
                  </ModalButtonRow>
                </motion.div>
              )}

              {/* ── Step 3: Confirmation ── */}
              {transferStep === 3 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <FaExclamationTriangle style={{ color: '#FF9F0A' }} /> CONFIRM TRANSFER
                  </h3>
                  <div style={{
                    padding: '1.25rem',
                    background: 'rgba(255, 59, 48, 0.06)',
                    border: '1px solid rgba(255, 59, 48, 0.2)',
                    borderRadius: '12px',
                    marginBottom: '1.25rem',
                    fontFamily: 'var(--font-secondary)',
                    fontSize: '0.85rem',
                    color: 'rgba(255,255,255,0.7)',
                    lineHeight: 1.7
                  }}>
                    <p style={{ marginBottom: '0.75rem', color: 'var(--vault-error)', fontWeight: 600 }}>
                      ⚠ This action is permanent and cannot be undone.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>From</span>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{formatAddress(walletAddress)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>To</span>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{formatAddress(transferDestination)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Asset</span>
                        <span>Lil Durk #{displayEdition || '—'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Verified</span>
                        <span style={{ color: 'var(--vault-success)' }}>✓ 2FA + Wallet Signature</span>
                      </div>
                    </div>
                  </div>
                  {transferError && (
                    <StatusMessage $status="error" style={{ marginTop: '0', marginBottom: '0.75rem' }}>
                      <FaTimes /> {transferError}
                    </StatusMessage>
                  )}
                  <ModalButtonRow>
                    <ActionButton
                      $primary
                      onClick={handleExecuteTransfer}
                      style={{ flex: 2, background: 'var(--vault-error)', boxShadow: '0 4px 15px rgba(255, 59, 48, 0.2)' }}
                    >
                      <FaExchangeAlt /> TRANSFER NOW
                    </ActionButton>
                    <ActionButton onClick={() => { setTransferStep(2); setTransferError(''); }} style={{ flex: 1 }}>
                      BACK
                    </ActionButton>
                  </ModalButtonRow>
                </motion.div>
              )}

              {/* ── Step 4: Processing ── */}
              {transferStep === 4 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{ textAlign: 'center', padding: '2rem 0' }}
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                    style={{
                      width: '64px',
                      height: '64px',
                      border: '3px solid rgba(255,255,255,0.1)',
                      borderTopColor: 'var(--vault-accent)',
                      borderRadius: '50%',
                      margin: '0 auto 1.5rem',
                    }}
                  />
                  <h3 style={{ marginBottom: '0.75rem' }}>PROCESSING TRANSFER</h3>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', fontFamily: 'var(--font-secondary)', lineHeight: 1.6 }}>
                    Verifying signature and executing on-chain transfer...<br />
                    <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>Do not close this window.</span>
                  </p>
                </motion.div>
              )}

              {/* ── Step 5: Result ── */}
              {transferStep === 5 && transferResult && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
                  <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                    <div style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      background: 'rgba(52, 199, 89, 0.1)',
                      border: '2px solid var(--vault-success)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 1rem',
                    }}>
                      <FaCheck size={24} style={{ color: 'var(--vault-success)' }} />
                    </div>
                    <h3 style={{ color: 'var(--vault-success)', marginBottom: '0.5rem' }}>TRANSFER COMPLETE</h3>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', fontFamily: 'var(--font-secondary)' }}>
                      Your NFT has been successfully transferred.
                    </p>
                  </div>
                  <div style={{
                    padding: '1rem',
                    background: 'rgba(0,0,0,0.3)',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.08)',
                    marginBottom: '1.5rem',
                    fontFamily: 'var(--font-secondary)',
                    fontSize: '0.8rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'rgba(255,255,255,0.4)' }}>To</span>
                      <span style={{ fontFamily: 'monospace', color: 'rgba(255,255,255,0.8)' }}>{formatAddress(transferResult.transfer?.to || transferDestination)}</span>
                    </div>
                    {transferResult.transfer?.transactionHash && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'rgba(255,255,255,0.4)' }}>Tx Hash</span>
                        <a
                          href={`https://polygonscan.com/tx/${transferResult.transfer.transactionHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: 'var(--vault-accent)', fontFamily: 'monospace', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                        >
                          {formatAddress(transferResult.transfer.transactionHash)} <FaExternalLinkAlt size={10} />
                        </a>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'rgba(255,255,255,0.4)' }}>Edition</span>
                      <span>#{transferResult.transfer?.edition || displayEdition || '—'} / 500</span>
                    </div>
                  </div>
                  <ActionButton $primary onClick={closeTransferModal}>
                    DONE
                  </ActionButton>
                </motion.div>
              )}
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

      <AnimatePresence>
        {showCinematic && (
          <OverlayContainer
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
            transition={{ duration: 0.8 }}
          >
            <OverlayBackground />
            <OverlayContent>
              <div style={{ position: 'relative' }}>
                <OverlayTitle data-text="THE VAULT" initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}>
                  THE VAULT
                </OverlayTitle>
              </div>
              <OverlaySubtitle initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1, duration: 1 }}>
                SECURE STORAGE PROTOCOL
              </OverlaySubtitle>

              <EnterButton
                onClick={() => setShowCinematic(false)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.5 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                ENTER SYSTEM
              </EnterButton>
            </OverlayContent>
          </OverlayContainer>
        )}
      </AnimatePresence>

      {/* QR Scanner Modal */}
      <QRScanner
        isOpen={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        onScan={(code) => {
          setSerialNumber(code);
          setShowQRScanner(false);
          showToastMessage('QR code scanned! Verifying...');
          // Pass code directly to avoid React state race condition
          setTimeout(() => {
            if (code) handleVerify(code);
          }, 300);
        }}
        themeColor={themes[currentTheme].color}
      />
    </VaultSection >
  );
}
