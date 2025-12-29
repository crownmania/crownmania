import { createGlobalStyle } from 'styled-components';

export const GlobalStyles = createGlobalStyle`
  @font-face {
    font-family: 'Designer';
    src: local('Designer');
    font-weight: normal;
    font-style: normal;
  }

  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');

  :root {
    --dark-blue: rgb(2, 6, 23);
    --light-blue: #0066FF;
    --light-blue-rgb: 0, 102, 255;
    --white: #FFFFFF;
    --black: #000000;
    --font-primary: 'Designer', sans-serif;
    --font-secondary: 'Avenir Next', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  }

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  html {
    scroll-behavior: smooth;
  }

  body {
    font-family: 'Designer', sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    background-color: #000000;
    color: var(--white);
    line-height: 1.5;
    overflow-x: hidden;
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
  }

  img {
    max-width: 100%;
    height: auto;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
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
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .spin {
    animation: spin 1s linear infinite;
  }
`;
