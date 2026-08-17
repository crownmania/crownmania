// Custom process shim that properly exposes nextTick as a named export.
// The default `process` npm package browser build sets nextTick on its
// exports object, but Vite/Rollup wraps it in an ES module namespace,
// so `import process from 'process'` gives a namespace where
// `process.nextTick` is undefined (it's at `process.default.nextTick`).
// This shim flattens the interop so nextTick is directly accessible.

function nextTick(fn) {
  var args = Array.prototype.slice.call(arguments, 1);
  queueMicrotask(function () { fn.apply(null, args); });
}

var processObj = {
  env: {},
  version: '',
  versions: {},
  browser: true,
  title: 'browser',
  argv: [],
  cwd: function () { return '/'; },
  nextTick: nextTick,
  on: function () {},
  addListener: function () {},
  once: function () {},
  off: function () {},
  removeListener: function () {},
  removeAllListeners: function () {},
  emit: function () {},
  prependListener: function () {},
  prependOnceListener: function () {},
  listeners: function () { return []; },
  binding: function () { throw new Error('process.binding is not supported'); },
  chdir: function () { throw new Error('process.chdir is not supported'); },
  umask: function () { return 0; },
};

export default processObj;
export { nextTick, processObj as process };
