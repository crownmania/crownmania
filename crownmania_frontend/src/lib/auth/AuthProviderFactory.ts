/**
 * AUTH PROVIDER FACTORY
 * ======================
 * Creates appropriate auth provider based on environment variable
 * Enables switching between Web3Auth and MoonPay for testing
 */

import { AuthProvider } from './AuthProvider';
import { Web3AuthProvider } from './Web3AuthProvider';
import { MoonPayAuthProvider } from './MoonPayAuthProvider';

export type AuthProviderType = 'web3auth' | 'moonpay';

/**
 * Factory function to create auth provider instance
 * @param providerType - Type of provider to create (defaults to env var or 'web3auth')
 * @returns Initialized auth provider instance
 */
export async function createAuthProvider(
    providerType?: AuthProviderType
): Promise<AuthProvider> {
    // Determine provider from parameter or environment variable
    const selectedProvider =
        providerType ||
        (process.env.NEXT_PUBLIC_AUTH_PROVIDER as AuthProviderType) ||
        'web3auth'; // Default to Web3Auth for production

    console.log(`[AuthProviderFactory] Creating provider: ${selectedProvider}`);

    let provider: AuthProvider;

    switch (selectedProvider) {
        case 'moonpay':
            console.warn('⚠️  MoonPay provider selected - LOCALHOST TESTING ONLY');
            provider = new MoonPayAuthProvider();
            break;

        case 'web3auth':
        default:
            provider = new Web3AuthProvider();
            break;
    }

    // Initialize the provider
    await provider.init();

    return provider;
}

/**
 * Singleton pattern for auth provider
 * Ensures only one provider instance exists per session
 */
class AuthProviderSingleton {
    private static instance: AuthProvider | null = null;
    private static providerType: AuthProviderType | null = null;

    static async getInstance(providerType?: AuthProviderType): Promise<AuthProvider> {
        const requestedType = providerType ||
            (process.env.NEXT_PUBLIC_AUTH_PROVIDER as AuthProviderType) ||
            'web3auth';

        // If provider type changed, recreate instance
        if (this.instance && this.providerType !== requestedType) {
            console.log(`[AuthProviderSingleton] Provider type changed from ${this.providerType} to ${requestedType}, recreating...`);
            this.instance = null;
        }

        if (!this.instance) {
            this.instance = await createAuthProvider(requestedType);
            this.providerType = requestedType;
        }

        return this.instance;
    }

    static reset(): void {
        this.instance = null;
        this.providerType = null;
    }
}

export { AuthProviderSingleton };
