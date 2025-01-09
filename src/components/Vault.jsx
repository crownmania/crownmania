import { useState } from 'react';
import styled from 'styled-components';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import QrReader from 'react-qr-scanner';
import { DurkModel } from './3d/DurkModel';
import GlowButton from './GlowButton';
import { FaQrcode, FaCheck, FaTimes, FaSpinner, FaChevronDown } from 'react-icons/fa';

const VaultSection = styled.section`
  min-height: 100vh;
  background: var(--dark-blue);
  color: white;
  padding: 2rem;
  position: relative;
  display: grid;
  gap: 2rem;
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
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  padding: 2rem;
  margin-bottom: 2rem;
  text-align: center;

  h1 {
    font-size: 3rem;
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
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: auto 1fr auto;
  gap: 2rem;
  padding: 2rem;
`;

const Window = styled.div`
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 1.5rem;
  backdrop-filter: blur(10px);

  h3 {
    font-family: 'Designer', sans-serif;
    margin-bottom: 1rem;
    font-size: 1.2rem;
    text-transform: uppercase;
  }
`;

const ModelWindow = styled(Window)`
  grid-column: 2;
  grid-row: 1 / span 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;

  .model-container {
    width: 100%;
    height: 400px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    overflow: hidden;
    margin-bottom: 1rem;
  }
`;

const VerificationWindow = styled(Window)`
  grid-column: 3;
  grid-row: 1 / span 2;
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const SerialInput = styled.input`
  width: 100%;
  padding: 0.8rem;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: white;
  font-family: 'Designer', sans-serif;
`;

const QRIconButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.8rem;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: white;
  width: 100%;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
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
  width: 500px;
  position: relative;

  select {
    background: transparent;
    border: none;
    color: white;
    font-family: 'Designer', sans-serif;
    font-size: 1.2rem;
    width: calc(100% - 30px);
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
  }
`;

const AuthButtons = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
`;

const StatusWindow = styled(Window)`
  padding: 1rem;
  margin-top: 1rem;
  text-align: center;
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
`;

const ClaimWindow = styled(Window)`
  margin-top: 1rem;
  text-align: center;
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
  const [isScanning, setIsScanning] = useState(false);
  const [serialNumber, setSerialNumber] = useState('');
  const [verificationStatus, setVerificationStatus] = useState('');
  const [selectedModel, setSelectedModel] = useState('');

  const handleVerification = () => {
    if (!serialNumber) return;
    setVerificationStatus('verifying');
    setTimeout(() => {
      setVerificationStatus(Math.random() > 0.5 ? 'verified' : 'failed');
    }, 2000);
  };

  return (
    <VaultSection>
      <TopBar>
        <div>AUTHENTICATE • AUTHENTICATE • VERIFY • CONNECT • CONNECT</div>
        <div className="auth-status">0 / 71</div>
      </TopBar>

      <MainTitle>
        <h1>THE VAULT</h1>
        <div className="subtitle">AUTHENTICATE VECTOR MODEL</div>
      </MainTitle>

      <GridLayout>
        <Window style={{ gridColumn: 1, gridRow: '1 / span 2' }}>
          <h3>COLLECTIBLE INFORMATION</h3>
          <div>
            <p>Collection: Crown Series</p>
            <p>Edition: Limited</p>
            <p>Release Date: 2025</p>
          </div>
        </Window>

        <div style={{ gridColumn: 2, gridRow: '1 / span 2' }}>
          <CollectibleSelector>
            <select 
              value={selectedModel} 
              onChange={(e) => setSelectedModel(e.target.value)}
            >
              <option value="">Collectible Name</option>
              <option value="durk">Durk Model</option>
              <option value="model2">Vector Model 2</option>
              <option value="model3">Vector Model 3</option>
            </select>
            <FaChevronDown className="dropdown-icon" />
          </CollectibleSelector>

          <ModelWindow>
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
            <h2>AUTHENTITE 3D MODEL</h2>
            <p>View and verify your digital authentite model</p>
          </ModelWindow>
        </div>

        <div style={{ gridColumn: 3, gridRow: '1 / span 2' }}>
          <AuthButtons>
            <GlowButton>SIGN IN</GlowButton>
            <GlowButton>CONNECT WALLET</GlowButton>
          </AuthButtons>

          <VerificationWindow>
            <h3>VERIFY COLLECTIBLE</h3>
            <QRIconButton onClick={() => setIsScanning(!isScanning)}>
              <FaQrcode /> {isScanning ? 'Cancel Scan' : 'Scan QR Code'}
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
            <GlowButton onClick={handleVerification}>
              Begin Verification
            </GlowButton>

            <StatusWindow status={verificationStatus}>
              <h3>VERIFICATION STATUS</h3>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                {verificationStatus === 'verifying' && <FaSpinner />}
                {verificationStatus === 'verified' && <FaCheck />}
                {verificationStatus === 'failed' && <FaTimes />}
                {verificationStatus === 'verifying' && 'Verifying...'}
                {verificationStatus === 'verified' && 'Verification Successful'}
                {verificationStatus === 'failed' && 'Verification Failed'}
              </div>
            </StatusWindow>

            <ClaimWindow>
              <h3>CLAIM DIGITAL COLLECTIBLE</h3>
              {verificationStatus === 'verified' && (
                <GlowButton>
                  Claim Collectible
                </GlowButton>
              )}
            </ClaimWindow>
          </VerificationWindow>
        </div>

        <DigitalComponentsWindow>
          <h3>DIGITAL COMPONENTS</h3>
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
          <h3>COLLECTIBLE DETAILS</h3>
          {/* Add collectible information here */}
        </CollectibleInfoWindow>
      </GridLayout>
    </VaultSection>
  );
}
