import api from './api';

/**
 * API functions for product verification and token management
 */
const verificationApi = {
  /**
   * Verify a product by serial number
   * @param {string} serialNumber - The product serial number
   * @returns {Promise} - The verification result
   */
  verifySerialNumber: async (serialNumber) => {
    const response = await api.post('/api/verification/verify-serial', { serialNumber });
    return response.data;
  },

  /**
   * Request email verification for a product
   * @param {string} serialNumber - The product serial number
   * @param {string} email - The email to verify against
   * @returns {Promise} - The verification request result
   */
  requestEmailVerification: async (serialNumber, email) => {
    const response = await api.post('/api/verification/request-email-verification', {
      serialNumber,
      email
    });
    return response.data;
  },

  /**
   * Verify a token received via email
   * @param {string} token - The verification token
   * @returns {Promise} - The token verification result
   */
  verifyToken: async (token) => {
    const response = await api.post('/api/verification/verify-token', { token });
    return response.data;
  },

  /**
   * Issue a digital token for a verified product
   * @param {string} serialNumber - The verified product serial number
   * @param {string} walletAddress - The wallet address to issue the token to
   * @returns {Promise} - The token issuance result
   */
  issueToken: async (serialNumber, walletAddress) => {
    const response = await api.post('/api/verification/issue-token', {
      serialNumber,
      walletAddress
    });
    return response.data;
  },

  /**
   * Get all tokens owned by a wallet address
   * @param {string} walletAddress - The wallet address to check
   * @returns {Promise} - Array of owned tokens
   */
  getWalletTokens: async (walletAddress) => {
    const response = await api.get(`/api/verification/wallet-tokens/${walletAddress}`);
    return response.data.tokens;
  },

  /**
   * Check NFT transfer status for a serial number
   * @param {string} serialNumber - The serial number to check
   * @returns {Promise} - Transfer status details
   */
  getTransferStatus: async (serialNumber) => {
    const response = await api.get(`/api/verification/transfer-status/${serialNumber}`);
    return response.data;
  },

  /**
   * Verify a product serial number (alias for verifySerialNumber)
   * @param {string} serialNumber - The product serial number
   * @returns {Promise} - The verification result
   */
  verifySerial: async (serialNumber) => {
    return verificationApi.verifySerialNumber(serialNumber);
  }
};

export default verificationApi;
