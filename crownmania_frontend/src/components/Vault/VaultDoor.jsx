import { motion } from 'framer-motion';
import styled from 'styled-components';

const DoorContainer = styled.div`
  position: relative;
  width: 100%;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  perspective: 1000px;
`;

const VaultHandle = styled(motion.div)`
  width: 200px;
  height: 200px;
  border: 15px solid var(--light-blue);
  border-radius: 50%;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 20px;
    height: 80px;
    background: var(--light-blue);
    transform: translate(-50%, -50%);
    border-radius: 4px;
  }

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    border: 2px solid rgba(0, 166, 251, 0.3);
    border-radius: 50%;
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0% { transform: scale(1); opacity: 1; }
    100% { transform: scale(1.5); opacity: 0; }
  }
`;

export default function VaultDoor({ onAnimationComplete }) {
  return (
    <DoorContainer>
      <VaultHandle
        initial={{ rotate: 0 }}
        animate={{ 
          rotate: 720,
          scale: [1, 1.2, 0],
        }}
        transition={{ 
          duration: 3,
          times: [0, 0.8, 1],
          ease: [0.4, 0, 0.2, 1]
        }}
        onAnimationComplete={onAnimationComplete}
      />
    </DoorContainer>
  );
}
