import { useState, useEffect, useCallback, useRef } from 'react';
import { getWeb3Auth, initMoralis, initializeModal, isWeb3AuthReady, WEB3_ENABLED } from '../config/web3Config';

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

        console.log('[Web3Auth Hook] Starting initialization...');
        console.log('[Web3Auth Hook] WEB3_ENABLED check:', WEB3_ENABLED);

        // Get the Web3Auth instance (real or mock)
        const web3auth = await getWeb3Auth();
        web3authRef.current = web3auth;

        console.log('[Web3Auth Hook] Instance retrieved. isMock:', web3auth?.isMock);

        // Check if it's a mock instance
        if (!WEB3_ENABLED || web3auth?.isMock) {
          console.warn('[Web3Auth Hook] Running in MOCK mode. Modal will not appear.');
          setIsInitialized(true);
          setIsLoading(false);
          return;
        }

        console.log('[Web3Auth Hook] Calling initializeModal helper...');
        const modalReady = await initializeModal();
        console.log('[Web3Auth Hook] initializeModal result:', modalReady);

        // Initialize Moralis (optional, non-blocking)
        initMoralis().catch(err => console.warn('Moralis init failed:', err));

        setIsInitialized(true);

        // Check if already connected (for session persistence)
        if (web3auth.connected && web3auth.provider) {
          console.log('useWeb3Auth: Already connected, restoring session...');
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
    console.log('=== LOGIN ATTEMPT ===');
    console.log('isInitialized:', isInitialized);
    console.log('WEB3_ENABLED:', WEB3_ENABLED);

    if (!WEB3_ENABLED) {
      setError("Web3 features are not configured. Please set up VITE_WEB3AUTH_CLIENT_ID in your .env file.");
      return null;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Ensure we have a Web3Auth instance
      let web3auth = web3authRef.current;
      if (!web3auth || web3auth.isMock) {
        console.log('[Login] Getting fresh Web3Auth instance...');
        web3auth = await getWeb3Auth();
        web3authRef.current = web3auth;
      }

      if (!web3auth || web3auth.isMock) {
        // Log why we got a mock instance
        console.error('[Login] Web3Auth returned mock instance. Check browser console for initialization errors.');
        setError("Web3Auth initialization failed. Check browser console for details.");
        return null;
      }

      // Ensure modal is initialized before connecting
      if (!isWeb3AuthReady()) {
        console.log('[Login] Modal not ready, initializing...');
        await initializeModal();
      }

      console.log('[Login] Calling web3auth.connect()...');
      const web3authProvider = await web3auth.connect();
      console.log('[Login] connect() returned provider:', !!web3authProvider);

      if (!web3authProvider) {
        setError("Failed to connect. Please try again.");
        return null;
      }

      setProvider(web3authProvider);

      let userInfo;
      try {
        userInfo = await web3auth.getUserInfo();
        console.log('[Login] User info retrieved:', userInfo?.email || userInfo?.name || 'connected');
        setUser(userInfo);
      } catch (userErr) {
        console.warn('[Login] Could not get user info:', userErr);
        userInfo = { connected: true };
        setUser(userInfo);
      }

      // Initialize Web3 for blockchain interactions
      if (web3authProvider) {
        try {
          const Web3 = (await import('web3')).default;
          const web3Instance = new Web3(web3authProvider);
          setWeb3(web3Instance);
          console.log('[Login] Web3 instance created successfully');
        } catch (err) {
          console.warn('[Login] Web3 initialization failed:', err.message);
        }
      }

      setIsInitialized(true);
      return userInfo;
    } catch (err) {
      console.error("[Login] Failed:", err);
      // Don't show error if user closed the modal
      if (err.message && !err.message.includes('User closed') && !err.message.includes('user closed')) {
        setError(err.message || "Login failed. Please try again.");
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