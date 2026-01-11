import { createGlobalStyle } from 'styled-components';

export const GlobalStyles = createGlobalStyle`
  @font-face {
    font-family: 'Designer';
    src: url('/fonts/Designer.otf?v=1') format('opentype'),
         url('/fonts/Designer.otf?v=1') format('otf');
    font-weight: normal;
    font-style: normal;
    font-display: block;
  }

  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Source+Sans+Pro:wght@300;400;500;600&display=swap');

  :root {
    --dark-blue: rgb(2, 6, 23);
    --light-blue: #0066FF;
    --light-blue-rgb: 0, 102, 255;
    --white: #FFFFFF;
    --black: #000000;
    --font-primary: 'Designer', 'Arial Black', sans-serif;
    --font-secondary: 'Source Sans Pro', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    --title-glow: 0 0 10px rgba(255, 255, 255, 0.5);
  }

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  html {
    scroll-behavior: smooth;
    -webkit-text-size-adjust: 100%;
  }

  body {
    font-family: var(--font-secondary);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    background-color: #000000;
    color: var(--white);
    line-height: 1.6;
    overflow-x: hidden;
    -webkit-tap-highlight-color: transparent;
  }

  p, span, label, input, textarea, select {
    font-family: var(--font-secondary);
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
    font-family: 'Designer', sans-serif;
    font-weight: normal;
    letter-spacing: 0.1em;
  }

  a {
    color: inherit;
    text-decoration: none;
  }

  button {
    font-family: inherit;
    cursor: pointer;
    touch-action: manipulation;
  }

  img {
    max-width: 100%;
    height: auto;
  }

  /* Mobile-friendly button sizing */
  button, a[role="button"], input[type="submit"] {
    min-height: 44px;
    min-width: 44px;
  }

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
    animation: fadeIn 0.5s ease-in-out;
  }

  .slide-up {
    animation: slideUp 0.5s ease-in-out;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .spin {
    animation: spin 1s linear infinite;
  }

  /* Mobile Responsive Typography */
  @media (max-width: 768px) {
    html {
      font-size: 14px;
    }

    body {
      padding: 0;
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