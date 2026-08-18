// Web3Auth Configuration - npm SDK (@web3auth/modal v10)

// Vite's node-polyfills plugin provides its own `process` object that
// overwrites the index.html shim — and it lacks `nextTick`, which
// crashes Web3Auth's internal stream processing. Patch it here at
// module level so it's fixed before any dynamic import runs.
if (typeof process !== 'undefined' && typeof process.nextTick !== 'function') {
  process.nextTick = function (fn) {
    var args = Array.prototype.slice.call(arguments, 1);
    queueMicrotask(function () { fn.apply(null, args); });
  };
}

const isDev = import.meta.env.DEV;

// Check if we have the necessary keys
const HAS_WEB3_KEYS = Boolean(
  import.meta.env.VITE_WEB3AUTH_CLIENT_ID
);

const WEB3_ENABLED = HAS_WEB3_KEYS;

// iOS and many mobile browsers block popups, so we use redirect mode there.
// Desktop can use the cleaner popup mode.
const isMobile = typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const WEB3AUTH_UX_MODE = isMobile ? 'redirect' : 'popup';

// Lazy-initialized instance
let web3authInstance = null;
let moralisInstance = null;
let isInitialized = false;

// Mock Web3Auth for development without credentials
const mockWeb3Auth = {
  isMock: true,
  status: 'ready',
  connected: false,
  provider: null,
  init: async () => {
    if (isDev) console.warn('Web3Auth: Running in mock mode.');
    return Promise.resolve();
  },
  initModal: async () => {
    if (isDev) console.warn('Web3Auth: Running in mock mode.');
    return Promise.resolve();
  },
  connect: async () => {
    if (isDev) console.warn('Web3Auth: Mock connection activated.');
    mockWeb3Auth.connected = true;
    mockWeb3Auth.provider = {
      request: async ({ method }) => {
        if (method === 'eth_accounts') return ['0x1234567890123456789012345678901234567890'];
        if (method === 'personal_sign') return '0xmocksignature' + Math.random().toString(16).substring(2);
        return null;
      }
    };
    return mockWeb3Auth.provider;
  },
  logout: async () => {
    mockWeb3Auth.connected = false;
    mockWeb3Auth.provider = null;
    return Promise.resolve();
  },
  getUserInfo: async () => ({
    name: "Demo User",
    email: "demo@crownmania.com",
    verifier: "demo-verifier",
    verifierId: "demo-user"
  }),
};

// Initialize Web3Auth using the npm SDK (@web3auth/modal v10)
const getWeb3Auth = async () => {
  if (web3authInstance && isInitialized) {
    return web3authInstance;
  }

  const clientId = import.meta.env.VITE_WEB3AUTH_CLIENT_ID;

  if (!clientId) {
    if (isDev) console.warn('Web3Auth: No credentials, returning mock');
    return mockWeb3Auth;
  }

  try {
    // Dynamic import keeps the heavy SDK out of the initial bundle
    const { Web3Auth } = await import('@web3auth/modal');

    // Workaround for a v10 redirect-mode bug: the SDK persists the login
    // session (auth_store.sessionId) but not cachedConnector, and its
    // auto-reconnect only fires when cachedConnector === 'auth'. Restore
    // the pointer so init() rehydrates the session after the redirect.
    try {
      const authStore = JSON.parse(localStorage.getItem('auth_store') || '{}');
      if (authStore.sessionId) {
        const w3aState = JSON.parse(localStorage.getItem('Web3Auth-state') || '{}');
        if (!w3aState.cachedConnector) {
          w3aState.cachedConnector = 'auth';
          localStorage.setItem('Web3Auth-state', JSON.stringify(w3aState));
        }
      }
    } catch { /* non-fatal */ }

    const web3AuthNetwork = import.meta.env.VITE_WEB3AUTH_NETWORK || "sapphire_mainnet";
    const chainId = import.meta.env.VITE_WEB3_CHAIN_ID || "0x89";
    const rpcTarget = import.meta.env.VITE_WEB3_RPC_TARGET || "https://polygon-rpc.com";

    web3authInstance = new Web3Auth({
      clientId,
      web3AuthNetwork,
      defaultChainId: chainId,
      chains: [{
        chainNamespace: 'eip155',
        chainId,
        rpcTarget,
        displayName: 'Polygon Mainnet',
        blockExplorerUrl: 'https://polygonscan.com',
        ticker: 'MATIC',
        tickerName: 'Matic',
        logo: 'https://cryptologos.cc/logos/polygon-matic-logo.png',
      }],
      uiConfig: {
        uxMode: WEB3AUTH_UX_MODE,
      },
    });

    if (isDev) console.log('Web3Auth: Using network:', web3AuthNetwork, 'chain:', chainId);

    await web3authInstance.init();
    isInitialized = true;

    if (isDev) console.log('Web3Auth: Initialized successfully!');

    return web3authInstance;
  } catch (err) {
    console.error('Web3Auth initialization failed:', err);
    return mockWeb3Auth;
  }
};

// Initialize Moralis (lazy)
const initMoralis = async () => {
  if (!import.meta.env.VITE_MORALIS_API_KEY) {
    if (isDev) console.warn('Moralis: No API key, skipping.');
    return null;
  }

  // Use a global flag to prevent re-initialization during HMR
  if (window.__MORALIS_INITIALIZED__) {
    return moralisInstance;
  }

  if (!moralisInstance) {
    try {
      const Moralis = (await import('moralis')).default;

      // Check both our flag and Moralis internal state
      if (!window.__MORALIS_INITIALIZED__) {
        try {
          await Moralis.start({
            apiKey: import.meta.env.VITE_MORALIS_API_KEY
          });
          window.__MORALIS_INITIALIZED__ = true;
        } catch (e) {
          // If C0009 error (already started), just mark as initialized
          if (e.code === 'C0009' || e.message?.includes('started already')) {
            window.__MORALIS_INITIALIZED__ = true;
          } else {
            console.warn('Moralis start error:', e);
          }
        }
      }
      moralisInstance = Moralis;
      if (isDev) console.log('Moralis initialized successfully');
    } catch (err) {
      console.error('Failed to initialize Moralis:', err);
      return null;
    }
  }
  return moralisInstance;
};

// Check if Web3Auth modal is ready
const isWeb3AuthReady = () => isInitialized;

// Initialize Web3Auth (helper for hooks)
const initializeModal = async () => {
  if (isInitialized) return true;

  await getWeb3Auth();
  return isInitialized;
};

// Export for Moralis
const Moralis = {
  get instance() {
    return moralisInstance;
  }
};

// Unified getter for the instance
const getWeb3AuthInstance = () => {
  return web3authInstance || mockWeb3Auth;
};

// Proxy for backward compatibility
const web3auth = new Proxy(mockWeb3Auth, {
  get(target, prop) {
    const instance = web3authInstance || target;
    const value = instance[prop];
    if (typeof value === 'function') {
      return value.bind(instance);
    }
    return value;
  }
});

export {
  web3auth,
  Moralis,
  initMoralis,
  getWeb3Auth,
  initializeModal,
  isWeb3AuthReady,
  WEB3_ENABLED,
  getWeb3AuthInstance
};