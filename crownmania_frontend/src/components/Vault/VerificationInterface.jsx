import { motion } from 'framer-motion';
import styled from 'styled-components';

const Interface = styled(motion.div)`
  width: 100%;
  max-width: 600px;
  margin: 2rem auto;
  padding: 2rem;
  background: rgba(0, 166, 251, 0.05);
  border-radius: 8px;
  border: 1px solid var(--light-blue);
  position: relative;
`;

const HolographicOverlay = styled(motion.div)`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    45deg,
    transparent 0%,
    rgba(0, 166, 251, 0.1) 45%,
    rgba(0, 166, 251, 0.1) 55%,
    transparent 100%
  );
  pointer-events: none;
`;

const Input = styled(motion.input)`
  width: 100%;
  padding: 1rem;
  background: rgba(0, 20, 40, 0.8);
  border: 1px solid var(--light-blue);
  border-radius: 4px;
  color: var(--light-blue);
  font-size: 1.1rem;
  margin-bottom: 1rem;
  
  &:focus {
    outline: none;
    box-shadow: 0 0 15px rgba(0, 166, 251, 0.3);
  }
`;

const VerifyButton = styled(motion.button)`
  width: 100%;
  padding: 1rem;
  background: var(--light-blue);
  color: var(--dark-blue);
  border: none;
  border-radius: 4px;
  font-size: 1.1rem;
  font-weight: bold;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.2),
      transparent
    );
    transition: 0.5s;
  }
  
  &:hover::before {
    left: 100%;
  }
`;

export default function VerificationInterface({ onVerify }) {
  return (
    <Interface
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5 }}
    >
      <HolographicOverlay
        animate={{
          opacity: [0.3, 0.6, 0.3],
          x: ['-100%', '100%'],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
      
      <Input
        type="text"
        placeholder="Enter Serial Number"
        whileFocus={{ scale: 1.02 }}
      />
      
      <VerifyButton
        onClick={onVerify}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        Verify Authenticity
      </VerifyButton>
    </Interface>
  );
}
