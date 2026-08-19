import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import styled from 'styled-components';
import {
  FaLock, FaCheck, FaPlay, FaPause, FaVolumeUp, FaVolumeMute,
  FaTicketAlt, FaVideo, FaHandshake, FaGem, FaArrowRight, FaExclamationTriangle,
  FaClock, FaExpand, FaCompress, FaRedo,
} from 'react-icons/fa';
import useWeb3Auth from '../hooks/useWeb3Auth';
import { verificationAPI, contentAPI } from '../services/api';

// ── YouTube helpers ────────────────────────────────────────────

function extractYouTubeId(url) {
  if (!url) return null;
  // Handle youtube.com/watch?v=, youtu.be/, youtube.com/embed/
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const p of patterns) {
    const match = url.match(p);
    if (match) return match[1];
  }
  return null;
}

function buildYouTubeEmbedUrl(videoId, startTime = 0) {
  const params = new URLSearchParams({
    autoplay: '0',
    rel: '0',
    modestbranding: '1',
    playsinline: '1',
    start: Math.floor(startTime).toString(),
  });
  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}

const VERIFIED_SERIALS_KEY = 'crownmania_verified_serials';

// ── Styled Components ──────────────────────────────────────────

const PageContainer = styled.div`
  min-height: 100vh;
  padding: 6rem 1.5rem 4rem;
  color: white;
  font-family: var(--font-primary), sans-serif;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  background: radial-gradient(ellipse at top, rgba(0, 255, 136, 0.04) 0%, transparent 60%),
              radial-gradient(ellipse at bottom, rgba(138, 43, 226, 0.04) 0%, transparent 60%);
`;

const PageTitle = styled(motion.h1)`
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 0.5rem;
  text-align: center;
  background: linear-gradient(135deg, #fff 0%, #00ff88 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const PageSubtitle = styled.p`
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.5);
  text-align: center;
  max-width: 600px;
  margin-bottom: 3rem;
  line-height: 1.6;
`;

const VaultGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
  width: 100%;
  max-width: 900px;
`;

const VaultPanel = styled(motion.div)`
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid ${props => props.$unlocked ? 'rgba(0, 255, 136, 0.3)' : 'rgba(255, 255, 255, 0.08)'};
  border-radius: 16px;
  padding: 2rem;
  backdrop-filter: blur(12px);
  transition: border-color 0.3s ease;

  &:hover {
    border-color: ${props => props.$unlocked ? 'rgba(0, 255, 136, 0.5)' : 'rgba(255, 255, 255, 0.15)'};
  }
`;

const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
`;

const PanelIcon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.3rem;
  background: ${props => props.$unlocked ? 'rgba(0, 255, 136, 0.15)' : 'rgba(255, 255, 255, 0.05)'};
  color: ${props => props.$unlocked ? '#00ff88' : 'rgba(255, 255, 255, 0.4)'};
  border: 1px solid ${props => props.$unlocked ? 'rgba(0, 255, 136, 0.3)' : 'rgba(255, 255, 255, 0.1)'};
`;

const PanelTitle = styled.h3`
  font-size: 1.1rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${props => props.$unlocked ? '#00ff88' : 'rgba(255, 255, 255, 0.7)'};
`;

const PanelDesc = styled.p`
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.4);
  margin-top: 0.25rem;
`;

const VideoWrapper = styled.div`
  position: relative;
  width: 100%;
  border-radius: 12px;
  overflow: hidden;
  background: #000;
  aspect-ratio: 16 / 9;
`;

const StyledVideo = styled.video`
  width: 100%;
  height: 100%;
  object-fit: contain;
`;

const VideoOverlay = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 1rem;
  background: rgba(0, 0, 0, 0.85);
  cursor: ${props => props.$clickable ? 'pointer' : 'default'};
`;

const VideoControls = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background: linear-gradient(transparent, rgba(0,0,0,0.8));
  opacity: ${props => props.$visible ? 1 : 0};
  transition: opacity 0.3s ease;
`;

const ControlButton = styled.button`
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  font-size: 1.2rem;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  &:hover { color: #00ff88; }
`;

const ProgressBar = styled.input`
  flex: 1;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: rgba(255,255,255,0.2);
  border-radius: 2px;
  cursor: pointer;
  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #00ff88;
  }
`;

const SessionBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.8rem;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 600;
  background: ${props => props.$active ? 'rgba(0, 255, 136, 0.15)' : 'rgba(255,255,255,0.05)'};
  color: ${props => props.$active ? '#00ff88' : 'rgba(255,255,255,0.4)'};
  border: 1px solid ${props => props.$active ? 'rgba(0, 255, 136, 0.3)' : 'rgba(255,255,255,0.1)'};
`;

const PerkRow = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border-radius: 12px;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.06);
  transition: all 0.3s ease;
  margin-bottom: 0.75rem;

  &:hover {
    background: ${props => props.$unlocked ? 'rgba(0, 255, 136, 0.05)' : 'rgba(255,255,255,0.03)'};
    border-color: ${props => props.$unlocked ? 'rgba(0, 255, 136, 0.2)' : 'rgba(255,255,255,0.1)'};
  }
`;

const PerkInfo = styled.div`
  flex: 1;
`;

const PerkName = styled.div`
  font-size: 0.95rem;
  font-weight: 600;
  color: ${props => props.$unlocked ? 'white' : 'rgba(255,255,255,0.5)'};
`;

const PerkDetail = styled.div`
  font-size: 0.75rem;
  color: rgba(255,255,255,0.35);
  margin-top: 0.2rem;
`;

const LockedGate = styled(motion.div)`
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 24px;
  padding: 4rem 2rem;
  text-align: center;
  max-width: 600px;
  width: 100%;
  backdrop-filter: blur(12px);
`;

const ActionButton = styled(motion.button)`
  padding: 0.8rem 1.5rem;
  border-radius: 10px;
  border: 1px solid;
  border-color: ${props => props.$primary ? '#00ff88' : 'rgba(255,255,255,0.15)'};
  background: ${props => props.$primary ? 'rgba(0, 255, 136, 0.15)' : 'rgba(255,255,255,0.05)'};
  color: ${props => props.$primary ? '#00ff88' : 'rgba(255,255,255,0.7)'};
  font-family: var(--font-primary);
  font-weight: 700;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  cursor: ${props => props.$disabled ? 'not-allowed' : 'pointer'};
  opacity: ${props => props.$disabled ? 0.4 : 1};
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
`;

const LoadingSpinner = styled(motion.div)`
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: #00ff88;
  border-radius: 50%;
`;

function isVerified() {
  try {
    const stored = localStorage.getItem(VERIFIED_SERIALS_KEY);
    if (!stored) return false;
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return false;
    const expiryMs = 30 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    return parsed.some(item => {
      if (!item.verifiedAt) return false;
      const age = now - new Date(item.verifiedAt).getTime();
      return age < expiryMs;
    });
  } catch (err) {
    return false;
  }
}

function formatTimeRemaining(expiresAt) {
  const remaining = expiresAt - Date.now();
  if (remaining <= 0) return 'Expired';
  const hours = Math.floor(remaining / (60 * 60 * 1000));
  const mins = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
  return `${hours}h ${mins}m remaining`;
}

const ExclusivePerks = () => {
  const navigate = useNavigate();
  const { isInitialized, user, walletAddress: hookWalletAddress, getAddress, login, signMessageWithNonce } = useWeb3Auth();
  const [tokens, setTokens] = useState([]);
  const [exclusiveContent, setExclusiveContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Content player state
  const [contentUnlocked, setContentUnlocked] = useState(false);
  const [youtubeVideoId, setYoutubeVideoId] = useState(null);
  const [videoSessionExpires, setVideoSessionExpires] = useState(null);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const iframeRef = useRef(null);
  const playerRef = useRef(null);
  const controlsTimeoutRef = useRef(null);

  const verified = isVerified();
  const connected = !!user;
  const hasToken = tokens.length > 0;
  const canAccess = verified && connected && hasToken;

  // Find video/content from exclusive content list
  const videoContent = exclusiveContent.find(c => c.contentType?.startsWith('video/') || c.category === 'video');
  const hasVideoAccess = videoContent?.hasAccess;
  const hasActiveVideoSession = videoContent?.hasActiveSession;

  useEffect(() => {
    const checkAccess = async () => {
      if (!isInitialized) return;

      try {
        if (user) {
          let address = hookWalletAddress;
          if (!address) address = await getAddress();
          if (address) {
            const [tokenResult, contentResult] = await Promise.allSettled([
              verificationAPI.getWalletTokens(address),
              contentAPI.getExclusiveContent(address),
            ]);

            if (tokenResult.status === 'fulfilled') {
              setTokens(tokenResult.value?.tokens || []);
            }
            if (contentResult.status === 'fulfilled') {
              setExclusiveContent(contentResult.value?.content || []);
            }
          }
        }
      } catch (err) {
        console.error('Error checking exclusive access:', err);
        setError('Could not verify token ownership. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    checkAccess();
  }, [isInitialized, user, hookWalletAddress, getAddress]);

  const handleUnlockVideo = useCallback(async () => {
    if (!videoContent || !canAccess) return;

    setVideoLoading(true);
    setVideoError(null);

    try {
      let address = hookWalletAddress;
      if (!address) address = await getAddress();
      if (!address) throw new Error('No wallet address available');

      let result;
      if (hasActiveVideoSession) {
        result = await contentAPI.getSignedUrl(videoContent.contentId, address, 60);
      } else {
        const signature = await signMessageWithNonce('Grant exclusive content access');
        if (!signature) throw new Error('Signature required to unlock content');
        result = await contentAPI.grantAccess(videoContent.contentId, address, signature.signature, signature.message);
      }

      // The signed URL from backend may contain a YouTube URL in metadata,
      // or we extract from the content metadata directly
      const ytId = extractYouTubeId(result?.signedUrl || result?.youtubeUrl || videoContent?.originalName);
      if (ytId) {
        setYoutubeVideoId(ytId);
        setContentUnlocked(true);
        setVideoSessionExpires(result.sessionExpiresAt || (Date.now() + 24 * 60 * 60 * 1000));
      } else if (result?.signedUrl) {
        // Fallback: direct URL (non-YouTube)
        setYoutubeVideoId(null);
        setContentUnlocked(true);
        setVideoSessionExpires(result.sessionExpiresAt || (Date.now() + 24 * 60 * 60 * 1000));
      } else {
        throw new Error('No content URL returned');
      }
    } catch (err) {
      console.error('Error unlocking content:', err);
      setVideoError(err.message || 'Failed to unlock content. Please try again.');
    } finally {
      setVideoLoading(false);
    }
  }, [videoContent, canAccess, hookWalletAddress, getAddress, signMessageWithNonce, hasActiveVideoSession]);

  // ── YouTube IFrame API integration ────────────────────────────
  // Load YouTube API once
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.body.appendChild(tag);
    }
  }, []);

  // Initialize player when video is unlocked
  useEffect(() => {
    if (!contentUnlocked || !youtubeVideoId || !iframeRef.current) return;

    const initPlayer = () => {
      if (!window.YT || !window.YT.Player) {
        setTimeout(initPlayer, 200);
        return;
      }

      playerRef.current = new window.YT.Player(iframeRef.current, {
        videoId: youtubeVideoId,
        playerVars: {
          autoplay: 0,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          controls: 0, // We use custom controls
        },
        events: {
          onReady: () => {
            setPlayerReady(true);
            setDuration(playerRef.current.getDuration());
          },
          onStateChange: (e) => {
            setIsPlaying(e.data === window.YT.PlayerState.PLAYING);
            if (e.data === window.YT.PlayerState.ENDED) {
              setIsPlaying(false);
              setShowControls(true);
            }
          },
        },
      });
    };

    initPlayer();

    return () => {
      if (playerRef.current && playerRef.current.destroy) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [contentUnlocked, youtubeVideoId]);

  // Poll current time while playing
  useEffect(() => {
    if (!playerReady || !isPlaying) return;
    const interval = setInterval(() => {
      if (playerRef.current && playerRef.current.getCurrentTime) {
        setCurrentTime(playerRef.current.getCurrentTime());
        setDuration(playerRef.current.getDuration());
      }
    }, 500);
    return () => clearInterval(interval);
  }, [playerReady, isPlaying]);

  // Video controls (YouTube API)
  const togglePlay = () => {
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  };

  const toggleMute = () => {
    if (!playerRef.current) return;
    if (isMuted) {
      playerRef.current.unMute();
      setIsMuted(false);
    } else {
      playerRef.current.mute();
      setIsMuted(true);
    }
  };

  const handleSeek = (e) => {
    if (!playerRef.current) return;
    const time = (parseFloat(e.target.value) / 100) * duration;
    playerRef.current.seekTo(time, true);
    setCurrentTime(time);
  };

  const handleRestart = () => {
    if (!playerRef.current) return;
    playerRef.current.seekTo(0, true);
    setCurrentTime(0);
  };

  const toggleFullscreen = () => {
    const wrapper = iframeRef.current?.parentElement;
    if (!wrapper) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
      setIsFullscreen(false);
    } else {
      wrapper.requestFullscreen();
      setIsFullscreen(true);
    }
  };

  const showControlsTemporarily = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  };

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <PageContainer>
        <LoadingContainer>
          <LoadingSpinner
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
          <p style={{ marginTop: '1rem', color: 'rgba(255,255,255,0.6)' }}>Verifying your crown...</p>
        </LoadingContainer>
      </PageContainer>
    );
  }

  if (!canAccess) {
    let missing = '';
    if (!verified && !connected) missing = 'You need to verify your collectible and connect your wallet.';
    else if (!verified) missing = 'You need to verify your collectible figure first.';
    else if (!connected) missing = 'Connect your wallet to prove token ownership.';
    else if (!hasToken) missing = 'Your connected wallet does not hold a Crownmania token.';

    return (
      <PageContainer>
        <LockedGate
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }}><FaLock /></div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.75rem', color: 'white' }}>Exclusive Perks Locked</h2>
          <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)', marginBottom: '1.5rem', lineHeight: 1.6 }}>{missing}</p>
          <ActionButton
            $primary
            onClick={() => navigate('/')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <FaArrowRight /> Return to Vault
          </ActionButton>
        </LockedGate>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageTitle
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        Exclusive Vault
      </PageTitle>
      <PageSubtitle>
        Welcome, verified collector. Your token grants access to exclusive content, experiences, and rewards.
      </PageSubtitle>

      <VaultGrid>
        {/* ── Exclusive Video Player ─────────────────────────── */}
        <VaultPanel
          $unlocked={hasVideoAccess}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <PanelHeader>
            <PanelIcon $unlocked={hasVideoAccess}><FaVideo /></PanelIcon>
            <div style={{ flex: 1 }}>
              <PanelTitle $unlocked={hasVideoAccess}>Exclusive Content</PanelTitle>
              <PanelDesc>Early access for token holders only</PanelDesc>
            </div>
            {contentUnlocked && videoSessionExpires && (
              <SessionBadge $active>
                <FaClock size={11} /> {formatTimeRemaining(videoSessionExpires)}
              </SessionBadge>
            )}
          </PanelHeader>

          {videoError && (
            <div style={{
              marginBottom: '1rem',
              padding: '0.75rem 1rem',
              background: 'rgba(255, 59, 48, 0.1)',
              border: '1px solid rgba(255, 59, 48, 0.3)',
              borderRadius: '8px',
              color: '#ff6b6b',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}>
              <FaExclamationTriangle size={14} />
              <span>{videoError}</span>
            </div>
          )}

          <VideoWrapper
            onMouseMove={showControlsTemporarily}
            onMouseLeave={() => isPlaying && setShowControls(false)}
          >
            {contentUnlocked && youtubeVideoId ? (
              <>
                <div ref={iframeRef} style={{ width: '100%', height: '100%' }} />
                {playerReady && (
                  <VideoControls $visible={showControls}>
                    <ControlButton onClick={togglePlay}>
                      {isPlaying ? <FaPause /> : <FaPlay />}
                    </ControlButton>
                    <ControlButton onClick={handleRestart} title="Restart">
                      <FaRedo size={14} />
                    </ControlButton>
                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', minWidth: '35px' }}>
                      {formatTime(currentTime)}
                    </span>
                    <ProgressBar
                      type="range"
                      min="0"
                      max="100"
                      value={duration ? (currentTime / duration) * 100 : 0}
                      onChange={handleSeek}
                      style={{ background: `linear-gradient(to right, #00ff88 ${(duration ? (currentTime / duration) * 100 : 0)}%, rgba(255,255,255,0.2) ${(duration ? (currentTime / duration) * 100 : 0)}%)` }}
                    />
                    <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', minWidth: '35px' }}>
                      {formatTime(duration)}
                    </span>
                    <ControlButton onClick={toggleMute}>
                      {isMuted ? <FaVolumeMute /> : <FaVolumeUp />}
                    </ControlButton>
                    <ControlButton onClick={toggleFullscreen}>
                      {isFullscreen ? <FaCompress /> : <FaExpand />}
                    </ControlButton>
                  </VideoControls>
                )}
                {!playerReady && (
                  <VideoOverlay $clickable={false}>
                    <LoadingSpinner animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} />
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>Loading player...</p>
                  </VideoOverlay>
                )}
              </>
            ) : (
              <VideoOverlay $clickable={hasVideoAccess && !videoLoading} onClick={hasVideoAccess && !videoLoading ? handleUnlockVideo : undefined}>
                {videoLoading ? (
                  <>
                    <LoadingSpinner animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} />
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>Unlocking exclusive content...</p>
                  </>
                ) : hasVideoAccess ? (
                  <>
                    <div style={{ fontSize: '3rem', color: '#00ff88', cursor: 'pointer' }}><FaPlay /></div>
                    <p style={{ color: '#00ff88', fontSize: '0.9rem', fontWeight: 600 }}>Click to unlock & play</p>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.75rem' }}>24-hour unlimited access with your token</p>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: '3rem', opacity: 0.3 }}><FaLock /></div>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>Token ownership required</p>
                  </>
                )}
              </VideoOverlay>
            )}
          </VideoWrapper>

          {hasVideoAccess && !contentUnlocked && !videoLoading && (
            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center' }}>
              <ActionButton
                $primary
                onClick={handleUnlockVideo}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <FaVideo /> Unlock Exclusive Content
              </ActionButton>
            </div>
          )}
        </VaultPanel>

        {/* ── Concert Tickets ────────────────────────────────── */}
        <VaultPanel
          $unlocked={hasToken}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <PanelHeader>
            <PanelIcon $unlocked={hasToken}><FaTicketAlt /></PanelIcon>
            <div style={{ flex: 1 }}>
              <PanelTitle $unlocked={hasToken}>Concert Tickets</PanelTitle>
              <PanelDesc>Priority access to upcoming shows</PanelDesc>
            </div>
          </PanelHeader>

          <PerkRow $unlocked={hasToken}>
            <div style={{ fontSize: '1.5rem', opacity: hasToken ? 1 : 0.3 }}><FaTicketAlt /></div>
            <PerkInfo>
              <PerkName $unlocked={hasToken}>Priority Presale Access</PerkName>
              <PerkDetail>Skip the line with token-holder presale codes</PerkDetail>
            </PerkInfo>
            {hasToken ? <FaCheck style={{ color: '#00ff88' }} /> : <FaLock style={{ opacity: 0.3 }} />}
          </PerkRow>
          <PerkRow $unlocked={hasToken}>
            <div style={{ fontSize: '1.5rem', opacity: hasToken ? 1 : 0.3 }}><FaTicketAlt /></div>
            <PerkInfo>
              <PerkName $unlocked={hasToken}>VIP Seating</PerkName>
              <PerkDetail>Reserved VIP sections for verified collectors</PerkDetail>
            </PerkInfo>
            {hasToken ? <FaCheck style={{ color: '#00ff88' }} /> : <FaLock style={{ opacity: 0.3 }} />}
          </PerkRow>
          <PerkRow $unlocked={false}>
            <div style={{ fontSize: '1.5rem', opacity: 0.3 }}><FaTicketAlt /></div>
            <PerkInfo>
              <PerkName $unlocked={false}>Backstage Passes</PerkName>
              <PerkDetail>Limited availability — announced via push notifications</PerkDetail>
            </PerkInfo>
            <span style={{ fontSize: '0.6rem', letterSpacing: '0.12em', opacity: 0.6, border: '1px solid rgba(255,255,255,0.2)', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>SOON</span>
          </PerkRow>
        </VaultPanel>

        {/* ── Meet & Greet ───────────────────────────────────── */}
        <VaultPanel
          $unlocked={hasToken}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <PanelHeader>
            <PanelIcon $unlocked={hasToken}><FaHandshake /></PanelIcon>
            <div style={{ flex: 1 }}>
              <PanelTitle $unlocked={hasToken}>Meet & Greet</PanelTitle>
              <PanelDesc>Exclusive experiences with the artist</PanelDesc>
            </div>
          </PanelHeader>

          <PerkRow $unlocked={hasToken}>
            <div style={{ fontSize: '1.5rem', opacity: hasToken ? 1 : 0.3 }}><FaHandshake /></div>
            <PerkInfo>
              <PerkName $unlocked={hasToken}>VIP Meet & Greet Pass</PerkName>
              <PerkDetail>Meet the artist at select tour stops — token holders get first dibs</PerkDetail>
            </PerkInfo>
            {hasToken ? <FaCheck style={{ color: '#00ff88' }} /> : <FaLock style={{ opacity: 0.3 }} />}
          </PerkRow>
          <PerkRow $unlocked={false}>
            <div style={{ fontSize: '1.5rem', opacity: 0.3 }}><FaHandshake /></div>
            <PerkInfo>
              <PerkName $unlocked={false}>Private Listening Sessions</PerkName>
              <PerkDetail>Hear upcoming albums before release — limited spots</PerkDetail>
            </PerkInfo>
            <span style={{ fontSize: '0.6rem', letterSpacing: '0.12em', opacity: 0.6, border: '1px solid rgba(255,255,255,0.2)', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>SOON</span>
          </PerkRow>
        </VaultPanel>

        {/* ── Rewards & Airdrops ─────────────────────────────── */}
        <VaultPanel
          $unlocked={hasToken}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <PanelHeader>
            <PanelIcon $unlocked={hasToken}><FaGem /></PanelIcon>
            <div style={{ flex: 1 }}>
              <PanelTitle $unlocked={hasToken}>Rewards & Airdrops</PanelTitle>
              <PanelDesc>Token-holder exclusive drops</PanelDesc>
            </div>
          </PanelHeader>

          <PerkRow $unlocked={hasToken}>
            <div style={{ fontSize: '1.5rem', opacity: hasToken ? 1 : 0.3 }}><FaGem /></div>
            <PerkInfo>
              <PerkName $unlocked={hasToken}>Future Airdrops</PerkName>
              <PerkDetail>Digital collectibles and rewards airdropped to your wallet</PerkDetail>
            </PerkInfo>
            {hasToken ? <FaCheck style={{ color: '#00ff88' }} /> : <FaLock style={{ opacity: 0.3 }} />}
          </PerkRow>
          <PerkRow $unlocked={false}>
            <div style={{ fontSize: '1.5rem', opacity: 0.3 }}><FaGem /></div>
            <PerkInfo>
              <PerkName $unlocked={false}>Limited Merchandise Drops</PerkName>
              <PerkDetail>Exclusive physical merch reserved for verified collectors</PerkDetail>
            </PerkInfo>
            <span style={{ fontSize: '0.6rem', letterSpacing: '0.12em', opacity: 0.6, border: '1px solid rgba(255,255,255,0.2)', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>SOON</span>
          </PerkRow>
        </VaultPanel>
      </VaultGrid>
    </PageContainer>
  );
};

export default ExclusivePerks;
