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
  background: #000000;
`;

const BlueprintLayer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: url(${blueprintSvg});
  background-repeat: repeat;
  background-size: 600px auto;
  opacity: 0.35;
  pointer-events: none;
  z-index: -1;
  filter: invert(1) brightness(3) contrast(1.5); /* Makes blue lines white with much better visibility */
  mix-blend-mode: screen;
`;

const DotOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: radial-gradient(rgba(255, 255, 255, 0.2) 2px, transparent 2px);
  background-size: 40px 40px;
  mask-image: linear-gradient(to bottom, black 0%, transparent 80%);
  -webkit-mask-image: linear-gradient(to bottom, black 0%, transparent 80%);
  z-index: -1;
  pointer-events: none;
`;

const BackgroundBeams = () => {
  return (
    <BackgroundContainer>
      <BlueprintLayer />
      <DotOverlay />
    </BackgroundContainer>
  );
};

export default BackgroundBeams;
