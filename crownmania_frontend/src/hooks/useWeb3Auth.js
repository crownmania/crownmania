import { useState, useEffect, useCallback, useRef } from 'react';
import { getWeb3Auth, initMoralis, WEB3_ENABLED } from '../config/web3Config';

const useWeb3Auth = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [user, setUser] = useState(null);
  const [provider, setProvider] = useState(null);
  const [web3, setWeb3] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isWeb3Available, setIsWeb3Available] = useState(WEB3_ENABLED);

  const web3authRef = useRef(null);
  const initializingRef = useRef(false);

  // Initialize Web3Auth
  useEffect(() => {
    const init = async () => {
      // Prevent double initialization
      if (initializingRef.current || isInitialized) return;
      initializingRef.current = true;

      try {
        setIsLoading(true);
        setError(null);

        // Get the Web3Auth instance (real or mock)
        const web3auth = await getWeb3Auth();
        web3authRef.current = web3auth;

        // Check if it's a mock instance
        if (!WEB3_ENABLED) {
          console.log('Web3Auth: Running in demo mode (no credentials configured)');
          setIsInitialized(true);
          setIsLoading(false);
          return;
        }

        await web3auth.initModal();
        await initMoralis();
        setIsInitialized(true);

        // Check if already connected
        if (web3auth.connected && web3auth.provider) {
          setProvider(web3auth.provider);

          try {
            const userInfo = await web3auth.getUserInfo();
            setUser(userInfo);
          } catch (userErr) {
            console.warn('Could not get user info:', userErr);
            setUser({ connected: true });
          }

          // Initialize Web3 instance
          if (web3auth.provider) {
            try {
              const Web3 = (await import('web3')).default;
              const web3Instance = new Web3(web3auth.provider);
              setWeb3(web3Instance);
            } catch (err) {
              console.warn('Web3 initialization skipped:', err.message);
            }
          }
        }
      } catch (err) {
        console.error("Failed to initialize Web3Auth", err);
        // Don't set error for expected mock mode behavior
        if (WEB3_ENABLED) {
          setError(err.message || "Failed to initialize authentication");
        }
        setIsInitialized(true); // Still mark as initialized so UI can proceed
      } finally {
        setIsLoading(false);
        initializingRef.current = false;
      }
    };

    init();
  }, [isInitialized]);

  // Login with Web3Auth
  const login = useCallback(async () => {
    console.log('=== LOGIN DEBUG ===');
    console.log('isInitialized:', isInitialized);
    console.log('WEB3_ENABLED:', WEB3_ENABLED);
    console.log('web3authRef.current:', web3authRef.current);
    console.log('web3authRef.current?.isMock:', web3authRef.current?.isMock);

    if (!isInitialized) {
      setError("Authentication not initialized yet");
      return null;
    }

    if (!WEB3_ENABLED) {
      setError("Web3 features are not configured. Please set up VITE_WEB3AUTH_CLIENT_ID in your .env file.");
      return null;
    }

    const web3auth = web3authRef.current;
    if (!web3auth) {
      setError("Web3Auth not available");
      return null;
    }

    console.log('Calling web3auth.connect()...');
    try {
      setIsLoading(true);
      setError(null);

      const web3authProvider = await web3auth.connect();
      console.log('web3auth.connect() returned:', web3authProvider);
      setProvider(web3authProvider);

      let userInfo;
      try {
        userInfo = await web3auth.getUserInfo();
        setUser(userInfo);
      } catch (userErr) {
        console.warn('Could not get user info after login:', userErr);
        userInfo = { connected: true };
        setUser(userInfo);
      }

      if (web3authProvider) {
        try {
          const Web3 = (await import('web3')).default;
          const web3Instance = new Web3(web3authProvider);
          setWeb3(web3Instance);
        } catch (err) {
          console.warn('Web3 initialization failed:', err.message);
        }
      }

      return userInfo;
    } catch (err) {
      console.error("Login failed", err);
      // Don't show error if user closed the modal
      if (err.message && !err.message.includes('User closed')) {
        setError(err.message || "Login failed");
      }
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized]);

  // Logout
  const logout = useCallback(async () => {
    if (!isInitialized) return;

    const web3auth = web3authRef.current;
    if (!web3auth) return;

    try {
      setIsLoading(true);
      setError(null);
      await web3auth.logout();
      setProvider(null);
      setUser(null);
      setWeb3(null);
    } catch (err) {
      console.error("Logout failed", err);
      // Still clear state even if logout fails
      setProvider(null);
      setUser(null);
      setWeb3(null);
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized]);

  // Get user's wallet address
  const getAddress = useCallback(async () => {
    if (!web3) {
      // Try to get from provider directly
      if (provider && provider.request) {
        try {
          const accounts = await provider.request({ method: 'eth_accounts' });
          return accounts[0] || null;
        } catch (err) {
          console.error("Failed to get address from provider:", err);
          return null;
        }
      }
      return null;
    }
    try {
      const accounts = await web3.eth.getAccounts();
      return accounts[0] || null;
    } catch (err) {
      console.error("Failed to get address", err);
      return null;
    }
  }, [web3, provider]);

  // Get balance
  const getBalance = useCallback(async () => {
    if (!web3) return null;
    try {
      const address = await getAddress();
      if (!address) return null;
      const balance = await web3.eth.getBalance(address);
      return web3.utils.fromWei(balance, 'ether');
    } catch (err) {
      console.error("Failed to get balance", err);
      return null;
    }
  }, [web3, getAddress]);

  // Sign a message
  const signMessage = useCallback(async (message) => {
    if (!web3 && !provider) {
      setError("Web3 not initialized");
      return null;
    }

    try {
      setIsLoading(true);
      const address = await getAddress();
      if (!address) throw new Error("Could not get wallet address");

      let signature;
      if (web3) {
        signature = await web3.eth.personal.sign(message, address, "");
      } else {
        // Fallback to provider request
        signature = await provider.request({
          method: 'personal_sign',
          params: [message, address],
        });
      }
      return signature;
    } catch (err) {
      console.error("Signing failed", err);
      setError(err.message || "Failed to sign message");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [web3, provider, getAddress]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isInitialized,
    isWeb3Available,
    user,
    provider,
    web3,
    isLoading,
    error,
    login,
    logout,
    getAddress,
    getBalance,
    signMessage,
    clearError
  };
};

export default useWeb3Auth;
