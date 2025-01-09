import React from 'react';
import styled, { keyframes } from 'styled-components';

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const SpinnerWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: ${props => props.$fullHeight ? '100vh' : '100%'};
`;

const Spinner = styled.div`
  width: 50px;
  height: 50px;
  border: 5px solid #f3f3f3;
  border-top: 5px solid #3498db;
  border-radius: 50%;
  animation: ${spin} 1s linear infinite;
`;

const LoadingText = styled.p`
  margin-top: 1rem;
  color: #666;
  font-size: 1rem;
`;

const LoadingSpinner = ({ fullHeight = false, text = 'Loading...' }) => {
  return (
    <SpinnerWrapper $fullHeight={fullHeight}>
      <div>
        <Spinner />
        {text && <LoadingText>{text}</LoadingText>}
      </div>
    </SpinnerWrapper>
  );
};

export default LoadingSpinner;
