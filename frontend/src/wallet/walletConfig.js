/**
 * Wallet Configuration for Arbitrum Sepolia
 * 
 * Contains network settings, RPC URLs, and chain configuration
 * for wallet connection and transaction management
 */

export const ARBITRUM_SEPOLIA_CONFIG = {
  chainId: 421614, // Arbitrum Sepolia chain ID
  chainIdHex: '0x66e5e', // Hex format for wallet switching
  name: 'Arbitrum Sepolia',
  shortName: 'arb-sepolia',
  nativeCurrency: {
    name: 'ETH',
    symbol: 'ETH',
    decimals: 18
  },
  rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
  explorerUrl: 'https://sepolia.arbiscan.io',
  explorerApiUrl: 'https://api-sepolia.arbiscan.io/api'
};

export const SUPPORTED_NETWORKS = {
  [ARBITRUM_SEPOLIA_CONFIG.chainId]: ARBITRUM_SEPOLIA_CONFIG
};

export const DEFAULT_NETWORK = ARBITRUM_SEPOLIA_CONFIG;

/**
 * Network parameters for adding/switching to Arbitrum Sepolia
 */
export const ARBITRUM_SEPOLIA_NETWORK_PARAMS = {
  chainId: ARBITRUM_SEPOLIA_CONFIG.chainIdHex,
  chainName: ARBITRUM_SEPOLIA_CONFIG.name,
  nativeCurrency: ARBITRUM_SEPOLIA_CONFIG.nativeCurrency,
  rpcUrls: [ARBITRUM_SEPOLIA_CONFIG.rpcUrl],
  blockExplorerUrls: [ARBITRUM_SEPOLIA_CONFIG.explorerUrl]
};

/**
 * Contract addresses for ShadowID system on Arbitrum Sepolia
 * (Will be populated after deployment)
 */
export const CONTRACT_ADDRESSES = {
  DAO: process.env.REACT_APP_DAO_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000',
  GOVERNANCE_TOKEN: process.env.REACT_APP_GOVERNANCE_TOKEN_ADDRESS || '0x0000000000000000000000000000000000000000',
  TREASURY: process.env.REACT_APP_TREASURY_ADDRESS || '0x0000000000000000000000000000000000000000',
  ZK_VERIFIER: process.env.REACT_APP_ZK_VERIFIER_ADDRESS || '0x0000000000000000000000000000000000000000'
};

/**
 * Gas configuration for different transaction types
 */
export const GAS_CONFIG = {
  // Standard gas limits for common operations
  limits: {
    transfer: 21000,
    erc20Transfer: 65000,
    contractCall: 200000,
    zkProofSubmission: 500000,
    daoJoin: 350000,
    voting: 150000
  },
  
  // Gas price multipliers for different priorities
  priorities: {
    slow: 1.0,
    standard: 1.1,
    fast: 1.3,
    instant: 1.5
  }
};

/**
 * Transaction configuration
 */
export const TX_CONFIG = {
  // Confirmation requirements
  confirmations: {
    standard: 1,
    sensitive: 3,
    zkProof: 2
  },
  
  // Timeout settings (in milliseconds)
  timeouts: {
    connection: 10000,
    transaction: 120000,
    confirmation: 300000
  },
  
  // Retry configuration
  retries: {
    maxAttempts: 3,
    backoffMs: 2000
  }
};

/**
 * MetaMask detection and compatibility
 */
export const METAMASK_CONFIG = {
  // Required MetaMask version (optional)
  minimumVersion: '10.0.0',
  
  // Deep link for MetaMask installation
  installUrl: 'https://metamask.io/download/',
  
  // Mobile deep link
  mobileDeepLink: 'https://metamask.app.link/dapp/',
  
  // Connection timeout
  connectionTimeoutMs: 10000
};

/**
 * Utility functions for network management
 */
export const NetworkUtils = {
  /**
   * Check if current network is supported
   */
  isSupportedNetwork(chainId) {
    return chainId in SUPPORTED_NETWORKS;
  },

  /**
   * Get network config by chain ID
   */
  getNetworkConfig(chainId) {
    return SUPPORTED_NETWORKS[chainId] || null;
  },

  /**
   * Format chain ID for display
   */
  formatChainId(chainId) {
    const network = this.getNetworkConfig(chainId);
    return network ? network.name : `Unknown Network (${chainId})`;
  },

  /**
   * Get explorer URL for transaction
   */
  getExplorerTxUrl(txHash, chainId = DEFAULT_NETWORK.chainId) {
    const network = this.getNetworkConfig(chainId);
    return network ? `${network.explorerUrl}/tx/${txHash}` : null;
  },

  /**
   * Get explorer URL for address
   */
  getExplorerAddressUrl(address, chainId = DEFAULT_NETWORK.chainId) {
    const network = this.getNetworkConfig(chainId);
    return network ? `${network.explorerUrl}/address/${address}` : null;
  }
};

/**
 * Environment-specific configurations
 */
export const ENV_CONFIG = {
  development: {
    logLevel: 'debug',
    enableTestFeatures: true,
    mockTransactions: false
  },
  
  production: {
    logLevel: 'warn',
    enableTestFeatures: false,
    mockTransactions: false
  },
  
  testing: {
    logLevel: 'error',
    enableTestFeatures: true,
    mockTransactions: true
  }
};

// Export current environment config
export const currentEnvConfig = ENV_CONFIG[process.env.NODE_ENV] || ENV_CONFIG.development;