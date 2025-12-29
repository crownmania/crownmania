// Web3Auth and Moralis configuration
// These are lazy-loaded to prevent crashes when env vars are missing

// Check if we're in development mode
const isDev = import.meta.env.DEV;

// Check if we have the necessary keys for real Web3Auth
const HAS_WEB3_KEYS = Boolean(
  import.meta.env.VITE_WEB3AUTH_CLIENT_ID &&
  import.meta.env.VITE_WEB3_RPC_TARGET
);

// Web3 features are only enabled if we have the necessary keys
const WEB3_ENABLED = HAS_WEB3_KEYS;

// Only log in development mode
if (isDev) {
  console.log('Web3Auth config:', { WEB3_ENABLED, HAS_WEB3_KEYS });
}

// Lazy-initialized instances
let web3authInstance = null;
let moralisInstance = null;

// Create a mock Web3Auth instance for when Web3 is disabled
const mockWeb3Auth = {
  isMock: true,
  connected: false,
  provider: null,
  initModal: async () => {
    if (isDev) {
      console.warn('Web3Auth: Running in mock mode. Set VITE_WEB3AUTH_CLIENT_ID for full functionality.');
    }
    return Promise.resolve();
  },
  connect: async () => {
    if (isDev) {
      console.warn('Web3Auth: Mock connection activated.');
    }
    // Simulate a successful login for demo purposes
    mockWeb3Auth.connected = true;
    return {
      request: async ({ method }) => {
        if (method === 'eth_accounts') return ['0x1234567890123456789012345678901234567890'];
        return null;
      }
    };
  },
  logout: async () => {
    mockWeb3Auth.connected = false;
    return Promise.resolve();
  },
  getUserInfo: async () => ({
    name: "Demo User",
    email: "demo@crownmania.com",
    verifier: "demo-verifier",
    verifierId: "demo-user"
  }),
  signMessage: async (message) => {
    if (isDev) {
      console.warn('Web3Auth: Mock signing message');
    }
    return "0xmocksignature" + Math.random().toString(16).substring(2);
  },
};

// Get or initialize Web3Auth instance
const getWeb3Auth = async () => {
  // Dynamically check for keys every time (in case of hot reload or delayed env loading)
  const hasClientId = Boolean(import.meta.env.VITE_WEB3AUTH_CLIENT_ID);
  const hasRpcTarget = Boolean(import.meta.env.VITE_WEB3_RPC_TARGET);
  const hasKeys = hasClientId && hasRpcTarget;

  if (!hasKeys) {
    if (isDev) {
      console.warn('Web3Auth: No credentials found, returning mock');
    }
    return mockWeb3Auth;
  }

  if (!web3authInstance) {
    try {
      const { Web3Auth } = await import('@web3auth/modal');
      const { CHAIN_NAMESPACES } = await import('@web3auth/base');

      const clientId = import.meta.env.VITE_WEB3AUTH_CLIENT_ID;
      const rpcTarget = import.meta.env.VITE_WEB3_RPC_TARGET;

      web3authInstance = new Web3Auth({
        clientId: clientId,
        chainConfig: {
          chainNamespace: CHAIN_NAMESPACES.EIP155,
          chainId: "0x1", // Ethereum Mainnet
          rpcTarget: rpcTarget,
          displayName: "Ethereum Mainnet",
          blockExplorerUrl: "https://etherscan.io",
          ticker: "ETH",
          tickerName: "Ethereum"
        },
        web3AuthNetwork: "sapphire_mainnet", // Use sapphire_mainnet for production
        uiConfig: {
          appName: "Crownmania",
          theme: {
            primary: "#00c8ff",
          },
          mode: "dark",
          logoLight: "https://crownmania.com/logo.png",
          logoDark: "https://crownmania.com/logo.png",
          defaultLanguage: "en",
          loginGridCol: 3,
          primaryButton: "socialLogin",
        }
      });

      if (isDev) {
        console.log('Web3Auth instance created successfully');
      }
    } catch (err) {
      console.error('Failed to initialize Web3Auth:', err);
      return mockWeb3Auth;
    }
  }
  return web3authInstance;
};

// For backward compatibility - returns mock by default, real instance after getWeb3Auth() is called
const web3auth = new Proxy(mockWeb3Auth, {
  get(target, prop) {
    if (web3authInstance) {
      return web3authInstance[prop];
    }
    return target[prop];
  }
});

// Initialize Moralis (lazy)
const initMoralis = async () => {
  if (!import.meta.env.VITE_MORALIS_API_KEY) {
    if (isDev) {
      console.warn('Moralis: Running in mock mode. Set VITE_MORALIS_API_KEY for full functionality.');
    }
    return null;
  }

  if (!moralisInstance) {
    try {
      const Moralis = (await import('moralis')).default;
      await Moralis.start({
        apiKey: import.meta.env.VITE_MORALIS_API_KEY
      });
      moralisInstance = Moralis;
      if (isDev) {
        console.log('Moralis initialized successfully');
      }
    } catch (err) {
      console.error('Failed to initialize Moralis:', err);
      return null;
    }
  }
  return moralisInstance;
};

// Export a getter for Moralis
const Moralis = {
  get instance() {
    return moralisInstance;
  }
};

export { web3auth, Moralis, initMoralis, getWeb3Auth, WEB3_ENABLED };