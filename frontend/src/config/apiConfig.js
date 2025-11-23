/**
 * @fileoverview API Configuration for Verifier Services
 * Centralized configuration for all API endpoints and services
 */

// Environment-based configuration
export const API_CONFIG = {
  // Base URLs
  BASE_URL: import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001',
  ZK_SERVICE_URL: import.meta.env.VITE_ZK_SERVICE_URL || 'http://localhost:3001',
  WS_URL: import.meta.env.VITE_WS_URL || 'ws://localhost:3001',
  
  // API Keys
  ZK_API_KEY: import.meta.env.VITE_ZK_API_KEY || 'shadowid-client-key-2025',
  ALCHEMY_API_KEY: import.meta.env.VITE_ALCHEMY_API_KEY || '',
  
  // Timeouts and limits
  REQUEST_TIMEOUT: 30000, // 30 seconds
  UPLOAD_TIMEOUT: 120000, // 2 minutes for file uploads
  CACHE_DURATION: 5 * 60 * 1000, // 5 minutes
  PROOF_CACHE_DURATION: 24 * 60 * 60 * 1000, // 24 hours
  
  // Retry configuration
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second
  
  // File upload limits
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_FILE_TYPES: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
};

// API Endpoints
export const ENDPOINTS = {
  // Health check
  HEALTH: '/health',
  
  // KYC endpoints
  KYC: {
    START: '/api/kyc/start',
    STATUS: (walletAddress) => `/api/kyc/status/${walletAddress}`,
    UPDATE: (walletAddress) => `/api/kyc/${walletAddress}`,
    DELETE: (walletAddress) => `/api/kyc/${walletAddress}`,
    ZK_IDENTITY: (walletAddress) => `/api/kyc/zk-identity/${walletAddress}`,
    STATS: '/api/kyc/stats'
  },
  
  // KYB endpoints
  KYB: {
    START: '/api/kyb/start',
    STATUS: (walletAddress) => `/api/kyb/status/${walletAddress}`,
    UPDATE: (walletAddress) => `/api/kyb/${walletAddress}`,
    DELETE: (walletAddress) => `/api/kyb/${walletAddress}`,
    STATS: '/api/kyb/stats'
  },
  
  // ZK Proof endpoints
  ZK: {
    AGE_PROOF: '/api/zk/age-proof',
    CITIZENSHIP_PROOF: '/api/zk/citizenship-proof',
    BUSINESS_PROOF: '/api/zk/business-proof',
    VERIFY: '/api/zk/verify',
    STATUS: (proofHash) => `/api/zk/status/${proofHash}`,
    SUBMIT_PROOF: '/api/zk/submit-proof',
    IDENTITY: (walletAddress) => `/api/zk/identity/${walletAddress}`,
    AGGREGATE_IDENTITY: '/api/zk/aggregate-identity',
    STATS: '/api/zk/stats',
    CIRCUITS: '/zk/circuits',
    COMMITMENT: '/zk/commitment',
    PROVE: (circuit) => `/zk/prove/${circuit}`
  }
};

// Error codes and messages
export const ERROR_CODES = {
  // Network errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  
  // Authentication errors
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  ACCESS_DENIED: 'ACCESS_DENIED',
  
  // KYC/KYB errors
  KYC_START_FAILED: 'KYC_START_FAILED',
  KYC_STATUS_FAILED: 'KYC_STATUS_FAILED',
  KYB_START_FAILED: 'KYB_START_FAILED',
  KYB_STATUS_FAILED: 'KYB_STATUS_FAILED',
  
  // ZK Proof errors
  AGE_PROOF_FAILED: 'AGE_PROOF_FAILED',
  CITIZENSHIP_PROOF_FAILED: 'CITIZENSHIP_PROOF_FAILED',
  BUSINESS_PROOF_FAILED: 'BUSINESS_PROOF_FAILED',
  PROOF_VERIFICATION_FAILED: 'PROOF_VERIFICATION_FAILED',
  
  // File upload errors
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  UPLOAD_FAILED: 'UPLOAD_FAILED',
  
  // Data validation errors
  INVALID_WALLET_ADDRESS: 'INVALID_WALLET_ADDRESS',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_DATA_FORMAT: 'INVALID_DATA_FORMAT'
};

// Success messages
export const SUCCESS_MESSAGES = {
  KYC_STARTED: 'KYC verification process started successfully',
  KYB_STARTED: 'KYB verification process started successfully',
  PROOF_GENERATED: 'ZK proof generated successfully',
  PROOF_VERIFIED: 'Proof verification completed',
  DATA_UPDATED: 'Data updated successfully',
  DATA_DELETED: 'Data deleted successfully'
};

// Status constants
export const VERIFICATION_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  EXPIRED: 'expired'
};

export const PROOF_STATUS = {
  GENERATING: 'generating',
  GENERATED: 'generated',
  SUBMITTING: 'submitting',
  VERIFIED: 'verified',
  FAILED: 'failed'
};

// Circuit names for ZK proofs
export const ZK_CIRCUITS = {
  AGE_VERIFICATION: 'age_verification',
  CITIZENSHIP_PROOF: 'citizenship_proof',
  BUSINESS_REGISTRATION: 'business_registration',
  UBO_PROOF: 'ubo_proof',
  REVENUE_THRESHOLD: 'revenue_threshold'
};

// Default configuration for different environments
export const ENV_CONFIGS = {
  development: {
    DEBUG: true,
    VERBOSE_LOGGING: true,
    MOCK_RESPONSES: false
  },
  
  production: {
    DEBUG: false,
    VERBOSE_LOGGING: false,
    MOCK_RESPONSES: false
  },
  
  test: {
    DEBUG: true,
    VERBOSE_LOGGING: true,
    MOCK_RESPONSES: true
  }
};

// Get current environment configuration
export const getCurrentEnvConfig = () => {
  const env = import.meta.env.VITE_NODE_ENV || 'development';
  return ENV_CONFIGS[env] || ENV_CONFIGS.development;
};

// Validation utilities
export const VALIDATION = {
  /**
   * Validate wallet address format
   * @param {string} address - Wallet address to validate
   * @returns {boolean} True if valid
   */
  isValidWalletAddress: (address) => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  },
  
  /**
   * Validate file size
   * @param {File} file - File to validate
   * @returns {boolean} True if valid
   */
  isValidFileSize: (file) => {
    return file.size <= API_CONFIG.MAX_FILE_SIZE;
  },
  
  /**
   * Validate file type
   * @param {File} file - File to validate
   * @returns {boolean} True if valid
   */
  isValidFileType: (file) => {
    return API_CONFIG.ALLOWED_FILE_TYPES.includes(file.type);
  },
  
  /**
   * Validate email format
   * @param {string} email - Email to validate
   * @returns {boolean} True if valid
   */
  isValidEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
};

export default {
  API_CONFIG,
  ENDPOINTS,
  ERROR_CODES,
  SUCCESS_MESSAGES,
  VERIFICATION_STATUS,
  PROOF_STATUS,
  ZK_CIRCUITS,
  getCurrentEnvConfig,
  VALIDATION
};