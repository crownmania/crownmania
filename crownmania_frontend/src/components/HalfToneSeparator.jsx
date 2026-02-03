import { motion } from 'framer-motion';
import styled from 'styled-components';

/**
 * Expert UI Halftone Dot Pattern Gradient
 * 
 * Creates a beautiful transition from solid black to transparent
 * using a halftone dot pattern that fades via opacity gradient.
 */

const SeparatorContainer = styled.div`
  position: relative;
  width: 100%;
  height: 120px;
  z-index: 100;
  pointer-events: none;
  overflow: hidden;
`;

/**
 * The halftone dot pattern layer
 * Uses SVG radial gradient mask for smooth dot size transition
 */
const HalftoneLayer = styled.div`
  position: absolute;
  inset: 0;
  background: #000;
  
  /* Create the halftone dot pattern using radial-gradient */
  /* Each "dot" is a small circle that repeats in a grid */
  background-image: radial-gradient(
    circle at center,
    #000 2px,
    transparent 2px
  );
  background-size: 6px 6px;
  background-position: 0 0;
  
  /* Apply opacity mask that fades from top (opaque) to bottom (transparent) */
  /* This creates the gradient effect through the dot pattern */
  mask-image: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 1) 0%,
    rgba(0, 0, 0, 0.95) 10%,
    rgba(0, 0, 0, 0.85) 25%,
    rgba(0, 0, 0, 0.7) 40%,
    rgba(0, 0, 0, 0.5) 55%,
    rgba(0, 0, 0, 0.3) 70%,
    rgba(0, 0, 0, 0.15) 85%,
    rgba(0, 0, 0, 0.05) 95%,
    rgba(0, 0, 0, 0) 100%
  );
  -webkit-mask-image: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 1) 0%,
    rgba(0, 0, 0, 0.95) 10%,
    rgba(0, 0, 0, 0.85) 25%,
    rgba(0, 0, 0, 0.7) 40%,
    rgba(0, 0, 0, 0.5) 55%,
    rgba(0, 0, 0, 0.3) 70%,
    rgba(0, 0, 0, 0.15) 85%,
    rgba(0, 0, 0, 0.05) 95%,
    rgba(0, 0, 0, 0) 100%
  );
`;

/**
 * Solid black fill at top for seamless header connection
 */
const SolidTopFill = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 20px;
  background: #000;
  z-index: 2;
`;

/**
 * Secondary halftone layer with offset for denser pattern
 */
const HalftoneLayerOffset = styled.div`
  position: absolute;
  inset: 0;
  
  /* Offset dot pattern for richer halftone effect */
  background-image: radial-gradient(
    circle at center,
    #000 1.5px,
    transparent 1.5px
  );
  background-size: 6px 6px;
  background-position: 3px 3px; /* Offset by half the grid size */
  
  /* Same opacity gradient mask */
  mask-image: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 1) 0%,
    rgba(0, 0, 0, 0.9) 15%,
    rgba(0, 0, 0, 0.7) 35%,
    rgba(0, 0, 0, 0.45) 55%,
    rgba(0, 0, 0, 0.2) 75%,
    rgba(0, 0, 0, 0.05) 90%,
    rgba(0, 0, 0, 0) 100%
  );
  -webkit-mask-image: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 1) 0%,
    rgba(0, 0, 0, 0.9) 15%,
    rgba(0, 0, 0, 0.7) 35%,
    rgba(0, 0, 0, 0.45) 55%,
    rgba(0, 0, 0, 0.2) 75%,
    rgba(0, 0, 0, 0.05) 90%,
    rgba(0, 0, 0, 0) 100%
  );
`;

/**
 * Subtle accent line at the very top for visual definition
 */
const TopAccentLine = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.08) 20%,
    rgba(255, 255, 255, 0.08) 80%,
    transparent 100%
  );
  z-index: 3;
`;

/**
 * HalfToneSeparator Component
 * 
 * A visual separator that creates an expert-quality half-tone dot pattern
 * gradient effect between the header and content sections.
 * 
 * Features:
 * - Smooth opacity transition from solid to transparent
 * - Dual-layer halftone pattern for rich visual effect
 * - Seamless connection to solid black header
 * 
 * @param {Object} props
 * @param {string} props.className - Additional CSS class
 * @param {Object} props.style - Additional inline styles
 */
export default function HalfToneSeparator({ className, style }) {
  return (
    <SeparatorContainer className={className} style={style}>
      <SolidTopFill />
      <HalftoneLayer />
      <HalftoneLayerOffset />
      <TopAccentLine />
    </SeparatorContainer>
  );
}

/**
 * StickyHalfToneSeparator Component
 * 
 * A variant that sticks below the header and stays fixed during scroll,
 * creating a clean transition effect for content passing underneath.
 * 
 * @param {Object} props
 * @param {number} props.topOffset - Distance from top (default: 80px for header height)
 * @param {string} props.className - Additional CSS class
 */
export function StickyHalfToneSeparator({
  topOffset = 80,
  className,
  style
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, delay: 0.3 }}
      style={{
        position: 'fixed',
        top: `${topOffset}px`,
        left: 0,
        right: 0,
        width: '100%',
        zIndex: 1999,
        pointerEvents: 'none',
        ...style
      }}
      className={className}
    >
      <HalfToneSeparator />
    </motion.div>
  );
}

/**
 * AnimatedHalfToneSeparator Component
 * 
 * A variant with animated dot pattern that responds to scroll position.
 * 
 * @param {Object} props
 * @param {number} props.scrollProgress - Scroll progress value (0-1)
 * @param {string} props.className - Additional CSS class
 */
export function AnimatedHalfToneSeparator({
  scrollProgress = 0,
  className,
  style
}) {
  return (
    <SeparatorContainer className={className} style={style}>
      <SolidTopFill />
      <HalftoneLayer
        style={{
          opacity: 0.8 + (scrollProgress * 0.2)
        }}
      />
      <HalftoneLayerOffset
        style={{
          opacity: 0.6 + (scrollProgress * 0.3)
        }}
      />
      <TopAccentLine />
    </SeparatorContainer>
  );
}
