import React from 'react';
import { createRoot } from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './App';

// Optional Sentry — active only when VITE_SENTRY_DSN is configured
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
  });
}

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
