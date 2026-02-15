/**
 * AUTH PROVIDER ABSTRACTION
 * ==========================
 * Interface for authentication providers (Web3Auth, MoonPay, etc.)
 * Enables switching auth providers via environment variable while
 * maintaining consistent authentication flow.
 */

export interface AuthProvider {
    /**
     * Initialize the auth provider
     * @throws Error if initialization fails
     */
    init(): Promise<void>;

    /**
     * Authenticate user and create/restore wallet
     * @returns Wallet address (checksummed)
     * @throws Error if login fails or user cancels
     */
    login(): Promise<string>;

    /**
     * Sign out user and clear session
     */
    logout(): Promise<void>;

    /**
     * Get current authenticated wallet address
     * @returns Wallet address or null if not authenticated
     */
    getAddress(): Promise<string | null>;

    /**
     * Sign a message with user's wallet
     * @param message - Message to sign
     * @returns Signature (hex string with 0x prefix)
     * @throws Error if not authenticated or user rejects
     */
    signMessage(message: string): Promise<string>;

    /**
     * Check if user is currently authenticated
     */
    isConnected(): Promise<boolean>;

    /**
     * Get provider name for logging/debugging
     */
    getProviderName(): string;
}

/**
 * Auth provider metadata for DB storage
 */
export interface AuthProviderMetadata {
    provider: 'web3auth' | 'moonpay' | 'walletconnect';
    loginMethod?: string;  // e.g., "google", "email", "phone"
    connectedAt: Date;
}
