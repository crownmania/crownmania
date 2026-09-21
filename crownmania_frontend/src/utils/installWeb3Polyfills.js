// Installs the Node-style globals that Web3Auth / web3 / moralis expect.
// Imported dynamically so the polyfill code stays out of the entry bundle —
// index.html provides a minimal inline shim until this runs.

let installed = false;
let installing = null;

export const installWeb3Polyfills = () => {
  if (installed) return Promise.resolve();
  if (installing) return installing;

  installing = Promise.all([
    import('buffer'),
    import('readable-stream'),
  ]).then(([{ Buffer }, { Readable, Writable, Duplex, Transform }]) => {
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

    installed = true;
  });

  return installing;
};
