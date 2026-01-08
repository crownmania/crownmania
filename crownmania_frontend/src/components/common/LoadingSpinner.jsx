import React from 'react';
import styled, { keyframes } from 'styled-components';

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const SpinnerContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  width: 100%;

  &.full-height {
    height: 100vh;
  }
`;

const Spinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top: 3px solid rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  animation: ${spin} 1s linear infinite;
`;

const LoadingText = styled.div`
  color: rgba(255, 255, 255, 0.8);
  font-family: 'Avenir Next', sans-serif;
  font-size: 0.9rem;
  margin-top: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
`;

const LoadingSpinner = ({ fullHeight = false, text = 'Loading...' }) => {
  return (
    <SpinnerContainer className={fullHeight ? 'full-height' : ''}>
      <div style={{ textAlign: 'center' }}>
        <Spinner />
        {text && <LoadingText>{text}</LoadingText>}
      </div>
    </SpinnerContainer>
  );
};

export default LoadingSpinner;
