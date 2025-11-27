import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import QrReader from 'react-qr-scanner';
import { DurkModel } from './3d/DurkModel';
import useWeb3Auth from '../hooks/useWeb3Auth';
import verificationApi from '../api/verificationApi';
import GlowButton from './GlowButton';
import { FaQrcode, FaCheck, FaTimes, FaSpinner, FaChevronDown } from 'react-icons/fa';

const VaultSection = styled.section`
  min-height: 100vh;
  background: rgba(0, 19, 36, 0.5);
  color: white;
  padding: 2rem;
  position: relative;
  display: grid;
  gap: 2rem;
  backdrop-filter: blur(10px);
`;

const TopBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const MainTitle = styled.div`
  position: absolute;
  top: 2rem;
  left: 50%;
  transform: translateX(-50%);
  padding: 1rem;
  text-align: center;
  z-index: 10;

  h1 {
    font-size: 2.5rem;
    font-family: 'Designer', sans-serif;
    margin-bottom: 0.5rem;
    font-weight: bold;
  }

  .subtitle {
    font-size: 0.8rem;
    opacity: 0.8;
    letter-spacing: 0.1em;
    font-family: 'Avenir Next', sans-serif;
    text-transform: uppercase;
  }

  .social-icons {
    display: none;
  }
`;

const GridLayout = styled.div`
  margin-top: 12rem;
  display: grid;
  grid-template-columns: minmax(300px, 1fr) auto minmax(300px, 1fr);
  grid-template-rows: auto 1fr auto;
  gap: 2rem;
  padding: 2rem;
  max-width: 1800px;
  margin: 0 auto;
  width: 100%;
`;

const Window = styled.div`
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 1rem;
  position: relative;

  .window-title {
    font-family: 'Designer', sans-serif;
    font-size: 1.2rem;
    margin-bottom: 1rem;
    color: white;
  }

  .window-subtitle {
    font-family: 'Avenir Next', sans-serif;
    font-size: 0.9rem;
    opacity: 0.8;
    margin-bottom: 1rem;
  }
`;

const ModelShowcase = styled.div`
  grid-column: 2;
  grid-row: 1 / span 3;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: calc(100vh - 16rem); 
  max-height: 800px; 
  min-height: 400px; 
  overflow: hidden; 

  .model-container {
    width: 100%;
    height: 100%;
    position: relative;

    canvas {
      width: 100% !important;
      height: 100% !important;
      object-fit: contain;
    }
  }

  .model-title {
    font-family: 'Designer', sans-serif;
    font-size: 1.2rem;
    text-align: center;
    margin-top: 1rem;
    color: rgba(255, 255, 255, 0.8);
  }
`;

const VerificationWindow = styled(Window)`
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  padding: 2rem;

  h3 {
    font-family: 'Designer', sans-serif;
    font-size: 1.2rem;
    text-align: center;
  }

  p {
    font-family: 'Avenir Next', sans-serif;
  }
`;

const SerialInput = styled.input`
  width: 100%;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: white;
  font-family: 'Avenir Next', sans-serif;
  font-size: 1rem;

  &::placeholder {
    color: rgba(255, 255, 255, 0.5);
    font-family: 'Avenir Next', sans-serif;
  }
`;

const QRIconButton = styled.button`
  width: 120px;
  height: 120px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: white;
  cursor: pointer;
  font-family: 'Avenir Next', sans-serif;
  margin: 0 auto;
  padding: 1rem;
  transition: all 0.3s ease;

  svg {
    font-size: 2rem;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
`;

const StatusWindow = styled(Window)`
  padding: 1.5rem;
  margin-top: 1rem;
  text-align: center;
  font-family: 'Avenir Next', sans-serif;
  min-height: 150px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  background: ${props => {
    if (props.status === 'verified') return 'rgba(0, 255, 0, 0.1)';
    if (props.status === 'failed') return 'rgba(255, 0, 0, 0.1)';
    return 'rgba(0, 0, 0, 0.3)';
  }};
  border: 1px solid ${props => {
    if (props.status === 'verified') return 'rgba(0, 255, 0, 0.3)';
    if (props.status === 'failed') return 'rgba(255, 0, 0, 0.3)';
    return 'rgba(255, 255, 255, 0.1)';
  }};

  h3 {
    font-family: 'Designer', sans-serif;
    margin-bottom: 1rem;
  }

  .loading-bar {
    width: 100%;
    height: 4px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 2px;
    overflow: hidden;
    margin: 1rem 0;

    &::after {
      content: '';
      display: block;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, #00ff00, #00ff00);
      animation: loading 2s ease-in-out infinite;
      transform-origin: left;
    }
  }

  @keyframes loading {
    0% {
      transform: scaleX(0);
    }
    50% {
      transform: scaleX(1);
    }
    100% {
      transform: scaleX(0);
    }
  }

  .status-content {
    opacity: ${props => props.status === 'verifying' ? 0 : 1};
    transition: opacity 0.3s ease;
  }
`;

const ClaimWindow = styled(Window)`
  margin-top: 1rem;
  text-align: center;
  font-family: 'Avenir Next', sans-serif;

  h3 {
    font-family: 'Designer', sans-serif;
  }
`;

const CollectibleSelector = styled.div`
  display: flex;
  align-items: center;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  margin: 0 auto;
  margin-bottom: 1rem;
  padding: 0.5rem 1rem;
  height: 50px;
  width: 100%;
  max-width: 500px;
  position: relative;

  select {
    background: transparent;
    border: none;
    color: white;
    font-family: 'Designer', sans-serif;
    font-size: 1.2rem;
    width: 100%;
    padding-right: 30px;
    cursor: pointer;
    appearance: none;
    outline: none;

    option {
      background: var(--dark-blue);
      color: white;
    }
  }

  .dropdown-icon {
    position: absolute;
    right: 1rem;
    color: rgba(255, 255, 255, 0.5);
    pointer-events: none;
  }
`;

const AuthButtons = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
`;

const DigitalComponentsWindow = styled(Window)`
  grid-column: 1;
  grid-row: 3;
  min-height: 400px;
  display: flex;
  flex-direction: column;

  .model-preview {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: 1rem;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 8px;
    padding: 1rem;
  }
`;

const CollectibleInfoWindow = styled(Window)`
  grid-column: 2;
  grid-row: 3;
`;

export default function Vault() {
  const location = useLocation();
  const { isInitialized, user, isLoading, error, login, logout, getAddress } = useWeb3Auth();
  
  const [isScanning, setIsScanning] = useState(false);
  const [serialNumber, setSerialNumber] = useState('');
  const [verificationStatus, setVerificationStatus] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [verificationStep, setVerificationStep] = useState('initial'); // initial, email, token, success
  const [verificationMessage, setVerificationMessage] = useState('');
  const [tokenInput, setTokenInput] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [userTokens, setUserTokens] = useState([]);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);
  
  // Parse QR code from URL if present
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const serialFromQR = params.get('serial');
    if (serialFromQR) {
      setSerialNumber(serialFromQR);
    }
  }, [location]);
  
  // Get wallet address when authenticated
  useEffect(() => {
    const fetchAddress = async () => {
      if (user) {
        const address = await getAddress();
        setWalletAddress(address);
        fetchUserTokens(address);
      }
    };
    
    if (isInitialized && user) {
      fetchAddress();
    }
  }, [isInitialized, user, getAddress]);
  
  // Fetch user's tokens
  const fetchUserTokens = async (address) => {
    if (!address) return;
    
    try {
      setIsLoadingTokens(true);
      const tokens = await verificationApi.getWalletTokens(address);
      setUserTokens(tokens);
      
      // If tokens exist, select the first one
      if (tokens.length > 0) {
        setSelectedModel(tokens[0].serialNumber);
      }
    } catch (error) {
      console.error("Error fetching tokens:", error);
    } finally {
      setIsLoadingTokens(false);
    }
  };
  
  // Handle serial number verification
  const handleVerification = async () => {
    if (!serialNumber) return;
    
    try {
      setVerificationStatus('verifying');
      const result = await verificationApi.verifySerialNumber(serialNumber);
      
      if (result.verified) {
        setVerificationStatus('verified');
        setVerificationStep('email');
        setVerificationMessage(result.message);
      } else {
        setVerificationStatus('failed');
        setVerificationMessage(result.message);
      }
    } catch (error) {
      console.error("Verification error:", error);
      setVerificationStatus('failed');
      setVerificationMessage('Error during verification. Please try again.');
    }
  };
  
  // Handle email verification request
  const handleEmailVerification = async () => {
    if (!emailInput || !serialNumber) return;
    
    try {
      setVerificationStatus('verifying');
      const result = await verificationApi.requestEmailVerification(serialNumber, emailInput);
      
      if (result.success) {
        setVerificationStep('token');
        setVerificationMessage(result.message);
      } else {
        setVerificationStatus('failed');
        setVerificationMessage(result.message);
      }
    } catch (error) {
      console.error("Email verification error:", error);
      setVerificationStatus('failed');
      setVerificationMessage('Error during email verification. Please try again.');
    } finally {
      setVerificationStatus('');
    }
  };
  
  // Handle token verification
  const handleTokenVerification = async () => {
    if (!tokenInput) return;
    
    try {
      setVerificationStatus('verifying');
      const result = await verificationApi.verifyToken(tokenInput);
      
      if (result.success) {
        setVerificationStep('success');
        setVerificationMessage('Email verified successfully. You can now claim your digital collectible.');
      } else {
        setVerificationStatus('failed');
        setVerificationMessage(result.message);
      }
    } catch (error) {
      console.error("Token verification error:", error);
      setVerificationStatus('failed');
      setVerificationMessage('Error during token verification. Please try again.');
    } finally {
      setVerificationStatus('');
    }
  };
  
  // Handle token claiming
  const handleClaimToken = async () => {
    if (!walletAddress || !serialNumber) {
      // If no wallet address, prompt login first
      if (!walletAddress) {
        await login();
        return;
      }
      return;
    }
    
    try {
      setVerificationStatus('verifying');
      const result = await verificationApi.issueToken(serialNumber, walletAddress);
      
      if (result.success) {
        setVerificationStatus('verified');
        setVerificationMessage('Digital collectible claimed successfully!');
        fetchUserTokens(walletAddress);
      } else {
        setVerificationStatus('failed');
        setVerificationMessage(result.message);
      }
    } catch (error) {
      console.error("Token claiming error:", error);
      setVerificationStatus('failed');
      setVerificationMessage('Error during token claiming. Please try again.');
    }
  };

  return (
    <VaultSection>
      <TopBar>
        <div></div>
        <div className="auth-status"></div>
      </TopBar>

      <MainTitle>
        <h1>THE VAULT</h1>
        <div className="subtitle">VERIFY • AUTHENTICATE • SECURE</div>
      </MainTitle>

      <GridLayout>
        <Window style={{ gridColumn: 1, gridRow: '1 / span 2' }}>
          <h3 className="window-title">COLLECTIBLE INFORMATION</h3>
          <div className="window-subtitle" style={{ fontFamily: 'Avenir Next, sans-serif' }}>
            <p>Collection: Crown Series</p>
            <p>Edition: Limited</p>
            <p>Release Date: 2025</p>
          </div>
        </Window>

        <ModelShowcase>
          <CollectibleSelector>
            <select 
              value={selectedModel} 
              onChange={(e) => setSelectedModel(e.target.value)}
              disabled={isLoadingTokens}
            >
              <option value="">Select Your Collectible</option>
              {userTokens.length > 0 ? (
                userTokens.map(token => (
                  <option key={token.id} value={token.serialNumber}>
                    {token.productName} #{token.serialNumber.slice(-6)}
                  </option>
                ))
              ) : (
                <option value="" disabled>{isLoadingTokens ? 'Loading...' : 'No collectibles found'}</option>
              )}
            </select>
            <FaChevronDown className="dropdown-icon" />
          </CollectibleSelector>

          <div className="model-container">
            <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
              <ambientLight intensity={0.5} />
              <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
              <pointLight position={[-10, -10, -10]} />
              <DurkModel />
              <OrbitControls enableZoom={true} />
              <Environment preset="city" />
            </Canvas>
          </div>
          <div className="model-title">AUTHENTITE 3D MODEL</div>
        </ModelShowcase>

        <div style={{ gridColumn: 3, gridRow: '1 / span 3' }}>
          <AuthButtons>
            {!user ? (
              <GlowButton onClick={login} disabled={isLoading}>
                {isLoading ? 'CONNECTING...' : 'SIGN IN / CONNECT WALLET'}
              </GlowButton>
            ) : (
              <GlowButton onClick={logout}>SIGN OUT</GlowButton>
            )}
          </AuthButtons>
          {user && (
            <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
              <p>Welcome, {user.name || user.email}</p>
              {walletAddress && <p className="subtitle">Wallet: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</p>}
            </div>
          )}

          <VerificationWindow>
            <h3 className="window-title">VERIFY COLLECTIBLE</h3>
            <QRIconButton onClick={() => setIsScanning(!isScanning)}>
              <FaQrcode />
              {isScanning ? 'Cancel Scan' : 'Scan QR'}
            </QRIconButton>
            {isScanning && (
              <QrReader
                delay={300}
                onError={(err) => console.error(err)}
                onScan={(data) => {
                  if (data) {
                    setSerialNumber(data);
                    setIsScanning(false);
                  }
                }}
                style={{ width: '100%' }}
              />
            )}
            <SerialInput
              type="text"
              placeholder="Input Serial Number"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
            />
            
            {verificationStep === 'initial' && (
              <GlowButton onClick={handleVerification} disabled={!serialNumber || verificationStatus === 'verifying'}>
                {verificationStatus === 'verifying' ? 'Verifying...' : 'Begin Verification'}
              </GlowButton>
            )}
            
            {verificationStep === 'email' && (
              <>
                <p style={{ margin: '1rem 0', textAlign: 'center' }}>
                  Please enter the email used for your purchase to verify ownership:
                </p>
                <SerialInput
                  type="email"
                  placeholder="Enter purchase email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                />
                <GlowButton onClick={handleEmailVerification} disabled={!emailInput || verificationStatus === 'verifying'}>
                  {verificationStatus === 'verifying' ? 'Sending...' : 'Send Verification Email'}
                </GlowButton>
              </>
            )}
            
            {verificationStep === 'token' && (
              <>
                <p style={{ margin: '1rem 0', textAlign: 'center' }}>
                  Please enter the verification code sent to your email:
                </p>
                <SerialInput
                  type="text"
                  placeholder="Enter verification code"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                />
                <GlowButton onClick={handleTokenVerification} disabled={!tokenInput || verificationStatus === 'verifying'}>
                  {verificationStatus === 'verifying' ? 'Verifying...' : 'Verify Code'}
                </GlowButton>
              </>
            )}

            <StatusWindow status={verificationStatus}>
              <h3 className="window-title">VERIFICATION STATUS</h3>
              {verificationStatus === 'verifying' ? (
                <div className="loading-bar" />
              ) : (
                <div className="status-content">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    {verificationStatus === 'verified' && <FaCheck size={24} />}
                    {verificationStatus === 'failed' && <FaTimes size={24} />}
                    {verificationStatus === 'verified' && 'Verification Successful'}
                    {verificationStatus === 'failed' && 'Verification Failed'}
                  </div>
                  {verificationMessage && (
                    <p style={{ marginTop: '1rem', textAlign: 'center' }}>{verificationMessage}</p>
                  )}
                </div>
              )}
            </StatusWindow>

            <ClaimWindow>
              <h3 className="window-title">CLAIM DIGITAL COLLECTIBLE</h3>
              {verificationStep === 'success' && (
                <>
                  <p style={{ margin: '1rem 0', textAlign: 'center' }}>
                    Your product has been successfully verified. You can now claim your digital collectible.
                  </p>
                  <GlowButton onClick={handleClaimToken} disabled={verificationStatus === 'verifying'}>
                    {verificationStatus === 'verifying' ? 'Processing...' : 'Claim Collectible'}
                  </GlowButton>
                </>
              )}
            </ClaimWindow>
          </VerificationWindow>
        </div>

        <DigitalComponentsWindow>
          <h3 className="window-title">DIGITAL COLLECTIBLE</h3>
          <div className="model-preview">
            <Canvas>
              <ambientLight intensity={0.5} />
              <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} />
              <pointLight position={[-10, -10, -10]} />
              <DurkModel />
              <OrbitControls enableZoom={true} />
              <Environment preset="city" />
            </Canvas>
          </div>
        </DigitalComponentsWindow>

        <CollectibleInfoWindow>
          <h3 className="window-title">DIGITAL COLLECTIBLE INFORMATION</h3>
          <div className="window-subtitle" style={{ fontFamily: 'Avenir Next, sans-serif' }}>
            {/* Add collectible information here */}
          </div>
        </CollectibleInfoWindow>
      </GridLayout>
    </VaultSection>
  );
}
