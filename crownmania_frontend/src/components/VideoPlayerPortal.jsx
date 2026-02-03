import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPlay, FaPause, FaVolumeUp, FaVolumeMute, FaExpand, FaCompress, FaTimes } from 'react-icons/fa';

const PortalOverlay = styled(motion.div)`
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

const PortalContainer = styled(motion.div)`
  background: linear-gradient(145deg, rgba(0, 30, 60, 0.95), rgba(0, 10, 30, 0.98));
  border: 1px solid rgba(65, 105, 225, 0.3);
  border-radius: 20px;
  max-width: 90vw;
  max-height: 90vh;
  width: 100%;
  position: relative;
  box-shadow: 0 0 60px rgba(65, 105, 225, 0.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const VideoHeader = styled.div`
  padding: 1.5rem 2rem;
  border-bottom: 1px solid rgba(65, 105, 225, 0.2);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;

  h2 {
    font-family: var(--font-primary);
    font-size: 1.5rem;
    color: white;
    margin: 0;
    letter-spacing: 0.15em;
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

const VideoContainer = styled.div`
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  min-height: 400px;
`;

const VideoElement = styled.video`
  width: 100%;
  height: 100%;
  max-height: 70vh;
  object-fit: contain;
`;

const ControlsBar = styled.div`
  padding: 1rem 2rem;
  border-top: 1px solid rgba(65, 105, 225, 0.2);
  display: flex;
  align-items: center;
  gap: 1rem;
  background: rgba(0, 0, 0, 0.3);
`;

const ControlButton = styled.button`
  background: rgba(65, 105, 225, 0.1);
  border: 1px solid rgba(65, 105, 225, 0.3);
  color: #4169E1;
  padding: 0.75rem;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  font-size: 1rem;

  &:hover {
    background: rgba(65, 105, 225, 0.2);
    border-color: rgba(65, 105, 225, 0.5);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ProgressBar = styled.div`
  flex: 1;
  height: 6px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
  position: relative;
  cursor: pointer;

  .progress {
    height: 100%;
    background: linear-gradient(90deg, #4169E1, #6B8DD6);
    border-radius: 3px;
    width: ${props => props.$progress || 0}%;
    transition: width 0.1s ease;
  }
`;

const TimeDisplay = styled.span`
  font-family: var(--font-secondary);
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.7);
  min-width: 100px;
  text-align: center;
`;

const VideoPlayerPortal = ({ videoUrl, title = 'Video Player', onClose }) => {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleLoadedMetadata = () => setDuration(video.duration);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
    };
  }, []);

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const handleProgressClick = (e) => {
    if (videoRef.current && duration) {
      const rect = e.target.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const percentage = clickX / rect.width;
      const newTime = percentage * duration;
      videoRef.current.currentTime = newTime;
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const newMuted = !isMuted;
      videoRef.current.muted = newMuted;
      setIsMuted(newMuted);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      videoRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  const formatTime = (time) => {
    if (!time || isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <AnimatePresence>
      <PortalOverlay
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <PortalContainer
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <VideoHeader>
            <h2>{title}</h2>
            <CloseButton onClick={onClose}>
              <FaTimes />
            </CloseButton>
          </VideoHeader>

          <VideoContainer>
            <VideoElement
              ref={videoRef}
              src={videoUrl}
              preload="metadata"
            />
          </VideoContainer>

          <ControlsBar>
            <ControlButton onClick={handlePlayPause}>
              {isPlaying ? <FaPause /> : <FaPlay />}
            </ControlButton>

            <ControlButton onClick={toggleMute}>
              {isMuted ? <FaVolumeMute /> : <FaVolumeUp />}
            </ControlButton>

            <ProgressBar $progress={(currentTime / duration) * 100} onClick={handleProgressClick}>
              <div className="progress"></div>
            </ProgressBar>

            <TimeDisplay>
              {formatTime(currentTime)} / {formatTime(duration)}
            </TimeDisplay>

            <ControlButton onClick={toggleFullscreen}>
              {isFullscreen ? <FaCompress /> : <FaExpand />}
            </ControlButton>
          </ControlsBar>
        </PortalContainer>
      </PortalOverlay>
    </AnimatePresence>
  );
};

export default VideoPlayerPortal;
