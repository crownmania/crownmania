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
  background-color: #001324;
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
  opacity: 0.06;
  pointer-events: none;
  background-color: #001324;
  mix-blend-mode: screen;
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
