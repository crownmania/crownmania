// Vault Component - Build v2.0.2
import { useState, useEffect, Suspense, lazy, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import styled, { keyframes, css } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { FaLock, FaCheck, FaTimes, FaSpinner, FaWallet, FaSignOutAlt, FaCube, FaChevronLeft, FaChevronRight, FaKeyboard, FaQrcode } from 'react-icons/fa';

import useWeb3Auth from '../hooks/useWeb3Auth';
import { verificationAPI } from '../services/api';
import { DurkModel } from './3d/DurkModel';
import crownLogo from '../assets/crown_logo_white.svg';

// Firebase Storage image URLs
const DURK_PREVIEW_IMG = 'https://firebasestorage.googleapis.com/v0/b/sonorous-crane-440603-s6.firebasestorage.app/o/images%2Fdurktoy7.webp?alt=media';
const DURK_BACKGROUND_IMG = 'https://firebasestorage.googleapis.com/v0/b/sonorous-crane-440603-s6.firebasestorage.app/o/images%2Fdurktoy4.webp?alt=media';

// Lazy load QR Scanner
const QrReader = lazy(() =>
  import('react-qr-scanner').catch(() => ({
    default: () => <div style={{ padding: '1rem', textAlign: 'center', color: '#ff6b6b' }}>QR Scanner unavailable</div>
  }))
);

// Animations
const packAPunchGlow = keyframes`
  0%, 100% { 
    box-shadow: 0 0 20px rgba(0, 255, 136, 0.4), 0 0 40px rgba(0, 255, 136, 0.2);
    border-color: rgba(0, 255, 136, 0.6);
  }
  50% { 
    box-shadow: 0 0 30px rgba(0, 200, 255, 0.5), 0 0 60px rgba(0, 200, 255, 0.3);
    border-color: rgba(0, 200, 255, 0.8);
  }
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
`;

// ============================================
// STYLED COMPONENTS
// ============================================

const VaultSection = styled.section`
  min-height: 100vh;
  background: linear-gradient(180deg, rgba(0, 19, 36, 0.9) 0%, rgba(0, 10, 20, 0.95) 100%);
  color: white;
  padding: 2rem;
  position: relative;
  overflow: hidden;
`;

// Background Logo Watermark
const LogoWatermark = styled.div`
  position: absolute;
  top: 50%;
  left: 05%;
  transform: translate(-50%, -50%);
  width: 60%;
  max-width: 1250px;
  opacity: 0.03;
  pointer-events: none;
  z-index: 0;
  
  img {
    width: 100%;
    height: auto;
  }
`;

const MainTitle = styled.div`
  text-align: center;
  padding: 1.5rem;
  margin-bottom: 1rem;
  position: relative;
  z-index: 1;

  h1 {
    font-size: clamp(2rem, 5vw, 3rem);
    font-family: 'Designer', sans-serif;
    margin-bottom: 0.5rem;
    text-transform: uppercase;
    letter-spacing: 0.15em;
    color: white;
    text-shadow: var(--title-glow);
    filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.3));
  }

  .subtitle {
    font-size: 0.85rem;
    opacity: 0.7;
    letter-spacing: 0.15em;
    font-family: 'Source Sans Pro', sans-serif;
    text-transform: uppercase;
  }
`;

// Top Row: Verify & Connect Panels
const TopPanelsRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  max-width: 1200px;
  margin: 0 auto 2rem;
  position: relative;
  z-index: 1;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const Panel = styled(motion.div)`
  background: linear-gradient(145deg, rgba(0, 30, 50, 0.8), rgba(0, 15, 30, 0.9));
  border: 1px solid rgba(0, 166, 251, 0.2);
  border-radius: 12px;
  padding: 2rem;
  position: relative;
  min-height: 250px;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, rgba(0, 200, 255, 0.6), transparent);
  }
`;

// Welcome Panel with background image
const WelcomePanel = styled(Panel)`
  overflow: hidden;
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: 60%;
    background-image: url('https://firebasestorage.googleapis.com/v0/b/sonorous-crane-440603-s6.firebasestorage.app/o/images%2Fdurktoy4.webp?alt=media');
    background-size: contain;
    background-repeat: no-repeat;
    background-position: right center;
    opacity: 0.20;
    pointer-events: none;
    z-index: 0;
  }
  
  > * {
    position: relative;
    z-index: 1;
  }
`;

const PanelTitle = styled.h3`
  font-family: 'Designer', sans-serif;
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: #00c8ff;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const WelcomeText = styled.p`
  font-family: 'Source Sans Pro', sans-serif;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 1.5rem;
  line-height: 1.5;
`;

const SerialInput = styled.input`
  width: 100%;
  padding: 0.8rem 1rem;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  color: white;
  font-family: 'Source Sans Pro', sans-serif;
  font-size: 0.9rem;
  margin-bottom: 1rem;

  &::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }

  &:focus {
    outline: none;
    border-color: rgba(0, 255, 136, 0.5);
  }
`;

const ActionButton = styled(motion.button)`
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-family: 'Designer', sans-serif;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
  width: 100%;
  background: rgba(0, 255, 136, 0.1);
  border: 1px solid rgba(0, 255, 136, 0.4);
  color: #00ff88;

  &:hover {
    background: rgba(0, 255, 136, 0.2);
  }

  &.primary {
    background: linear-gradient(135deg, #4f46e5, #3b82f6);
    border: none;
    color: white;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 5px 20px rgba(59, 130, 246, 0.4);
    }
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const StatusMessage = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  border-radius: 6px;
  font-family: 'Source Sans Pro', sans-serif;
  font-size: 0.85rem;
  margin-top: 1rem;

  &.success {
    background: rgba(0, 255, 136, 0.1);
    border: 1px solid rgba(0, 255, 136, 0.3);
    color: #00ff88;
  }

  &.error {
    background: rgba(255, 107, 107, 0.1);
    border: 1px solid rgba(255, 107, 107, 0.3);
    color: #ff6b6b;
  }

  &.loading {
    background: rgba(0, 200, 255, 0.1);
    border: 1px solid rgba(0, 200, 255, 0.3);
    color: #00c8ff;
  }
`;

// Middle Row: Preview & 3D Model
const MiddleRow = styled.div`
  display: grid;
  grid-template-columns: 650px 500px;
  gap: 1.5rem;
  max-width: 1200px;
  margin: 0 auto 2rem;
  position: relative;
  z-index: 1;
  justify-content: center;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const PreviewCard = styled(motion.div)`
  background: linear-gradient(145deg, rgba(0, 30, 50, 0.8), rgba(0, 15, 30, 0.9));
  border: 1px solid rgba(0, 166, 251, 0.2);
  border-radius: 12px;
  overflow: hidden;
  position: relative;
`;

const PreviewImage = styled.div`
  width: 100%;
  height: 500px;
  position: relative;
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center top;
    filter: grayscale(100%) brightness(0.4);
    transition: filter 0.5s ease;
  }
  
  &.unlocked img {
    filter: none;
  }
`;

const EditionBadge = styled.div`
  position: absolute;
  bottom: 1rem;
  right: 1rem;
  background: rgba(0, 0, 0, 0.8);
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-family: 'Designer', sans-serif;
  font-size: 1.2rem;
  color: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
  
  &.unlocked {
    color: #00ff88;
    border: 1px solid rgba(0, 255, 136, 0.5);
  }
`;

const ModelViewerPanel = styled(motion.div)`
  background: linear-gradient(145deg, rgba(0, 30, 50, 0.8), rgba(0, 15, 30, 0.9));
  border: 1px solid rgba(0, 166, 251, 0.2);
  border-radius: 12px;
  overflow: hidden;
  position: relative;
  min-height: 550px;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, rgba(0, 200, 255, 0.6), transparent);
  }

  /* Background image - 
  &::after {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: 80%;
    background-image: url('https://firebasestorage.googleapis.com/v0/b/sonorous-crane-440603-s6.firebasestorage.app/o/images%2Fdurktoy4.webp?alt=media');
    background-size: contain;
    background-repeat: no-repeat;
    background-position: right center;
    opacity: 0.15;
    pointer-events: none;
    z-index: 0;
  }
`;

const ModelHeader = styled.div`
  padding: 1rem 1.5rem;
  border-bottom: 1px solid rgba(0, 166, 251, 0.2);
  display: flex;
  align-items: center;
  gap: 0.75rem;

  .icon {
    color: #00c8ff;
    font-size: 1.1rem;
  }

  h3 {
    font-family: 'Designer', sans-serif;
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #00c8ff;
  }

  .status {
    margin-left: auto;
    font-size: 0.75rem;
    font-family: 'Source Sans Pro', sans-serif;
    color: rgba(255, 255, 255, 0.5);
  }
`;

const ModelCanvas = styled.div`
  height: 300px;
  position: relative;
  background: radial-gradient(ellipse at center, rgba(0, 100, 150, 0.1), transparent 70%);
`;

// Character Grid Section (Street Fighter Style)
const CharacterSection = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
`;

const CharacterTitle = styled.h2`
  font-family: 'Designer', sans-serif;
  font-size: clamp(1.5rem, 4vw, 2rem);
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 1.5rem;
  color: white;
  text-shadow: var(--title-glow);
`;

const CharacterGridWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 1rem;
  overflow-x: auto;
  max-width: 100%;
  
  @media (max-width: 600px) {
    gap: 0.5rem;
    padding: 0.5rem;
  }
`;

const NavArrow = styled(motion.button)`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(0, 200, 255, 0.5);
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
  
  @media (max-width: 600px) {
    display: none;
  }
`;

const CharacterGrid = styled.div`
  display: flex;
  gap: 0.75rem;
  perspective: 1000px;
  
  @media (max-width: 600px) {
    gap: 0.5rem;
  }
`;

const CharacterSlot = styled(motion.div)`
  width: 100px;
  height: 130px;
  border-radius: 8px;
  position: relative;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.3s ease;
  transform-style: preserve-3d;
  flex-shrink: 0;
  background: linear-gradient(145deg, rgba(20, 25, 35, 0.9), rgba(10, 15, 25, 0.95));
  border: 2px solid rgba(255, 255, 255, 0.1);

  img {
    filter: grayscale(100%) brightness(0.3);
    opacity: 0.6;
  }

  &.center {
    width: 140px;
    height: 180px;
    z-index: 10;
  }

  &.unlocked {
    background: linear-gradient(145deg, rgba(0, 40, 60, 0.9), rgba(0, 20, 40, 0.95));
    border: 2px solid transparent;
    animation: ${packAPunchGlow} 3s ease-in-out infinite;
    
    img {
      filter: none;
      opacity: 1;
    }
  }

  &:hover {
    transform: scale(1.05);
  }
  
  @media (max-width: 600px) {
    width: 70px;
    height: 95px;
    
    &.center {
      width: 85px;
      height: 115px;
    }
  }
`;

const CharacterImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: contain;
  transition: all 0.5s ease;
`;

const CharacterName = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 0.5rem;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.9));
  font-family: 'Designer', sans-serif;
  font-size: 0.7rem;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(255, 255, 255, 0.5);
  
  &.unlocked {
    color: #00ff88;
  }
`;

const LockedIcon = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 1.5rem;
  color: rgba(255, 255, 255, 0.3);
`;

const EmptySlot = styled.div`
  width: 100px;
  height: 130px;
  border-radius: 8px;
  background: linear-gradient(145deg, rgba(20, 25, 35, 0.5), rgba(10, 15, 25, 0.6));
  border: 2px dashed rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
  
  @media (max-width: 600px) {
    width: 70px;
    height: 95px;
  }
`;

// ============================================
// CHARACTER DATA
// ============================================
const CHARACTERS = [
  { id: 'empty-1', name: '', empty: true },
  { id: 'empty-2', name: '', empty: true },
  { id: 'empty-3', name: '', empty: true },
  {
    id: 'lil-durk-figure',
    name: 'Lil Durk',
    image: 'https://firebasestorage.googleapis.com/v0/b/sonorous-crane-440603-s6.firebasestorage.app/o/images%2Fdurktoy2.webp?alt=media',
    isCenter: false
  },
];

// ============================================
// MAIN COMPONENT
// ============================================
export default function Vault() {
  const navigate = useNavigate();
  const { isInitialized, isWeb3Available, user, isLoading, login, logout, getAddress } = useWeb3Auth();

  const [walletAddress, setWalletAddress] = useState('');
  const [userTokens, setUserTokens] = useState([]);
  const [serialNumber, setSerialNumber] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [inputMethod, setInputMethod] = useState('manual');
  const [currentEdition, setCurrentEdition] = useState(null);

  // Fetch wallet data when authenticated
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (isInitialized && user) {
          const address = await getAddress();
          if (address) {
            setWalletAddress(address);
            try {
              const result = await verificationAPI.getWalletTokens(address);
              setUserTokens(result.tokens || []);
              // Get edition number from tokens
              const durkToken = result.tokens?.find(t => t.productId === 'lil-durk-figure');
              if (durkToken) {
                setCurrentEdition(durkToken.edition || durkToken.editionNumber);
              }
            } catch (err) {
              console.error('Error fetching tokens:', err);
              setUserTokens([]);
            }
          }
        }
      } catch (err) {
        console.error('Error in Vault data fetch:', err);
      }
    };
    fetchData();
  }, [isInitialized, user, getAddress]);

  // Check if user owns a character
  const isOwned = useCallback((characterId) => {
    if (!userTokens || userTokens.length === 0) return false;
    return userTokens.some(token => token.productId === characterId);
  }, [userTokens]);

  // Handle wallet connection
  const handleConnect = async () => {
    try {
      await login();
    } catch (err) {
      console.error('Connection failed:', err);
    }
  };

  // Handle wallet disconnection
  const handleDisconnect = async () => {
    try {
      await logout();
      setWalletAddress('');
      setUserTokens([]);
      setCurrentEdition(null);
    } catch (err) {
      console.error('Disconnection failed:', err);
    }
  };

  // Handle verification
  const handleVerify = async () => {
    if (!serialNumber.trim()) return;

    setIsVerifying(true);
    setVerificationResult(null);

    try {
      // Navigate to verify page with the serial number
      navigate(`/ mintNFT ? id = ${serialNumber.trim()}& type=1`);
    } catch (err) {
      setVerificationResult({ status: 'error', message: err.message || 'Verification failed' });
    } finally {
      setIsVerifying(false);
    }
  };

  const isDurkOwned = isOwned('lil-durk-figure');

  return (
    <VaultSection id="vault">
      {/* Background Logo Watermark */}
      <LogoWatermark>
        <img src={crownLogo} alt="" aria-hidden="true" />
      </LogoWatermark>

      {/* Title */}
      <MainTitle>
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          THE VAULT
        </motion.h1>
        <motion.div
          className="subtitle"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          Your Digital Collectibles
        </motion.div>
      </MainTitle>

      {/* Top Row: Verify & Connect Panels */}
      <TopPanelsRow>
        {/* Left Panel: Verify & Unlock */}
        <Panel
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <PanelTitle>
            <FaLock /> Verify & Unlock
          </PanelTitle>

          <SerialInput
            type="text"
            placeholder="Enter Claim Code"
            value={serialNumber}
            onChange={(e) => setSerialNumber(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleVerify()}
          />

          <ActionButton
            onClick={handleVerify}
            disabled={isVerifying || !serialNumber.trim()}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isVerifying ? (
              <>
                <FaSpinner className="spin" /> Verifying...
              </>
            ) : (
              'Verify Code'
            )}
          </ActionButton>

          {verificationResult && (
            <StatusMessage
              className={verificationResult.status}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {verificationResult.status === 'success' && <FaCheck />}
              {verificationResult.status === 'error' && <FaTimes />}
              {verificationResult.status === 'loading' && <FaSpinner className="spin" />}
              {verificationResult.message}
            </StatusMessage>
          )}
        </Panel>

        {/* Right Panel: Welcome & Connect */}
        <WelcomePanel
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <PanelTitle>
            <FaWallet /> {user ? 'Wallet Connected' : 'Welcome to the Crownmania Vault'}
          </PanelTitle>

          <WelcomeText>
            {user && walletAddress ? (
              <>Connected: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</>
            ) : (
              'Connect your wallet to claim digital goods and unlock exclusive content.'
            )}
          </WelcomeText>

          {user && walletAddress ? (
            <ActionButton
              onClick={handleDisconnect}
              disabled={isLoading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <FaSignOutAlt /> Disconnect
            </ActionButton>
          ) : (
            <ActionButton
              className="primary"
              onClick={handleConnect}
              disabled={isLoading || !isWeb3Available}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isLoading ? (
                <>
                  <FaSpinner className="spin" /> Connecting...
                </>
              ) : (
                <>
                  <FaWallet /> Connect
                </>
              )}
            </ActionButton>
          )}
        </WelcomePanel>
      </TopPanelsRow>

      {/* Middle Row: Preview & 3D Model */}
      <MiddleRow>
        {/* Product Preview Card */}
        <PreviewCard
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <PreviewImage className={isDurkOwned ? 'unlocked' : ''}>
            <img src={DURK_PREVIEW_IMG} alt="Lil Durk Figure" />
            <EditionBadge className={isDurkOwned ? 'unlocked' : ''}>
              #{currentEdition || '---'}
            </EditionBadge>
          </PreviewImage>
        </PreviewCard>

        {/* 3D Model Viewer */}
        <ModelViewerPanel
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <ModelHeader>
            <FaCube className="icon" />
            <h3>3D Interactive Viewer</h3>
            <span className="status">{isDurkOwned ? 'UNLOCKED' : 'LOCKED'}</span>
          </ModelHeader>
          <ModelCanvas>
            {isDurkOwned ? (
              <Canvas camera={{ position: [0, 0, 3], fov: 50 }}>
                <ambientLight intensity={0.6} />
                <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} />
                <Suspense fallback={null}>
                  <DurkModel scale={1.5} position={[0, -1, 0]} />
                  <Environment preset="studio" />
                </Suspense>
                <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={2} />
              </Canvas>
            ) : (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                flexDirection: 'column',
                gap: '1rem',
                color: 'rgba(255, 255, 255, 0.5)'
              }}>
                <FaLock style={{ fontSize: '2rem' }} />
                <span style={{ fontFamily: 'Source Sans Pro', fontSize: '0.9rem' }}>
                  Verify your collectible to unlock
                </span>
              </div>
            )}
          </ModelCanvas>
        </ModelViewerPanel>
      </MiddleRow>

      {/* Character Grid Section */}
      <CharacterSection>
        <CharacterTitle>LIL DURK</CharacterTitle>

        <CharacterGridWrapper>
          <NavArrow
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            disabled
          >
            <FaChevronLeft />
          </NavArrow>

          <CharacterGrid>
            {CHARACTERS.map((char) => (
              char.empty ? (
                <EmptySlot key={char.id} />
              ) : (
                <CharacterSlot
                  key={char.id}
                  className={`${char.isCenter ? 'center' : ''} ${isOwned(char.id) ? 'unlocked' : ''}`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <CharacterImage
                    src={char.image}
                    alt={char.name}
                  />
                  <CharacterName className={isOwned(char.id) ? 'unlocked' : ''}>
                    {char.name}
                  </CharacterName>
                  {!isOwned(char.id) && (
                    <LockedIcon>
                      <FaLock />
                    </LockedIcon>
                  )}
                </CharacterSlot>
              )
            ))}
          </CharacterGrid>

          <NavArrow
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            disabled
          >
            <FaChevronRight />
          </NavArrow>
        </CharacterGridWrapper>
      </CharacterSection>

      {/* Global Styles for spin animation */}
      <style>{`
@keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
}
        .spin {
  animation: spin 1s linear infinite;
}
`}</style>
    </VaultSection>
  );
}