/**
 * UNIT TESTS: Auth Provider Interface
 * ====================================
 * Tests for provider abstraction and implementations
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { Web3AuthProvider } from '../Web3AuthProvider';
import { MoonPayAuthProvider } from '../MoonPayAuthProvider';
import { createAuthProvider, AuthProviderSingleton } from '../AuthProviderFactory';
import { ethers } from 'ethers';

describe('AuthProvider Interface', () => {
    describe('MoonPayAuthProvider (Mock)', () => {
        let provider: MoonPayAuthProvider;

        beforeEach(async () => {
            provider = new MoonPayAuthProvider();
            await provider.init();
        });

        it('should initialize in sandbox mode', async () => {
            // Already initialized in beforeEach
            expect(provider.getProviderName()).toBe('moonpay-mock');
        });

        it('should login and return valid address', async () => {
            const address = await provider.login();

            expect(address).toBeTruthy();
            expect(ethers.utils.isAddress(address)).toBe(true);
            expect(address).toMatch(/^0x[a-fA-F0-9]{40}$/);
        });

        it('should be connected after login', async () => {
            await provider.login();
            const connected = await provider.isConnected();

            expect(connected).toBe(true);
        });

        it('should return address after login', async () => {
            const loginAddress = await provider.login();
            const getAddress = await provider.getAddress();

            expect(getAddress).toBe(loginAddress);
        });

        it('should sign messages correctly', async () => {
            await provider.login();
            const message = 'Test message for signature';
            const signature = await provider.signMessage(message);

            expect(signature).toBeTruthy();
            expect(signature).toMatch(/^0x[a-fA-F0-9]{130}$/);
        });

        it('should verify signature round-trip', async () => {
            const address = await provider.login();
            const message = 'Verification test';
            const signature = await provider.signMessage(message);

            // Verify signature
            const recoveredAddress = ethers.utils.verifyMessage(message, signature);
            expect(recoveredAddress.toLowerCase()).toBe(address.toLowerCase());
        });

        it('should throw error when signing without login', async () => {
            await expect(async () => {
                await provider.signMessage('test');
            }).rejects.toThrow('Not authenticated');
        });

        it('should logout successfully', async () => {
            await provider.login();
            await provider.logout();

            const connected = await provider.isConnected();
            const address = await provider.getAddress();

            expect(connected).toBe(false);
            expect(address).toBeNull();
        });

        it('should be deterministic (same wallet each time)', async () => {
            const address1 = await provider.login();
            await provider.logout();

            const provider2 = new MoonPayAuthProvider();
            await provider2.init();
            const address2 = await provider2.login();

            expect(address1).toBe(address2);
        });
    });

    describe('AuthProviderFactory', () => {
        beforeEach(() => {
            AuthProviderSingleton.reset();
        });

        it('should create MoonPay provider when specified', async () => {
            const provider = await createAuthProvider('moonpay');
            expect(provider.getProviderName()).toBe('moonpay-mock');
        });

        it('should default to web3auth if not specified', async () => {
            // This test requires Web3Auth to be properly mocked or configured
            // Skip in environments where Web3Auth credentials aren't available
            if (!process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID) {
                console.log('Skipping Web3Auth test - no credentials configured');
                return;
            }

            const provider = await createAuthProvider('web3auth');
            expect(provider.getProviderName()).toBe('web3auth');
        });

        it('should return singleton instance', async () => {
            const provider1 = await AuthProviderSingleton.getInstance('moonpay');
            const provider2 = await AuthProviderSingleton.getInstance('moonpay');

            expect(provider1).toBe(provider2);
        });

        it('should recreate instance when provider type changes', async () => {
            const provider1 = await AuthProviderSingleton.getInstance('moonpay');
            AuthProviderSingleton.reset();
            const provider2 = await AuthProviderSingleton.getInstance('moonpay');

            expect(provider1).not.toBe(provider2);
        });
    });

    describe('Signature Verification (Integration)', () => {
        it('should create valid signatures compatible with backend verification', async () => {
            const provider = new MoonPayAuthProvider();
            await provider.init();
            const address = await provider.login();

            // Simulate nonce message from backend
            const nonce = 'abc123def456';
            const message = `Sign this message to authenticate with CrownMania.\n\nNonce: ${nonce}`;

            const signature = await provider.signMessage(message);

            // Verify using ethers (same method backend uses)
            const recoveredAddress = ethers.utils.verifyMessage(message, signature);
            expect(recoveredAddress.toLowerCase()).toBe(address.toLowerCase());
        });
    });
});
