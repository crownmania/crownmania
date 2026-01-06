// Web3Auth Configuration - CDN Version (v8.12.4)
// Uses window.Modal and window.EthereumProvider from CDN

const isDev = import.meta.env.DEV;

// Check if we have the necessary keys
const HAS_WEB3_KEYS = Boolean(
  import.meta.env.VITE_WEB3AUTH_CLIENT_ID &&
  import.meta.env.VITE_WEB3_RPC_TARGET
);

const WEB3_ENABLED = HAS_WEB3_KEYS;

if (isDev) {
  console.log('Web3Auth config:', { WEB3_ENABLED, HAS_WEB3_KEYS });
}

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

// Wait for CDN to load
const waitForCDN = (timeout = 15000) => {
  return new Promise((resolve) => {
    const startTime = Date.now();

    const checkInterval = setInterval(() => {
      // Check for the CDN globals
      const hasModal = window.Modal && window.Modal.Web3Auth;
      const hasProvider = window.EthereumProvider && window.EthereumProvider.EthereumPrivateKeyProvider;

      if (hasModal && hasProvider) {
        clearInterval(checkInterval);
        if (isDev) console.log('Web3Auth CDN loaded successfully (Modal + Provider)');
        resolve(true);
      } else if (Date.now() - startTime > timeout) {
        clearInterval(checkInterval);
        console.error('Web3Auth CDN timeout', { hasModal, hasProvider });
        resolve(false);
      }
    }, 100);
  });
};

// Initialize Web3Auth from CDN
const getWeb3Auth = async () => {
  const hasClientId = Boolean(import.meta.env.VITE_WEB3AUTH_CLIENT_ID);
  const hasRpcTarget = Boolean(import.meta.env.VITE_WEB3_RPC_TARGET);
  const hasKeys = hasClientId && hasRpcTarget;

  if (isDev) {
    console.log('Web3Auth getWeb3Auth:', { hasClientId, hasRpcTarget, hasKeys });
  }

  if (!hasKeys) {
    if (isDev) console.warn('Web3Auth: No credentials, returning mock');
    return mockWeb3Auth;
  }

  if (web3authInstance && isInitialized) {
    return web3authInstance;
  }

  try {
    if (isDev) console.log('Web3Auth: Waiting for CDN...');

    const cdnLoaded = await waitForCDN();

    if (!cdnLoaded) {
      console.error('Web3Auth: CDN failed to load');
      return mockWeb3Auth;
    }

    // Get classes from CDN globals
    const { Web3Auth } = window.Modal;
    const { EthereumPrivateKeyProvider } = window.EthereumProvider;

    const clientId = import.meta.env.VITE_WEB3AUTH_CLIENT_ID;
    const rpcTarget = import.meta.env.VITE_WEB3_RPC_TARGET;
    const chainId = import.meta.env.VITE_WEB3_CHAIN_ID || "0x89";

    if (isDev) {
      console.log('Web3Auth: ClientID:', clientId?.substring(0, 20) + '...');
      console.log('Web3Auth: RPC:', rpcTarget);
      console.log('Web3Auth: ChainID:', chainId);
    }

    // Chain configurations
    const chainNames = {
      "0x1": { name: "Ethereum Mainnet", explorer: "https://etherscan.io", ticker: "ETH", tickerName: "Ethereum" },
      "0x89": { name: "Polygon Mainnet", explorer: "https://polygonscan.com", ticker: "MATIC", tickerName: "Polygon" },
      "0x38": { name: "BNB Smart Chain", explorer: "https://bscscan.com", ticker: "BNB", tickerName: "BNB" },
    };

    const chainInfo = chainNames[chainId] || chainNames["0x89"];

    const chainConfig = {
      chainNamespace: "eip155",
      chainId: chainId,
      rpcTarget: rpcTarget,
      displayName: chainInfo.name,
      blockExplorer: chainInfo.explorer,
      ticker: chainInfo.ticker,
      tickerName: chainInfo.tickerName
    };

    // Create the private key provider
    const privateKeyProvider = new EthereumPrivateKeyProvider({
      config: { chainConfig }
    });

    if (isDev) console.log('Web3Auth: Provider created, creating Web3Auth instance...');

    // Use environment variable for network, default to sapphire_devnet for testing
    const web3AuthNetwork = import.meta.env.VITE_WEB3AUTH_NETWORK || "sapphire_devnet";

    web3authInstance = new Web3Auth({
      clientId,
      web3AuthNetwork,
      privateKeyProvider,
    });

    if (isDev) console.log('Web3Auth: Using network:', web3AuthNetwork);

    await web3authInstance.initModal();
    isInitialized = true;

    if (isDev) console.log('Web3Auth: Modal initialized successfully!');

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

  if (!moralisInstance) {
    try {
      const Moralis = (await import('moralis')).default;
      await Moralis.start({
        apiKey: import.meta.env.VITE_MORALIS_API_KEY
      });
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

// Initialize the modal (helper for hooks)
const initializeModal = async () => {
  if (isInitialized) return true;

  const web3auth = await getWeb3Auth();
  return !web3auth.isMock && isInitialized;
};

// Export for Moralis
const Moralis = {
  get instance() {
    return moralisInstance;
  }
};

// Proxy for backward compatibility
const web3auth = new Proxy(mockWeb3Auth, {
  get(target, prop) {
    if (web3authInstance) {
      return web3authInstance[prop];
    }
    return target[prop];
  }
});

export { web3auth, Moralis, initMoralis, getWeb3Auth, initializeModal, isWeb3AuthReady, WEB3_ENABLED };