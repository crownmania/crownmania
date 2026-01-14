// Polyfill Buffer and Stream for Web3Auth
import { Buffer } from 'buffer';
import { Readable, Writable, Duplex, Transform } from 'readable-stream';

window.Buffer = Buffer;

// Polyfill stream.finished for end-of-stream module
const streamFinished = (stream, opts, callback) => {
  if (typeof opts === 'function') {
    callback = opts;
    opts = {};
  }
  opts = opts || {};

  const readable = opts.readable ?? stream.readable !== false;
  const writable = opts.writable ?? stream.writable !== false;

  const onClose = () => {
    callback(null);
  };

  const onError = (err) => {
    callback(err);
  };

  const onFinish = () => {
    if (writable) {
      stream.removeListener('close', onClose);
    }
    callback(null);
  };

  const onEnd = () => {
    if (readable) {
      stream.removeListener('close', onClose);
    }
    callback(null);
  };

  if (readable) stream.on('end', onEnd);
  if (writable) stream.on('finish', onFinish);
  stream.on('error', onError);
  stream.on('close', onClose);

  return () => {
    stream.removeListener('end', onEnd);
    stream.removeListener('finish', onFinish);
    stream.removeListener('error', onError);
    stream.removeListener('close', onClose);
  };
};

// Attach to stream modules
if (Readable && !Readable.finished) {
  Readable.finished = streamFinished;
}

// Make stream available globally for modules that expect it
window.stream = {
  Readable,
  Writable,
  Duplex,
  Transform,
  finished: streamFinished
};

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Fonts: Using Google Fonts (Inter, Source Sans Pro) via GlobalStyles @import
// Designer font loaded from public/fonts/Designer.otf
// Avenir Next is a system font on macOS/iOS with fallback chain in GlobalStyles

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
