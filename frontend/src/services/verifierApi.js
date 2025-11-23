import axios from 'axios';

/**
 * @fileoverview Verifier API Service
 * Provides KYC/KYB and ZK Proof API endpoints for Verifier functionality
 * 
 * @typedef {Object} ApiResponse
 * @property {boolean} success - Indicates if the request was successful
 * @property {*} data - Response data
 * @property {string} [message] - Optional message
 * @property {string} [error] - Error message if request failed
 * 
 * @typedef {Object} KYCData
 * @property {string} walletAddress - User's wallet address
 * @property {string} fullName - User's full name
 * @property {string} dateOfBirth - Date of birth
 * @property {string} nationality - User's nationality
 * @property {File} idDocument - Identity document file
 * @property {File} selfie - Selfie photo for verification
 * 
 * @typedef {Object} KYBData
 * @property {string} walletAddress - Business wallet address
 * @property {string} businessName - Legal business name
 * @property {string} registrationNumber - Business registration number
 * @property {string} businessType - Type of business entity
 * @property {string} jurisdiction - Business jurisdiction
 * @property {File} businessDocs - Business documents file
 */

const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
const ZK_SERVICE_URL = import.meta.env.VITE_ZK_SERVICE_URL || API_BASE;

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 30000, // 30 seconds for file uploads
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('[Verifier API] Request failed:', error.message);
    return Promise.reject(error);
  }
);

/**
 * Verifier API Service Class
 * Handles all KYC, KYB, and ZK proof operations
 */
export class VerifierApiService {
  
  constructor() {
    this.zkApiKey = import.meta.env.VITE_ZK_API_KEY || 'shadowid-client-key-2025';
  }

  /**
   * Get enhanced headers with ZK API key
   * @returns {Object} Headers object
   */
  getZkHeaders() {
    return {
      'Content-Type': 'application/json',
      'x-api-key': this.zkApiKey,
      'Authorization': `Bearer ${localStorage.getItem('auth_token') || ''}`
    };
  }

  // ========================================================================
  // KYC (Know Your Customer) Verification
  // ========================================================================

  /**
   * Start KYC verification process
   * @param {FormData|KYCData} formData - KYC form data with documents
   * @returns {Promise<ApiResponse>} KYC initiation response
   */
  async startKyc(formData) {
    try {
      const response = await apiClient.post('/api/kyc/start', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      // Store KYC session ID for tracking
      if (response.data?.sessionId) {
        localStorage.setItem('kyc_session_id', response.data.sessionId);
      }
      
      return response;
    } catch (error) {
      console.error('[VerifierAPI] KYC start failed:', error);
      throw this._enhanceError(error, 'KYC_START_FAILED');
    }
  }

  /**
   * Get KYC verification status
   * @param {string} walletAddress - User's wallet address
   * @returns {Promise<ApiResponse>} KYC status response
   */
  async getKycStatus(walletAddress) {
    try {
      const response = await apiClient.get(`/api/kyc/status/${walletAddress}`);
      
      // Cache status for offline access
      if (response.data?.status) {
        localStorage.setItem(`kyc_status_${walletAddress}`, JSON.stringify({
          status: response.data.status,
          timestamp: Date.now(),
          expires: Date.now() + (5 * 60 * 1000) // 5 minutes cache
        }));
      }
      
      return response;
    } catch (error) {
      // Try to return cached status if available
      const cached = this._getCachedStatus('kyc', walletAddress);
      if (cached) {
        return { data: cached };
      }
      throw this._enhanceError(error, 'KYC_STATUS_FAILED');
    }
  }

  /**
   * Update KYC information
   * @param {string} walletAddress - User's wallet address
   * @param {FormData} updateData - Updated KYC data
   * @returns {Promise<ApiResponse>} Update response
   */
  async updateKyc(walletAddress, updateData) {
    return apiClient.put(`/api/kyc/${walletAddress}`, updateData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  }

  /**
   * Delete KYC data
   * @param {string} walletAddress - User's wallet address
   * @returns {Promise<ApiResponse>} Deletion response
   */
  async deleteKyc(walletAddress) {
    const response = await apiClient.delete(`/api/kyc/${walletAddress}`);
    // Clear cached data
    localStorage.removeItem(`kyc_status_${walletAddress}`);
    return response;
  }

  // ========================================================================
  // KYB (Know Your Business) Verification
  // ========================================================================

  /**
   * Start KYB verification process
   * @param {FormData|KYBData} formData - KYB form data with documents
   * @returns {Promise<ApiResponse>} KYB initiation response
   */
  async startKyb(formData) {
    try {
      const response = await apiClient.post('/api/kyb/start', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      // Store KYB session ID for tracking
      if (response.data?.sessionId) {
        localStorage.setItem('kyb_session_id', response.data.sessionId);
      }
      
      return response;
    } catch (error) {
      console.error('[VerifierAPI] KYB start failed:', error);
      throw this._enhanceError(error, 'KYB_START_FAILED');
    }
  }

  /**
   * Get KYB verification status
   * @param {string} walletAddress - Business wallet address
   * @returns {Promise<ApiResponse>} KYB status response
   */
  async getKybStatus(walletAddress) {
    try {
      const response = await apiClient.get(`/api/kyb/status/${walletAddress}`);
      
      // Cache status for offline access
      if (response.data?.status) {
        localStorage.setItem(`kyb_status_${walletAddress}`, JSON.stringify({
          status: response.data.status,
          timestamp: Date.now(),
          expires: Date.now() + (5 * 60 * 1000) // 5 minutes cache
        }));
      }
      
      return response;
    } catch (error) {
      // Try to return cached status if available
      const cached = this._getCachedStatus('kyb', walletAddress);
      if (cached) {
        return { data: cached };
      }
      throw this._enhanceError(error, 'KYB_STATUS_FAILED');
    }
  }

  /**
   * Update KYB information
   * @param {string} walletAddress - Business wallet address
   * @param {FormData} updateData - Updated KYB data
   * @returns {Promise<ApiResponse>} Update response
   */
  async updateKyb(walletAddress, updateData) {
    return apiClient.put(`/api/kyb/${walletAddress}`, updateData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  }

  /**
   * Delete KYB data
   * @param {string} walletAddress - Business wallet address
   * @returns {Promise<ApiResponse>} Deletion response
   */
  async deleteKyb(walletAddress) {
    const response = await apiClient.delete(`/api/kyb/${walletAddress}`);
    // Clear cached data
    localStorage.removeItem(`kyb_status_${walletAddress}`);
    return response;
  }

  // ========================================================================
  // ZK Proof Generation
  // ========================================================================

  /**
   * Generate age verification proof
   * @param {string} walletAddress - User's wallet address
   * @param {number} minAge - Minimum age requirement (default: 18)
   * @returns {Promise<ApiResponse>} Age proof response
   */
  async generateAgeProof(walletAddress, minAge = 18) {
    try {
      const response = await apiClient.post('/api/zk/age-proof', { 
        walletAddress,
        minAge,
        timestamp: Date.now()
      }, {
        headers: this.getZkHeaders()
      });
      
      // Cache proof for later use
      if (response.data?.proof) {
        this._cacheProof('age', walletAddress, response.data);
      }
      
      return response;
    } catch (error) {
      throw this._enhanceError(error, 'AGE_PROOF_FAILED');
    }
  }

  /**
   * Generate citizenship verification proof
   * @param {string} walletAddress - User's wallet address
   * @param {string} country - Country code (default: 'US')
   * @returns {Promise<ApiResponse>} Citizenship proof response
   */
  async generateCitizenshipProof(walletAddress, country = 'US') {
    try {
      const response = await apiClient.post('/api/zk/citizenship-proof', { 
        walletAddress,
        country,
        timestamp: Date.now()
      }, {
        headers: this.getZkHeaders()
      });
      
      // Cache proof for later use
      if (response.data?.proof) {
        this._cacheProof('citizenship', walletAddress, response.data);
      }
      
      return response;
    } catch (error) {
      throw this._enhanceError(error, 'CITIZENSHIP_PROOF_FAILED');
    }
  }

  /**
   * Generate business verification proof
   * @param {string} walletAddress - Business wallet address
   * @returns {Promise<ApiResponse>} Business proof response
   */
  async generateBusinessProof(walletAddress) {
    try {
      const response = await apiClient.post('/api/zk/business-proof', { 
        walletAddress,
        timestamp: Date.now()
      }, {
        headers: this.getZkHeaders()
      });
      
      // Cache proof for later use
      if (response.data?.proof) {
        this._cacheProof('business', walletAddress, response.data);
      }
      
      return response;
    } catch (error) {
      throw this._enhanceError(error, 'BUSINESS_PROOF_FAILED');
    }
  }

  // ZK Proof Verification
  async verifyProof(proof) {
    return apiClient.post('/api/zk/verify', { proof });
  }

  async getProofStatus(proofHash) {
    return apiClient.get(`/api/zk/status/${proofHash}`);
  }

  // Identity Registry
  async getIdentityStatus(walletAddress) {
    return apiClient.get(`/api/zk/identity/${walletAddress}`);
  }

  async submitIdentityProof(walletAddress, proof) {
    return apiClient.post('/api/zk/submit-proof', {
      walletAddress,
      proof
    });
  }

  // Enhanced ZK Integration
  async aggregateIdentityProofs(walletAddress, proofIds) {
    return apiClient.post('/api/zk/aggregate-identity', {
      walletAddress,
      proofIds
    });
  }

  async getKycZkIdentity(walletAddress) {
    return apiClient.get(`/api/kyc/zk-identity/${walletAddress}`);
  }

  async getZkStats() {
    return apiClient.get('/api/zk/stats');
  }

  // ========================================================================
  // UTILITY METHODS
  // ========================================================================

  /**
   * Cache proof data locally
   * @private
   * @param {string} type - Proof type
   * @param {string} walletAddress - User's wallet address
   * @param {Object} proofData - Proof data to cache
   */
  _cacheProof(type, walletAddress, proofData) {
    const cacheKey = `zk_proof_${type}_${walletAddress}`;
    const cacheData = {
      ...proofData,
      cached: true,
      timestamp: Date.now(),
      expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    };
    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
  }

  /**
   * Get cached status
   * @private
   * @param {string} type - Status type (kyc/kyb)
   * @param {string} walletAddress - User's wallet address
   * @returns {Object|null} Cached status or null
   */
  _getCachedStatus(type, walletAddress) {
    const cached = localStorage.getItem(`${type}_status_${walletAddress}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed.expires > Date.now()) {
        return parsed;
      }
      localStorage.removeItem(`${type}_status_${walletAddress}`);
    }
    return null;
  }

  /**
   * Get cached proof
   * @param {string} type - Proof type
   * @param {string} walletAddress - User's wallet address
   * @returns {Object|null} Cached proof or null
   */
  getCachedProof(type, walletAddress) {
    const cacheKey = `zk_proof_${type}_${walletAddress}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed.expires > Date.now()) {
        return parsed;
      }
      localStorage.removeItem(cacheKey);
    }
    return null;
  }

  /**
   * Clear all cached data for a wallet
   * @param {string} walletAddress - User's wallet address
   */
  clearCache(walletAddress) {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.includes(walletAddress)) {
        localStorage.removeItem(key);
      }
    });
  }

  /**
   * Enhance error with additional context
   * @private
   * @param {Error} error - Original error
   * @param {string} code - Error code
   * @returns {Error} Enhanced error
   */
  _enhanceError(error, code) {
    const enhanced = new Error(
      error.response?.data?.message || error.message || 'API request failed'
    );
    enhanced.code = code;
    enhanced.status = error.response?.status;
    enhanced.originalError = error;
    return enhanced;
  }

  /**
   * Check service health
   * @returns {Promise<boolean>} True if service is healthy
   */
  async healthCheck() {
    try {
      const response = await apiClient.get('/health');
      return response.status === 200;
    } catch (error) {
      console.warn('[VerifierAPI] Health check failed:', error);
      return false;
    }
  }

  /**
   * Get service statistics
   * @returns {Promise<Object>} Service statistics
   */
  async getServiceStats() {
    try {
      const [kycStats, kybStats, zkStats] = await Promise.all([
        apiClient.get('/api/kyc/stats'),
        apiClient.get('/api/kyb/stats'),
        this.getZkStats()
      ]);
      
      return {
        kyc: kycStats.data,
        kyb: kybStats.data,
        zk: zkStats.data,
        timestamp: Date.now()
      };
    } catch (error) {
      throw this._enhanceError(error, 'STATS_FAILED');
    }
  }
}

// Export singleton instance
export const verifierApi = new VerifierApiService();

// Export axios instance for direct use if needed
export { apiClient as axiosInstance };

// For backward compatibility with existing backendApi usage in Verifier component
export const backendApi = {
  post: (url, data, config) => apiClient.post(url, data, config),
  get: (url, config) => apiClient.get(url, config),
  put: (url, data, config) => apiClient.put(url, data, config),
  delete: (url, config) => apiClient.delete(url, config)
};

export default verifierApi;