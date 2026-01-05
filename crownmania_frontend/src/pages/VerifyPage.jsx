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
  margin-bottom: 1rem;
`;

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
                    href={`https://polygonscan.com/token/0x0000000000000000000000000000000000000000?a=${tokenId}`}
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

    useEffect(() => {
        const checkSerial = async () => {
            try {
                const data = await verificationAPI.verifyProduct(serial);
                console.log('Verification response:', data);

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

    const handleClaim = async () => {
        if (!walletAddress) {
            setErrorMessage('Wallet not connected');
            return;
        }

        setStatus('claiming');
        setErrorMessage('');

        try {
            let message;
            try {
                const nonceData = await verificationAPI.getNonce();
                message = nonceData.messageTemplate
                    .replace('{ACTION}', 'claim')
                    .replace('{WALLET_ADDRESS}', walletAddress);
            } catch (nonceError) {
                console.warn('Nonce fetch failed, using simple message:', nonceError);
                message = `I claim ownership of product ${serial} on Crownmania. Timestamp: ${Date.now()}`;
            }

            const signature = await signMessage(message);

            if (!signature) {
                setErrorMessage('Failed to sign ownership proof. Please try again.');
                setStatus('verified_unclaimed');
                return;
            }

            const result = await verificationAPI.claimProduct(serial, walletAddress, signature, message);

            if (result.success) {
                // Store claim result for display
                const claimedAt = new Date().toISOString();
                setClaimResult({
                    edition: result.edition,
                    totalEditions: result.totalEditions || 500,
                    tokenId: result.tokenId,
                    claimedAt: claimedAt,
                    walletAddress: walletAddress
                });
                setStatus('ownership_verified');

                // Save to local storage for vault display
                const owned = JSON.parse(localStorage.getItem('my_collectibles') || '[]');
                if (!owned.find(item => item.id === serial)) {
                    owned.push({
                        id: serial,
                        tokenId: result.tokenId,
                        edition: result.edition,
                        totalEditions: result.totalEditions || 500,
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
                setErrorMessage(result.message || 'Failed to claim');
                setStatus('verified_unclaimed');
            }
        } catch (err) {
            console.error('Claim error:', err);
            setErrorMessage(err.message || 'Failed to claim product');
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
                        <motion.div
                            key="verifying"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <StatusIcon className="checking" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}>
                                <FaShieldAlt />
                            </StatusIcon>
                            <Title>Verifying...</Title>
                            <Message>Checking product authenticity and blockchain records.</Message>
                            <SerialDisplay>{serial}</SerialDisplay>
                        </motion.div>
                    )}

                    {/* VERIFIED UNCLAIMED - Not logged in */}
                    {status === 'verified_unclaimed' && !walletAddress && (
                        <motion.div
                            key="verified_unclaimed_no_wallet"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <StatusIcon className="valid" initial={{ scale: 0 }} animate={{ scale: 1 }}>
                                <FaCheckCircle />
                            </StatusIcon>
                            <Title>Product Verified ✓</Title>
                            <ProductDetails product={product} serial={serial} showBadge />
                            <Message>
                                This product is authentic! Create a wallet to claim your digital collectible.
                            </Message>
                            <ActionButton
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handleConnectWallet}
                                disabled={isWeb3Loading}
                            >
                                <FaWallet /> {isWeb3Loading ? 'Connecting...' : 'Sign In to Claim'}
                            </ActionButton>
                            {errorMessage && <ErrorMessage>{errorMessage}</ErrorMessage>}
                        </motion.div>
                    )}

                    {/* VERIFIED UNCLAIMED - Logged in (Ready to claim) */}
                    {status === 'verified_unclaimed' && walletAddress && (
                        <motion.div
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
                            <Message>
                                Claim your digital collectible to prove ownership on the blockchain.
                            </Message>
                            <ActionButton
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={handleClaim}
                            >
                                Claim Now <FaArrowRight />
                            </ActionButton>
                            {errorMessage && <ErrorMessage>{errorMessage}</ErrorMessage>}
                        </motion.div>
                    )}

                    {/* CLAIMING STATE */}
                    {status === 'claiming' && (
                        <motion.div
                            key="claiming"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                        >
                            <StatusIcon className="checking" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                                <FaShieldAlt />
                            </StatusIcon>
                            <Title>Claiming...</Title>
                            <ProductDetails product={product} serial={serial} showBadge />
                            <Message>Recording your ownership on the blockchain.</Message>
                        </motion.div>
                    )}

                    {/* OWNERSHIP VERIFIED (Success) */}
                    {status === 'ownership_verified' && (
                        <motion.div
                            key="ownership_verified"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            onAnimationComplete={() => {
                                // Fire confetti!
                                confetti({
                                    particleCount: 100,
                                    spread: 70,
                                    origin: { y: 0.6 }
                                });
                                // Fire again for extra celebration
                                setTimeout(() => {
                                    confetti({
                                        particleCount: 50,
                                        angle: 60,
                                        spread: 55,
                                        origin: { x: 0 }
                                    });
                                    confetti({
                                        particleCount: 50,
                                        angle: 120,
                                        spread: 55,
                                        origin: { x: 1 }
                                    });
                                }, 250);
                            }}
                        >
                            <StatusIcon className="valid" initial={{ scale: 0 }} animate={{ scale: 1.2 }} transition={{ type: "spring" }}>
                                <FaCheckCircle />
                            </StatusIcon>
                            <Title>Ownership Verified ✓</Title>
                            <ProductDetails product={product} serial={serial} showBadge />
                            <OwnershipDetails
                                edition={claimResult?.edition}
                                totalEditions={claimResult?.totalEditions}
                                claimedAt={claimResult?.claimedAt}
                                walletAddress={claimResult?.walletAddress}
                                tokenId={claimResult?.tokenId}
                            />
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
                                    View in Vault <FaArrowRight />
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
                                    <FaShare /> Share
                                </ShareButton>
                            </ButtonGroup>
                        </motion.div>
                    )}

                    {/* VERIFIED BUT ALREADY CLAIMED */}
                    {status === 'verified_claimed' && (
                        <motion.div
                            key="verified_claimed"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                        >
                            <StatusIcon className="valid">
                                <FaCheckCircle />
                            </StatusIcon>
                            <Title>Product Verified ✓</Title>
                            <ProductDetails product={product} serial={serial} showBadge />
                            <Message>
                                This product is authentic and has been claimed.
                            </Message>
                            <OwnershipDetails
                                edition={product?.edition}
                                totalEditions={product?.totalEditions || 500}
                                claimedAt={claimInfo?.claimedAt}
                                walletAddress={claimInfo?.claimedBy}
                                tokenId={product?.tokenId}
                            />
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
                        </motion.div>
                    )}

                    {/* INVALID STATE */}
                    {status === 'invalid' && (
                        <motion.div
                            key="invalid"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                        >
                            <StatusIcon className="invalid">
                                <FaExclamationTriangle />
                            </StatusIcon>
                            <Title>Invalid Serial</Title>
                            <Message>
                                {errorMessage || 'This serial number could not be verified. Please check and try again.'}
                            </Message>
                            <SerialDisplay>{serial}</SerialDisplay>
                            <ActionButton onClick={() => navigate('/')}>
                                Try Another Code
                            </ActionButton>
                        </motion.div>
                    )}
                </AnimatePresence>
            </ContentCard>
        </VerifyContainer>
    );
}
