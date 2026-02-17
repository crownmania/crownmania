import { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';

const STORAGE_KEY = 'crownmania_site_unlocked';
const SITE_PASSWORD = import.meta.env.VITE_SITE_PASSWORD || '';

const shake = keyframes`
  10%, 90% { transform: translateX(-2px); }
  20%, 80% { transform: translateX(4px); }
  30%, 50%, 70% { transform: translateX(-6px); }
  40%, 60% { transform: translateX(6px); }
`;

const GateOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 99999;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 2rem;
`;

const LogoText = styled.h1`
  font-family: var(--font-primary);
  font-size: clamp(2rem, 6vw, 3.5rem);
  color: white;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  margin: 0;
  text-shadow: 0 0 30px rgba(65, 105, 225, 0.3);
`;

const Subtitle = styled.div`
  font-family: var(--font-secondary);
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.35);
  letter-spacing: 0.3em;
  text-transform: uppercase;
`;

const InputGroup = styled.form`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  width: 100%;
  max-width: 360px;
  padding: 0 1.5rem;
  animation: ${props => props.$shake ? shake : 'none'} 0.5s ease;
`;

const PasswordInput = styled.input`
  width: 100%;
  padding: 1rem 1.25rem;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid ${props => props.$error ? 'rgba(255, 59, 48, 0.5)' : 'rgba(255, 255, 255, 0.1)'};
  border-radius: 12px;
  color: white;
  font-family: var(--font-secondary);
  font-size: 1rem;
  letter-spacing: 0.15em;
  text-align: center;
  transition: all 0.3s ease;
  outline: none;

  &:focus {
    border-color: ${props => props.$error ? 'rgba(255, 59, 48, 0.7)' : 'rgba(65, 105, 225, 0.5)'};
    background: rgba(255, 255, 255, 0.06);
    box-shadow: 0 0 20px ${props => props.$error ? 'rgba(255, 59, 48, 0.1)' : 'rgba(65, 105, 225, 0.1)'};
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.15);
    letter-spacing: 0.2em;
    font-size: 0.85rem;
  }
`;

const SubmitButton = styled(motion.button)`
  width: 100%;
  padding: 0.9rem;
  background: rgba(65, 105, 225, 0.15);
  border: 1px solid rgba(65, 105, 225, 0.3);
  border-radius: 12px;
  color: white;
  font-family: var(--font-primary);
  font-size: 0.85rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(65, 105, 225, 0.25);
    border-color: rgba(65, 105, 225, 0.5);
  }
`;

const ErrorText = styled(motion.div)`
  font-family: var(--font-secondary);
  font-size: 0.8rem;
  color: rgba(255, 59, 48, 0.8);
  letter-spacing: 0.05em;
`;

export default function PasswordGate({ children }) {
    // If no password is set, skip the gate entirely
    if (!SITE_PASSWORD) return children;

    const [unlocked, setUnlocked] = useState(() => {
        return sessionStorage.getItem(STORAGE_KEY) === 'true';
    });
    const [input, setInput] = useState('');
    const [error, setError] = useState(false);
    const [shaking, setShaking] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (input === SITE_PASSWORD) {
            sessionStorage.setItem(STORAGE_KEY, 'true');
            setUnlocked(true);
        } else {
            setError(true);
            setShaking(true);
            setTimeout(() => setShaking(false), 500);
            setTimeout(() => setError(false), 3000);
        }
    };

    if (unlocked) return children;

    return (
        <GateOverlay>
            <LogoText>CrownMania</LogoText>
            <Subtitle>Site Under Development</Subtitle>

            <InputGroup onSubmit={handleSubmit} $shake={shaking}>
                <PasswordInput
                    type="password"
                    placeholder="Enter access code"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    $error={error}
                    autoFocus
                />
                <SubmitButton
                    type="submit"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    Enter
                </SubmitButton>
                <AnimatePresence>
                    {error && (
                        <ErrorText
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                        >
                            Incorrect access code
                        </ErrorText>
                    )}
                </AnimatePresence>
            </InputGroup>
        </GateOverlay>
    );
}
