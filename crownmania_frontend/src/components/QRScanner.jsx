import { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaQrcode, FaMobile, FaDesktop, FaRedo } from 'react-icons/fa';

const scanPulse = keyframes`
  0%, 100% { opacity: 0.4; transform: scaleY(1); }
  50% { opacity: 1; transform: scaleY(1.05); }
`;

const Overlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(12px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
`;

const ModalContainer = styled(motion.div)`
  background: rgba(10, 10, 30, 0.98);
  border: 1px solid ${props => props.$themeColor || 'rgba(65, 105, 225, 0.4)'};
  border-radius: 20px;
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8), 
              inset 0 1px 0 ${props => props.$themeColor ? `${props.$themeColor}22` : 'rgba(65, 105, 225, 0.13)'};
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
`;

const ModalTitle = styled.h3`
  font-family: var(--font-primary);
  font-size: 1.2rem;
  font-weight: 700;
  color: white;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin: 0;
  letter-spacing: 0.05em;
`;

const CloseButton = styled.button`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: white;
  }
`;

const ModalBody = styled.div`
  padding: 1.5rem;
`;

const ScannerContainer = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  border-radius: 12px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.08);
  margin-bottom: 1rem;
  
  #qr-reader {
    width: 100% !important;
    border: none !important;
    
    video {
      border-radius: 12px;
      object-fit: cover;
    }
  }
`;

const ScanLine = styled.div`
  position: absolute;
  top: 50%;
  left: 10%;
  right: 10%;
  height: 2px;
  background: ${props => props.$color || 'rgba(65, 105, 225, 0.8)'};
  box-shadow: 0 0 12px ${props => props.$color || 'rgba(65, 105, 225, 0.5)'};
  z-index: 10;
  pointer-events: none;
  animation: ${scanPulse} 2s ease-in-out infinite;
`;

const ScanCorner = styled.div`
  position: absolute;
  width: 24px;
  height: 24px;
  z-index: 10;
  pointer-events: none;
  
  &::before, &::after {
    content: '';
    position: absolute;
    background: ${props => props.$color || 'rgba(65, 105, 225, 0.8)'};
  }
  
  &.top-left {
    top: 15%;
    left: 15%;
    &::before { top: 0; left: 0; width: 24px; height: 3px; }
    &::after { top: 0; left: 0; width: 3px; height: 24px; }
  }
  &.top-right {
    top: 15%;
    right: 15%;
    &::before { top: 0; right: 0; width: 24px; height: 3px; }
    &::after { top: 0; right: 0; width: 3px; height: 24px; }
  }
  &.bottom-left {
    bottom: 15%;
    left: 15%;
    &::before { bottom: 0; left: 0; width: 24px; height: 3px; }
    &::after { bottom: 0; left: 0; width: 3px; height: 24px; }
  }
  &.bottom-right {
    bottom: 15%;
    right: 15%;
    &::before { bottom: 0; right: 0; width: 24px; height: 3px; }
    &::after { bottom: 0; right: 0; width: 3px; height: 24px; }
  }
`;

const StatusText = styled.div`
  text-align: center;
  font-family: var(--font-secondary);
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 0.75rem;
  letter-spacing: 0.05em;
`;

const DesktopQRDisplay = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  padding: 1.5rem 0;
`;

const QRImageContainer = styled.div`
  background: white;
  border-radius: 16px;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 30px ${props => props.$color ? `${props.$color}33` : 'rgba(65, 105, 225, 0.2)'};
`;

const InstructionList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 100%;
`;

const InstructionStep = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  font-family: var(--font-secondary);
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.5;
`;

const StepNumber = styled.div`
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: ${props => props.$color ? `${props.$color}33` : 'rgba(65, 105, 225, 0.2)'};
  border: 1px solid ${props => props.$color ? `${props.$color}66` : 'rgba(65, 105, 225, 0.4)'};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 700;
  color: ${props => props.$color || 'rgba(65, 105, 225, 1)'};
`;

const RetryButton = styled.button`
  background: ${props => props.$color ? `${props.$color}22` : 'rgba(65, 105, 225, 0.13)'};
  border: 1px solid ${props => props.$color ? `${props.$color}66` : 'rgba(65, 105, 225, 0.4)'};
  border-radius: 10px;
  padding: 0.75rem 1.5rem;
  color: white;
  font-family: var(--font-secondary);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
  
  &:hover {
    background: ${props => props.$color ? `${props.$color}44` : 'rgba(65, 105, 225, 0.27)'};
  }
`;

const ErrorMessage = styled.div`
  background: rgba(255, 59, 48, 0.1);
  border: 1px solid rgba(255, 59, 48, 0.3);
  border-radius: 10px;
  padding: 1rem;
  color: rgba(255, 255, 255, 0.9);
  font-family: var(--font-secondary);
  font-size: 0.85rem;
  text-align: center;
  margin-bottom: 1rem;
`;

// Detect mobile
const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
        || (navigator.maxTouchPoints && navigator.maxTouchPoints > 2);
};

export default function QRScanner({ isOpen, onClose, onScan, themeColor }) {
    const [isMobile] = useState(isMobileDevice());
    const [scannerState, setScannerState] = useState('initializing'); // initializing, scanning, success, error
    const [errorMessage, setErrorMessage] = useState('');
    const [scannedCode, setScannedCode] = useState('');
    const scannerRef = useRef(null);
    const scannerIdRef = useRef('qr-reader-' + Date.now());
    const hasStartedRef = useRef(false);
    const scannerOverlayTapRef = useRef(null);

    const stopScanner = useCallback(async () => {
        if (scannerRef.current) {
            try {
                const state = scannerRef.current.getState();
                if (state === 2) { // SCANNING
                    await scannerRef.current.stop();
                }
            } catch (err) {
                console.warn('Scanner stop error:', err);
            }
            try {
                scannerRef.current.clear();
            } catch (err) {
                console.warn('Scanner clear error:', err);
            }
            scannerRef.current = null;
        }
        hasStartedRef.current = false;
    }, []);

    const startScanner = useCallback(async () => {
        if (hasStartedRef.current) return;
        hasStartedRef.current = true;

        try {
            setScannerState('initializing');
            setErrorMessage('');

            // Small delay to ensure DOM is ready
            await new Promise(resolve => setTimeout(resolve, 300));

            const element = document.getElementById(scannerIdRef.current);
            if (!element) {
                setErrorMessage('Scanner element not found');
                setScannerState('error');
                return;
            }

            const scanner = new Html5Qrcode(scannerIdRef.current);
            scannerRef.current = scanner;

            const config = {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1,
                disableFlip: false,
            };

            await scanner.start(
                { facingMode: 'environment' },
                config,
                (decodedText) => {
                    // Guard against multiple scan callbacks
                    if (scannerRef.current === null) return;
                    setScannedCode(decodedText);
                    setScannerState('success');

                    // Auto-close and send result after brief success display
                    const proceed = async () => {
                        await stopScanner();
                        onScan(decodedText);
                    };

                    // Allow the user to tap the success overlay to proceed immediately
                    scannerOverlayTapRef.current = proceed;

                    // Auto-proceed after a short delay if the user doesn't tap
                    setTimeout(() => {
                        if (scannerOverlayTapRef.current) {
                            scannerOverlayTapRef.current = null;
                            proceed();
                        }
                    }, 400);
                },
                () => { } // Ignore scan failures (normal during continuous scanning)
            );

            setScannerState('scanning');
        } catch (err) {
            console.error('Scanner start error:', err);
            let message = 'Could not access camera.';
            if (err.toString().includes('NotAllowedError')) {
                message = 'Camera permission denied. Please allow camera access in your browser settings.';
            } else if (err.toString().includes('NotFoundError')) {
                message = 'No camera found on this device.';
            } else if (err.toString().includes('NotReadableError')) {
                message = 'Camera is in use by another application.';
            }
            setErrorMessage(message);
            setScannerState('error');
        }
    }, [onScan, onClose, stopScanner]);

    useEffect(() => {
        if (isOpen && isMobile) {
            startScanner();
        }

        return () => {
            stopScanner();
        };
    }, [isOpen, isMobile, startScanner, stopScanner]);

    const handleRetry = () => {
        hasStartedRef.current = false;
        startScanner();
    };

    // Generate a session URL for desktop QR display
    const sessionUrl = `${window.location.origin}/vault-scan?session=${Date.now().toString(36)}`;

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <Overlay
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={(e) => { if (e.target === e.currentTarget) { stopScanner(); onClose(); } }}
            >
                <ModalContainer
                    $themeColor={themeColor}
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    onClick={e => e.stopPropagation()}
                >
                    <ModalHeader>
                        <ModalTitle>
                            <FaQrcode style={{ color: themeColor }} />
                            {isMobile ? 'SCAN QR CODE' : 'QR VERIFICATION'}
                        </ModalTitle>
                        <CloseButton onClick={() => { stopScanner(); onClose(); }}>
                            <FaTimes size={14} />
                        </CloseButton>
                    </ModalHeader>

                    <ModalBody>
                        {isMobile ? (
                            /* === MOBILE: Camera Scanner === */
                            <>
                                <ScannerContainer>
                                    <div id={scannerIdRef.current} style={{ width: '100%', height: '100%' }} />
                                    {scannerState === 'scanning' && (
                                        <>
                                            <ScanLine $color={themeColor} />
                                            <ScanCorner className="top-left" $color={themeColor} />
                                            <ScanCorner className="top-right" $color={themeColor} />
                                            <ScanCorner className="bottom-left" $color={themeColor} />
                                            <ScanCorner className="bottom-right" $color={themeColor} />
                                        </>
                                    )}
                                    {scannerState === 'success' && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            onClick={() => {
                                                if (scannerOverlayTapRef.current) {
                                                    const cb = scannerOverlayTapRef.current;
                                                    scannerOverlayTapRef.current = null;
                                                    cb();
                                                }
                                            }}
                                            style={{
                                                cursor: 'pointer',
                                                position: 'absolute',
                                                inset: 0,
                                                background: 'rgba(0, 0, 0, 0.7)',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '0.75rem',
                                                zIndex: 20,
                                            }}
                                        >
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                transition={{ type: 'spring', damping: 10 }}
                                                style={{
                                                    width: 64, height: 64, borderRadius: '50%',
                                                    background: `${themeColor || '#4169E1'}33`,
                                                    border: `2px solid ${themeColor || '#4169E1'}`,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    color: themeColor || '#4169E1', fontSize: '1.5rem',
                                                }}
                                            >
                                                ✓
                                            </motion.div>
                                            <div style={{
                                                color: 'white', fontFamily: 'var(--font-secondary)',
                                                fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.1em'
                                            }}>
                                                CODE DETECTED — TAP TO CONTINUE
                                            </div>
                                            <div style={{
                                                color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace',
                                                fontSize: '0.8rem', wordBreak: 'break-all', textAlign: 'center',
                                                padding: '0 1rem',
                                            }}>
                                                {scannedCode}
                                            </div>
                                        </motion.div>
                                    )}
                                </ScannerContainer>

                                {errorMessage && (
                                    <ErrorMessage>{errorMessage}</ErrorMessage>
                                )}

                                {scannerState === 'error' && (
                                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                                        <RetryButton $color={themeColor} onClick={handleRetry}>
                                            <FaRedo size={12} /> Try Again
                                        </RetryButton>
                                    </div>
                                )}

                                <StatusText>
                                    {scannerState === 'initializing' && 'Requesting camera access...'}
                                    {scannerState === 'scanning' && 'Point your camera at the product QR code'}
                                    {scannerState === 'success' && 'Verifying product code...'}
                                    {scannerState === 'error' && 'Scanner could not start'}
                                </StatusText>
                            </>
                        ) : (
                            /* === DESKTOP: Show QR for mobile scanning === */
                            <DesktopQRDisplay>
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                                    color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-secondary)',
                                    fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.15em',
                                }}>
                                    <FaDesktop /> Desktop Mode
                                </div>

                                <QRImageContainer $color={themeColor}>
                                    {/* Generate QR code using a simple API */}
                                    <img
                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(sessionUrl)}&bgcolor=ffffff&color=000000&format=svg`}
                                        alt="Scan with phone"
                                        style={{ width: 200, height: 200, display: 'block' }}
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                            e.target.parentElement.innerHTML = '<div style="width:200px;height:200px;display:flex;align-items:center;justify-content:center;color:#666;font-size:0.8rem;text-align:center">QR Generation<br/>Requires Internet</div>';
                                        }}
                                    />
                                </QRImageContainer>

                                <InstructionList>
                                    <InstructionStep>
                                        <StepNumber $color={themeColor}>1</StepNumber>
                                        <span>Open the camera app on your phone</span>
                                    </InstructionStep>
                                    <InstructionStep>
                                        <StepNumber $color={themeColor}>2</StepNumber>
                                        <span>Scan the QR code above to open the mobile scanner</span>
                                    </InstructionStep>
                                    <InstructionStep>
                                        <StepNumber $color={themeColor}>3</StepNumber>
                                        <span>Use the mobile scanner to scan your product's QR code</span>
                                    </InstructionStep>
                                    <InstructionStep>
                                        <StepNumber $color={themeColor}>4</StepNumber>
                                        <span>The verification code will sync back to this page automatically</span>
                                    </InstructionStep>
                                </InstructionList>

                                <div style={{
                                    background: `${themeColor || '#4169E1'}11`,
                                    border: `1px solid ${themeColor || '#4169E1'}33`,
                                    borderRadius: '10px',
                                    padding: '0.75rem 1rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    width: '100%',
                                }}>
                                    <FaMobile style={{ color: themeColor || '#4169E1', fontSize: '1.2rem', flexShrink: 0 }} />
                                    <span style={{
                                        fontFamily: 'var(--font-secondary)', fontSize: '0.8rem',
                                        color: 'rgba(255,255,255,0.6)', lineHeight: 1.5
                                    }}>
                                        Or enter your product code manually using the input field below the scanner.
                                    </span>
                                </div>
                            </DesktopQRDisplay>
                        )}
                    </ModalBody>
                </ModalContainer>
            </Overlay>
        </AnimatePresence>
    );
}
