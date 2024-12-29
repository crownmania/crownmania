import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const ImageContainer = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
`;

const StyledImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: ${props => props.isLoaded ? 1 : 0};
  transition: opacity 0.3s ease-in-out;
`;

const Placeholder = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(45deg, #1a1a1a, #2a2a2a);
  opacity: ${props => props.isLoaded ? 0 : 1};
  transition: opacity 0.3s ease-in-out;
`;

const ImageLoader = ({ src, alt, className }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(null);

  useEffect(() => {
    const img = new Image();
    img.src = src;
    img.onload = () => {
      setCurrentSrc(src);
      setIsLoaded(true);
    };
  }, [src]);

  return (
    <ImageContainer className={className}>
      <Placeholder isLoaded={isLoaded} />
      {currentSrc && (
        <StyledImage
          src={currentSrc}
          alt={alt}
          isLoaded={isLoaded}
          loading="lazy"
        />
      )}
    </ImageContainer>
  );
};

export default ImageLoader;
