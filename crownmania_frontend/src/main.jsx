import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Fonts: Using Google Fonts (Inter, Source Sans Pro) via GlobalStyles @import
// Designer font loaded from public/fonts/Designer.otf
// Avenir Next is a system font on macOS/iOS with fallback chain in GlobalStyles
// Web3 polyfills (buffer/stream) are installed lazily by
// utils/installWeb3Polyfills.js before the web3 SDK chunks load.

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
