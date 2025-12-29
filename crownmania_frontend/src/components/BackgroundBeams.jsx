import React from 'react';
import styled from 'styled-components';
import blueprintSvg from '../assets/crownmania_blueprint.svg';

const BackgroundContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  z-index: -1;
  overflow: hidden;
  background: radial-gradient(circle at center, #0f172a 0%, #000000 100%);
`;

const Background = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  background-image: url(${blueprintSvg});
  background-size: 33%;
  background-position: center;
  background-repeat: repeat;
  opacity: 0.05;
  pointer-events: none;
  background-color: transparent;
  transform: none;
`;

const BackgroundBeams = () => {
  return (
    <BackgroundContainer>
      <Background />
    </BackgroundContainer>
  );
};

export default BackgroundBeams;
