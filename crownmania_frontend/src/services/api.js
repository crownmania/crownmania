import axios from 'axios';

// Use environment variable for API URL, fallback to local development or production
const isDev = import.meta.env.DEV;
const API_BASE_URL = import.meta.env.VITE_API_URL || (isDev ? 'http://localhost:5001' : 'https://api.crownmania.com');

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
});

/**
 * Verification API service
 */
export const verificationAPI = {
    /**
     * Verify a product by its ID (from QR code)
     * @param {string} productId - The product ID
     * @param {string} productType - The product type (optional)
     * @returns {Promise<{verified: boolean, claimed: boolean, product: object, message: string}>}
     */
    verifyProduct: async (productId, productType) => {
        try {
            const params = productType ? { type: productType } : {};
            const response = await api.get(`/api/verification/verify-product/${productId}`, { params });
            return response.data;
        } catch (error) {
            console.error('Error verifying product:', error);
            throw error.response?.data || { error: 'Failed to verify product' };
        }
    },

    /**
     * Verify a product by its serial number (manual input)
     * @param {string} serialNumber - The serial number
     * @returns {Promise<{verified: boolean, product: object, message: string}>}
     */
    verifySerialNumber: async (serialNumber) => {
        try {
            const response = await api.post('/api/verification/verify-serial', { serialNumber });
            return response.data;
        } catch (error) {
            console.error('Error verifying serial number:', error);
            throw error.response?.data || { error: 'Failed to verify serial number' };
        }
    },

    /**
     * Claim a product to a wallet address
     * @param {string} productId - The product ID
     * @param {string} walletAddress - The wallet address to claim to
     * @param {string} signature - Signed proof of ownership
     * @param {string} message - The signed message
     * @returns {Promise<{success: boolean, tokenId: string, message: string}>}
     */
    claimProduct: async (productId, walletAddress, signature, message) => {
        try {
            const response = await api.post('/api/verification/claim', {
                productId,
                walletAddress,
                signature,
                message
            });
            return response.data;
        } catch (error) {
            console.error('Error claiming product:', error);
            throw error.response?.data || { error: 'Failed to claim product' };
        }
    },

    /**
     * Get all tokens owned by a wallet address
     * @param {string} walletAddress - The wallet address
     * @returns {Promise<{tokens: Array}>}
     */
    getWalletTokens: async (walletAddress) => {
        try {
            const response = await api.get(`/api/verification/wallet-tokens/${walletAddress}`);
            return response.data;
        } catch (error) {
            console.error('Error getting wallet tokens:', error);
            throw error.response?.data || { error: 'Failed to get wallet tokens' };
        }
    },
};

export default api;
