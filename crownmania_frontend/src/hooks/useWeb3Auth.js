import { useState, useEffect, useCallback } from 'react';
import { web3auth, Moralis, initMoralis } from '../config/web3Config';
import Web3 from 'web3';

const useWeb3Auth = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [user, setUser] = useState(null);
  const [provider, setProvider] = useState(null);
  const [web3, setWeb3] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Initialize Web3Auth
  useEffect(() => {
    const init = async () => {
      try {
        setIsLoading(true);
        await web3auth.initModal();
        await initMoralis();
        setIsInitialized(true);
        
        if (web3auth.connected) {
          const web3authProvider = web3auth.provider;
          setProvider(web3authProvider);
          
          const userInfo = await web3auth.getUserInfo();
          setUser(userInfo);
          
          const web3Instance = new Web3(web3authProvider);
          setWeb3(web3Instance);
        }
      } catch (err) {
        console.error("Failed to initialize Web3Auth", err);
        setError(err.message || "Failed to initialize authentication");
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  // Login with Web3Auth (supports social logins, email passwordless, and wallet connections)
  const login = useCallback(async () => {
    if (!isInitialized) {
      setError("Authentication not initialized yet");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const web3authProvider = await web3auth.connect();
      setProvider(web3authProvider);
      
      const userInfo = await web3auth.getUserInfo();
      setUser(userInfo);
      
      const web3Instance = new Web3(web3authProvider);
      setWeb3(web3Instance);
      
      return userInfo;
    } catch (err) {
      console.error("Login failed", err);
      setError(err.message || "Login failed");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized]);

  // Logout
  const logout = useCallback(async () => {
    if (!isInitialized) return;
    
    try {
      setIsLoading(true);
      await web3auth.logout();
      setProvider(null);
      setUser(null);
      setWeb3(null);
    } catch (err) {
      console.error("Logout failed", err);
      setError(err.message || "Logout failed");
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized]);

  // Get user's wallet address
  const getAddress = useCallback(async () => {
    if (!web3) return null;
    try {
      const accounts = await web3.eth.getAccounts();
      return accounts[0];
    } catch (err) {
      console.error("Failed to get address", err);
      setError(err.message || "Failed to get wallet address");
      return null;
    }
  }, [web3]);

  return {
    isInitialized,
    user,
    provider,
    web3,
    isLoading,
    error,
    login,
    logout,
    getAddress
  };
};

export default useWeb3Auth;
