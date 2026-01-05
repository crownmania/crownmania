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

    /**
     * Get a nonce for secure message signing
     * @returns {Promise<{nonce: string, timestamp: number, messageTemplate: string}>}
     */
    getNonce: async () => {
        try {
            const response = await api.get('/api/verification/nonce');
            return response.data;
        } catch (error) {
            console.error('Error getting nonce:', error);
            throw error.response?.data || { error: 'Failed to get nonce' };
        }
    },
};

/**
 * Content API service for token-gated content
 */
export const contentAPI = {
    /**
     * Upload content to Firebase Storage
     * @param {FormData} formData - Form data containing file and metadata
     * @returns {Promise<{success: boolean, contentId: string, url: string}>}
     */
    uploadContent: async (formData) => {
        try {
            const response = await api.post('/api/content/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            return response.data;
        } catch (error) {
            console.error('Error uploading content:', error);
            throw error.response?.data || { error: 'Failed to upload content' };
        }
    },

    /**
     * Generate a signed URL for content access
     * @param {string} contentId - The content identifier
     * @param {string} walletAddress - Wallet address requesting access
     * @param {number} expiryMinutes - URL expiry time in minutes (default 60)
     * @returns {Promise<{success: boolean, signedUrl: string, expiresAt: number}>}
     */
    getSignedUrl: async (contentId, walletAddress, expiryMinutes = 60) => {
        try {
            const response = await api.get(`/api/content/signed-url/${contentId}`, {
                params: { walletAddress, expiryMinutes }
            });
            return response.data;
        } catch (error) {
            console.error('Error getting signed URL:', error);
            throw error.response?.data || { error: 'Failed to get signed URL' };
        }
    },

    /**
     * Get content metadata without granting access
     * @param {string} contentId - The content identifier
     * @returns {Promise<{success: boolean, metadata: object}>}
     */
    getContentMetadata: async (contentId) => {
        try {
            const response = await api.get(`/api/content/${contentId}/metadata`);
            return response.data;
        } catch (error) {
            console.error('Error getting content metadata:', error);
            throw error.response?.data || { error: 'Failed to get content metadata' };
        }
    },

    /**
     * Get all content for a specific product
     * @param {string} productId - The product identifier
     * @param {string} walletAddress - Optional wallet address for access filtering
     * @returns {Promise<{success: boolean, content: Array, count: number}>}
     */
    getProductContent: async (productId, walletAddress) => {
        try {
            const params = walletAddress ? { walletAddress } : {};
            const response = await api.get(`/api/content/product/${productId}`, { params });
            return response.data;
        } catch (error) {
            console.error('Error getting product content:', error);
            throw error.response?.data || { error: 'Failed to get product content' };
        }
    },

    /**
     * Get content accessible by the requesting wallet
     * @param {string} walletAddress - Wallet address to check
     * @returns {Promise<{success: boolean, content: Array, count: number}>}
     */
    getAccessibleContent: async (walletAddress) => {
        try {
            const response = await api.get('/api/content/accessible', {
                params: { walletAddress }
            });
            return response.data;
        } catch (error) {
            console.error('Error getting accessible content:', error);
            throw error.response?.data || { error: 'Failed to get accessible content' };
        }
    },

    /**
     * Validate a signed URL
     * @param {string} url - The signed URL to validate
     * @returns {Promise<{valid: boolean, ...params}>}
     */
    validateSignedUrl: async (url) => {
        try {
            const response = await api.get('/api/content/validate-url', {
                params: { url }
            });
            return response.data;
        } catch (error) {
            console.error('Error validating signed URL:', error);
            return { valid: false };
        }
    }
};

export default api;