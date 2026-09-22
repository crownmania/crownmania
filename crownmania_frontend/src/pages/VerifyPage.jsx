import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaShieldAlt, FaCheckCircle, FaExclamationTriangle, FaWallet, FaArrowRight, FaLock, FaUser, FaShare, FaLink, FaCopy, FaCertificate, FaExternalLinkAlt } from 'react-icons/fa';
import confetti from 'canvas-confetti';
import useWeb3Auth from '../hooks/useWeb3Auth';
import { verificationAPI } from '../services/api';

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
  
  @media (max-width: 480px) {
    width: 150px;
    height: 150px;
  }
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

const EditionInfo = styled.p`
  font-size: 0.9rem;
  color: #a5b4fc;
  margin-bottom: 0.5rem;
`;

const SeriesLabel = styled.p`
  font-size: 0.85rem;
  color: #fbbf24;
  margin-bottom: 1rem;
  font-weight: 500;
`;

const SERIES_NAME = 'FREE THE VOICE';

const VerificationBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: linear-gradient(135deg, rgba(74, 222, 128, 0.2), rgba(34, 197, 94, 0.1));
  border: 1px solid rgba(74, 222, 128, 0.4);
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.85rem;
  color: #4ade80;
  margin: 0.5rem 0 1rem;
  
  svg {
    font-size: 1rem;
  }
`;

const BlockchainLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: #a5b4fc;
  font-size: 0.8rem;
  text-decoration: none;
  margin-top: 0.5rem;
  opacity: 0.8;
  transition: opacity 0.2s, color 0.2s;
  
  &:hover {
    opacity: 1;
    color: #818cf8;
    text-decoration: underline;
  }
  
  svg {
    font-size: 0.7rem;
  }
`;

const SerialDisplay = styled.div`
  font-family: 'Courier New', monospace;
  background: rgba(255, 255, 255, 0.05);
  padding: 0.8rem 1.5rem;
  border-radius: 8px;
  border: 1px dashed rgba(255, 255, 255, 0.3);
  margin: 1.5rem 0;
  font-size: 0.85rem;
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
  &.claimed { color: #fbbf24; }
`;

const StateContainer = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
`;

const Message = styled.p`
  font-size: 1.1rem;
  line-height: 1.6;
  opacity: 0.9;
  margin-bottom: 1.5rem;
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

const SecondaryButton = styled(motion.button)`
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  color: white;
  font-size: 0.95rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.75rem;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 100%;
  align-items: center;
  margin-top: 1rem;
`;

const ShareButton = styled(motion.button)`
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  color: white;
  font-size: 0.95rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
`;

const OwnershipDetailsBox = styled.div`
  background: linear-gradient(135deg, rgba(0, 30, 60, 0.9), rgba(0, 50, 80, 0.7));
  border: 1px solid rgba(74, 222, 128, 0.3);
  border-radius: 12px;
  padding: 1.25rem;
  margin: 1.5rem 0;
  width: 100%;
  text-align: left;
`;

const DetailsRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  
  &:last-child {
    border-bottom: none;
  }
`;

const DetailsLabel = styled.span`
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const DetailsValue = styled.span`
  font-size: 0.9rem;
  color: #fff;
  font-family: ${props => props.mono ? "'Courier New', monospace" : 'inherit'};
  
  &.highlight {
    color: #4ade80;
    font-weight: 600;
  }
`;

const OwnerInfo = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(74, 222, 128, 0.3);
  border-radius: 12px;
  padding: 1rem;
  margin: 1rem 0;
  width: 100%;
`;

const OwnerLabel = styled.p`
  font-size: 0.85rem;
  color: #4ade80;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  justify-content: center;
`;

const OwnerAddress = styled.p`
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  color: white;
  word-break: break-all;
`;

const ClaimDate = styled.p`
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 0.5rem;
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

const ClaimInput = styled.input`
  width: 100%;
  max-width: 340px;
  padding: 0.9rem 1.1rem;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  background: rgba(255, 255, 255, 0.07);
  color: white;
  font-size: 1rem;
  text-align: center;
  letter-spacing: ${props => props.$code ? '0.3em' : 'normal'};
  font-family: ${props => props.$code ? "'Courier New', monospace" : 'inherit'};
  margin-top: 0.75rem;
  outline: none;
  transition: border-color 0.2s;

  &::placeholder {
    color: rgba(255, 255, 255, 0.35);
    letter-spacing: normal;
  }

  &:focus {
    border-color: #4f46e5;
  }
`;

const SentNote = styled.p`
  font-size: 0.85rem;
  color: #4ade80;
  margin-top: 0.75rem;
`;

// Ownership details component
const OwnershipDetails = ({ edition, totalEditions, claimedAt, walletAddress, tokenId }) => {
    const formatAddress = (addr) => {
        if (!addr) return 'Unknown';
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    const formatDate = (dateInput) => {
        if (!dateInput) return 'Just now';

        let date;
        // Handle Firestore Timestamp format (_seconds)
        if (dateInput._seconds) {
            date = new Date(dateInput._seconds * 1000);
        }
        // Handle seconds format (numeric)
        else if (dateInput.seconds) {
            date = new Date(dateInput.seconds * 1000);
        }
        // Handle ISO string or Date object
        else {
            date = new Date(dateInput);
        }

        // Check if valid date
        if (isNaN(date.getTime())) return 'Just now';

        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <OwnershipDetailsBox>
            {edition && (
                <DetailsRow>
                    <DetailsLabel>Edition</DetailsLabel>
                    <DetailsValue className="highlight">#{edition} of {totalEditions || 500}</DetailsValue>
                </DetailsRow>
            )}
            <DetailsRow>
                <DetailsLabel>Claimed On</DetailsLabel>
                <DetailsValue>{formatDate(claimedAt)}</DetailsValue>
            </DetailsRow>
            <DetailsRow>
                <DetailsLabel>Owner Wallet</DetailsLabel>
                <DetailsValue mono>{formatAddress(walletAddress)}</DetailsValue>
            </DetailsRow>
            {tokenId && (
                <DetailsRow>
                    <DetailsLabel>Token ID</DetailsLabel>
                    <DetailsValue mono>{tokenId}</DetailsValue>
                </DetailsRow>
            )}
        </OwnershipDetailsBox>
    );
};


const ProductDetails = ({ product, serial, showBadge = false, tokenId = null }) => {
    if (!product) return null;

    return (
        <>
            {product.imageUrl && <ProductImage src={product.imageUrl} alt={product.name} />}
            <ProductName>{product.name}</ProductName>
            <SeriesLabel>Series: {SERIES_NAME}</SeriesLabel>
            {product.edition && (
                <EditionInfo>Edition #{product.edition} of {product.totalEditions || '500'}</EditionInfo>
            )}
            {showBadge && (
                <VerificationBadge>
                    <FaCertificate /> Authentic Product
                </VerificationBadge>
            )}
            {tokenId && (
                <BlockchainLink
                    href={`https://polygonscan.com/token/${import.meta.env.VITE_NFT_CONTRACT_ADDRESS || '0x4785DBa85de01B0DB84269F3fd471dDd8461623C'}?a=${tokenId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    View on Polygon <FaExternalLinkAlt />
                </BlockchainLink>
            )}
        </>
    );
};

export default function VerifyPage() {
    const { serial } = useParams();
    const navigate = useNavigate();
    const { login, user, getAddress, signMessage, isInitialized, isLoading: isWeb3Loading } = useWeb3Auth();

    // States: verifying, invalid, verified_unclaimed, verified_claimed, claiming, ownership_verified
    const [status, setStatus] = useState('verifying');
    const [walletAddress, setWalletAddress] = useState(null);
    const [product, setProduct] = useState(null);
    const [claimInfo, setClaimInfo] = useState(null);
    const [claimResult, setClaimResult] = useState(null);
    const [errorMessage, setErrorMessage] = useState('');
    const [isCurrentOwner, setIsCurrentOwner] = useState(false);
    const [deliveryInfo, setDeliveryInfo] = useState(null);
    const [deliveryTimedOut, setDeliveryTimedOut] = useState(false);
    const [claimEmail, setClaimEmail] = useState('');
    const [claimCode, setClaimCode] = useState('');
    const [codeSent, setCodeSent] = useState(false);
    const [sendingCode, setSendingCode] = useState(false);

    // Sync wallet address
    useEffect(() => {
        const syncWallet = async () => {
            if (user) {
                const address = await getAddress();
                setWalletAddress(address);

                // Check if current user is the owner
                if (claimInfo?.claimedBy && address) {
                    setIsCurrentOwner(claimInfo.claimedBy.toLowerCase() === address.toLowerCase());
                }
            } else {
                setWalletAddress(null);
                setIsCurrentOwner(false);
            }
        };
        syncWallet();
    }, [user, getAddress, claimInfo]);

    // Poll for on-chain NFT delivery after a real claim succeeds
    // (test claims have no transfer — they go straight to the success screen)
    useEffect(() => {
        if (status !== 'delivering' || !serial) return;

        let cancelled = false;
        let pollCount = 0;
        const maxPolls = 36; // 36 x 5s = 3 minutes max

        const poll = async () => {
            if (cancelled) return;
            pollCount++;

            try {
                const result = await verificationAPI.getTransferStatus(serial);
                if (cancelled) return;

                if (result.status === 'transferred') {
                    setDeliveryInfo({
                        transactionHash: result.transactionHash,
                        tokenId: result.tokenId,
                        contractAddress: result.contractAddress,
                        edition: result.edition,
                        totalEditions: result.totalEditions
                    });
                    setStatus('ownership_verified');
                    return;
                }

                if (pollCount >= maxPolls) {
                    setDeliveryTimedOut(true);
                    setStatus('ownership_verified');
                } else {
                    setTimeout(poll, 5000);
                }
            } catch (err) {
                if (cancelled) return;
                if (pollCount >= maxPolls) {
                    setDeliveryTimedOut(true);
                    setStatus('ownership_verified');
                } else {
                    setTimeout(poll, 5000);
                }
            }
        };

        const initialDelay = setTimeout(poll, 3000);
        return () => {
            cancelled = true;
            clearTimeout(initialDelay);
        };
    }, [status, serial]);

    useEffect(() => {
        const checkSerial = async () => {
            try {
                const data = await verificationAPI.verifyProduct(serial);

                if (data.verified) {
                    setProduct(data.product);

                    if (data.claimed) {
                        // Product is verified but already claimed
                        setStatus('verified_claimed');
                        setClaimInfo({
                            claimedBy: data.product?.claimedBy || 'Unknown',
                            claimedAt: data.product?.claimedAt
                        });
                    } else {
                        // Product is verified and available to claim
                        setStatus('verified_unclaimed');
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

    const handleSendCode = async () => {
        const email = claimEmail.trim();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setErrorMessage('Please enter a valid email address.');
            return;
        }

        setSendingCode(true);
        setErrorMessage('');

        try {
            await verificationAPI.requestClaimCode(serial, email);
            setCodeSent(true);
        } catch (err) {
            setErrorMessage(err.error || err.message || 'Failed to send verification code.');
        } finally {
            setSendingCode(false);
        }
    };

    const handleClaim = async () => {
        if (!walletAddress) {
            setErrorMessage('Wallet not connected. Please sign in again.');
            return;
        }

        if (!claimEmail.trim() || !claimCode.trim()) {
            setErrorMessage('Please enter your email and the verification code.');
            return;
        }

        setStatus('claiming');
        setErrorMessage('');

        try {
            // 1. Fetch secure nonce and message template
            let nonceData;
            try {
                nonceData = await verificationAPI.getNonce();
            } catch (nonceError) {
                console.error('Failed to fetch nonce:', nonceError);
                throw new Error('Security initialization failed. Please try again.');
            }

            // 2. Prepare the message
            const message = nonceData.messageTemplate
                .replace('{ACTION}', 'claim')
                .replace('{WALLET_ADDRESS}', walletAddress);

            // 3. Request signature from wallet
            let signature;
            try {
                signature = await signMessage(message);
            } catch (signError) {
                console.error('Signing error:', signError);
                throw new Error('Message signing was cancelled or failed. Ownership could not be verified.');
            }

            if (!signature) {
                throw new Error('Failed to sign ownership proof. Please try again.');
            }

            // 4. Submit claim to backend — include the Web3Auth login
            // identity (social account behind the wallet) when present so
            // admins can attribute claims to real accounts.
            const authIdentity = (user && (user.email || user.name || user.typeOfLogin)) ? {
                email: user.email || null,
                name: user.name || null,
                provider: user.typeOfLogin || user.verifier || null
            } : null;
            const result = await verificationAPI.claimProduct(
                serial, walletAddress, signature, message,
                claimEmail.trim(), claimCode.trim(), authIdentity
            );

            if (result.success) {
                // Success!
                const claimedAt = new Date().toISOString();
                setClaimResult({
                    edition: result.editionNumber || result.edition,
                    totalEditions: result.totalEditions,
                    tokenId: result.tokenId,
                    blockchainTokenId: result.blockchainTokenId,
                    transactionHash: result.transactionHash,
                    isTestCode: result.isTestCode === true,
                    claimedAt: claimedAt,
                    walletAddress: walletAddress
                });
                // Real claims wait for on-chain delivery; test claims have no transfer
                setStatus(result.isTestCode ? 'ownership_verified' : 'delivering');

                // Update local storage for vault display
                const owned = JSON.parse(localStorage.getItem('my_collectibles') || '[]');
                if (!owned.find(item => item.id === serial)) {
                    owned.push({
                        id: serial,
                        tokenId: result.tokenId,
                        blockchainTokenId: result.blockchainTokenId,
                        transactionHash: result.transactionHash,
                        edition: result.edition,
                        totalEditions: result.totalEditions,
                        type: product?.type,
                        name: product?.name || 'Crownmania Collectible',
                        description: product?.description,
                        imageUrl: product?.imageUrl,
                        claimedDate: claimedAt,
                        walletAddress
                    });
                    localStorage.setItem('my_collectibles', JSON.stringify(owned));
                }
            } else {
                throw new Error(result.message || 'The claim request was declined by the server.');
            }
        } catch (err) {
            console.error('Claim error:', err);
            setErrorMessage(err.message || 'An unexpected error occurred during the claim process.');
            setStatus('verified_unclaimed');
        }
    };

    const formatAddress = (addr) => {
        if (!addr) return 'Unknown';
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <VerifyContainer>
            <ContentCard
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
            >
                <AnimatePresence mode="wait">
                    {/* VERIFYING STATE */}
                    {status === 'verifying' && (
                        <StateContainer
                            key="verifying"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <StatusIcon className="checking" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}>
                                <FaShieldAlt />
                            </StatusIcon>
                            <Title>Verifying Authenticity</Title>
                            <Message>Securing blockchain records and authenticating your product.</Message>
                            <SerialDisplay>{serial}</SerialDisplay>
                        </StateContainer>
                    )}

                    {/* VERIFIED UNCLAIMED - Not logged in */}
                    {status === 'verified_unclaimed' && !walletAddress && (
                        <StateContainer
                            key="verified_unclaimed_no_wallet"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <StatusIcon className="valid" initial={{ scale: 0 }} animate={{ scale: 1 }}>
                                <FaCheckCircle />
                            </StatusIcon>
                            <Title>Verification Successful</Title>
                            <ProductDetails product={product} serial={serial} showBadge />
                            <Message>
                                Your CrownMania collectible is ready. Connect your wallet to claim ownership.
                            </Message>
                            <ActionButton
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handleConnectWallet}
                                disabled={isWeb3Loading}
                            >
                                <FaWallet /> {isWeb3Loading ? 'SECURIING WALLET...' : 'SIGN IN TO CLAIM'}
                            </ActionButton>
                            {errorMessage && <ErrorMessage>{errorMessage}</ErrorMessage>}
                        </StateContainer>
                    )}

                    {/* VERIFIED UNCLAIMED - Logged in (Ready to claim) */}
                    {status === 'verified_unclaimed' && walletAddress && (
                        <StateContainer
                            key="verified_unclaimed_ready"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <StatusIcon className="valid">
                                <FaCheckCircle />
                            </StatusIcon>
                            <Title>Ready to Claim</Title>
                            <ProductDetails product={product} serial={serial} showBadge />
                            {!codeSent ? (
                                <>
                                    <Message>
                                        Enter your email to receive a verification code and confirm your ownership.
                                    </Message>
                                    <ClaimInput
                                        type="email"
                                        placeholder="your@email.com"
                                        value={claimEmail}
                                        onChange={(e) => setClaimEmail(e.target.value)}
                                        autoComplete="email"
                                    />
                                    <ActionButton
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={handleSendCode}
                                        disabled={sendingCode || !claimEmail.trim()}
                                    >
                                        {sendingCode ? 'SENDING CODE...' : 'SEND VERIFICATION CODE'} <FaArrowRight />
                                    </ActionButton>
                                </>
                            ) : (
                                <>
                                    <SentNote>Verification code sent to {claimEmail}</SentNote>
                                    <ClaimInput
                                        $code
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={6}
                                        placeholder="000000"
                                        value={claimCode}
                                        onChange={(e) => setClaimCode(e.target.value.replace(/\D/g, ''))}
                                    />
                                    <ActionButton
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={handleClaim}
                                        disabled={claimCode.length !== 6}
                                    >
                                        CLAIM NOW <FaArrowRight />
                                    </ActionButton>
                                    <SecondaryButton
                                        onClick={() => { setCodeSent(false); setClaimCode(''); }}
                                    >
                                        Use a different email
                                    </SecondaryButton>
                                </>
                            )}
                            {errorMessage && <ErrorMessage>{errorMessage}</ErrorMessage>}
                        </StateContainer>
                    )}

                    {/* CLAIMING STATE */}
                    {status === 'claiming' && (
                        <StateContainer
                            key="claiming"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <StatusIcon className="checking" animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                                <FaShieldAlt />
                            </StatusIcon>
                            <Title>Securing Ownership</Title>
                            <Message>Minting your digital collectible on the blockchain...</Message>
                            <SerialDisplay>{serial}</SerialDisplay>
                        </StateContainer>
                    )}

                    {/* DELIVERING STATE — waiting for on-chain transfer */}
                    {status === 'delivering' && (
                        <StateContainer
                            key="delivering"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <StatusIcon className="checking" animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                                <FaShieldAlt />
                            </StatusIcon>
                            <Title>Claim Successful</Title>
                            <Message>Your digital collectible is being delivered to your wallet on-chain. This usually takes under a minute.</Message>
                            <SerialDisplay>{serial}</SerialDisplay>
                        </StateContainer>
                    )}

                    {/* OWNERSHIP VERIFIED (Success) */}
                    {status === 'ownership_verified' && (
                        <StateContainer
                            key="ownership_verified"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            onAnimationComplete={() => {
                                // Fire confetti!
                                confetti({
                                    particleCount: 150,
                                    spread: 80,
                                    origin: { y: 0.6 }
                                });
                                // Fire again for extra celebration
                                setTimeout(() => {
                                    confetti({
                                        particleCount: 80,
                                        angle: 60,
                                        spread: 60,
                                        origin: { x: 0 }
                                    });
                                    confetti({
                                        particleCount: 80,
                                        angle: 120,
                                        spread: 60,
                                        origin: { x: 1 }
                                    });
                                }, 300);
                            }}
                        >
                            <StatusIcon className="valid" initial={{ scale: 0 }} animate={{ scale: 1.2 }} transition={{ type: "spring" }}>
                                <FaCheckCircle />
                            </StatusIcon>
                            <Title>CONGRATULATIONS</Title>
                            <Message style={{ color: "#ffd700", fontWeight: "bold" }}>Ownership Verified Successfully</Message>
                            <ProductDetails product={product} serial={serial} showBadge />
                            <OwnershipDetails
                                edition={deliveryInfo?.edition || claimResult?.edition}
                                totalEditions={deliveryInfo?.totalEditions || claimResult?.totalEditions}
                                claimedAt={claimResult?.claimedAt}
                                walletAddress={claimResult?.walletAddress}
                                tokenId={deliveryInfo?.tokenId || claimResult?.tokenId}
                            />
                            {deliveryTimedOut && (
                                <Message style={{ fontSize: '0.85rem', opacity: 0.8 }}>
                                    On-chain delivery is taking longer than usual — it completes automatically, no action needed.
                                </Message>
                            )}
                            {(deliveryInfo?.transactionHash || claimResult?.transactionHash) && (
                                <BlockchainLink
                                    href={`https://polygonscan.com/tx/${deliveryInfo?.transactionHash || claimResult?.transactionHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    View Transaction <FaExternalLinkAlt />
                                </BlockchainLink>
                            )}
                            <ButtonGroup>
                                <ActionButton
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => {
                                        navigate('/');
                                        setTimeout(() => {
                                            const vault = document.getElementById('vault');
                                            if (vault) vault.scrollIntoView({ behavior: 'smooth' });
                                        }, 100);
                                    }}
                                >
                                    ENTER THE VAULT <FaArrowRight />
                                </ActionButton>
                                <ShareButton
                                    whileHover={{ scale: 1.02 }}
                                    onClick={async () => {
                                        const url = window.location.href;
                                        if (navigator.share) {
                                            await navigator.share({
                                                title: `${product?.name || 'Crownmania Collectible'} - Verified`,
                                                text: 'Check out my verified Crownmania collectible!',
                                                url
                                            });
                                        } else {
                                            await navigator.clipboard.writeText(url);
                                            alert('Link copied to clipboard!');
                                        }
                                    }}
                                >
                                    <FaShare /> SHARE ACHIEVEMENT
                                </ShareButton>
                            </ButtonGroup>
                        </StateContainer>
                    )}

                    {/* VERIFIED BUT ALREADY CLAIMED */}
                    {status === 'verified_claimed' && (
                        <StateContainer
                            key="verified_claimed"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <StatusIcon className="claimed">
                                <FaCheckCircle />
                            </StatusIcon>
                            <Title>Already Claimed</Title>
                            <ProductDetails product={product} serial={serial} />
                            <Message>
                                This product has already been claimed by wallet:
                                <br />
                                <code style={{ fontSize: '0.9rem', color: '#fbbf24' }}>
                                    {claimInfo?.claimedBy ? formatAddress(claimInfo.claimedBy) : 'Unknown'}
                                </code>
                            </Message>
                            <ButtonGroup>
                                {isCurrentOwner ? (
                                    <ActionButton
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => {
                                            navigate('/');
                                            setTimeout(() => {
                                                const vault = document.getElementById('vault');
                                                if (vault) vault.scrollIntoView({ behavior: 'smooth' });
                                            }, 100);
                                        }}
                                    >
                                        View in Vault <FaArrowRight />
                                    </ActionButton>
                                ) : (
                                    <SecondaryButton onClick={() => navigate('/')}>
                                        Return Home
                                    </SecondaryButton>
                                )}
                                <ShareButton
                                    whileHover={{ scale: 1.02 }}
                                    onClick={async () => {
                                        const url = window.location.href;
                                        if (navigator.share) {
                                            await navigator.share({
                                                title: `${product?.name || 'Crownmania Collectible'} - Verified`,
                                                text: 'This Crownmania collectible is verified authentic!',
                                                url
                                            });
                                        } else {
                                            await navigator.clipboard.writeText(url);
                                            alert('Link copied to clipboard!');
                                        }
                                    }}
                                >
                                    <FaShare /> Share Verification
                                </ShareButton>
                            </ButtonGroup>
                        </StateContainer>
                    )}

                    {/* INVALID STATE */}
                    {status === 'invalid' && (
                        <StateContainer
                            key="invalid"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <StatusIcon className="invalid">
                                <FaTimesCircle />
                            </StatusIcon>
                            <Title>Invalid Product</Title>
                            <Message>
                                The serial number provided could not be verified. Please check and try again.
                            </Message>
                            <ActionButton onClick={() => navigate('/')}>
                                TRY AGAIN
                            </ActionButton>
                        </StateContainer>
                    )}
                </AnimatePresence>
            </ContentCard>
        </VerifyContainer>
    );
}
