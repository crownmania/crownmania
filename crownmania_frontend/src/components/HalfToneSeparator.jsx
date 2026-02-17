import { motion } from 'framer-motion';
import styled from 'styled-components';

/**
 * Gradient Fade Separator
 * 
 * Creates a smooth transparent transition from the header to content
 * allowing items to disappear seamlessly underneath.
 */

const SeparatorContainer = styled.div`
  position: relative;
  width: 100%;
  height: 60px; /* Slightly taller for smoother fade */
  z-index: 100;
  pointer-events: none;
  overflow: hidden;
`;

/**
 * The gradient layer
 * Creates a clean fade to black without visible dots
 */
const FadeLayer = styled.div`
  position: absolute;
  inset: 0;
  background: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 0.15) 0%,
    rgba(0, 0, 0, 0.08) 40%,
    transparent 100%
  );
`;

/**
 * Subtle top accent — no more solid black fill
 */
const SolidTopFill = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: rgba(255, 255, 255, 0.03);
  z-index: 2;
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
    rgba(255, 255, 255, 0.05) 20%,
    rgba(255, 255, 255, 0.05) 80%,
    transparent 100%
  );
  z-index: 3;
`;

/**
 * HalfToneSeparator Component (Renamed internally to GradientFade but kept export for compatibility)
 */
export default function HalfToneSeparator({ className, style }) {
  return (
    <SeparatorContainer className={className} style={style}>
      <SolidTopFill />
      <FadeLayer />
      <TopAccentLine />
    </SeparatorContainer>
  );
}

/**
 * StickyHalfToneSeparator Component
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
 * Simplified for gradient version
 */
export function AnimatedHalfToneSeparator({
  scrollProgress = 0,
  className,
  style
}) {
  return (
    <SeparatorContainer className={className} style={style}>
      <SolidTopFill />
      <FadeLayer
        style={{
          opacity: 0.8 + (scrollProgress * 0.2)
        }}
      />
      <TopAccentLine />
    </SeparatorContainer>
  );
}
