/**
 * AUTH PROVIDER ABSTRACTION - PUBLIC API
 * =======================================
 * Barrel export for clean imports throughout the app
 */

export { AuthProvider, AuthProviderMetadata } from './AuthProvider';
export { Web3AuthProvider } from './Web3AuthProvider';
export { MoonPayAuthProvider } from './MoonPayAuthProvider';
export {
    createAuthProvider,
    AuthProviderSingleton,
    AuthProviderType
} from './AuthProviderFactory';
