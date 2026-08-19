import { useState, useEffect, useCallback, useRef } from 'react';
import { getWeb3Auth, initMoralis, initializeModal, isWeb3AuthReady, WEB3_ENABLED } from '../config/web3Config';

// Security configuration constants
const SECURITY_CONFIG = {
  HEARTBEAT_INTERVAL: 15000, // 15 seconds
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutes
  MAX_RECONNECT_ATTEMPTS: 3,
  RECONNECT_DELAY: 2000, // 2 seconds
  NONCE_EXPIRY: 5 * 60 * 1000, // 5 minutes
};

// Detect whether the URL carries a Web3Auth redirect callback. If so, and the
// session is not connected after init(), calling connect() again will only
// trigger the same redirect and create an infinite loop.
const hasRedirectParams = () => {
  if (typeof window === 'undefined') return false;
  const search = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  return Boolean(
    window.location.hash.includes('b64Params') ||
    search.get('state') ||
    search.get('code') ||
    search.get('sessionId') ||
    hash.get('state') ||
    hash.get('code') ||
    hash.get('sessionId')
  );
};

const useWeb3Auth = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [user, setUser] = useState(null);
  const [provider, setProvider] = useState(null);
  const [web3, setWeb3] = useState(null);
  const [walletAddress, setWalletAddress] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isWeb3Available, setIsWeb3Available] = useState(WEB3_ENABLED);
  const [isConnected, setIsConnected] = useState(false);
  const [sessionExpiry, setSessionExpiry] = useState(null);

  // Refs for security and state management
  const web3authRef = useRef(null);
  const initializingRef = useRef(false);
  const heartbeatIntervalRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const sessionNonceRef = useRef(null);
  const nonceTimestampRef = useRef(null);
  const addressChecksumRef = useRef(null);
  const lastValidatedRef = useRef(null);
  const loginInProgressRef = useRef(false);

  /**
   * Calculate address checksum for anti-tampering verification
   */
  const calculateAddressChecksum = useCallback((address) => {
    if (!address) return null;
    // Simple checksum: combine address with timestamp hash
    const timestamp = Date.now();
    const checksum = `${address.toLowerCase()}_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
    return btoa(checksum);
  }, []);

  /**
   * Verify address integrity - anti-tampering check
   */
  const verifyAddressIntegrity = useCallback((address) => {
    if (!address || !addressChecksumRef.current) return false;
    const expectedPrefix = address.toLowerCase();
    try {
      const decoded = atob(addressChecksumRef.current);
      return decoded.startsWith(expectedPrefix);
    } catch {
      return false;
    }
  }, []);

  /**
   * Generate and store nonce for authentication
   */
  const generateNonce = useCallback(() => {
    const nonce = `${Date.now()}_${Math.random().toString(36).substr(2, 15)}_${Math.random().toString(36).substr(2, 15)}`;
    sessionNonceRef.current = nonce;
    nonceTimestampRef.current = Date.now();
    return nonce;
  }, []);

  /**
   * Validate nonce hasn't expired
   */
  const validateNonce = useCallback(() => {
    if (!sessionNonceRef.current || !nonceTimestampRef.current) return false;
    const elapsed = Date.now() - nonceTimestampRef.current;
    return elapsed < SECURITY_CONFIG.NONCE_EXPIRY;
  }, []);

  /**
   * Validate session hasn't expired
   */
  const validateSession = useCallback(() => {
    if (!sessionExpiry) return true;
    const now = Date.now();
    if (now > sessionExpiry) {
      console.warn('[useWeb3Auth] Session expired');
      return false;
    }
    return true;
  }, [sessionExpiry]);

  /**
   * Clear all security-related state
   */
  const clearSecurityState = useCallback(() => {
    sessionNonceRef.current = null;
    nonceTimestampRef.current = null;
    addressChecksumRef.current = null;
    lastValidatedRef.current = null;
    reconnectAttemptsRef.current = 0;
    setSessionExpiry(null);
  }, []);

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

  /**
   * Heartbeat check - verifies wallet connection status
   */
  const performHeartbeat = useCallback(async () => {
    if (!web3authRef.current || !isConnected) return;

    try {
      const web3auth = web3authRef.current;
      
      // Check if still connected at Web3Auth level
      if (!web3auth.connected) {
        console.warn('[useWeb3Auth] Heartbeat detected disconnection');
        setIsConnected(false);
        await handleDisconnect();
        return;
      }

      // Verify wallet address hasn't changed (anti-tampering)
      const currentAddress = await fetchAddress(provider, web3);
      
      if (currentAddress !== walletAddress) {
        if (currentAddress) {
          console.warn('[useWeb3Auth] Address changed during session');
          // Address changed - update with new checksum
          setWalletAddress(currentAddress);
          addressChecksumRef.current = calculateAddressChecksum(currentAddress);
        } else {
          console.warn('[useWeb3Auth] Address no longer available');
          await handleDisconnect();
          return;
        }
      }

      // Verify integrity
      if (currentAddress && !verifyAddressIntegrity(currentAddress)) {
        console.error('[useWeb3Auth] Address integrity check failed!');
        await handleDisconnect();
        return;
      }

      lastValidatedRef.current = Date.now();
    } catch (err) {
      console.error('[useWeb3Auth] Heartbeat error:', err);
    }
  }, [provider, web3, walletAddress, isConnected, fetchAddress, calculateAddressChecksum, verifyAddressIntegrity]);

  /**
   * Handle disconnection
   */
  const handleDisconnect = useCallback(async () => {
    clearSecurityState();
    setProvider(null);
    setUser(null);
    setWeb3(null);
    setWalletAddress(null);
    setIsConnected(false);
  }, [clearSecurityState]);

  /**
   * Start heartbeat monitoring
   */
  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    heartbeatIntervalRef.current = setInterval(performHeartbeat, SECURITY_CONFIG.HEARTBEAT_INTERVAL);
  }, [performHeartbeat]);

  /**
   * Stop heartbeat monitoring
   */
  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  /**
   * Attempt automatic reconnection
   */
  const attemptReconnection = useCallback(async () => {
    if (reconnectAttemptsRef.current >= SECURITY_CONFIG.MAX_RECONNECT_ATTEMPTS) {
      console.error('[useWeb3Auth] Max reconnection attempts reached');
      setError('Connection lost. Please login again.');
      await logout();
      return false;
    }

    reconnectAttemptsRef.current += 1;
    console.log(`[useWeb3Auth] Reconnection attempt ${reconnectAttemptsRef.current}/${SECURITY_CONFIG.MAX_RECONNECT_ATTEMPTS}`);

    try {
      await new Promise(resolve => setTimeout(resolve, SECURITY_CONFIG.RECONNECT_DELAY * reconnectAttemptsRef.current));
      
      const web3auth = web3authRef.current;
      if (web3auth && web3auth.connected) {
        // Already reconnected
        reconnectAttemptsRef.current = 0;
        return true;
      }

      // Attempt to reconnect
      const result = await login();
      if (result) {
        reconnectAttemptsRef.current = 0;
        return true;
      }
    } catch (err) {
      console.error('[useWeb3Auth] Reconnection failed:', err);
    }

    return false;
  }, []);

  /**
   * Validate connection before sensitive operations
   */
  const validateConnection = useCallback(async () => {
    // Check session expiry
    if (!validateSession()) {
      throw new Error('Session expired. Please login again.');
    }

    // Check Web3Auth connection
    const web3auth = web3authRef.current;
    if (!web3auth || !web3auth.connected) {
      throw new Error('Wallet not connected');
    }

    // Check provider availability
    if (!provider) {
      throw new Error('Provider not available');
    }

    // Verify wallet address
    const currentAddress = await fetchAddress(provider, web3);
    if (!currentAddress) {
      throw new Error('Could not retrieve wallet address');
    }

    // Anti-tampering check
    if (!verifyAddressIntegrity(currentAddress)) {
      throw new Error('Address integrity verification failed');
    }

    // Verify nonce if available
    if (sessionNonceRef.current && !validateNonce()) {
      // Nonce expired, generate new one
      generateNonce();
    }

    return {
      address: currentAddress,
      nonce: sessionNonceRef.current,
      isValid: true
    };
  }, [provider, web3, validateSession, fetchAddress, verifyAddressIntegrity, validateNonce, generateNonce]);

  // Initialize Web3Auth — runs once on mount
  useEffect(() => {
    let cancelled = false;

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
          setIsConnected(true);

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

          // Initial address fetch (with retry — provider may not be ready immediately after redirect)
          let address = null;
          for (let attempt = 0; attempt < 3 && !address; attempt++) {
            if (attempt > 0) await new Promise(r => setTimeout(r, 1000));
            address = await fetchAddress(web3auth.provider, web3Instance);
          }
          if (address) {
            setWalletAddress(address);
            addressChecksumRef.current = calculateAddressChecksum(address);
            generateNonce();
            setSessionExpiry(Date.now() + SECURITY_CONFIG.SESSION_TIMEOUT);
            startHeartbeat();
          } else {
            console.warn('[useWeb3Auth] Address fetch failed after retries — Vault will retry via getAddress()');
          }
        } else if (hasRedirectParams() && !cancelled) {
          // Redirect came back but the session could not be restored. Clear the
          // stale callback from the URL so the user can try again without looping.
          console.warn('[useWeb3Auth] Redirect params present but session not restored');
          if (typeof window !== 'undefined' && window.location.hash) {
            window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
          }
          setError('Login session could not be restored. Please try again.');
        }

        if (!cancelled) setIsInitialized(true);
      } catch (err) {
        if (!cancelled) {
          if (WEB3_ENABLED) {
            setError(err.message || "Failed to initialize authentication");
          }
          setIsInitialized(true);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
        initializingRef.current = false;
      }
    };

    init();

    // Cleanup on unmount
    return () => {
      cancelled = true;
      stopHeartbeat();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Login
  const login = useCallback(async () => {
    if (!WEB3_ENABLED) {
      setError("Web3 features are not configured.");
      return null;
    }

    if (loginInProgressRef.current) {
      console.warn('[useWeb3Auth] Login already in progress, ignoring duplicate call');
      return null;
    }

    try {
      loginInProgressRef.current = true;
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

      // If the user just returned from a redirect and the session is already active,
      // do not call connect() again — recover the existing user info and provider if present.
      if (web3auth.connected) {
        console.log('[useWeb3Auth] Session already active after redirect — recovering');

        let userInfo;
        try {
          userInfo = await web3auth.getUserInfo();
          setUser(userInfo);
        } catch (userErr) {
          userInfo = { connected: true };
          setUser(userInfo);
        }

        const existingProvider = web3auth.provider;
        if (existingProvider) {
          if (existingProvider?.setMaxListeners) existingProvider.setMaxListeners(50);
          setProvider(existingProvider);
          setIsConnected(true);

          try {
            const Web3 = (await import('web3')).default;
            const web3Instance = new Web3(existingProvider);
            setWeb3(web3Instance);
            const address = await fetchAddress(existingProvider, web3Instance);
            if (address) {
              setWalletAddress(address);
              addressChecksumRef.current = calculateAddressChecksum(address);
              generateNonce();
              setSessionExpiry(Date.now() + SECURITY_CONFIG.SESSION_TIMEOUT);
              startHeartbeat();
            }
          } catch (err) {
            console.warn('[useWeb3Auth] Recovering Web3 after redirect failed:', err.message);
          }
        } else {
          setIsConnected(true);
        }

        return userInfo;
      }

      // Clean up any stale redirect params from previous redirect-mode attempts
      // so they don't interfere with popup mode.
      if (hasRedirectParams()) {
        if (typeof window !== 'undefined' && window.location.hash) {
          window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
        }
      }

      if (!isWeb3AuthReady()) {
        await initializeModal();
      }

      let web3authProvider;
      try {
        web3authProvider = await web3auth.connect();
      } catch (connectErr) {
        // Popup may throw even when auth succeeded — check if session is actually live
        console.warn('[useWeb3Auth] connect() threw:', connectErr?.message);
        // On iOS, popup blocking throws a TypeError or "blocked" error. Surface
        // it so the user sees something actionable instead of a silent revert.
        if (connectErr?.message && !connectErr.message.toLowerCase().includes('closed')) {
          setError(`Login error: ${connectErr.message}`);
        }
      }

      // Fallback: if connect() returned null or threw, but Web3Auth reports connected, use the cached provider
      if (!web3authProvider && web3auth.connected && web3auth.provider) {
        web3authProvider = web3auth.provider;
        console.log('[useWeb3Auth] connect() failed but session is active — using cached provider');
      }

      if (!web3authProvider) {
        // Show error if we have one, otherwise generic message
        const msg = error || 'Failed to connect. Please try again.';
        setError(msg);
        return null;
      }

      if (web3authProvider?.setMaxListeners) {
        web3authProvider.setMaxListeners(50);
      }

      setProvider(web3authProvider);
      setIsConnected(true);

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
      if (address) {
        setWalletAddress(address);
        // Initialize security state
        addressChecksumRef.current = calculateAddressChecksum(address);
        generateNonce();
        setSessionExpiry(Date.now() + SECURITY_CONFIG.SESSION_TIMEOUT);
        reconnectAttemptsRef.current = 0;
        startHeartbeat();
      }

      return userInfo;
    } catch (err) {
      // Last-resort fallback: check if Web3Auth session is active despite the error
      const w3a = web3authRef.current;
      if (w3a && w3a.connected && w3a.provider) {
        console.log('[useWeb3Auth] Login threw but session is active — recovering');
        const p = w3a.provider;
        if (p?.setMaxListeners) p.setMaxListeners(50);
        setProvider(p);
        setIsConnected(true);
        try { setUser(await w3a.getUserInfo()); } catch { setUser({ connected: true }); }
        try {
          const Web3 = (await import('web3')).default;
          const w3 = new Web3(p);
          setWeb3(w3);
          const addr = await fetchAddress(p, w3);
          if (addr) {
            setWalletAddress(addr);
            addressChecksumRef.current = calculateAddressChecksum(addr);
            generateNonce();
            setSessionExpiry(Date.now() + SECURITY_CONFIG.SESSION_TIMEOUT);
            startHeartbeat();
          }
        } catch (e) { console.warn('[useWeb3Auth] Fallback Web3 init failed:', e.message); }
        return { connected: true };
      }
      if (err.message && !err.message.toLowerCase().includes('closed')) {
        setError(err.message || "Login failed.");
      }
      return null;
    } finally {
      loginInProgressRef.current = false;
      setIsLoading(false);
    }
  }, [fetchAddress, calculateAddressChecksum, generateNonce, startHeartbeat]);

  // Logout
  const logout = useCallback(async () => {
    const web3auth = web3authRef.current;
    
    stopHeartbeat();
    clearSecurityState();

    if (web3auth) {
      try {
        setIsLoading(true);
        await web3auth.logout({ cleanup: true });
      } catch (err) {
        console.error("Logout failed", err);
      }
    }

    setProvider(null);
    setUser(null);
    setWeb3(null);
    setWalletAddress(null);
    setIsConnected(false);
    setIsLoading(false);
  }, [stopHeartbeat, clearSecurityState]);

  // Sign Message
  const signMessage = useCallback(async (message) => {
    // Validate connection before signing
    try {
      const validation = await validateConnection();
      if (!validation.isValid) {
        throw new Error('Connection validation failed');
      }
    } catch (err) {
      setError(err.message);
      return null;
    }

    if (!web3 && !provider) {
      setError("Web3 not initialized");
      return null;
    }

    try {
      setIsLoading(true);
      const address = walletAddress || await fetchAddress(provider, web3);
      if (!address) throw new Error("Could not get wallet address");

      // Double-check address integrity before signing
      if (!verifyAddressIntegrity(address)) {
        throw new Error("Address integrity check failed");
      }

      let signature;
      if (web3) {
        signature = await web3.eth.personal.sign(message, address, "");
      } else {
        signature = await provider.request({
          method: 'personal_sign',
          params: [message, address],
        });
      }

      // Update last validated timestamp
      lastValidatedRef.current = Date.now();
      
      // Refresh session expiry on successful sign
      setSessionExpiry(Date.now() + SECURITY_CONFIG.SESSION_TIMEOUT);

      return signature;
    } catch (err) {
      setError(err.message || "Failed to sign message");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [web3, provider, walletAddress, validateConnection, fetchAddress, verifyAddressIntegrity]);

  /**
   * Sign message with nonce for authentication
   */
  const signMessageWithNonce = useCallback(async (customMessage = null) => {
    if (!validateNonce()) {
      generateNonce();
    }

    const message = customMessage || `Crownmania authentication\nNonce: ${sessionNonceRef.current}\nTimestamp: ${Date.now()}`;
    
    const signature = await signMessage(message);
    
    return {
      message,
      signature,
      nonce: sessionNonceRef.current,
      timestamp: Date.now(),
      address: walletAddress
    };
  }, [signMessage, validateNonce, generateNonce, walletAddress]);

  /**
   * Check if wallet is ready for vault operations
   */
  const isReadyForVault = useCallback(async () => {
    try {
      const validation = await validateConnection();
      return validation.isValid;
    } catch {
      return false;
    }
  }, [validateConnection]);

  /**
   * Refresh session
   */
  const refreshSession = useCallback(async () => {
    if (!isConnected) {
      return false;
    }

    try {
      const validation = await validateConnection();
      if (validation.isValid) {
        setSessionExpiry(Date.now() + SECURITY_CONFIG.SESSION_TIMEOUT);
        generateNonce();
        return true;
      }
    } catch (err) {
      console.error('[useWeb3Auth] Session refresh failed:', err);
    }

    return false;
  }, [isConnected, validateConnection, generateNonce]);

  /**
   * Force connection validation check
   */
  const forceValidate = useCallback(async () => {
    return await validateConnection();
  }, [validateConnection]);

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
    isConnected,
    sessionExpiry,
    login,
    logout,
    getAddress: async () => {
      if (walletAddress) return walletAddress;
      // If not cached, try to fetch from provider
      if (provider) {
        const addr = await fetchAddress(provider, web3);
        if (addr) {
          setWalletAddress(addr);
          addressChecksumRef.current = calculateAddressChecksum(addr);
          return addr;
        }
      }
      return null;
    },
    getBalance: async () => {
      // Validate before balance fetch
      try {
        await validateConnection();
      } catch (err) {
        console.error('[useWeb3Auth] Balance fetch validation failed:', err);
        return null;
      }

      if (!web3 || !walletAddress) return null;
      try {
        const balance = await web3.eth.getBalance(walletAddress);
        return web3.utils.fromWei(balance, 'ether');
      } catch (err) {
        return null;
      }
    },
    signMessage,
    signMessageWithNonce,
    clearError,
    // Security methods
    validateConnection,
    isReadyForVault,
    refreshSession,
    forceValidate,
    getSessionNonce: () => sessionNonceRef.current,
    isSessionValid: () => validateSession() && validateNonce(),
    getLastValidated: () => lastValidatedRef.current,
  };
};

export default useWeb3Auth;
