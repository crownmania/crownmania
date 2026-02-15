/**
 * WEB3AUTH PROVIDER ADAPTER
 * ==========================
 * Wraps existing Web3Auth integration into AuthProvider interface
 * Production default - uses Web3Auth sandbox/production
 */

import { Web3Auth } from '@web3auth/modal';
import { CHAIN_NAMESPACES, SafeEventEmitterProvider } from '@web3auth/base';
import { ethers } from 'ethers';
import { AuthProvider } from './AuthProvider';

export class Web3AuthProvider implements AuthProvider {
    private web3auth: Web3Auth | null = null;
    private provider: SafeEventEmitterProvider | null = null;

    async init(): Promise<void> {
        try {
            const clientId = process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID;

            if (!clientId) {
                throw new Error('NEXT_PUBLIC_WEB3AUTH_CLIENT_ID not configured');
            }

            this.web3auth = new Web3Auth({
                clientId,
                web3AuthNetwork: 'sapphire_devnet', // or 'sapphire_mainnet'
                chainConfig: {
                    chainNamespace: CHAIN_NAMESPACES.EIP155,
                    chainId: '0x89', // Polygon Mainnet
                    rpcTarget: process.env.NEXT_PUBLIC_POLYGON_RPC_URL || 'https://polygon-rpc.com',
                    displayName: 'Polygon',
                    blockExplorer: 'https://polygonscan.com',
                    ticker: 'MATIC',
                    tickerName: 'Polygon',
                },
            });

            await this.web3auth.initModal();
            console.log('[Web3AuthProvider] Initialized successfully');
        } catch (error) {
            console.error('[Web3AuthProvider] Initialization failed:', error);
            throw new Error(`Web3Auth initialization failed: ${error.message}`);
        }
    }

    async login(): Promise<string> {
        if (!this.web3auth) {
            throw new Error('Web3Auth not initialized. Call init() first.');
        }

        try {
            this.provider = await this.web3auth.connect();

            if (!this.provider) {
                throw new Error('Failed to connect - no provider returned');
            }

            const address = await this.getAddress();

            if (!address) {
                throw new Error('Failed to get wallet address after login');
            }

            console.log('[Web3AuthProvider] Login successful:', address);
            return address;
        } catch (error) {
            console.error('[Web3AuthProvider] Login failed:', error);
            throw new Error(`Web3Auth login failed: ${error.message}`);
        }
    }

    async logout(): Promise<void> {
        if (!this.web3auth) {
            return;
        }

        try {
            await this.web3auth.logout();
            this.provider = null;
            console.log('[Web3AuthProvider] Logout successful');
        } catch (error) {
            console.error('[Web3AuthProvider] Logout failed:', error);
            throw error;
        }
    }

    async getAddress(): Promise<string | null> {
        if (!this.provider) {
            return null;
        }

        try {
            const ethersProvider = new ethers.providers.Web3Provider(this.provider as any);
            const signer = ethersProvider.getSigner();
            const address = await signer.getAddress();
            return ethers.utils.getAddress(address); // Checksummed
        } catch (error) {
            console.error('[Web3AuthProvider] Failed to get address:', error);
            return null;
        }
    }

    async signMessage(message: string): Promise<string> {
        if (!this.provider) {
            throw new Error('Not authenticated - call login() first');
        }

        try {
            const ethersProvider = new ethers.providers.Web3Provider(this.provider as any);
            const signer = ethersProvider.getSigner();
            const signature = await signer.signMessage(message);

            console.log('[Web3AuthProvider] Message signed successfully');
            return signature;
        } catch (error) {
            console.error('[Web3AuthProvider] Signature failed:', error);
            throw new Error(`Failed to sign message: ${error.message}`);
        }
    }

    async isConnected(): Promise<boolean> {
        if (!this.web3auth) {
            return false;
        }

        try {
            return this.web3auth.status === 'connected' && this.provider !== null;
        } catch (error) {
            console.error('[Web3AuthProvider] Connection check failed:', error);
            return false;
        }
    }

    getProviderName(): string {
        return 'web3auth';
    }
}
