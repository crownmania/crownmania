import { useState, useEffect, useCallback, useRef } from 'react';
import { getWeb3Auth, initMoralis, initializeModal, isWeb3AuthReady, WEB3_ENABLED } from '../config/web3Config';

const useWeb3Auth = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [user, setUser] = useState(null);
  const [provider, setProvider] = useState(null);
  const [web3, setWeb3] = useState(null);
  const [walletAddress, setWalletAddress] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isWeb3Available, setIsWeb3Available] = useState(WEB3_ENABLED);

  const web3authRef = useRef(null);
  const initializingRef = useRef(false);

  // Helper to fetch address
  const fetchAddress = useCallback(async (currentProvider, currentWeb3) => {
    if (currentWeb3) {
      try {
        const accounts = await currentWeb3.eth.getAccounts();
        return accounts[0] || null;
      } catch (err) {
        console.error("[useWeb3Auth] Failed to get address from web3:", err);
      }
    }
    if (currentProvider && currentProvider.request) {
      try {
        const accounts = await currentProvider.request({ method: 'eth_accounts' });
        return accounts[0] || null;
      } catch (err) {
        console.error("[useWeb3Auth] Failed to get address from provider:", err);
      }
    }
    return null;
  }, []);

  // Initialize Web3Auth
  useEffect(() => {
    const init = async () => {
      if (initializingRef.current || isInitialized) return;
      initializingRef.current = true;

      try {
        setIsLoading(true);
        setError(null);

        const web3auth = await getWeb3Auth();
        web3authRef.current = web3auth;

        if (!WEB3_ENABLED || web3auth?.isMock) {
          setIsInitialized(true);
          setIsLoading(false);
          return;
        }

        await initializeModal();

        // Optional Moralis init
        initMoralis().catch(err => console.warn('Moralis init failed:', err));

        if (web3auth.connected && web3auth.provider) {
          setProvider(web3auth.provider);

          try {
            const userInfo = await web3auth.getUserInfo();
            setUser(userInfo);
          } catch (userErr) {
            setUser({ connected: true });
          }

          // Initialize Web3 instance
          let web3Instance = null;
          try {
            const Web3 = (await import('web3')).default;
            web3Instance = new Web3(web3auth.provider);
            setWeb3(web3Instance);
          } catch (err) {
            console.warn('Web3 initialization skipped:', err.message);
          }

          // Initial address fetch
          const address = await fetchAddress(web3auth.provider, web3Instance);
          setWalletAddress(address);
        }

        setIsInitialized(true);
      } catch (err) {
        if (WEB3_ENABLED) {
          setError(err.message || "Failed to initialize authentication");
        }
        setIsInitialized(true);
      } finally {
        setIsLoading(false);
        initializingRef.current = false;
      }
    };

    init();
  }, [isInitialized, fetchAddress]);

  // Login
  const login = useCallback(async () => {
    if (!WEB3_ENABLED) {
      setError("Web3 features are not configured.");
      return null;
    }

    try {
      setIsLoading(true);
      setError(null);

      let web3auth = web3authRef.current;
      if (!web3auth || web3auth.isMock) {
        web3auth = await getWeb3Auth();
        web3authRef.current = web3auth;
      }

      if (!web3auth || web3auth.isMock) {
        setError("Web3Auth initialization failed.");
        return null;
      }

      if (!isWeb3AuthReady()) {
        await initializeModal();
      }

      const web3authProvider = await web3auth.connect();
      if (!web3authProvider) {
        setError("Failed to connect.");
        return null;
      }

      setProvider(web3authProvider);

      let userInfo;
      try {
        userInfo = await web3auth.getUserInfo();
        setUser(userInfo);
      } catch (userErr) {
        userInfo = { connected: true };
        setUser(userInfo);
      }

      let web3Instance = null;
      try {
        const Web3 = (await import('web3')).default;
        web3Instance = new Web3(web3authProvider);
        setWeb3(web3Instance);
      } catch (err) {
        console.warn('Web3 login initialization failed:', err.message);
      }

      const address = await fetchAddress(web3authProvider, web3Instance);
      setWalletAddress(address);

      return userInfo;
    } catch (err) {
      if (err.message && !err.message.toLowerCase().includes('closed')) {
        setError(err.message || "Login failed.");
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [fetchAddress]);

  // Logout
  const logout = useCallback(async () => {
    const web3auth = web3authRef.current;
    if (!web3auth) return;

    try {
      setIsLoading(true);
      await web3auth.logout();
    } catch (err) {
      console.error("Logout failed", err);
    } finally {
      setProvider(null);
      setUser(null);
      setWeb3(null);
      setWalletAddress(null);
      setIsLoading(false);
    }
  }, []);

  // Sign Message
  const signMessage = useCallback(async (message) => {
    if (!web3 && !provider) {
      setError("Web3 not initialized");
      return null;
    }

    try {
      setIsLoading(true);
      const address = walletAddress || await fetchAddress(provider, web3);
      if (!address) throw new Error("Could not get wallet address");

      let signature;
      if (web3) {
        signature = await web3.eth.personal.sign(message, address, "");
      } else {
        signature = await provider.request({
          method: 'personal_sign',
          params: [message, address],
        });
      }
      return signature;
    } catch (err) {
      setError(err.message || "Failed to sign message");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [web3, provider, walletAddress, fetchAddress]);

  const clearError = useCallback(() => setError(null), []);

  return {
    isInitialized,
    isWeb3Available,
    user,
    provider,
    web3,
    walletAddress,
    isLoading,
    error,
    login,
    logout,
    getAddress: () => Promise.resolve(walletAddress),
    getBalance: async () => {
      if (!web3 || !walletAddress) return null;
      try {
        const balance = await web3.eth.getBalance(walletAddress);
        return web3.utils.fromWei(balance, 'ether');
      } catch (err) {
        return null;
      }
    },
    signMessage,
    clearError
  };
};

export default useWeb3Auth;