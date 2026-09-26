import React, { Suspense, lazy, useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled, { keyframes, css } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FaShieldAlt, FaCheckCircle, FaTimesCircle, FaWallet, FaArrowRight,
    FaShare, FaCertificate, FaExternalLinkAlt, FaCube,
} from 'react-icons/fa';
import confetti from 'canvas-confetti';
import useWeb3Auth from '../hooks/useWeb3Auth';
import { verificationAPI } from '../services/api';
import ErrorBoundary from '../components/common/ErrorBoundary';

const VaultModelViewer = lazy(() => import('../components/3d/VaultModelViewer'));

const SERIES_NAME = 'FREE THE VOICE';
const HOLO = '#00e5ff';
const NFT_CONTRACT = import.meta.env.VITE_NFT_CONTRACT_ADDRESS || '0x4785DBa85de01B0DB84269F3fd471dDd8461623C';

// ============================================================
// STATUS MODEL
// Every UI surface (chip, readout, telemetry, progress rail)
// reads from this one table so they can never disagree.
// ============================================================
const STATUS_META = {
    verifying: { label: 'SCANNING', tone: HOLO, readout: 'INTERROGATING SECURITY LEDGER', step: 1, busy: true },
    verified_unclaimed: { label: 'AUTHENTIC // UNCLAIMED', tone: '#fbbf24', readout: 'GENUINE ARTICLE DETECTED — OWNERSHIP UNBOUND', step: 2, busy: false },
    claiming: { label: 'BINDING', tone: HOLO, readout: 'WRITING OWNERSHIP RECORD', step: 3, busy: true },
    delivering: { label: 'DELIVERING', tone: HOLO, readout: 'OWNERSHIP BOUND — MATERIALIZING DIGITAL TWIN', step: 3, busy: true },
    ownership_verified: { label: 'CLAIMED', tone: '#4ade80', readout: 'OWNERSHIP CONFIRMED — ASSET MATERIALIZED', step: 4, busy: false },
    verified_claimed: { label: 'ALREADY CLAIMED', tone: '#fbbf24', readout: 'THIS ARTICLE IS BOUND TO ANOTHER WALLET', step: 4, busy: false },
    invalid: { label: 'NO MATCH', tone: '#ef4444', readout: 'CODE NOT PRESENT IN SECURITY LEDGER', step: 1, busy: false },
};

const STEPS = ['SCAN', 'IDENTIFY', 'CLAIM', 'BOUND'];

// ============================================================
// MOTION
// ============================================================
const sweep = keyframes`
  0%   { transform: translateY(-10%); opacity: 0; }
  10%  { opacity: 1; }
  90%  { opacity: 1; }
  100% { transform: translateY(1000%); opacity: 0; }
`;

const gridDrift = keyframes`
  from { background-position: 0 0, 0 0; }
  to   { background-position: 0 60px, 0 60px; }
`;

const flicker = keyframes`
  0%, 100% { opacity: 0.85; }
  47% { opacity: 0.85; }
  48% { opacity: 0.35; }
  49% { opacity: 0.9; }
  62% { opacity: 0.5; }
  63% { opacity: 0.88; }
`;

const blink = keyframes`
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0.15; }
`;

const railPulse = keyframes`
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(400%); }
`;

// ============================================================
// LAYOUT
// ============================================================
const Shell = styled.div`
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 1180px;
  margin: 0 auto;
  padding: 1.5rem 1rem 4rem;
  color: #fff;
  font-family: var(--font-secondary, 'Inter', sans-serif);

  @media (max-width: 768px) {
    padding: 0.75rem 0.65rem 3rem;
  }
`;

const Mono = css`
  font-family: 'Courier New', ui-monospace, monospace;
  letter-spacing: 0.12em;
  text-transform: uppercase;
`;

// ---------- Stage ----------
const Stage = styled.div`
  position: relative;
  height: clamp(340px, 52vh, 560px);
  border: 1px solid ${p => p.$tone}44;
  border-radius: 18px 18px 4px 4px;
  overflow: hidden;
  background:
    radial-gradient(ellipse 70% 55% at 50% 100%, ${p => p.$tone}22, transparent 70%),
    radial-gradient(ellipse at 50% 30%, rgba(10, 20, 40, 0.85), #000 75%);
  box-shadow: 0 0 60px ${p => p.$tone}18, inset 0 0 90px rgba(0, 0, 0, 0.9);

  @media (max-width: 768px) {
    height: clamp(300px, 44vh, 400px);
  }
`;

const StageGrid = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.5;
  background-image:
    linear-gradient(to bottom, ${p => p.$tone}14 1px, transparent 1px),
    linear-gradient(to right, ${p => p.$tone}0e 1px, transparent 1px);
  background-size: 100% 60px, 60px 100%;
  animation: ${gridDrift} 6s linear infinite;
  mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, #000 20%, transparent 85%);
`;

const CanvasSlot = styled.div`
  position: absolute;
  inset: 0;
`;

const Overlay = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
`;

const Corner = styled.span`
  position: absolute;
  width: 26px;
  height: 26px;
  border: 2px solid ${p => p.$tone};
  opacity: 0.7;
  ${p => p.$pos === 'tl' && css`top: 10px; left: 10px; border-right: 0; border-bottom: 0;`}
  ${p => p.$pos === 'tr' && css`top: 10px; right: 10px; border-left: 0; border-bottom: 0;`}
  ${p => p.$pos === 'bl' && css`bottom: 10px; left: 10px; border-right: 0; border-top: 0;`}
  ${p => p.$pos === 'br' && css`bottom: 10px; right: 10px; border-left: 0; border-top: 0;`}
`;

const ScanBar = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, ${HOLO}, transparent);
  box-shadow: 0 0 18px ${HOLO};
  animation: ${sweep} 3.2s linear infinite;
`;

const StageTop = styled.div`
  position: absolute;
  top: 14px;
  left: 46px;
  right: 46px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  ${Mono};
  font-size: 0.6rem;
  color: rgba(255, 255, 255, 0.45);
`;

const StatusChip = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.3rem 0.65rem;
  border: 1px solid ${p => p.$tone}77;
  border-radius: 3px;
  background: ${p => p.$tone}18;
  color: ${p => p.$tone};
  ${Mono};
  font-size: 0.6rem;
  font-weight: 700;
  white-space: nowrap;

  &::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${p => p.$tone};
    box-shadow: 0 0 8px ${p => p.$tone};
    animation: ${blink} 1.1s steps(1) infinite;
  }
`;

const Telemetry = styled.div`
  position: absolute;
  bottom: 54px;
  ${p => p.$side === 'left' ? 'left: 18px;' : 'right: 18px; text-align: right;'}
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  animation: ${flicker} 7s linear infinite;

  @media (max-width: 640px) {
    display: ${p => p.$side === 'right' ? 'none' : 'flex'};
    bottom: 58px;
    gap: 0.35rem;
  }
`;

const TelemetryItem = styled.div`
  ${Mono};
  font-size: 0.55rem;
  line-height: 1.35;

  span {
    display: block;
    color: rgba(255, 255, 255, 0.3);
    font-size: 0.5rem;
  }

  strong {
    color: ${p => p.$tone || 'rgba(255,255,255,0.8)'};
    font-weight: 700;
    font-size: 0.62rem;
    word-break: break-all;
  }
`;

const Readout = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  bottom: 14px;
  text-align: center;
  ${Mono};
  font-size: 0.6rem;
  color: ${p => p.$tone};
  text-shadow: 0 0 14px ${p => p.$tone}88;
  padding: 0 1rem;
`;

const ProgressRail = styled.div`
  position: absolute;
  left: 18%;
  right: 18%;
  bottom: 6px;
  height: 2px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    width: 25%;
    background: linear-gradient(90deg, transparent, ${p => p.$tone}, transparent);
    animation: ${railPulse} 1.4s linear infinite;
  }
`;

const StageFallback = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.8rem;
  ${Mono};
  font-size: 0.62rem;
  color: ${HOLO};
  opacity: 0.75;

  svg { font-size: 1.6rem; }
`;

// ---------- Console ----------
const StepRail = styled.div`
  display: flex;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-top: 0;
  background: rgba(4, 8, 16, 0.85);
`;

const Step = styled.div`
  flex: 1;
  padding: 0.6rem 0.4rem;
  text-align: center;
  ${Mono};
  font-size: 0.55rem;
  color: ${p => p.$state === 'done' ? 'rgba(255,255,255,0.4)' : p.$state === 'active' ? p.$tone : 'rgba(255,255,255,0.18)'};
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  position: relative;

  &:last-child { border-right: 0; }

  ${p => p.$state === 'active' && css`
    background: ${p.$tone}12;
    text-shadow: 0 0 12px ${p.$tone}aa;
    &::after {
      content: '';
      position: absolute;
      left: 0; right: 0; bottom: 0;
      height: 2px;
      background: ${p.$tone};
      box-shadow: 0 0 10px ${p.$tone};
    }
  `}
`;

const Console = styled.div`
  position: relative;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-top: 0;
  border-radius: 0 0 18px 18px;
  background: linear-gradient(180deg, rgba(6, 10, 20, 0.92), rgba(0, 0, 0, 0.92));
  backdrop-filter: blur(18px);
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;

  @media (max-width: 768px) {
    padding: 1.5rem 1.1rem 2rem;
  }
`;

const StateContainer = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
`;

const Title = styled.h1`
  font-family: var(--font-primary, 'Designer'), sans-serif;
  font-size: clamp(1.35rem, 3.6vw, 2.1rem);
  letter-spacing: 0.06em;
  margin: 0.25rem 0 0.75rem;
  background: linear-gradient(135deg, #fff 0%, #a5b4fc 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const Message = styled.p`
  font-size: 1rem;
  line-height: 1.6;
  opacity: 0.8;
  margin-bottom: 1.25rem;
  max-width: 420px;
`;

const ProductName = styled.h2`
  font-family: var(--font-primary, 'Designer'), sans-serif;
  font-size: 1.3rem;
  color: #ffd700;
  margin-bottom: 0.35rem;
`;

const SeriesLabel = styled.p`
  ${Mono};
  font-size: 0.6rem;
  color: #fbbf24;
  margin-bottom: 1rem;
  opacity: 0.85;
`;

const VerificationBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: linear-gradient(135deg, rgba(74, 222, 128, 0.18), rgba(34, 197, 94, 0.08));
  border: 1px solid rgba(74, 222, 128, 0.4);
  padding: 0.4rem 0.9rem;
  border-radius: 3px;
  ${Mono};
  font-size: 0.6rem;
  color: #4ade80;
  margin-bottom: 1rem;
`;

const BlockchainLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: #a5b4fc;
  ${Mono};
  font-size: 0.58rem;
  text-decoration: none;
  margin-top: 0.75rem;
  opacity: 0.8;
  transition: opacity 0.2s, color 0.2s;

  &:hover { opacity: 1; color: #818cf8; text-decoration: underline; }
`;

const StatusIcon = styled(motion.div)`
  font-size: 3rem;
  margin-bottom: 1rem;

  &.valid { color: #4ade80; filter: drop-shadow(0 0 16px rgba(74, 222, 128, 0.6)); }
  &.invalid { color: #ef4444; filter: drop-shadow(0 0 16px rgba(239, 68, 68, 0.5)); }
  &.checking { color: ${HOLO}; filter: drop-shadow(0 0 16px ${HOLO}88); }
  &.claimed { color: #fbbf24; filter: drop-shadow(0 0 16px rgba(251, 191, 36, 0.5)); }
`;

const ActionButton = styled(motion.button)`
  position: relative;
  background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%);
  border: none;
  padding: 0.95rem 2rem;
  border-radius: 4px;
  color: white;
  font-family: var(--font-primary, 'Designer'), sans-serif;
  ${Mono};
  font-size: 0.8rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.8rem;
  margin-top: 0.85rem;
  box-shadow: 0 0 24px rgba(79, 70, 229, 0.35);

  &:disabled { opacity: 0.45; cursor: not-allowed; box-shadow: none; }
`;

const SecondaryButton = styled(motion.button)`
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.22);
  padding: 0.7rem 1.4rem;
  border-radius: 4px;
  color: rgba(255, 255, 255, 0.8);
  ${Mono};
  font-size: 0.65rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.7rem;

  &:hover { background: rgba(255, 255, 255, 0.07); color: #fff; }
`;

const ButtonGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
  align-items: center;
  margin-top: 0.75rem;
`;

const ShareButton = styled(SecondaryButton)``;

const OwnershipDetailsBox = styled.div`
  background: linear-gradient(135deg, rgba(0, 30, 60, 0.75), rgba(0, 50, 80, 0.45));
  border: 1px solid rgba(74, 222, 128, 0.28);
  border-radius: 4px;
  padding: 1.1rem 1.25rem;
  margin: 1.25rem 0 0;
  width: 100%;
  max-width: 460px;
  text-align: left;
`;

const DetailsRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);

  &:last-child { border-bottom: none; }
`;

const DetailsLabel = styled.span`
  ${Mono};
  font-size: 0.55rem;
  color: rgba(255, 255, 255, 0.4);
`;

const DetailsValue = styled.span`
  font-size: 0.85rem;
  color: #fff;
  text-align: right;
  font-family: ${props => props.mono ? "'Courier New', monospace" : 'inherit'};

  &.highlight { color: #4ade80; font-weight: 600; }
`;

const ErrorMessage = styled.div`
  color: #fca5a5;
  ${Mono};
  font-size: 0.62rem;
  line-height: 1.6;
  margin-top: 1rem;
  padding: 0.7rem 1rem;
  background: rgba(239, 68, 68, 0.08);
  border-left: 2px solid #ef4444;
  text-align: left;
  max-width: 420px;
`;

const ClaimInput = styled.input`
  width: 100%;
  max-width: 340px;
  padding: 0.9rem 1.1rem;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.05);
  color: white;
  font-size: 1rem;
  text-align: center;
  letter-spacing: ${props => props.$code ? '0.4em' : 'normal'};
  font-family: ${props => props.$code ? "'Courier New', monospace" : 'inherit'};
  margin-top: 0.6rem;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;

  &::placeholder { color: rgba(255, 255, 255, 0.28); letter-spacing: normal; }
  &:focus { border-color: ${HOLO}; box-shadow: 0 0 18px ${HOLO}33; }
`;

const SentNote = styled.p`
  ${Mono};
  font-size: 0.6rem;
  color: #4ade80;
  margin-top: 0.5rem;
`;

// ============================================================
// SUBCOMPONENTS
// ============================================================
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

const ProductDetails = ({ product, showBadge = false, tokenId = null }) => {
    if (!product) return null;

    return (
        <>
            <ProductName>{product.name}</ProductName>
            <SeriesLabel>Series: {SERIES_NAME}</SeriesLabel>
            {showBadge && (
                <VerificationBadge>
                    <FaCertificate /> Authentic Product
                </VerificationBadge>
            )}
            {tokenId && (
                <BlockchainLink
                    href={`https://polygonscan.com/token/${NFT_CONTRACT}?a=${tokenId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    View on Polygon <FaExternalLinkAlt />
                </BlockchainLink>
            )}
        </>
    );
};

// ============================================================
// PAGE
// ============================================================
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

    // The figure stays a wireframe ghost until ownership actually belongs to
    // the person looking at it. Everything else — invalid, unclaimed, claimed
    // by a stranger — keeps it locked in hologram.
    //
    // 'delivering' counts as owned: the claim transaction already committed
    // server-side, so materialization starts the moment CLAIM succeeds. The
    // on-chain transfer confirmation that follows only decides which copy the
    // console shows — it should never gate the reveal (that poll is what made
    // the animation feel like it started 10+ seconds late).
    const isOwnedByViewer = status === 'ownership_verified'
        || status === 'delivering'
        || (status === 'verified_claimed' && isCurrentOwner);
    const [hasMaterialized, setHasMaterialized] = useState(false);

    const meta = STATUS_META[status] || STATUS_META.verifying;
    const tone = meta.tone;

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

    const handleShare = async (text) => {
        const url = window.location.href;
        if (navigator.share) {
            await navigator.share({ title: `${product?.name || 'Crownmania Collectible'} - Verified`, text, url });
        } else {
            await navigator.clipboard.writeText(url);
            alert('Link copied to clipboard!');
        }
    };

    const goToVault = () => {
        navigate('/');
        setTimeout(() => {
            const vault = document.getElementById('vault');
            if (vault) vault.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    const shortSerial = useMemo(() => (serial && serial.length > 22 ? `${serial.slice(0, 10)}…${serial.slice(-8)}` : serial), [serial]);
    const edition = deliveryInfo?.edition || claimResult?.edition || product?.edition;
    const totalEditions = deliveryInfo?.totalEditions || claimResult?.totalEditions || product?.totalEditions || 500;

    return (
        <Shell>
            {/* ============ HOLOGRAM STAGE ============ */}
            <Stage $tone={tone}>
                <StageGrid $tone={tone} />

                <CanvasSlot>
                    {/* The figure is decorative — if WebGL is missing or the
                        model fails, the claim flow below must still work. */}
                    <ErrorBoundary fallback={null}>
                        <Suspense fallback={
                            <StageFallback>
                                <FaCube />
                                <span>Initialising projector…</span>
                            </StageFallback>
                        }>
                            <VaultModelViewer
                                isUnlocked
                                hologram={!isOwnedByViewer}
                                holoColor={HOLO}
                                holoCharge={status === 'claiming'}
                                showStage
                                cameraDistance={13.5}
                                autoRotateSpeed={isOwnedByViewer ? 4.5 : 2.4}
                                onMaterialized={() => setHasMaterialized(true)}
                            />
                        </Suspense>
                    </ErrorBoundary>
                </CanvasSlot>

                <Overlay>
                    <Corner $pos="tl" $tone={tone} />
                    <Corner $pos="tr" $tone={tone} />
                    <Corner $pos="bl" $tone={tone} />
                    <Corner $pos="br" $tone={tone} />

                    {!isOwnedByViewer && <ScanBar />}

                    <StageTop>
                        <span>CROWNMANIA · AUTHENTICATION UPLINK</span>
                        <StatusChip $tone={tone}>{meta.label}</StatusChip>
                    </StageTop>

                    <Telemetry $side="left">
                        <TelemetryItem $tone={tone}>
                            <span>Serial</span>
                            <strong>{shortSerial || '—'}</strong>
                        </TelemetryItem>
                        <TelemetryItem>
                            <span>Series</span>
                            <strong>{SERIES_NAME}</strong>
                        </TelemetryItem>
                        <TelemetryItem>
                            <span>Edition</span>
                            <strong>{edition ? `#${edition} / ${totalEditions}` : '— / ' + totalEditions}</strong>
                        </TelemetryItem>
                    </Telemetry>

                    <Telemetry $side="right">
                        <TelemetryItem>
                            <span>Chain</span>
                            <strong>Polygon</strong>
                        </TelemetryItem>
                        <TelemetryItem>
                            <span>Render</span>
                            <strong>{isOwnedByViewer ? (hasMaterialized ? 'Physical' : 'Materializing') : status === 'claiming' ? 'Charging' : 'Wireframe Proxy'}</strong>
                        </TelemetryItem>
                        <TelemetryItem $tone={tone}>
                            <span>Integrity</span>
                            <strong>{status === 'invalid' ? 'Failed' : status === 'verifying' ? 'Checking' : 'Passed'}</strong>
                        </TelemetryItem>
                    </Telemetry>

                    <Readout $tone={tone}>{meta.readout}</Readout>
                    {meta.busy && <ProgressRail $tone={tone} />}
                </Overlay>
            </Stage>

            {/* ============ STEP RAIL ============ */}
            <StepRail>
                {STEPS.map((label, i) => (
                    <Step
                        key={label}
                        $tone={tone}
                        $state={i + 1 === meta.step ? 'active' : i + 1 < meta.step ? 'done' : 'todo'}
                    >
                        {String(i + 1).padStart(2, '0')} {label}
                    </Step>
                ))}
            </StepRail>

            {/* ============ CONSOLE ============ */}
            <Console>
                <AnimatePresence mode="wait">
                    {/* VERIFYING STATE */}
                    {status === 'verifying' && (
                        <StateContainer key="verifying" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <StatusIcon className="checking" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}>
                                <FaShieldAlt />
                            </StatusIcon>
                            <Title>Verifying Authenticity</Title>
                            <Message>Securing blockchain records and authenticating your product.</Message>
                        </StateContainer>
                    )}

                    {/* VERIFIED UNCLAIMED - Not logged in */}
                    {status === 'verified_unclaimed' && !walletAddress && (
                        <StateContainer key="verified_unclaimed_no_wallet" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <StatusIcon className="valid" initial={{ scale: 0 }} animate={{ scale: 1 }}>
                                <FaCheckCircle />
                            </StatusIcon>
                            <Title>Verification Successful</Title>
                            <ProductDetails product={product} showBadge />
                            <Message>
                                Your CrownMania collectible is authentic. Sign in to bind it to your wallet —
                                the figure stays a wireframe proxy until ownership is claimed.
                            </Message>
                            <ActionButton
                                whileHover={{ scale: 1.04 }}
                                whileTap={{ scale: 0.96 }}
                                onClick={handleConnectWallet}
                                disabled={isWeb3Loading || !isInitialized}
                            >
                                <FaWallet /> {isWeb3Loading ? 'SECURING WALLET…' : 'SIGN IN TO CLAIM'}
                            </ActionButton>
                            {errorMessage && <ErrorMessage>{errorMessage}</ErrorMessage>}
                        </StateContainer>
                    )}

                    {/* VERIFIED UNCLAIMED - Logged in (Ready to claim) */}
                    {status === 'verified_unclaimed' && walletAddress && (
                        <StateContainer key="verified_unclaimed_ready" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <StatusIcon className="valid">
                                <FaCheckCircle />
                            </StatusIcon>
                            <Title>Ready to Claim</Title>
                            <ProductDetails product={product} showBadge />
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
                                        whileHover={{ scale: 1.04 }}
                                        whileTap={{ scale: 0.96 }}
                                        onClick={handleSendCode}
                                        disabled={sendingCode || !claimEmail.trim()}
                                    >
                                        {sendingCode ? 'SENDING CODE…' : 'SEND VERIFICATION CODE'} <FaArrowRight />
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
                                        whileHover={{ scale: 1.04 }}
                                        whileTap={{ scale: 0.96 }}
                                        onClick={handleClaim}
                                        disabled={claimCode.length !== 6}
                                    >
                                        CLAIM NOW <FaArrowRight />
                                    </ActionButton>
                                    <SecondaryButton onClick={() => { setCodeSent(false); setClaimCode(''); }}>
                                        Use a different email
                                    </SecondaryButton>
                                </>
                            )}
                            {errorMessage && <ErrorMessage>{errorMessage}</ErrorMessage>}
                        </StateContainer>
                    )}

                    {/* CLAIMING STATE */}
                    {status === 'claiming' && (
                        <StateContainer key="claiming" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <StatusIcon className="checking" animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                                <FaShieldAlt />
                            </StatusIcon>
                            <Title>Securing Ownership</Title>
                            <Message>Minting your digital collectible on the blockchain…</Message>
                        </StateContainer>
                    )}

                    {/* DELIVERING STATE — waiting for on-chain transfer */}
                    {status === 'delivering' && (
                        <StateContainer key="delivering" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <StatusIcon className="checking" animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                                <FaShieldAlt />
                            </StatusIcon>
                            <Title>Claim Successful</Title>
                            <Message>Your digital collectible is being delivered to your wallet on-chain. This usually takes under a minute.</Message>
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
                            <StatusIcon className="valid" initial={{ scale: 0 }} animate={{ scale: 1.15 }} transition={{ type: 'spring' }}>
                                <FaCheckCircle />
                            </StatusIcon>
                            <Title>Congratulations</Title>
                            <Message style={{ color: '#ffd700', fontWeight: 'bold', marginBottom: '1rem' }}>
                                Ownership Verified — your figure is fully rendered.
                            </Message>
                            <ProductDetails product={product} showBadge tokenId={deliveryInfo?.tokenId || claimResult?.tokenId} />
                            <OwnershipDetails
                                edition={deliveryInfo?.edition || claimResult?.edition}
                                totalEditions={deliveryInfo?.totalEditions || claimResult?.totalEditions}
                                claimedAt={claimResult?.claimedAt}
                                walletAddress={claimResult?.walletAddress}
                                tokenId={deliveryInfo?.tokenId || claimResult?.tokenId}
                            />
                            {deliveryTimedOut && (
                                <Message style={{ fontSize: '0.85rem', opacity: 0.7, marginTop: '1rem' }}>
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
                                <ActionButton whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={goToVault}>
                                    ENTER THE VAULT <FaArrowRight />
                                </ActionButton>
                                <ShareButton
                                    whileHover={{ scale: 1.02 }}
                                    onClick={() => handleShare('Check out my verified Crownmania collectible!')}
                                >
                                    <FaShare /> SHARE ACHIEVEMENT
                                </ShareButton>
                            </ButtonGroup>
                        </StateContainer>
                    )}

                    {/* VERIFIED BUT ALREADY CLAIMED */}
                    {status === 'verified_claimed' && (
                        <StateContainer key="verified_claimed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <StatusIcon className={isCurrentOwner ? 'valid' : 'claimed'}>
                                <FaCheckCircle />
                            </StatusIcon>
                            <Title>{isCurrentOwner ? 'Your Collectible' : 'Already Claimed'}</Title>
                            <ProductDetails product={product} />
                            <Message>
                                {isCurrentOwner
                                    ? 'This article is bound to your wallet.'
                                    : 'This product has already been claimed by wallet:'}
                                <br />
                                <code style={{ fontSize: '0.9rem', color: '#fbbf24' }}>
                                    {claimInfo?.claimedBy ? formatAddress(claimInfo.claimedBy) : 'Unknown'}
                                </code>
                            </Message>
                            <ButtonGroup>
                                {isCurrentOwner ? (
                                    <ActionButton whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={goToVault}>
                                        View in Vault <FaArrowRight />
                                    </ActionButton>
                                ) : (
                                    <SecondaryButton onClick={() => navigate('/')}>
                                        Return Home
                                    </SecondaryButton>
                                )}
                                <ShareButton
                                    whileHover={{ scale: 1.02 }}
                                    onClick={() => handleShare('This Crownmania collectible is verified authentic!')}
                                >
                                    <FaShare /> Share Verification
                                </ShareButton>
                            </ButtonGroup>
                        </StateContainer>
                    )}

                    {/* INVALID STATE */}
                    {status === 'invalid' && (
                        <StateContainer key="invalid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <StatusIcon className="invalid">
                                <FaTimesCircle />
                            </StatusIcon>
                            <Title>Invalid Product</Title>
                            <Message>
                                {errorMessage || 'The serial number provided could not be verified. Please check and try again.'}
                            </Message>
                            <ActionButton whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} onClick={() => navigate('/')}>
                                TRY AGAIN
                            </ActionButton>
                        </StateContainer>
                    )}
                </AnimatePresence>
            </Console>
        </Shell>
    );
}
