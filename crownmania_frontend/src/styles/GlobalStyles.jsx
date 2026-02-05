import { createGlobalStyle } from 'styled-components';
import blueprintBg from '../assets/crownmania_blueprint.svg';

export const GlobalStyles = createGlobalStyle`

  :root {
    /* Colors - Royal Blue Vault Palette */
    --bg-deep: #000000;
    --bg-vault: rgba(0, 5, 25, 0.85); /* Slightly blueish dark background */
    --vault-border: rgba(65, 105, 225, 0.15);
    --vault-accent: #4169E1; /* Royal Blue */
    --vault-accent-bright: #6B8DD6;
    --vault-accent-rgb: 65, 105, 225;
    --vault-success: #34C759;
    --vault-error: #FF3B30;
    --vault-glow: rgba(65, 105, 225, 0.25);
    
    /* Legacy compatibility */
    --dark-blue: #00050f;
    --light-blue: var(--vault-accent);
    --light-blue-rgb: var(--vault-accent-rgb);
    --white: #FFFFFF;
    --black: #000000;
    
    /* Typography */
    --font-primary: 'Designer', 'Arial Black', sans-serif;
    --font-secondary: 'Inter', -apple-system, BlinkMacSystemFont, 'Avenir Next', sans-serif;
    --font-avenir: 'Avenir Next', sans-serif;
    
    /* Effects */
    --title-glow: 0 0 10px rgba(0, 242, 255, 0.2), 0 0 20px rgba(0, 242, 255, 0.1);
    --glass-blur: blur(20px) saturate(120%);
    --glass-border: 1px solid var(--vault-border);
    --vault-shadow: 0 10px 40px rgba(0, 0, 0, 0.8);
  }

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  html {
    scroll-behavior: smooth;
    -webkit-text-size-adjust: 100%;
    background-color: var(--bg-deep);
  }

  body {
    font-family: var(--font-secondary);
    background-color: var(--bg-deep);
    color: var(--white);
    line-height: 1.6;
    overflow-x: hidden;
    -webkit-tap-highlight-color: transparent;
  }

  /* Blueprint background moved to BackgroundBeams.jsx */

  p, label, input, textarea, select {
    font-family: var(--font-secondary);
  }

  span {
    font-family: inherit;
  }

  #root {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  main {
    flex: 1;
  }

  h1, h2, h3, h4, h5, h6 {
    font-family: var(--font-primary);
    font-weight: normal;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    text-shadow: 0 0 15px rgba(255, 255, 255, 0.2);
  }

  a {
    color: inherit;
    text-decoration: none;
    transition: opacity 0.2s ease;
  }
  
  a:hover {
    opacity: 0.8;
  }

  button {
    font-family: inherit;
    cursor: pointer;
    touch-action: manipulation;
    border: none;
    outline: none;
    background: none;
  }

  img {
    max-width: 100%;
    height: auto;
  }

  /* Utility: Glassmorphism */
  .glass-panel {
    background: var(--bg-vault);
    backdrop-filter: var(--glass-blur);
    border: var(--glass-border);
    box-shadow: var(--vault-shadow);
  }

  /* Animations - Refined */
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes slideUp {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  .fade-in {
    animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  .slide-up {
    animation: slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }

  /* Mobile Responsive Typography */
  @media (max-width: 768px) {
    html {
      font-size: 14px;
    }
  }

  @media (max-width: 480px) {
    html {
      font-size: 13px;
    }
  }

  /* Safe area insets for notched phones */
  @supports (padding: max(0px)) {
    body {
      padding-left: max(0px, env(safe-area-inset-left));
      padding-right: max(0px, env(safe-area-inset-right));
    }
  }
`;
