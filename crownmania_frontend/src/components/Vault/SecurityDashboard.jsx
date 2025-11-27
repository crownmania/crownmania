import { motion } from 'framer-motion';
import styled from 'styled-components';

const DashboardContainer = styled(motion.div)`
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
`;

const Window = styled(motion.div)`
  background: rgba(0, 166, 251, 0.05);
  border: 1px solid var(--light-blue);
  border-radius: 8px;
  padding: 1.5rem;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 2px;
    background: linear-gradient(90deg, transparent, var(--light-blue), transparent);
    animation: scan 2s linear infinite;
  }

  @keyframes scan {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
`;

const WindowTitle = styled.h3`
  color: var(--light-blue);
  margin-bottom: 1rem;
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  &::before {
    content: '';
    display: block;
    width: 8px;
    height: 8px;
    background: var(--light-blue);
    border-radius: 50%;
    animation: blink 1.5s infinite;
  }

  @keyframes blink {
    50% { opacity: 0.5; }
  }
`;

const StatusIndicator = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0.5rem 0;
  font-size: 0.9rem;
  opacity: 0.8;
`;

const ProgressBar = styled(motion.div)`
  width: 100%;
  height: 4px;
  background: rgba(0, 166, 251, 0.2);
  border-radius: 2px;
  overflow: hidden;
  margin: 1rem 0;
  
  div {
    height: 100%;
    background: var(--light-blue);
    width: ${props => props.progress}%;
  }
`;

export default function SecurityDashboard({ verificationProgress }) {
  return (
    <DashboardContainer
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
    >
      <Window>
        <WindowTitle>Authentication Status</WindowTitle>
        <StatusIndicator>
          <motion.span
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            ● Verifying Digital Signature
          </motion.span>
        </StatusIndicator>
        <ProgressBar progress={verificationProgress}>
          <div />
        </ProgressBar>
      </Window>

      <Window>
        <WindowTitle>Digital-Physical Link</WindowTitle>
        <StatusIndicator>
          <span>Serial: #XXXXX</span>
        </StatusIndicator>
        <StatusIndicator>
          <span>Token ID: 0x...</span>
        </StatusIndicator>
      </Window>

      <Window>
        <WindowTitle>Chain of Ownership</WindowTitle>
        <StatusIndicator>
          <span>Original Mint: 2023-11-01</span>
        </StatusIndicator>
        <StatusIndicator>
          <span>Current Owner: Verifying...</span>
        </StatusIndicator>
      </Window>
    </DashboardContainer>
  );
}
