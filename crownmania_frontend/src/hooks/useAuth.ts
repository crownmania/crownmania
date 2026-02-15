/**
 * UNIFIED AUTH HOOK
 * ==================
 * React hook for authentication using provider abstraction
 * Replaces direct Web3Auth usage throughout the app
 */

import { useState, useEffect, useCallback } from 'react';
import { AuthProvider, AuthProviderSingleton } from '../lib/auth';

export interface UseAuthReturn {
    address: string | null;
    isConnected: boolean;
    isLoading: boolean;
    error: string | null;
    provider: AuthProvider | null;
    login: () => Promise<void>;
    logout: () => Promise<void>;
    signMessage: (message: string) => Promise<string>;
}

export function useAuth(): UseAuthReturn {
    const [address, setAddress] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [provider, setProvider] = useState<AuthProvider | null>(null);

    // Initialize provider on mount
    useEffect(() => {
        async function initProvider() {
            try {
                setIsLoading(true);
                const authProvider = await AuthProviderSingleton.getInstance();
                setProvider(authProvider);

                // Check if already connected
                const connected = await authProvider.isConnected();
                setIsConnected(connected);

                if (connected) {
                    const addr = await authProvider.getAddress();
                    setAddress(addr);
                }

                setError(null);
            } catch (err: any) {
                console.error('[useAuth] Provider initialization failed:', err);
                setError(err.message || 'Failed to initialize auth provider');
            } finally {
                setIsLoading(false);
            }
        }

        initProvider();
    }, []);

    const login = useCallback(async () => {
        if (!provider) {
            throw new Error('Provider not initialized');
        }

        try {
            setIsLoading(true);
            setError(null);

            const addr = await provider.login();
            setAddress(addr);
            setIsConnected(true);

            console.log('[useAuth] Login successful:', addr);
        } catch (err: any) {
            console.error('[useAuth] Login failed:', err);
            setError(err.message || 'Login failed');
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [provider]);

    const logout = useCallback(async () => {
        if (!provider) {
            return;
        }

        try {
            setIsLoading(true);
            setError(null);

            await provider.logout();
            setAddress(null);
            setIsConnected(false);

            console.log('[useAuth] Logout successful');
        } catch (err: any) {
            console.error('[useAuth] Logout failed:', err);
            setError(err.message || 'Logout failed');
        } finally {
            setIsLoading(false);
        }
    }, [provider]);

    const signMessage = useCallback(async (message: string): Promise<string> => {
        if (!provider) {
            throw new Error('Provider not initialized');
        }

        if (!isConnected) {
            throw new Error('Not authenticated - please login first');
        }

        try {
            const signature = await provider.signMessage(message);
            console.log('[useAuth] Message signed successfully');
            return signature;
        } catch (err: any) {
            console.error('[useAuth] Signature failed:', err);
            throw new Error(err.message || 'Failed to sign message');
        }
    }, [provider, isConnected]);

    return {
        address,
        isConnected,
        isLoading,
        error,
        provider,
        login,
        logout,
        signMessage,
    };
}
