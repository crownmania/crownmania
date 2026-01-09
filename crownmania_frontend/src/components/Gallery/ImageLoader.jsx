import React, { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';

const ImageContainer = styled.div`
  width: 100%;
  height: 100%;
  position: relative;
  background-color: #f0f0f0;
  overflow: hidden;
`;

const PlaceholderImage = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: #f0f0f0;
  filter: blur(10px);
  transform: scale(1.1);
  opacity: ${props => props.$isMainLoaded ? 0 : 1};
  transition: opacity 0.3s ease-in-out;
`;

const MainImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: ${props => props.$isLoaded ? 1 : 0};
  transition: opacity 0.3s ease-in-out;
`;

const ImageLoader = ({ src, alt, className, sizes = '100vw', placeholderSize = 10 }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [placeholderSrc, setPlaceholderSrc] = useState('');
  const imgRef = useRef(null);

  // Generate a tiny placeholder version of the image URL
  useEffect(() => {
    if (src && src.includes('firebasestorage.googleapis.com')) {
      // For Firebase Storage URLs, we can modify the URL to get a smaller version
      // This assumes we have properly structured URLs
      const placeholderUrl = src.includes('?')
        ? `${src}&w=${placeholderSize}`
        : `${src}?w=${placeholderSize}`;
      setPlaceholderSrc(placeholderUrl);
    } else {
      // For other URLs, we'll just use the original
      setPlaceholderSrc(src);
    }
  }, [src, placeholderSize]);

  // Handle main image loading
  const handleImageLoad = () => {
    setIsLoaded(true);
  };

  // Use intersection observer for lazy loading
  useEffect(() => {
    if (!imgRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            img.setAttribute('src', src);
            observer.unobserve(img);
          }
        });
      },
      {
        rootMargin: '200px', // Start loading when image is 200px from viewport
        threshold: 0.01
      }
    );

    observer.observe(imgRef.current);

    return () => {
      if (imgRef.current) {
        observer.unobserve(imgRef.current);
      }
    };
  }, [src]);

  return (
    <ImageContainer className={className}>
      {placeholderSrc && (
        <PlaceholderImage $isMainLoaded={isLoaded} />
      )}
      <MainImage
        ref={imgRef}
        data-src={src} // The real source will be set by the observer
        src="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==" // Tiny transparent placeholder
        alt={alt}
        onLoad={handleImageLoad}
        $isLoaded={isLoaded}
        loading="lazy"
        decoding="async"
        sizes={sizes}
      />
    </ImageContainer>
  );
};

export default React.memo(ImageLoader);
