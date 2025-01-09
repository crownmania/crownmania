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
  background-color: #000;
`;

const Background = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  background-image: url(${blueprintSvg});
  background-size: 40%;
  background-position: center;
  background-repeat: repeat;
  opacity: 0.3;
  pointer-events: none;
  background-color: #007CAD;
  mix-blend-mode: screen;
`;

const BackgroundBeams = () => {
  return (
    <BackgroundContainer>
      <Background />
    </BackgroundContainer>
  );
};

export default BackgroundBeams;
