import { createGlobalStyle } from 'styled-components';

export const GlobalStyles = createGlobalStyle`
  :root {
    --dark-blue: #001428;
    --light-blue: #00A6FB;
    --text-color: #FFFFFF;
    --section-spacing: 100vh;
  }

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    color: var(--text-color);
    background-color: var(--dark-blue);
    font-family: 'Avenir Next Regular', sans-serif;
    text-transform: uppercase;
    font-size: 0.9rem;
    letter-spacing: 0.1em;
    overflow-x: hidden;
  }

  h1, h2, h3, h4, h5, h6 {
    font-family: 'Designer', sans-serif;
    text-transform: none;
    letter-spacing: 0.05em;
  }

  p, a, button, input, textarea {
    font-family: 'Avenir Next Regular', sans-serif;
    text-transform: uppercase;
  }

  .blueprint-bg {
    background-image: url('/blueprint-bg.png');
    background-size: cover;
    background-repeat: no-repeat;
    background-position: center;
  }
`;
