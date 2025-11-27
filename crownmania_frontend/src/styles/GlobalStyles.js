import { createGlobalStyle } from 'styled-components';

export const GlobalStyles = createGlobalStyle`
  :root {
    --primary-color: #1a1a1a;
    --secondary-color: #333;
    --accent-color: #007bff;
    --text-color: #ffffff;
    --background-color: #121212;
  }

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  html {
    font-size: 16px;
    
    @media (max-width: 768px) {
      font-size: 14px;
    }
  }

  body {
    font-family: 'Inter', sans-serif;
    background-color: var(--background-color);
    color: var(--text-color);
    line-height: 1.6;
  }

  /* Mobile-first responsive design */
  .container {
    width: 100%;
    padding: 0 1rem;
    margin: 0 auto;

    @media (min-width: 640px) {
      max-width: 640px;
    }

    @media (min-width: 768px) {
      max-width: 768px;
    }

    @media (min-width: 1024px) {
      max-width: 1024px;
    }

    @media (min-width: 1280px) {
      max-width: 1280px;
    }
  }
`;
