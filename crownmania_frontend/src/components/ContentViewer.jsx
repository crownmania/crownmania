import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPlay, FaPause, FaVolumeUp, FaVolumeMute, FaDownload, FaTimes, FaSpinner, FaExclamationTriangle } from 'react-icons/fa';
import { contentAPI } from '../services/api';

// Styled Components
const ViewerOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.95);
  backdrop-filter: blur(10px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
`;

const ViewerContainer = styled(motion.div)`
  background: linear-gradient(145deg, rgba(0, 30, 60, 0.95), rgba(0, 10, 30, 0.98));
  border: 1px solid rgba(0, 255, 136, 0.3);
  border-radius: 20px;
  max-width: 90vw;
  max-height: 90vh;
  width: 100%;
  position: relative;
  box-shadow: 0 0 60px rgba(0, 255, 136, 0.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const ViewerHeader = styled.div`
  padding: 1.5rem 2rem;
  border-bottom: 1px solid rgba(0, 255, 136, 0.2);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;

  h2 {
    font-family: 'Designer', sans-serif;
    font-size: 1.5rem;
    color: white;
    margin: 0;
    background: linear-gradient(135deg, #00ff88, #00c8ff);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.7);
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 8px;
  transition: all 0.2s;

  &:hover {
    color: white;
    background: rgba(255, 255, 255, 0.1);
  }
`;

const ContentArea = styled.div`
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  background: rgba(0, 0, 0, 0.3);
`;

const LoadingSpinner = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  color: rgba(255, 255, 255, 0.7);

  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgba(0, 255, 136, 0.3);
    border-top: 3px solid #00ff88;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  p {
    font-family: var(--font-secondary);
    margin: 0;
  }
`;

const ErrorMessage = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  color: #ff6b6b;
  text-align: center;
  padding: 2rem;

  .icon {
    font-size: 3rem;
    opacity: 0.5;
  }

  h3 {
    font-family: 'Designer', sans-serif;
    margin: 0;
  }

  p {
    font-family: var(--font-secondary);
    margin: 0;
    opacity: 0.8;
  }
`;

const VideoPlayer = styled.video`
  max-width: 100%;
  max-height: 100%;
  border-radius: 8px;
  box-shadow: 0 0 30px rgba(0, 255, 136, 0.3);
`;

const ImageViewer = styled.img`
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 0 30px rgba(0, 255, 136, 0.3);
`;

const DocumentViewer = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
  padding: 2rem;

  .document-icon {
    font-size: 5rem;
    color: rgba(255, 255, 255, 0.5);
    opacity: 0.7;
  }

  .document-info {
    text-align: center;

    h3 {
      font-family: 'Designer', sans-serif;
      color: white;
      margin: 0 0 0.5rem 0;
    }

    p {
      font-family: var(--font-secondary);
      color: rgba(255, 255, 255, 0.7);
      margin: 0;
    }
  }
`;

const ControlsBar = styled.div`
  padding: 1rem 2rem;
  border-top: 1px solid rgba(0, 255, 136, 0.2);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
`;

const ControlGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const ControlButton = styled.button`
  background: rgba(0, 255, 136, 0.1);
  border: 1px solid rgba(0, 255, 136, 0.3);
  color: #00ff88;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: var(--font-secondary);
  font-size: 0.9rem;
  transition: all 0.2s;

  &:hover {
    background: rgba(0, 255, 136, 0.2);
    border-color: rgba(0, 255, 136, 0.5);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ProgressBar = styled.div`
  flex: 1;
  height: 4px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
  position: relative;
  cursor: pointer;
  margin: 0 1rem;

  .progress {
    height: 100%;
    background: linear-gradient(90deg, #00ff88, #00c8ff);
    border-radius: 2px;
    transition: width 0.1s ease;
  }
`;

const TimeDisplay = styled.span`
  font-family: var(--font-secondary);
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.7);
  min-width: 80px;
  text-align: center;
`;

const ContentViewer = ({ contentId, onClose, walletAddress }) => {
  const [content, setContent] = useState(null);
  const [signedUrl, setSignedUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  const videoRef = useRef(null);

  // Load content metadata and generate signed URL
  useEffect(() => {
    const loadContent = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get content metadata first
        const metadata = await contentAPI.getContentMetadata(contentId);
        setContent(metadata.metadata);

        // Generate signed URL for access
        if (walletAddress) {
          const signedUrlResult = await contentAPI.getSignedUrl(contentId, walletAddress);
          setSignedUrl(signedUrlResult.signedUrl);
        } else {
          throw new Error('Wallet address required for content access');
        }
      } catch (err) {
        console.error('Error loading content:', err);
        setError(err.message || 'Failed to load content');
      } finally {
        setLoading(false);
      }
    };

    if (contentId && walletAddress) {
      loadContent();
    }
  }, [contentId, walletAddress]);

  // Video event handlers
  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleProgressClick = (e) => {
    if (videoRef.current && duration) {
      const rect = e.target.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const percentage = clickX / rect.width;
      const newTime = percentage * duration;
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleVolumeChange = (newVolume) => {
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
  };

  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    if (videoRef.current) {
      videoRef.current.muted = newMuted;
    }
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleDownload = () => {
    if (signedUrl) {
      const link = document.createElement('a');
      link.href = signedUrl;
      link.download = content?.originalName || 'download';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const renderContent = () => {
    if (!content || !signedUrl) return null;

    const contentType = content.contentType || content.metadata?.contentType || 'unknown';

    switch (contentType) {
      case 'video':
        return (
          <VideoPlayer
            ref={videoRef}
            src={signedUrl}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
            controls={false} // We'll use custom controls
            preload="metadata"
          />
        );

      case 'image':
        return (
          <ImageViewer
            src={signedUrl}
            alt={content.originalName || 'Content'}
            onError={() => setError('Failed to load image')}
          />
        );

      case 'audio':
        return (
          <VideoPlayer
            ref={videoRef}
            src={signedUrl}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
            controls={false}
            preload="metadata"
          />
        );

      case 'document':
      case 'pdf':
        return (
          <DocumentViewer>
            <div className="document-icon">
              <FaDownload />
            </div>
            <div className="document-info">
              <h3>{content.originalName || 'Document'}</h3>
              <p>This document can be downloaded for viewing</p>
              <p>Size: {content.size ? `${(content.size / 1024 / 1024).toFixed(2)} MB` : 'Unknown'}</p>
            </div>
          </DocumentViewer>
        );

      default:
        return (
          <DocumentViewer>
            <div className="document-icon">
              <FaDownload />
            </div>
            <div className="document-info">
              <h3>{content.originalName || 'Content'}</h3>
              <p>This content can be downloaded for viewing</p>
              <p>Type: {contentType}</p>
            </div>
          </DocumentViewer>
        );
    }
  };

  const renderControls = () => {
    if (!content) return null;

    const contentType = content.contentType || content.metadata?.contentType || 'unknown';
    const isMedia = ['video', 'audio'].includes(contentType);

    if (!isMedia) {
      return (
        <ControlsBar>
          <ControlGroup>
            <ControlButton onClick={handleDownload}>
              <FaDownload /> Download
            </ControlButton>
          </ControlGroup>
          <div></div>
        </ControlsBar>
      );
    }

    return (
      <ControlsBar>
        <ControlGroup>
          <ControlButton onClick={handlePlayPause}>
            {isPlaying ? <FaPause /> : <FaPlay />}
          </ControlButton>
          <ControlButton onClick={toggleMute}>
            {isMuted ? <FaVolumeMute /> : <FaVolumeUp />}
          </ControlButton>
        </ControlGroup>

        <ProgressBar onClick={handleProgressClick}>
          <div className="progress" style={{ width: `${(currentTime / duration) * 100}%` }}></div>
        </ProgressBar>

        <ControlGroup>
          <TimeDisplay>
            {formatTime(currentTime)} / {formatTime(duration)}
          </TimeDisplay>
          <ControlButton onClick={handleDownload}>
            <FaDownload />
          </ControlButton>
        </ControlGroup>
      </ControlsBar>
    );
  };

  return (
    <AnimatePresence>
      <ViewerOverlay
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <ViewerContainer
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <ViewerHeader>
            <h2>{content?.originalName || 'Exclusive Content'}</h2>
            <CloseButton onClick={onClose}>
              <FaTimes />
            </CloseButton>
          </ViewerHeader>

          <ContentArea>
            {loading ? (
              <LoadingSpinner>
                <div className="spinner"></div>
                <p>Loading exclusive content...</p>
              </LoadingSpinner>
            ) : error ? (
              <ErrorMessage>
                <FaExclamationTriangle className="icon" />
                <h3>Access Denied</h3>
                <p>{error}</p>
              </ErrorMessage>
            ) : (
              renderContent()
            )}
          </ContentArea>

          {!loading && !error && renderControls()}
        </ViewerContainer>
      </ViewerOverlay>
    </AnimatePresence>
  );
};

export default ContentViewer;