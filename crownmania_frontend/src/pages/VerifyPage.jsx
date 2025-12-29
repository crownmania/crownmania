import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaShieldAlt, FaCheckCircle, FaExclamationTriangle, FaWallet, FaArrowRight } from 'react-icons/fa';
import useWeb3Auth from '../hooks/useWeb3Auth';
import { verificationAPI } from '../services/api';

// API URL - uses environment variable or defaults to local backend
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

const VerifyContainer = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: white;
  position: relative;
  z-index: 1;
`;

const ContentCard = styled(motion.div)`
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 3rem;
  border-radius: 20px;
  max-width: 600px;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  box-shadow: 0 0 40px rgba(0, 0, 0, 0.5);

  @media (max-width: 768px) {
    padding: 2rem;
  }
`;

const ProductImage = styled.img`
  width: 200px;
  height: 200px;
  object-fit: cover;
  border-radius: 12px;
  margin-bottom: 1.5rem;
  border: 2px solid rgba(255, 255, 255, 0.2);
`;

const Title = styled.h1`
  font-family: 'Designer', sans-serif;
  font-size: clamp(1.5rem, 4vw, 2.5rem);
  margin-bottom: 1rem;
  background: linear-gradient(135deg, #fff 0%, #a5b4fc 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const ProductName = styled.h2`
  font-family: 'Designer', sans-serif;
  font-size: 1.5rem;
  color: #ffd700;
  margin-bottom: 0.5rem;
`;

const SerialDisplay = styled.div`
  font-family: 'Courier New', monospace;
  background: rgba(255, 255, 255, 0.05);
  padding: 0.8rem 1.5rem;
  border-radius: 8px;
  border: 1px dashed rgba(255, 255, 255, 0.3);
  margin: 1.5rem 0;
  font-size: 1rem;
  letter-spacing: 0.05em;
  color: #a5b4fc;
  word-break: break-all;
`;

const StatusIcon = styled(motion.div)`
  font-size: 4rem;
  margin-bottom: 1.5rem;
  
  &.valid { color: #4ade80; }
  &.invalid { color: #ef4444; }
  &.checking { color: #a5b4fc; }
`;

const Message = styled.p`
  font-size: 1.1rem;
  line-height: 1.6;
  opacity: 0.9;
  margin-bottom: 2rem;
  max-width: 400px;
`;

const ActionButton = styled(motion.button)`
  background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%);
  border: none;
  padding: 1rem 2rem;
  border-radius: 12px;
  color: white;
  font-family: 'Designer', sans-serif;
  font-size: 1.1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.8rem;
  margin-top: 1rem;
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ErrorMessage = styled.div`
  color: #ef4444;
  font-size: 0.9rem;
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  text-align: center;
`;

export default function VerifyPage() {
    const { serial } = useParams();
    const navigate = useNavigate();
    const { login, user, getAddress, signMessage, isInitialized, isLoading: isWeb3Loading, isWeb3Available } = useWeb3Auth();

    const [status, setStatus] = useState('checking'); // checking, valid, invalid, claimed, already_claimed
    const [walletAddress, setWalletAddress] = useState(null);
    const [product, setProduct] = useState(null);
    const [errorMessage, setErrorMessage] = useState('');

    // Sync wallet address
    useEffect(() => {
        const syncWallet = async () => {
            if (user) {
                const address = await getAddress();
                setWalletAddress(address);
            } else {
                setWalletAddress(null);
            }
        };
        syncWallet();
    }, [user, getAddress]);

    useEffect(() => {
        // Call the real backend API to verify the claim code
        const checkSerial = async () => {
            try {
                const data = await verificationAPI.verifyProduct(serial);

                console.log('Verification response:', data);

                if (data.verified) {
                    if (data.claimed) {
                        // Already claimed
                        setStatus('already_claimed');
                        setProduct(data.product);
                    } else {
                        // Valid and ready to claim
                        setStatus('valid');
                        setProduct(data.product);
                    }
                } else {
                    setStatus('invalid');
                    setErrorMessage(data.message || 'This code could not be verified.');
                }
            } catch (error) {
                console.error('Verification error:', error);
                setStatus('invalid');
                setErrorMessage('Unable to connect to verification server. Please try again later.');
            }
        };

        checkSerial();
    }, [serial]);

    const handleConnectWallet = async () => {
        try {
            await login();
        } catch (err) {
            setErrorMessage('Failed to connect wallet.');
        }
    };

    const handleClaim = async () => {
        if (!walletAddress) {
            setErrorMessage('Wallet not connected');
            return;
        }

        setStatus('claiming');
        setErrorMessage('');

        try {
            // Sign a message to prove wallet ownership
            const message = `I claim ownership of product ${serial} on Crownmania. Timestamp: ${Date.now()}`;
            const signature = await signMessage(message);

            if (!signature) {
                setErrorMessage('Failed to sign ownership proof. Please try again.');
                setStatus('valid');
                return;
            }

            // Call API to claim product
            const result = await verificationAPI.claimProduct(serial, walletAddress, signature, message);

            if (result.success) {
                setStatus('claimed');

                // Save to local storage for vault display
                const owned = JSON.parse(localStorage.getItem('my_collectibles') || '[]');
                if (!owned.find(item => item.id === serial)) {
                    owned.push({
                        id: serial,
                        tokenId: result.tokenId,
                        type: product?.type,
                        name: product?.name || 'Crownmania Collectible',
                        description: product?.description,
                        imageUrl: product?.imageUrl,
                        claimedDate: new Date().toISOString(),
                        walletAddress
                    });
                    localStorage.setItem('my_collectibles', JSON.stringify(owned));
                }
            } else {
                setErrorMessage(result.message || 'Failed to claim');
                setStatus('valid');
            }
        } catch (err) {
            console.error('Claim error:', err);
            setErrorMessage(err.message || 'Failed to claim product');
            setStatus('valid');
        }
    };

    return (
        <VerifyContainer>

            <ContentCard
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
            >
                <AnimatePresence mode="wait">
                    {status === 'checking' && (
                        <motion.div
                            key="checking"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <StatusIcon className="checking" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}>
                                <FaShieldAlt />
                            </StatusIcon>
                            <Title>Authenticating...</Title>
                            <Message>Verifying security signature and blockchain records for this item.</Message>
                            <SerialDisplay>{serial}</SerialDisplay>
                        </motion.div>
                    )}

                    {status === 'valid' && !walletAddress && (
                        <motion.div
                            key="valid"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <StatusIcon className="valid" initial={{ scale: 0 }} animate={{ scale: 1 }}>
                                <FaCheckCircle />
                            </StatusIcon>
                            <Title>Authentication Successful!</Title>
                            {product && (
                                <>
                                    {product.imageUrl && <ProductImage src={product.imageUrl} alt={product.name} />}
                                    <ProductName>{product.name}</ProductName>
                                </>
                            )}
                            <Message>
                                This item has been verified as authentic.
                                Sign in with your social account to secure your Digital Twin.
                            </Message>
                            <SerialDisplay>{serial}</SerialDisplay>
                            <ActionButton
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handleConnectWallet}
                            >
                                <FaWallet /> Sign in to the Vault
                            </ActionButton>
                        </motion.div>
                    )}

                    {status === 'valid' && walletAddress && (
                        <motion.div
                            key="claim"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <StatusIcon className="valid">
                                <FaWallet />
                            </StatusIcon>
                            <Title>Account Secured</Title>
                            <Message>
                                You have successfully secured your account. You are now ready to claim the Digital Twin for this item.
                            </Message>
                            <ActionButton
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handleClaim}
                            >
                                Claim Digital Token <FaArrowRight />
                            </ActionButton>
                            {errorMessage && <ErrorMessage>{errorMessage}</ErrorMessage>}
                        </motion.div>
                    )}

                    {status === 'claiming' && (
                        <motion.div
                            key="claiming"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                        >
                            <StatusIcon className="checking" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                                <FaShieldAlt />
                            </StatusIcon>
                            <Title>Minting...</Title>
                            <Message>Recording ownership on the blockchain securely.</Message>
                        </motion.div>
                    )}

                    {status === 'claimed' && (
                        <motion.div
                            key="success"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                        >
                            <StatusIcon className="valid">
                                <FaCheckCircle />
                            </StatusIcon>
                            <Title>Ownership Verified</Title>
                            <Message>
                                Congratulations! This item is now cryptographically linked to your wallet.
                            </Message>
                            <ActionButton
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => navigate('/#vault')}
                            >
                                View in Vault
                            </ActionButton>
                        </motion.div>
                    )}

                    {status === 'already_claimed' && (
                        <motion.div
                            key="already_claimed"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                        >
                            <StatusIcon className="invalid">
                                <FaExclamationTriangle />
                            </StatusIcon>
                            <Title>Already Claimed</Title>
                            {product && (
                                <>
                                    {product.imageUrl && <ProductImage src={product.imageUrl} alt={product.name} />}
                                    <ProductName>{product.name}</ProductName>
                                </>
                            )}
                            <Message>
                                This Digital Twin NFT has already been claimed by another wallet.
                                Each physical item can only be claimed once.
                            </Message>
                            <SerialDisplay>{serial}</SerialDisplay>
                            <ActionButton onClick={() => navigate('/')}>
                                Return Home
                            </ActionButton>
                        </motion.div>
                    )}

                    {status === 'invalid' && (
                        <motion.div
                            key="invalid"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                        >
                            <StatusIcon className="invalid">
                                <FaExclamationTriangle />
                            </StatusIcon>
                            <Title>Authentication Failed</Title>
                            <Message>
                                {errorMessage || 'We could not verify this serial number. It may be counterfeit or invalid.'}
                            </Message>
                            <SerialDisplay>{serial}</SerialDisplay>
                            <ActionButton onClick={() => navigate('/')}>
                                Return Home
                            </ActionButton>
                        </motion.div>
                    )}
                </AnimatePresence>
            </ContentCard>
        </VerifyContainer>
    );
}
