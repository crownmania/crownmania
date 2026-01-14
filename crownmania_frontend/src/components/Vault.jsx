import { useState, useEffect, Suspense, lazy, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import styled, { keyframes, css } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { FaLock, FaCheck, FaTimes, FaSpinner, FaWallet, FaSignOutAlt, FaCube, FaChevronLeft, FaChevronRight, FaKeyboard, FaQrcode, FaDiscord, FaGift, FaTag, FaInfoCircle } from 'react-icons/fa';

import useWeb3Auth from '../hooks/useWeb3Auth';
import { verificationAPI } from '../services/api';
import { DurkModel } from './3d/DurkModel';
import crownLogo from '../assets/crown_logo_white.svg';

// Firebase Storage image URLs
const DURK_PREVIEW_IMG = 'https://firebasestorage.googleapis.com/v0/b/sonorous-crane-440603-s6.firebasestorage.app/o/images%2Fdurktoy7.webp?alt=media';
// [NEW] Face close-up for grid
const DURK_FACE_IMG = 'https://firebasestorage.googleapis.com/v0/b/sonorous-crane-440603-s6.firebasestorage.app/o/images%2Fdurktoy2.webp?alt=media';
// [NEW] Front view for ID Card (Right side)
const DURK_FRONT_IMG = 'https://firebasestorage.googleapis.com/v0/b/sonorous-crane-440603-s6.firebasestorage.app/o/images%2Fdurktoy1.webp?alt=media';

const DURK_BACKGROUND_IMG = 'https://firebasestorage.googleapis.com/v0/b/sonorous-crane-440603-s6.firebasestorage.app/o/images%2Fdurktoy4.webp?alt=media';

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

// ============================================
// STYLED COMPONENTS
// ============================================

const VaultSection = styled.section`
  min-height: 100vh;
  background: linear-gradient(180deg, rgba(0, 19, 36, 0.9) 0%, rgba(0, 10, 20, 0.95) 100%);
  color: white;
  padding: 2rem;
  position: relative;
  overflow-x: hidden;
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
  margin-bottom: 2rem;
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

const Panel = styled(motion.div)`
  background: linear-gradient(145deg, rgba(0, 30, 50, 0.8), rgba(0, 15, 30, 0.9));
  border: 1px solid rgba(0, 166, 251, 0.2);
  border-radius: 12px;
  padding: 1.5rem;
  position: relative;
  
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

// Top Row: Verify & Connect Panels
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

// [NEW] Control Deck Row (Identity + Grid)
const ControlDeckRow = styled.div`
  display: grid;
  grid-template-columns: 500px 1fr;
  gap: 1.5rem;
  max-width: 1400px;
  margin: 0 auto 1.5rem;
  position: relative;
  z-index: 1;
  align-items: stretch;

  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
  }
`;

// [NEW] Character Select Grid
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
  gap: 1px;
  height: 100%;
  background-color: rgba(0, 166, 251, 0.3);
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
  
  @media (max-width: 600px) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

const SelectSlot = styled.div`
  background: rgba(10, 14, 22, 0.95);
  position: relative;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  transition: all 0.2s ease;
  aspect-ratio: 1; /* Keep slots square */

  &:hover {
    background: rgba(20, 30, 50, 0.95);
    
    img {
      transform: scale(1.1);
    }
  }

  /* Current Active/Selected Item */
  ${props => props.$active && css`
    background: rgba(20, 40, 60, 0.95);
    box-shadow: inset 0 0 15px rgba(0, 200, 255, 0.1);
    
    &::after {
      content: '';
      position: absolute;
      inset: 0;
      border: 2px solid #00c8ff;
      pointer-events: none;
    }
  `}

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: ${props => props.$owned ? 1 : 0.5};
    filter: ${props => props.$owned ? 'none' : 'grayscale(100%) blur(0.5px)'};
    transition: all 0.3s ease;
  }
`;

const UnknownAvatar = styled.div`
  font-family: 'Designer', sans-serif;
  font-size: 1.5rem;
  color: rgba(255, 255, 255, 0.1);
  user-select: none;
`;

// [MODIFIED] Identity Panel
const IdentityPanel = styled(Panel)`
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 1.5rem 2rem;
  z-index: 1;
  height: 100%; /* Match height of neighbor */
  
  @media (max-width: 1200px) {
    text-align: center;
    align-items: center;
    min-height: auto;
  }
`;

const IdentityInfo = styled.div`
  display: flex;
  flex-direction: column;
`;

const IdentityName = styled.h2`
  font-family: 'Designer', sans-serif;
  font-size: 2rem;
  color: white;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  line-height: 1;
`;

const IdentityTagline = styled.span`
  font-family: 'Source Sans Pro', sans-serif;
  font-size: 0.9rem;
  color: #00c8ff;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  margin-top: 0.5rem;
`;

// MiddleRow: Preview | Details | 3D
const MiddleRow = styled.div`
  display: grid;
  grid-template-columns: 500px 300px 1fr; 
  gap: 1.5rem;
  max-width: 1400px;
  margin: 0 auto 2rem;
  position: relative;
  z-index: 1;
  align-items: stretch;

  @media (max-width: 1200px) {
    grid-template-columns: 1fr 1fr;
    grid-template-rows: auto auto;
    
    // Details panel moves to second row, full width or shared
    > div:nth-child(2) {
      grid-column: 2;
    }
    // 3D viewer moves to bottom full width
    > div:nth-child(3) {
      grid-column: 1 / -1;
    }
  }

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    > div:nth-child(2) { grid-column: 1; }
  }
`;

// [MODIFIED] ID Card Style
const IDCard = styled(Panel)`
  padding: 0;
  overflow: hidden;
  border-radius: 16px;
  height: 100%;
  border: 1px solid rgba(0, 166, 251, 0.4);
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  display: flex;
  flex-direction: column;

  ${props => props.$owned && css`
    border-color: #00ff88;
    box-shadow: 0 0 20px rgba(0, 255, 136, 0.2);
  `}
`;

const IDImageContainer = styled.div`
  flex: 1;
  position: relative;
  display: flex;
  background: rgba(0,0,0,0.2);
`;

const IDImageHalf = styled.div`
  width: 50%;
  height: 100%;
  position: relative;
  border-right: 1px solid rgba(255,255,255,0.05);
  
  &:last-child {
    border-right: none;
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
    ${props => !props.$owned && css`
      filter: grayscale(100%) brightness(0.4);
    `}
    transition: filter 0.5s ease;
  }

  /* Label for Front/Back */
  &::after {
    content: '${props => props.$label}';
    position: absolute;
    bottom: 0.5rem;
    left: 0;
    width: 100%;
    text-align: center;
    font-family: 'Source Sans Pro', sans-serif;
    font-size: 0.7rem;
    color: rgba(255,255,255,0.5);
    text-transform: uppercase;
    pointer-events: none;
  }
`;

const IDFooter = styled.div`
  padding: 1rem;
  background: rgba(0,0,0,0.8);
  border-top: 1px solid rgba(255,255,255,0.1);
  text-align: center;
`;

// [NEW] Details Panel
const DetailsPanel = styled(Panel)`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const DetailHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: 'Designer', sans-serif;
  color: #00c8ff;
  font-size: 1.1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(0, 166, 251, 0.2);
`;

const DetailGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
`;

const DetailItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  label {
    font-family: 'Source Sans Pro', sans-serif;
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.5);
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  div {
    font-family: 'Designer', sans-serif;
    font-size: 1.5rem;
    color: white;
    
    &.highlight {
      color: #00ff88;
      text-shadow: 0 0 10px rgba(0, 255, 136, 0.3);
    }
    
    &.dim {
      color: rgba(255, 255, 255, 0.3);
    }
  }
`;

const OwnerBadge = styled.div`
  background: ${props => props.$owned ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255, 50, 50, 0.1)'};
  border: 1px solid ${props => props.$owned ? '#00ff88' : '#ff3333'};
  color: ${props => props.$owned ? '#00ff88' : '#ff3333'};
  padding: 1rem;
  border-radius: 8px;
  text-align: center;
  font-family: 'Designer', sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-top: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
`;

// [MODIFIED] 3D Panel
const ModelViewerPanel = styled(Panel)`
  padding: 0;
  overflow: hidden;
  height: 100%;
  min-height: 400px;
  display: flex;
  flex-direction: column;
`;

const ModelHeader = styled.div`
  padding: 1rem 1.5rem;
  background: rgba(0,0,0,0.3);
  border-bottom: 1px solid rgba(0, 166, 251, 0.2);
  display: flex;
  justify-content: space-between;
  align-items: center;

  h3 {
    font-family: 'Designer', sans-serif;
    color: #00c8ff;
    margin: 0;
    font-size: 1rem;
    letter-spacing: 0.1em;
  }
`;

const ModelCanvas = styled.div`
  flex: 1;
  position: relative;
  background: radial-gradient(circle at center, rgba(0, 100, 150, 0.1), transparent 70%);
`;

// [NEW] Exclusive Access Panel
const ExclusivePanel = styled(Panel)`
  max-width: 1400px;
  margin: 0 auto;
  min-height: 300px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  gap: 1.5rem;
  background: linear-gradient(145deg, rgba(10, 15, 25, 0.9), rgba(5, 10, 20, 0.95));
  border: 1px solid rgba(0, 166, 251, 0.2);
  
  ${props => props.$unlocked && css`
    border-color: rgba(0, 255, 136, 0.4);
    background: linear-gradient(145deg, rgba(0, 30, 20, 0.9), rgba(0, 15, 10, 0.95));
  `}
`;

const ExclusiveContent = styled.div`
  max-width: 800px;
  color: rgba(255, 255, 255, 0.8);
  
  h2 {
    font-family: 'Designer', sans-serif;
    font-size: 1.8rem;
    margin-bottom: 1rem;
    color: ${props => props.$unlocked ? '#00ff88' : 'white'};
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }
  
  p {
    font-family: 'Source Sans Pro', sans-serif;
    font-size: 1.1rem;
    line-height: 1.6;
    margin-bottom: 1rem;
    color: rgba(255, 255, 255, 0.6);
  }

  .highlight {
    color: #00c8ff;
    font-weight: bold;
  }
`;

const LockIconLarge = styled.div`
  font-size: 3.5rem;
  color: rgba(255, 255, 255, 0.1);
  margin-bottom: 0.5rem;
  
  ${props => props.$unlocked && css`
    color: #00ff88;
    filter: drop-shadow(0 0 15px rgba(0, 255, 136, 0.4));
  `}
`;

// Helper Components
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

const WelcomePanel = styled(Panel)`
  overflow: hidden;
  // ... existing styles ...
`;

const SerialInput = styled.input`
  width: 100%;
  padding: 0.8rem 1rem;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  color: white;
  margin-bottom: 1rem;
  &:focus { outline: none; border-color: #00ff88; }
`;

const ActionButton = styled(motion.button)`
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-family: 'Designer', sans-serif;
  font-size: 0.85rem;
  width: 100%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  
  ${props => props.$primary ? css`
    background: #0055ff; border: none; color: white;
  ` : css`
    background: transparent; border: 1px solid #00ff88; color: #00ff88;
  `}
`;

const StatusMessage = styled(motion.div)`
  margin-top: 1rem;
  color: ${props => props.$status === 'success' ? '#00ff88' : '#ff4444'};
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const WelcomeText = styled.p`
  color: rgba(255,255,255,0.7);
  font-size: 0.9rem;
  margin-bottom: 1.5rem;
`;

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

  const handleConnect = async () => { /* ... */ await login(); };
  const handleDisconnect = async () => {
    await logout();
    setWalletAddress('');
    setUserTokens([]);
    setCurrentEdition(null);
  };

  const handleVerify = async () => {
    if (!serialNumber.trim()) return;
    setIsVerifying(true);
    try {
      navigate(`/mintNFT?id=${serialNumber.trim()}&type=1`);
    } catch (err) {
      setVerificationResult({ status: 'error', message: err.message || 'Verification failed' });
    } finally {
      setIsVerifying(false);
    }
  };

  const isDurkOwned = isOwned('lil-durk-figure');

  return (
    <VaultSection id="vault">
      <LogoWatermark>
        <img src={crownLogo} alt="" aria-hidden="true" />
      </LogoWatermark>

      <MainTitle>
        <motion.h1 initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          THE VAULT
        </motion.h1>
        <div className="subtitle">Secure Control Terminal</div>
      </MainTitle>

      {/* TOP ROW: ACTIVATE & CONNECT */}
      <TopPanelsRow>
        <Panel initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
          <PanelTitle><FaLock /> Access Protocol</PanelTitle>
          <SerialInput
            placeholder="Enter Product Code"
            value={serialNumber}
            onChange={(e) => setSerialNumber(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleVerify()}
          />
          <ActionButton onClick={handleVerify} disabled={isVerifying}>
            {isVerifying ? <FaSpinner className="spin" /> : 'VERIFY CODE'}
          </ActionButton>
        </Panel>

        <WelcomePanel initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
          <PanelTitle><FaWallet /> Wallet Connection</PanelTitle>
          <WelcomeText>
            {user ? `Connected: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'Connect wallet to view your owned assets.'}
          </WelcomeText>
          {user ? (
            <ActionButton onClick={handleDisconnect}><FaSignOutAlt /> Disconnect</ActionButton>
          ) : (
            <ActionButton $primary onClick={handleConnect} disabled={isLoading}>
              {isLoading ? <FaSpinner className="spin" /> : 'CONNECT WALLET'}
            </ActionButton>
          )}
        </WelcomePanel>
      </TopPanelsRow>

      {/* CONTROL DECK (IDENTITY + SELECTOR) */}
      <ControlDeckRow>
        {/* IDENTITY STRIP */}
        <IdentityPanel initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
          <IdentityInfo>
            <IdentityName>LIL DURK</IdentityName>
            <IdentityTagline>10" Collectible Resin Figure</IdentityTagline>
          </IdentityInfo>
          <div style={{ color: isDurkOwned ? '#00ff88' : 'rgba(255,255,255,0.3)', fontFamily: 'Designer', fontSize: '1.2rem', marginTop: '1rem' }}>
            {isDurkOwned ? '• ASSET VERIFIED' : '• ASSET LOCKED'}
          </div>
        </IdentityPanel>

        {/* CHARACTER SELECT GRID */}
        <CharacterSelectSection>
          <SelectGrid>
            {/* Slot 1: Lil Durk (Active) - FACE SHOT */}
            <SelectSlot $active={true} $owned={isDurkOwned}>
              <img
                src={DURK_FACE_IMG}
                alt="Lil Durk Face"
                style={{
                  objectPosition: 'center center',
                  transform: 'scale(1.1)'
                }}
              />
            </SelectSlot>

            {/* Slot 2-12: Unknown */}
            {[...Array(11)].map((_, i) => (
              <SelectSlot key={i} $owned={false}>
                <UnknownAvatar>?</UnknownAvatar>
              </SelectSlot>
            ))}
          </SelectGrid>
        </CharacterSelectSection>
      </ControlDeckRow>

      {/* MIDDLE ROW: [ID CARD] [DETAILS] [3D VIEWER] */}
      <MiddleRow>
        {/* 1. ID CARD PREVIEW */}
        <IDCard
          $owned={isDurkOwned}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
        >
          <IDImageContainer>
            {/* LEFT: Back View (using original image 7 which is a back/side view usually, or reusing existing logic) */}
            <IDImageHalf $owned={isDurkOwned} $label="BACK VIEW">
              <img src={DURK_PREVIEW_IMG} alt="Lil Durk Back" style={{ objectPosition: 'center top' }} />
            </IDImageHalf>

            {/* RIGHT: Front View (New Image) */}
            <IDImageHalf $owned={isDurkOwned} $label="FRONT VIEW">
              <img src={DURK_FRONT_IMG} alt="Lil Durk Front" style={{ objectPosition: 'center top' }} />
            </IDImageHalf>
          </IDImageContainer>
          <IDFooter>
            <div style={{ fontFamily: 'Designer', color: '#00c8ff' }}>SERIES 1</div>
          </IDFooter>
        </IDCard>

        {/* 2. DETAILS PANEL */}
        <DetailsPanel initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <DetailHeader>
            <FaInfoCircle /> ASSET DETAILS
          </DetailHeader>

          <DetailGrid>
            <DetailItem>
              <label>Edition Number</label>
              <div className={isDurkOwned ? 'highlight' : 'dim'}>
                {isDurkOwned ? `#${currentEdition}` : '---'}
              </div>
            </DetailItem>

            <DetailItem>
              <label>Total Supply</label>
              <div>500</div>
            </DetailItem>

            <DetailItem>
              <label>Rarity Tier</label>
              <div style={{ color: '#E2B808' }}>LEGENDARY</div>
            </DetailItem>

            <DetailItem>
              <label>Dimensions</label>
              <div>10 INCH</div>
            </DetailItem>
          </DetailGrid>

          <OwnerBadge $owned={isDurkOwned}>
            {isDurkOwned ? <><FaCheck /> OWNER VERIFIED</> : <><FaLock /> UNOWNED</>}
          </OwnerBadge>

          {!isDurkOwned && (
            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', textAlign: 'center', marginTop: '1rem' }}>
              Claim your physical figure to unlock full details and benefits.
            </div>
          )}
        </DetailsPanel>

        {/* 3. 3D VIEWER */}
        <ModelViewerPanel initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 }}>
          <ModelHeader>
            <h3>3D Viewer</h3>
            <FaCube style={{ color: '#00c8ff' }} />
          </ModelHeader>
          <ModelCanvas>
            {isDurkOwned ? (
              <Canvas camera={{ position: [0, 0, 3.5], fov: 45 }}>
                <ambientLight intensity={0.6} />
                <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} />
                <Suspense fallback={null}>
                  <DurkModel scale={1.3} position={[0, -1.2, 0]} />
                  <Environment preset="studio" />
                </Suspense>
                <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={2} />
              </Canvas>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: '1rem', color: 'rgba(255,255,255,0.4)' }}>
                <FaLock style={{ fontSize: '2rem' }} />
                <span>LOCKED</span>
              </div>
            )}
          </ModelCanvas>
        </ModelViewerPanel>
      </MiddleRow>

      {/* EXCLUSIVE ACCESS PANEL */}
      <ExclusivePanel $unlocked={isDurkOwned}>
        <LockIconLarge $unlocked={isDurkOwned}>
          {isDurkOwned ? <FaGift /> : <FaLock />}
        </LockIconLarge>

        <ExclusiveContent $unlocked={isDurkOwned}>
          <h2>Exclusive Access & Unlockables</h2>

          {isDurkOwned ? (
            <>
              <p>
                Congratulations! As a verified owner, you have unlocked this section.
                <br />
                <span className="highlight">Exclusive unlocks are coming soon.</span>
              </p>
              <p style={{ fontSize: '0.9rem', opacity: 0.7 }}>
                You will be notified via registered email & phone number when new perks, content, and merchandise become available.
              </p>
            </>
          ) : (
            <>
              <p>
                Verified digital collectible owners will gain access to <span className="highlight">Exclusive Utilities and Unlockables</span>.
              </p>
              <p>
                Includes early access to content, exclusive merchandise, concert tickets, and future airdrops.
                <br />
                Claim your physical figure to unlock this section.
              </p>
            </>
          )}
        </ExclusiveContent>
      </ExclusivePanel>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
    </VaultSection>
  );
}
