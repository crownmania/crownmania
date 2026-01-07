import { useState, useEffect, Suspense, lazy, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import styled, { keyframes, css } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';

import useWeb3Auth from '../hooks/useWeb3Auth';
import { verificationAPI } from '../services/api';
import GlowButton from './GlowButton';
import ContentViewer from './ContentViewer';
import { DurkModel } from './3d/DurkModel';
import { FaLock, FaQuestion, FaCheck, FaTimes, FaQrcode, FaChevronDown, FaExclamationTriangle, FaSpinner, FaWallet, FaSignOutAlt, FaCube, FaKeyboard, FaPlay } from 'react-icons/fa';

// Lazy load QR Scanner to prevent build issues
const QrReader = lazy(() =>
  import('react-qr-scanner').catch(() => ({
    default: () => <div style={{ padding: '1rem', textAlign: 'center', color: '#ff6b6b' }}>QR Scanner unavailable</div>
  }))
);

// Pack-a-Punch style glow animation
const packAPunchGlow = keyframes`
  0%, 100% { 
    box-shadow: 0 0 20px rgba(0, 255, 136, 0.4), 0 0 40px rgba(0, 255, 136, 0.2), inset 0 0 20px rgba(0, 255, 136, 0.1);
    border-color: rgba(0, 255, 136, 0.6);
  }
  50% { 
    box-shadow: 0 0 30px rgba(0, 200, 255, 0.5), 0 0 60px rgba(0, 200, 255, 0.3), inset 0 0 30px rgba(0, 200, 255, 0.15);
    border-color: rgba(0, 200, 255, 0.8);
  }
`;

const scanLine = keyframes`
  0% { top: 0; }
  100% { top: 100%; }
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

const VaultSection = styled.section`
  min-height: 100vh;
  background: rgba(0, 19, 36, 0.5);
  color: white;
  padding: 2rem;
  position: relative;
  backdrop-filter: blur(10px);

  &::before {
    content: '';
    position: absolute;
    top: 20%;
    left: -10%;
    width: 80%;
    height: 60%;
    background-image: url('../assets/crown_logo_white.svg');
    background-size: contain;
    background-repeat: no-repeat;
    background-position: left center;
    opacity: 0.2;
    pointer-events: none;
    z-index: 0;
  }
`;

const MainTitle = styled.div`
  text-align: center;
  padding: 2rem;
  margin-bottom: 2rem;

  h1 {
    font-size: clamp(2rem, 5vw, 3rem);
    font-family: 'Designer', sans-serif;
    margin-bottom: 0.5rem;
    text-transform: uppercase;
    letter-spacing: 0.15em;
    background: linear-gradient(135deg, #fff 0%, #a5b4fc 50%, #fff 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .subtitle {
    font-size: 0.9rem;
    opacity: 0.8;
    letter-spacing: 0.2em;
    font-family: var(--font-secondary);
    text-transform: uppercase;
  }
`;

// Wallet Connection Banner
const WalletBanner = styled(motion.div)`
  max-width: 1200px;
  margin: 0 auto 2rem;
  padding: 1.5rem 2rem;
  background: linear-gradient(135deg, rgba(0, 30, 60, 0.9), rgba(0, 50, 80, 0.8));
  border: 1px solid rgba(0, 200, 255, 0.3);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    flex-direction: column;
    text-align: center;
  }
`;

const WalletInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;

  .icon {
    font-size: 2rem;
    color: #a5b4fc;
  }

  .details {
    h3 {
      font-family: 'Designer', sans-serif;
      font-size: 1.1rem;
      margin-bottom: 0.25rem;
    }
    p {
      font-family: var(--font-secondary);
      font-size: 0.85rem;
      opacity: 0.7;
    }
  }
`;

const WalletButtons = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
`;

const ConnectButton = styled(motion.button)`
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, #4f46e5, #3b82f6);
  color: white;
  border: none;
  border-radius: 8px;
  font-family: var(--font-secondary);
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: transform 0.2s;

  &:hover {
    transform: scale(1.05);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const DisconnectButton = styled(motion.button)`
  padding: 0.75rem 1.5rem;
  background: transparent;
  color: #ff6b6b;
  border: 1px solid #ff6b6b;
  border-radius: 8px;
  font-family: var(--font-secondary);
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 107, 107, 0.1);
  }
`;

// Grid container for collectibles - 2 rows x 5 columns
const CollectiblesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 1.5rem;
  max-width: 1200px;
  margin: 0 auto 3rem;
  padding: 0 1rem;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(3, 1fr);
  }

  @media (max-width: 600px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }
`;

// Individual collectible slot
const CollectibleSlot = styled(motion.div)`
  width: 120px;
  height: 160px;
  border-radius: 12px;
  position: relative;
  cursor: pointer;
  overflow: hidden;
  transition: transform 0.3s ease;

  ${props => props.$unlocked ? css`
    background: linear-gradient(145deg, rgba(0, 30, 60, 0.8), rgba(0, 10, 30, 0.9));
    border: 2px solid transparent;
    animation: ${packAPunchGlow} 3s ease-in-out infinite;
  ` : css`
    background: linear-gradient(145deg, rgba(20, 20, 30, 0.9), rgba(10, 10, 20, 0.95));
    border: 2px solid rgba(255, 255, 255, 0.1);
  `}

  &:hover {
    transform: ${props => props.$unlocked ? 'scale(1.05)' : 'scale(1.02)'};
  }
`;

const LockedOverlay = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, rgba(10, 20, 35, 0.95), rgba(5, 10, 20, 0.98));
`;

const SilhouetteHead = styled.div`
  position: relative;
  width: 80px;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  
  /* Head shape */
  &::before {
    content: '';
    position: absolute;
    width: 60px;
    height: 70px;
    background: rgba(40, 50, 70, 0.6);
    border-radius: 50% 50% 45% 45%;
    top: 0;
  }
  
  /* Neck/shoulders hint */
  &::after {
    content: '';
    position: absolute;
    width: 80px;
    height: 25px;
    background: rgba(40, 50, 70, 0.4);
    border-radius: 10px 10px 0 0;
    bottom: 0;
  }
`;

const QuestionMark = styled.div`
  position: relative;
  z-index: 2;
  font-size: 2rem;
  color: rgba(100, 120, 150, 0.7);
  font-family: 'Designer', sans-serif;
  font-weight: bold;
  margin-top: -15px;
`;

const SlotLabel = styled.div`
  display: none;
`;

// Unlocked collectible content
const UnlockedContent = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem;
  background: radial-gradient(ellipse at center, rgba(0, 255, 136, 0.05), transparent 70%);
`;

const CollectibleImage = styled.img`
  width: 100%;
  height: 70%;
  object-fit: contain;
  filter: drop-shadow(0 0 20px rgba(0, 255, 136, 0.4));
`;

const CollectibleName = styled.div`
  font-family: 'Designer', sans-serif;
  font-size: 0.9rem;
  text-align: center;
  margin-top: auto;
  color: white;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  text-shadow: 0 0 10px rgba(0, 255, 136, 0.5);
`;

const OwnedBadge = styled.div`
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background: linear-gradient(135deg, #4f46e5, #3b82f6);
  color: white;
  font-size: 0.65rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-family: var(--font-secondary);
  font-weight: 600;
  text-transform: uppercase;
`;

// Interactive Features Section
const FeaturesSection = styled.div`
  max-width: 1200px;
  margin: 0 auto 3rem;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

// 3D Model Viewer Window
const ModelViewerWindow = styled(motion.div)`
  background: linear-gradient(145deg, rgba(0, 30, 60, 0.8), rgba(0, 10, 30, 0.9));
  border: 1px solid rgba(0, 166, 251, 0.3);
  border-radius: 16px;
  overflow: hidden;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, rgba(0, 200, 255, 0.8), transparent);
  }
`;

const WindowHeader = styled.div`
  padding: 1rem 1.5rem;
  border-bottom: 1px solid rgba(0, 166, 251, 0.2);
  display: flex;
  align-items: center;
  gap: 0.75rem;

  .icon {
    color: #00c8ff;
    font-size: 1.2rem;
  }

  h3 {
    font-family: 'Designer', sans-serif;
    font-size: 1rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #00c8ff;
  }

  .status {
    margin-left: auto;
    font-size: 0.75rem;
    font-family: var(--font-secondary);
    color: rgba(255, 255, 255, 0.5);
  }
`;

const ModelCanvas = styled.div`
  height: 350px;
  position: relative;
  background: radial-gradient(ellipse at center, rgba(0, 100, 150, 0.1), transparent 70%);
`;

const ModelPlaceholder = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.5);
  font-family: var(--font-secondary);
  gap: 1rem;

  .icon {
    font-size: 3rem;
    opacity: 0.3;
  }
`;

// Verification Window
const VerificationWindow = styled(motion.div)`
  background: linear-gradient(145deg, rgba(0, 30, 60, 0.8), rgba(0, 10, 30, 0.9));
  border: 1px solid rgba(0, 166, 251, 0.3);
  border-radius: 16px;
  overflow: hidden;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, rgba(0, 255, 136, 0.8), transparent);
  }
`;

const VerificationContent = styled.div`
  padding: 1.5rem;
`;

const InputMethodTabs = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
`;

const TabButton = styled.button`
  flex: 1;
  padding: 0.75rem 1rem;
  background: ${props => props.$active ? 'rgba(0, 200, 255, 0.2)' : 'rgba(0, 0, 0, 0.3)'};
  border: 1px solid ${props => props.$active ? 'rgba(0, 200, 255, 0.5)' : 'rgba(255, 255, 255, 0.1)'};
  border-radius: 8px;
  color: ${props => props.$active ? '#00c8ff' : 'rgba(255, 255, 255, 0.6)'};
  font-family: var(--font-secondary);
  font-size: 0.85rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.2s;

  &:hover {
    border-color: rgba(0, 200, 255, 0.3);
  }
`;

const QRScannerContainer = styled.div`
  width: 100%;
  max-width: 300px;
  margin: 0 auto;
  border-radius: 12px;
  overflow: hidden;
  position: relative;
  background: black;

  &::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(90deg, transparent, #00ff88, transparent);
    animation: ${scanLine} 2s linear infinite;
  }
`;

const SerialInput = styled.input`
  width: 100%;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  color: white;
  font-family: var(--font-secondary);
  font-size: 1rem;
  margin-bottom: 1rem;
  text-align: center;

  &::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }

  &:focus {
    outline: none;
    border-color: rgba(0, 255, 136, 0.5);
  }
`;

const VerificationStatus = styled(motion.div)`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 1rem;
  border-radius: 8px;
  margin-top: 1rem;
  font-family: var(--font-secondary);
  
  ${props => props.$status === 'success' && css`
    background: rgba(0, 255, 136, 0.1);
    border: 1px solid rgba(0, 255, 136, 0.3);
    color: #00ff88;
  `}
  
  ${props => props.$status === 'error' && css`
    background: rgba(255, 107, 107, 0.1);
    border: 1px solid rgba(255, 107, 107, 0.3);
    color: #ff6b6b;
  `}
  
  ${props => props.$status === 'loading' && css`
    background: rgba(0, 200, 255, 0.1);
    border: 1px solid rgba(0, 200, 255, 0.3);
    color: #00c8ff;
  `}
`;

// Detail Modal
const ModalOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(10px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
`;

const ModalContent = styled(motion.div)`
  background: linear-gradient(145deg, rgba(0, 30, 60, 0.95), rgba(0, 10, 30, 0.98));
  border: 1px solid rgba(0, 255, 136, 0.3);
  border-radius: 20px;
  max-width: 800px;
  width: 100%;
  padding: 2rem;
  position: relative;
  box-shadow: 0 0 60px rgba(0, 255, 136, 0.2);
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    max-height: 90vh;
    overflow-y: auto;
  }
`;

const CloseButton = styled.button`
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: none;
  border: none;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.2s;
  z-index: 10;

  &:hover {
    opacity: 1;
  }
`;

const ModalModelView = styled.div`
  height: 350px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  overflow: hidden;
`;

const ModalDetails = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
`;

const ModalTitle = styled.h2`
  font-family: 'Designer', sans-serif;
  font-size: 1.5rem;
  margin-bottom: 1rem;
  background: linear-gradient(135deg, #00ff88, #00c8ff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const ModalInfo = styled.div`
  font-family: var(--font-secondary);
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.8;

  p {
    margin: 0.5rem 0;
  }

  .label {
    color: rgba(255, 255, 255, 0.5);
    font-size: 0.85rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
`;

// Collectibles data
const COLLECTIBLES = [
  {
    id: 1,
    productId: 'lil-durk-figure',
    name: 'Lil Durk',
    fullName: 'Lil Durk 10-Inch Resin Figure',
    image: '/images/product1.webp',
    edition: 'First Edition',
    year: '2025',
    series: 'Lil Durk: Free The Voice Series',
    has3DModel: true,
    locked: true  // Requires ownership to unlock
  },
  { id: 2, name: 'Coming Soon', locked: true },
  { id: 3, name: 'Coming Soon', locked: true },
  { id: 4, name: 'Coming Soon', locked: true },
  { id: 5, name: 'Coming Soon', locked: true },
];

export default function Vault() {
  const navigate = useNavigate();
  const { isInitialized, isWeb3Available, user, isLoading, error: authError, login, logout, getAddress } = useWeb3Auth();

  const [selectedCollectible, setSelectedCollectible] = useState(null);
  const [viewingContent, setViewingContent] = useState(null); // Content viewer state
  const [userTokens, setUserTokens] = useState([]);
  const [walletAddress, setWalletAddress] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [inputMethod, setInputMethod] = useState('manual'); // 'manual' or 'qr'
  const [showModel, setShowModel] = useState(true);

  // Get wallet address and tokens when authenticated
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

  // Check if user owns a collectible
  const isOwned = useCallback((collectibleId) => {
    if (!userTokens || userTokens.length === 0) return false;

    const collectible = COLLECTIBLES.find(c => c.id === collectibleId);
    if (!collectible || !collectible.productId) return false;

    return userTokens.some(token => token.productId === collectible.productId);
  }, [userTokens]);

  // Get token details for a collectible
  const getTokenDetails = useCallback((collectibleId) => {
    if (!userTokens || userTokens.length === 0) return null;

    const collectible = COLLECTIBLES.find(c => c.id === collectibleId);
    if (!collectible || !collectible.productId) return null;

    return userTokens.find(token => token.productId === collectible.productId);
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
    } catch (err) {
      console.error('Disconnection failed:', err);
    }
  };

  // Handle QR scan
  const handleQRScan = useCallback((data) => {
    if (data && data.text) {
      setSerialNumber(data.text);
      setInputMethod('manual'); // Switch back to manual after scan
    }
  }, []);

  // Handle verification
  const handleVerify = async () => {
    if (!serialNumber.trim()) return;

    setIsVerifying(true);
    setVerificationResult(null);

    try {
      // Navigate to verify page with the serial number
      navigate(`/verify/${serialNumber.trim()}`);
    } catch (err) {
      setVerificationResult({ status: 'error', message: err.message || 'Verification failed' });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <VaultSection id="vault">
      <MainTitle>
        <h1>THE VAULT</h1>
        <div className="subtitle">Your Digital Collection</div>
      </MainTitle>

      {/* Wallet Connection Banner */}
      <WalletBanner
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <WalletInfo>
          <div className="icon">
            <FaWallet />
          </div>
          <div className="details">
            {user && walletAddress ? (
              <>
                <h3>Wallet Connected</h3>
                <p>You can now verify and claim your digital collectibles</p>
              </>
            ) : (
              <>
                <h3>Welcome to the Crownmania Vault</h3>
                <p>Create a wallet to claim your digital collectibles</p>
              </>
            )}
          </div>
        </WalletInfo>
        <WalletButtons>
          {user && walletAddress ? (
            <DisconnectButton
              onClick={handleDisconnect}
              disabled={isLoading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <FaSignOutAlt /> Disconnect
            </DisconnectButton>
          ) : (
            <ConnectButton
              onClick={handleConnect}
              disabled={isLoading || !isWeb3Available}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isLoading ? (
                <>
                  <FaSpinner className="spin" /> Connecting...
                </>
              ) : !isWeb3Available ? (
                'Sign-in Unavailable'
              ) : (
                <>
                  <FaWallet /> Connect
                </>
              )}
            </ConnectButton>
          )}
        </WalletButtons>
      </WalletBanner>

      {authError && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            maxWidth: '1200px',
            margin: '0 auto 1rem',
            padding: '1rem',
            background: 'rgba(255, 107, 107, 0.1)',
            border: '1px solid rgba(255, 107, 107, 0.3)',
            borderRadius: '8px',
            color: '#ff6b6b',
            textAlign: 'center',
            fontFamily: 'var(--font-secondary)'
          }}
        >
          <FaExclamationTriangle style={{ marginRight: '0.5rem' }} />
          {authError}
        </motion.div>
      )}

      {/* Interactive Features Section */}
      <FeaturesSection>
        {/* 3D Model Viewer */}
        <ModelViewerWindow
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <WindowHeader>
            <FaCube className="icon" />
            <h3>3D Model Viewer</h3>
            <span className="status">Interactive Preview</span>
          </WindowHeader>
          <ModelCanvas>
            {showModel ? (
              <Canvas
                camera={{ position: [0, 0, 5], fov: 45 }}
                dpr={[1, 1.5]} // Limit pixel ratio for performance
                performance={{ min: 0.5 }} // Allow frame dropping
                frameloop="demand" // Only render when needed
              >
                <ambientLight intensity={0.6} />
                <directionalLight position={[5, 5, 5]} intensity={0.8} />
                <Suspense fallback={null}>
                  <DurkModel isUnlocked={isOwned(1)} />
                </Suspense>
                <OrbitControls enableZoom={true} />
                <Environment preset="studio" />
              </Canvas>
            ) : (
              <ModelPlaceholder>
                <FaCube className="icon" />
                <p>Sign in to view interactive 3D model</p>
              </ModelPlaceholder>
            )}
          </ModelCanvas>
        </ModelViewerWindow>

        {/* Verification Window */}
        <VerificationWindow
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <WindowHeader style={{ borderColor: 'rgba(0, 255, 136, 0.2)' }}>
            <FaQrcode className="icon" style={{ color: '#00ff88' }} />
            <h3 style={{ color: '#00ff88' }}>Verify & Unlock</h3>
          </WindowHeader>
          <VerificationContent>
            <InputMethodTabs>
              <TabButton
                $active={inputMethod === 'manual'}
                onClick={() => setInputMethod('manual')}
              >
                <FaKeyboard /> Enter Code
              </TabButton>
              <TabButton
                $active={inputMethod === 'qr'}
                onClick={() => setInputMethod('qr')}
              >
                <FaQrcode /> Scan QR
              </TabButton>
            </InputMethodTabs>

            {inputMethod === 'qr' ? (
              <QRScannerContainer>
                <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>Loading scanner...</div>}>
                  <QrReader
                    delay={300}
                    onError={(err) => console.error('QR Error:', err)}
                    onScan={handleQRScan}
                    style={{ width: '100%' }}
                  />
                </Suspense>
              </QRScannerContainer>
            ) : (
              <>
                <SerialInput
                  type="text"
                  placeholder="Enter Claim Code"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleVerify()}
                />
                <GlowButton onClick={handleVerify} disabled={!serialNumber.trim() || isVerifying} style={{ width: '100%' }}>
                  {isVerifying ? (
                    <>
                      <FaSpinner style={{ animation: 'spin 1s linear infinite' }} /> Verifying...
                    </>
                  ) : (
                    'Verify Code'
                  )}
                </GlowButton>
              </>
            )}

            {verificationResult && (
              <VerificationStatus
                $status={verificationResult.status}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {verificationResult.status === 'success' && <FaCheck />}
                {verificationResult.status === 'error' && <FaTimes />}
                {verificationResult.status === 'loading' && <FaSpinner />}
                {verificationResult.message}
              </VerificationStatus>
            )}
          </VerificationContent>
        </VerificationWindow>
      </FeaturesSection>

      {/* Collectibles Grid */}
      <CollectiblesGrid>
        {COLLECTIBLES.map((collectible) => {
          const owned = isOwned(collectible.id);
          const unlocked = !collectible.locked || owned;

          return (
            <CollectibleSlot
              key={collectible.id}
              $unlocked={unlocked}
              onClick={() => unlocked && setSelectedCollectible(collectible)}
              whileHover={{ scale: unlocked ? 1.05 : 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {unlocked ? (
                <UnlockedContent>
                  {owned && <OwnedBadge>Owned</OwnedBadge>}
                  <CollectibleImage src={collectible.image} alt={collectible.name} />
                  <CollectibleName>{collectible.name}</CollectibleName>
                </UnlockedContent>
              ) : (
                <LockedOverlay>
                  <SilhouetteHead>
                    <QuestionMark>?</QuestionMark>
                  </SilhouetteHead>
                </LockedOverlay>
              )}
            </CollectibleSlot>
          );
        })}
      </CollectiblesGrid>

      {/* Detail Modal with 3D Model */}
      <AnimatePresence>
        {selectedCollectible && (
          <ModalOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedCollectible(null)}
          >
            <ModalContent
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <CloseButton onClick={() => setSelectedCollectible(null)}>×</CloseButton>

              {/* 3D Model View */}
              <ModalModelView>
                {selectedCollectible.has3DModel ? (
                  <Canvas
                    camera={{ position: [0, 0, 5], fov: 45 }}
                    dpr={[1, 1.5]}
                    frameloop="demand"
                  >
                    <ambientLight intensity={0.6} />
                    <directionalLight position={[5, 5, 5]} intensity={0.8} />
                    <Suspense fallback={null}>
                      <DurkModel />
                    </Suspense>
                    <OrbitControls enableZoom={true} />
                    <Environment preset="studio" />
                  </Canvas>
                ) : (
                  <img
                    src={selectedCollectible.image}
                    alt={selectedCollectible.name}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                )}
              </ModalModelView>

              {/* Details */}
              <ModalDetails>
                <ModalTitle>{selectedCollectible.fullName || selectedCollectible.name}</ModalTitle>
                <ModalInfo>
                  <p><span className="label">Series:</span><br />{selectedCollectible.series || 'Lil Durk: Free The Voice Series'}</p>
                  {selectedCollectible.edition ? (
                    <p><span className="label">Edition:</span><br />#{selectedCollectible.edition} of {selectedCollectible.totalEditions || 500}</p>
                  ) : (
                    <p><span className="label">Edition:</span><br />Limited Edition</p>
                  )}
                  <p><span className="label">Year:</span><br />{selectedCollectible.year || '2025'}</p>
                </ModalInfo>
                {isOwned(selectedCollectible.id) && (() => {
                  const tokenDetails = getTokenDetails(selectedCollectible.id);
                  return (
                    <div style={{
                      marginTop: '1rem',
                      padding: '1.25rem',
                      background: 'linear-gradient(145deg, rgba(0, 40, 60, 0.9), rgba(0, 20, 40, 0.95))',
                      border: '1px solid rgba(0, 255, 136, 0.3)',
                      borderRadius: '12px'
                    }}>
                      <p style={{
                        color: '#00ff88',
                        marginBottom: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        fontWeight: '600'
                      }}>
                        <FaCheck /> You own this collectible
                      </p>

                      {/* Ownership Details Grid */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '0.75rem',
                        fontSize: '0.85rem'
                      }}>
                        <div>
                          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Edition</span>
                          <p style={{ color: '#00c8ff', fontFamily: 'monospace', marginTop: '0.25rem' }}>
                            #{tokenDetails?.editionNumber || tokenDetails?.claimNumber || '1'} of {tokenDetails?.totalEditions || 500}
                          </p>
                        </div>
                        <div>
                          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Claimed On</span>
                          <p style={{ color: 'white', marginTop: '0.25rem' }}>
                            {tokenDetails?.claimedAt ?
                              new Date(tokenDetails.claimedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                              : 'Recently'
                            }
                          </p>
                        </div>
                        <div>
                          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Owner Wallet</span>
                          <p style={{ color: 'white', fontFamily: 'monospace', marginTop: '0.25rem', fontSize: '0.8rem' }}>
                            {walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'Connected'}
                          </p>
                        </div>
                        <div>
                          <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Token ID</span>
                          <p style={{ color: 'white', fontFamily: 'monospace', marginTop: '0.25rem', fontSize: '0.8rem' }}>
                            {tokenDetails?.tokenId || tokenDetails?.id || 'NFT-' + (tokenDetails?.claimNumber || '001')}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })()}
                {!isOwned(selectedCollectible.id) && (
                  <GlowButton
                    style={{ marginTop: '1.5rem' }}
                    onClick={() => {
                      if (!user) {
                        handleConnect();
                        return;
                      }
                      // Navigate to mint page with product info
                      navigate('/mintNFT', {
                        state: {
                          product: {
                            id: selectedCollectible.productId,
                            name: selectedCollectible.name,
                            image: selectedCollectible.image
                          }
                        }
                      });
                    }}
                  >
                    {user ? 'Unlock' : 'Sign in to Unlock'}
                  </GlowButton>
                )}
              </ModalDetails>
            </ModalContent>
          </ModalOverlay>
        )}
      </AnimatePresence>

      {/* Content Viewer */}
      <AnimatePresence>
        {viewingContent && (
          <ContentViewer
            contentId={viewingContent.contentId}
            onClose={() => setViewingContent(null)}
            walletAddress={walletAddress}
          />
        )}
      </AnimatePresence>
    </VaultSection>
  );
}