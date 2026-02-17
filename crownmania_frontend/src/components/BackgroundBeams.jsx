
import React, { useEffect, useRef } from 'react';
import styled, { keyframes } from 'styled-components';
import blueprintSvg from '../assets/crownmania_blueprint.svg';

const BackgroundContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background: #000000;
`;

// Keyframe animation for the stroke-dasharray circuit effect
const circuitFlow = keyframes`
  0% {
    stroke-dashoffset: 1000;
  }
  100% {
    stroke-dashoffset: 0;
  }
`;

const BlueprintLayer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: url("${blueprintSvg}");
  background-repeat: repeat;
  background-size: 600px auto;
  opacity: 0.045;
  pointer-events: none;
  
  /* Apply SVG stroke animation */
  svg path {
    stroke-dasharray: 100;
    animation: ${circuitFlow} 3s linear infinite;
  }
`;

const AnimatedSVGOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0.08;
  pointer-events: none;
  
  svg {
    width: 100%;
    height: 100%;
    
    path {
      fill: none;
      stroke: rgba(65, 105, 225, 0.6);
      stroke-width: 0.5;
      stroke-dasharray: 200 300;
      animation: ${circuitFlow} 8s linear infinite;
      
      &:nth-child(2n) {
        animation-duration: 6s;
        animation-delay: -2s;
      }
      
      &:nth-child(3n) {
        animation-duration: 10s;
        animation-delay: -4s;
      }
    }
  }
`;

/**
 * Single unified dot layer — draws ALL halftone dots on canvas
 * with a radial wave pulse that animates their opacity.
 * Replaces the old DotOverlay (static CSS) + DotWaveCanvas (animated canvas) combo.
 */
const UnifiedDotCanvas = () => {
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const DOT_SPACING = 20;
    const DOT_RADIUS = 1;
    const CYCLE_DURATION = 8000; // ms per single wave cycle
    const NUM_WAVES = 3;         // concurrent overlapping waves
    const RING_THICKNESS = 300;  // px — wave ring width
    const BASE_OPACITY = 0.08;   // resting dot brightness
    const WAVE_OPACITY = 0.30;   // peak brightness during wave

    let ox = window.innerWidth / 2;
    let landingCenterY = window.innerHeight / 2;
    let scrollY = 0;
    let maxRadius = 8000;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      ox = window.innerWidth / 2;
      landingCenterY = window.innerHeight / 2;
      // Max reach: diagonal from landing center to farthest scrollable point
      const pageHeight = document.documentElement.scrollHeight;
      const diag = Math.sqrt(window.innerWidth ** 2 + (pageHeight + window.innerHeight) ** 2);
      maxRadius = Math.max(diag, 8000);
    };
    resize();
    window.addEventListener('resize', resize);

    const onScroll = () => { scrollY = window.scrollY; };
    window.addEventListener('scroll', onScroll, { passive: true });

    const animate = (timestamp) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Wave origin in viewport coords
      const oy = landingCenterY - scrollY;

      // Compute each wave's current radius + cycle fade
      const waves = [];
      for (let w = 0; w < NUM_WAVES; w++) {
        const wt = ((timestamp / CYCLE_DURATION) + w / NUM_WAVES) % 1;
        const radius = wt * maxRadius;
        // Smooth fade: ramp in at start, fade out in last 30%
        const cycleFade = wt < 0.05 ? wt / 0.05 : wt > 0.7 ? (1 - wt) / 0.3 : 1;
        waves.push({ radius, cycleFade });
      }

      // Vertical fade: full opacity across 80% of viewport, then gentle falloff
      const verticalFade = (y) => {
        const ratio = y / canvas.height;
        if (ratio < 0.8) return 1;
        return 1 - (ratio - 0.8) / 0.2 * 0.9; // 1 → 0.1 over last 20%
      };

      for (let x = 0; x < canvas.width; x += DOT_SPACING) {
        // Column-level frustum cull: can ANY wave ring hit this column?
        const colDist = Math.abs(x - ox);
        let anyWaveCanHit = false;
        for (let w = 0; w < NUM_WAVES; w++) {
          if (colDist <= waves[w].radius + RING_THICKNESS) {
            anyWaveCanHit = true;
            break;
          }
        }

        for (let y = 0; y < canvas.height; y += DOT_SPACING) {
          const vFade = verticalFade(y);
          let alpha = BASE_OPACITY * vFade;

          // Check all waves — brightest one wins
          if (anyWaveCanHit) {
            const dist = Math.sqrt((x - ox) ** 2 + (y - oy) ** 2);

            for (let w = 0; w < NUM_WAVES; w++) {
              const ringDist = Math.abs(dist - waves[w].radius);
              if (ringDist < RING_THICKNESS) {
                const fade = 1 - (ringDist / RING_THICKNESS);
                const waveAlpha = fade * waves[w].cycleFade * WAVE_OPACITY * vFade;
                if (waveAlpha > alpha) alpha = waveAlpha;
              }
            }
          }

          if (alpha > 0.003) {
            ctx.beginPath();
            ctx.arc(x, y, DOT_RADIUS, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.fill();
          }
        }
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 1,
      }}
    />
  );
};

const BackgroundBeams = () => {
  return (
    <BackgroundContainer>
      <BlueprintLayer />
      <AnimatedSVGOverlay>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 461.04 1680" preserveAspectRatio="xMidYMid slice">
          <path d="M95.95 1434.72v-20.16c.255.636.444.641.512 1.629.323 4.714.398 12.723-.008 17.378-.063.726-.376.832-.504 1.153Z" />
          <path d="M188.542 148.32c.009.582-.679.871-1.203.957-1.152.189-7.659.154-8.405-.237-.321-.168-.352-.624-.467-.72 3.453.91 6.646.44 10.075 0Z" />
          <path d="M370.417 0c.027-.021-.059-.563.48-.48.1.49-.475.446-.48.48Z" />
          <path d="M127.134 1132.32c-.159.194-.926.335-.96.96l-1.377-.767c1.451-3.265-.67-13.654.651-16.039.522-.943 1.112.04 1.214.718.556 3.695-.235 9.02-.031 12.997.048.942.423 1.536.503 2.131Z" />
          <path d="M89.234 1116h-.48c.07-.068-.069-.456 0-.48.154-.054.37.063.48 0-.071.119.072.368 0 .48Z" />
          <path d="M193.819 1201.92c-.803-.883-.809-.418-1.439-1.92.874.9 1.077 1.511 1.439 1.92Z" />
          <path d="M389.557 1582.08c.096-.174.306-.384.48-.48-.033.009-.153.5-.48.48Z" />
        </svg>
      </AnimatedSVGOverlay>
      {/* Single unified dot layer — no more DotOverlay + DotWaveCanvas overlap */}
      <UnifiedDotCanvas />
    </BackgroundContainer>
  );
};

export default BackgroundBeams;
