/**
 * MOONPAY AUTH PROVIDER ADAPTER (MOCK/SANDBOX)
 * ==============================================
 * POC implementation for localhost testing only.
 * 
 * CURRENT STATE: Mock/sandbox mode that simulates MoonPay auth behavior
 * FUTURE STATE: Replace with real MoonPay SDK once partner approval obtained
 * 
 * Mock behavior:
 * - Generates deterministic test wallet (DO NOT USE IN PRODUCTION)
 * - Simulates login delay
 * - Signs messages with test private key
 * 
 * To upgrade to real MoonPay:
 * 1. Install @moonpay/login-sdk
 * 2. Replace mock logic with SDK calls
 * 3. Update MOONPAY_SANDBOX_MODE to false
 * 4. Add real API keys to .env.local
 */

import { ethers } from 'ethers';
import { AuthProvider } from './AuthProvider';

// SANDBOX MODE FLAG - set to false when using real MoonPay SDK
const MOONPAY_SANDBOX_MODE = true;

export class MoonPayAuthProvider implements AuthProvider {
    private wallet: ethers.Wallet | null = null;
    private isAuthenticated: boolean = false;

    async init(): Promise<void> {
        if (!MOONPAY_SANDBOX_MODE) {
            // TODO: Real MoonPay SDK initialization
            // const { MoonPayAuth } = await import('@moonpay/login-sdk');
            // this.moonpayClient = new MoonPayAuth({
            //   apiKey: process.env.NEXT_PUBLIC_MOONPAY_API_KEY,
            //   environment: 'sandbox'
            // });
            throw new Error('Real MoonPay SDK not yet implemented - awaiting partner approval');
        }

        // Sandbox mode - no initialization needed
        console.log('[MoonPayAuthProvider] Initialized in SANDBOX mode');
        console.warn('⚠️  MoonPay provider is in MOCK MODE - for localhost testing only!');
    }

    async login(): Promise<string> {
        if (!MOONPAY_SANDBOX_MODE) {
            // TODO: Real MoonPay login flow
            // const result = await this.moonpayClient.login();
            // this.wallet = new ethers.Wallet(result.privateKey);
            throw new Error('Real MoonPay SDK not yet implemented');
        }

        // MOCK: Simulate login delay
        await this.simulateDelay(1500);

        // MOCK: Generate deterministic test wallet (NEVER use this pattern in production!)
        // In production, MoonPay SDK would handle key generation/custody
        const testMnemonic = 'test test test test test test test test test test test junk';
        const hdNode = ethers.utils.HDNode.fromMnemonic(testMnemonic);
        const derivedNode = hdNode.derivePath("m/44'/60'/0'/0/0");
        this.wallet = new ethers.Wallet(derivedNode.privateKey);
        this.isAuthenticated = true;

        const address = await this.wallet.getAddress();
        console.log('[MoonPayAuthProvider] MOCK login successful:', address);
        console.warn('⚠️  Using test wallet - DO NOT use for real funds!');

        return address;
    }

    async logout(): Promise<void> {
        if (!MOONPAY_SANDBOX_MODE) {
            // TODO: Real MoonPay logout
            // await this.moonpayClient.logout();
            throw new Error('Real MoonPay SDK not yet implemented');
        }

        // MOCK: Clear test wallet
        this.wallet = null;
        this.isAuthenticated = false;
        console.log('[MoonPayAuthProvider] MOCK logout successful');
    }

    async getAddress(): Promise<string | null> {
        if (!this.wallet || !this.isAuthenticated) {
            return null;
        }

        return await this.wallet.getAddress();
    }

    async signMessage(message: string): Promise<string> {
        if (!this.wallet || !this.isAuthenticated) {
            throw new Error('Not authenticated - call login() first');
        }

        if (!MOONPAY_SANDBOX_MODE) {
            // TODO: Real MoonPay signing (SDK likely provides this)
            // return await this.moonpayClient.signMessage(message);
            throw new Error('Real MoonPay SDK not yet implemented');
        }

        // MOCK: Sign with test wallet
        const signature = await this.wallet.signMessage(message);
        console.log('[MoonPayAuthProvider] MOCK message signed');

        return signature;
    }

    async isConnected(): Promise<boolean> {
        return this.isAuthenticated && this.wallet !== null;
    }

    getProviderName(): string {
        return MOONPAY_SANDBOX_MODE ? 'moonpay-mock' : 'moonpay';
    }

    // Helper: Simulate async delay for realistic UX testing
    private simulateDelay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * MIGRATION GUIDE: Mock → Real MoonPay SDK
 * ==========================================
 * 
 * 1. Install dependencies:
 *    npm install @moonpay/login-sdk
 * 
 * 2. Add environment variables (.env.local):
 *    NEXT_PUBLIC_MOONPAY_API_KEY=your_api_key
 *    NEXT_PUBLIC_MOONPAY_ENVIRONMENT=sandbox
 * 
 * 3. Update MOONPAY_SANDBOX_MODE to false
 * 
 * 4. Replace TODO sections with real SDK calls:
 *    - init(): Initialize MoonPayAuth client
 *    - login(): Use SDK's authentication flow
 *    - signMessage(): Use SDK's signing method
 *    - logout(): Use SDK's logout method
 * 
 * 5. Test in sandbox environment before production
 * 
 * 6. Update getProviderName() to return 'moonpay'
 * 
 * Reference: https://docs.moonpay.com/wallets-sdk
 */
