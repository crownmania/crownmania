import React from 'react';
import styled from 'styled-components';

const ButtonWrapper = styled.button`
  position: relative;
  height: 48px;
  overflow: hidden;
  border-radius: 9999px;
  padding: 1px;
  outline: none;
  transition: all 0.3s ease;
  background: conic-gradient(
    from 90deg at 50% 50%,
    #E2CBFF 0%,
    #393BB2 50%,
    #E2CBFF 100%
  );

  &:focus {
    box-shadow: 0 0 0 2px rgba(148, 163, 184, 0.4),
                0 0 0 4px rgba(148, 163, 184, 0.1);
  }

  @keyframes borderRotate {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 9999px;
    padding: 1px;
    background: inherit;
    animation: borderRotate 4s linear infinite;
  }
`;

const ButtonContent = styled.span`
  position: relative;
  display: flex;
  height: 100%;
  width: 100%;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  background-color: rgb(2, 6, 23);
  padding: 0.75rem 1.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: white;
  backdrop-filter: blur-3xl;
  transition: all 0.3s ease;
  z-index: 1;

  &:hover {
    background-color: rgba(2, 6, 23, 0.8);
  }
`;

const GlowButton = ({ children, onClick, className }) => {
  return (
    <ButtonWrapper onClick={onClick} className={className}>
      <ButtonContent>
        {children}
      </ButtonContent>
    </ButtonWrapper>
  );
};

export default GlowButton;
