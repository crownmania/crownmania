import axios from 'axios';

// Use environment variable for API URL, fallback to local development or production
const isDev = import.meta.env.DEV;
const API_BASE_URL = import.meta.env.VITE_API_URL || (isDev ? 'http://localhost:5001' : 'https://api.crownmania.com');

// Security configuration
const SECURITY_CONFIG = {
  MAX_RETRIES: 3,
  INITIAL_RETRY_DELAY: 1000, // 1 second
  MAX_RETRY_DELAY: 10000, // 10 seconds
  RATE_LIMIT_WINDOW: 60000, // 1 minute
  MAX_REQUESTS_PER_WINDOW: 30,
  REQUEST_TIMEOUT: 30000,
  TOKEN_REFRESH_BUFFER: 60000, // 1 minute before expiry
};

// Rate limiting state
const rateLimitState = {
  requests: [],
  blockedUntil: null,
};

// Connection validation state
let connectionValidator = null;
let sessionRefresher = null;

/**
 * Check if request should be rate limited
 */
const checkRateLimit = () => {
  const now = Date.now();

  // Clear old requests outside the window
  rateLimitState.requests = rateLimitState.requests.filter(
    timestamp => now - timestamp < SECURITY_CONFIG.RATE_LIMIT_WINDOW
  );

  // Check if currently blocked
  if (rateLimitState.blockedUntil && now < rateLimitState.blockedUntil) {
    const waitTime = Math.ceil((rateLimitState.blockedUntil - now) / 1000);
    throw new Error(`Rate limit exceeded. Please wait ${waitTime} seconds.`);
  }

  // Check request count
  if (rateLimitState.requests.length >= SECURITY_CONFIG.MAX_REQUESTS_PER_WINDOW) {
    rateLimitState.blockedUntil = now + SECURITY_CONFIG.RATE_LIMIT_WINDOW;
    throw new Error('Rate limit exceeded. Please try again later.');
  }

  // Record this request
  rateLimitState.requests.push(now);
  return true;
};

/**
 * Calculate exponential backoff delay
 */
const getRetryDelay = (attempt) => {
  const delay = Math.min(
    SECURITY_CONFIG.INITIAL_RETRY_DELAY * Math.pow(2, attempt),
    SECURITY_CONFIG.MAX_RETRY_DELAY
  );
  // Add jitter to prevent thundering herd
  return delay + Math.random() * 1000;
};

/**
 * Set connection validator function (called from useWeb3Auth)
 */
export const setConnectionValidator = (validator) => {
  connectionValidator = validator;
};

/**
 * Set session refresher function
 */
export const setSessionRefresher = (refresher) => {
  sessionRefresher = refresher;
};

/**
 * Request signing for sensitive operations
 */
const signRequest = async (method, url, data = null, walletAddress = null) => {
  if (!walletAddress) return null;

  const timestamp = Date.now();
  const nonce = Math.random().toString(36).substr(2, 15);

  // Create signature payload
  const payload = {
    method: method.toUpperCase(),
    path: url,
    timestamp,
    nonce,
    walletAddress: walletAddress.toLowerCase(),
  };

  if (data) {
    payload.dataHash = await hashData(JSON.stringify(data));
  }

  return {
    timestamp,
    nonce,
    payload: btoa(JSON.stringify(payload)),
  };
};

/**
 * Simple hash function for data integrity
 */
const hashData = async (data) => {
  const encoder = new TextEncoder();
  const buffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: SECURITY_CONFIG.REQUEST_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'X-Client-Version': '1.0.0',
    'X-Request-Source': 'crownmania-web',
  },
});

// Request interceptor
api.interceptors.request.use(
  async (config) => {
    // Check rate limiting
    try {
      checkRateLimit();
    } catch (err) {
      return Promise.reject(err);
    }

    // Validate connection before sensitive operations
    if (connectionValidator && config.requiresAuth !== false) {
      try {
        const isValid = await connectionValidator();
        if (!isValid) {
          return Promise.reject(new Error('Wallet connection not validated'));
        }
      } catch (err) {
        console.warn('[API] Connection validation failed:', err.message);
        // Continue anyway for non-critical requests
      }
    }

    // Add request timestamp for replay protection
    config.headers['X-Request-Timestamp'] = Date.now();

    // Add request ID for tracing
    config.headers['X-Request-ID'] = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Sign sensitive requests if wallet address available
    if (config.sensitive && config.walletAddress) {
      const signature = await signRequest(
        config.method,
        config.url,
        config.data,
        config.walletAddress
      );
      if (signature) {
        config.headers['X-Request-Signature'] = signature.payload;
        config.headers['X-Request-Timestamp'] = signature.timestamp;
        config.headers['X-Request-Nonce'] = signature.nonce;
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor with retry logic and error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;

    // If no config, can't retry
    if (!config) {
      return Promise.reject(error);
    }

    // Initialize retry count
    config.retryCount = config.retryCount || 0;

    // Handle 401/403 - session/token issues
    if (error.response?.status === 401 || error.response?.status === 403) {
      console.warn(`[API] Auth error ${error.response.status}:`, error.response.data);

      // Try to refresh session if available
      if (sessionRefresher && config.retryCount < SECURITY_CONFIG.MAX_RETRIES) {
        try {
          const refreshed = await sessionRefresher();
          if (refreshed) {
            config.retryCount += 1;
            console.log('[API] Session refreshed, retrying request...');
            return api(config);
          }
        } catch (refreshErr) {
          console.error('[API] Session refresh failed:', refreshErr);
        }
      }

      // Clear any stored auth data if refresh failed
      if (config.retryCount >= SECURITY_CONFIG.MAX_RETRIES) {
        // Optionally trigger logout or auth refresh
        console.error('[API] Max retries reached for auth error');
      }
    }

    // Retry logic for network errors or 5xx server errors
    const shouldRetry =
      !error.response || // Network error
      (error.response.status >= 500 && error.response.status < 600) || // Server error
      error.code === 'ECONNABORTED' || // Timeout
      error.code === 'ETIMEDOUT'; // Timeout

    if (shouldRetry && config.retryCount < SECURITY_CONFIG.MAX_RETRIES) {
      config.retryCount += 1;
      const delay = getRetryDelay(config.retryCount - 1);

      console.log(`[API] Retrying request (${config.retryCount}/${SECURITY_CONFIG.MAX_RETRIES}) after ${delay}ms`);

      await new Promise(resolve => setTimeout(resolve, delay));
      return api(config);
    }

    // Log security-related errors
    if (error.response?.status === 403) {
      console.error('[API] Security violation detected:', error.response.data);
    }

    return Promise.reject(error);
  }
);

/**
 * Execute API call with retry logic and rate limiting
 */
const executeAPICall = async (apiCall, options = {}) => {
  const {
    sensitive = false,
    walletAddress = null,
    requiresAuth = true,
    maxRetries = SECURITY_CONFIG.MAX_RETRIES
  } = options;

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const config = {
        sensitive,
        walletAddress,
        requiresAuth,
        retryCount: attempt,
      };

      const result = await apiCall(config);
      return result;
    } catch (error) {
      lastError = error;

      // Don't retry client errors (4xx) except 401/403 which are handled by interceptor
      if (error.response?.status >= 400 && error.response?.status < 500 &&
        error.response?.status !== 401 && error.response?.status !== 403) {
        throw error;
      }

      if (attempt < maxRetries) {
        const delay = getRetryDelay(attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
};

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
      const response = await api.get(`/api/verification/verify-product/${productId}`, {
        params,
        requiresAuth: false, // Public endpoint
      });
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
      const response = await api.post('/api/verification/verify-serial', {
        serialNumber
      }, {
        requiresAuth: false, // Public endpoint
      });
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
      }, {
        sensitive: true,
        walletAddress,
        requiresAuth: true,
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
      const response = await api.get(`/api/verification/wallet-tokens/${walletAddress}`, {
        sensitive: true,
        walletAddress,
        requiresAuth: true,
      });
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
      const response = await api.get('/api/verification/nonce', {
        requiresAuth: false, // Public endpoint
      });
      return response.data;
    } catch (error) {
      console.error('Error getting nonce:', error);
      throw error.response?.data || { error: 'Failed to get nonce' };
    }
  },

  /**
   * Verify a product by its serial number (alias for verifySerialNumber)
   * @param {string} serialNumber - The serial number
   * @returns {Promise<{verified: boolean, product: object, message: string}>}
   */
  verifySerial: async (serialNumber) => {
    try {
      const response = await api.post('/api/verification/verify-serial', {
        serialNumber
      }, {
        requiresAuth: false,
      });

      // Transform the response to include the expected fields
      const data = response.data;
      return {
        valid: data.verified,
        verified: data.verified,
        claimed: data.claimed || false,
        productId: data.product?.productId,
        editionNumber: data.product?.edition,
        edition: data.product?.edition,
        tokenAddress: data.product?.tokenAddress || data.product?.contractAddress,
        claimDate: data.product?.claimDate || data.product?.claimedAt,
        message: data.message,
        product: data.product
      };
    } catch (error) {
      console.error('Error verifying serial:', error);
      throw error.response?.data || { error: 'Failed to verify serial' };
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
   * @param {string} walletAddress - Wallet address for signing (optional)
   * @returns {Promise<{success: boolean, contentId: string, url: string}>}
   */
  uploadContent: async (formData, walletAddress = null) => {
    try {
      const response = await api.post('/api/content/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        sensitive: !!walletAddress,
        walletAddress,
        requiresAuth: true,
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
        params: { walletAddress, expiryMinutes },
        sensitive: true,
        walletAddress,
        requiresAuth: true,
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
      const response = await api.get(`/api/content/${contentId}/metadata`, {
        requiresAuth: false, // Public endpoint
      });
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
      const response = await api.get(`/api/content/product/${productId}`, {
        params,
        sensitive: !!walletAddress,
        walletAddress,
        requiresAuth: !!walletAddress,
      });
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
        params: { walletAddress },
        sensitive: true,
        walletAddress,
        requiresAuth: true,
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
        params: { url },
        requiresAuth: false, // Public endpoint
      });
      return response.data;
    } catch (error) {
      console.error('Error validating signed URL:', error);
      return { valid: false };
    }
  }
};

/**
 * Security utilities
 */
export const securityAPI = {
  /**
   * Get current rate limit status
   */
  getRateLimitStatus: () => {
    const now = Date.now();
    const windowStart = now - SECURITY_CONFIG.RATE_LIMIT_WINDOW;
    const requestsInWindow = rateLimitState.requests.filter(t => t > windowStart).length;
    const remaining = Math.max(0, SECURITY_CONFIG.MAX_REQUESTS_PER_WINDOW - requestsInWindow);

    return {
      remaining,
      limit: SECURITY_CONFIG.MAX_REQUESTS_PER_WINDOW,
      windowMs: SECURITY_CONFIG.RATE_LIMIT_WINDOW,
      blocked: rateLimitState.blockedUntil ? rateLimitState.blockedUntil > now : false,
      blockedUntil: rateLimitState.blockedUntil,
    };
  },

  /**
   * Clear rate limit (for testing/emergencies)
   */
  clearRateLimit: () => {
    rateLimitState.requests = [];
    rateLimitState.blockedUntil = null;
  },

  /**
   * Configure security settings
   */
  configure: (options) => {
    Object.assign(SECURITY_CONFIG, options);
  },
};

export default api;
