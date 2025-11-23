// Primary contracts on Arbitrum Sepolia (matches backend deployment)
export const CONTRACTS = {
  // Stylus WASM contract (main identity verification functionality)
  ShadowIDStylus: {
    address: "0x6d687a8D96D3306D62152d12d036c62705fe7a46",
    abi: [], // Stylus contract ABI - to be added
    type: "stylus"
  },
  // Solidity contracts (mock addresses for compatibility)
  GovernanceToken: {
    address: "0x2345678901234567890123456789012345678901",
    abi: [], // Will be populated by build process
    type: "erc20"
  },
  Treasury: {
    address: "0x3456789012345678901234567890123456789012", 
    abi: [], // Will be populated by build process
    type: "treasury"
  },
  // Legacy DAO contract (for backward compatibility)
  DAO: {
    address: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
    abi: [], // Will be populated by build process
    type: "legacy"
  },
};

// Primary network configuration - Arbitrum Sepolia (matches deployed backend)
export const NETWORK_CONFIG = {
  chainId: 421614,
  name: "arbitrum-sepolia",
  rpcUrl: "https://arb-sepolia.g.alchemy.com/v2/mUJMHrybqfzOlpVeT0cj7",
  explorerUrl: "https://sepolia.arbiscan.io",
};

// Localhost configuration for development
export const LOCALHOST_NETWORK_CONFIG = {
  chainId: 31337,
  name: "localhost", 
  rpcUrl: "http://127.0.0.1:8545",
  explorerUrl: "http://localhost:8545",
};

// Current network contract addresses (Arbitrum Sepolia)
export const CONTRACT_ADDRESSES = {
  // Main Stylus identity verification contract
  ShadowIDStylus: "0x6d687a8D96D3306D62152d12d036c62705fe7a46",
  // Supporting contracts
  GovernanceToken: "0x2345678901234567890123456789012345678901",
  Treasury: "0x3456789012345678901234567890123456789012",
  // Legacy
  DAO: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
};

// Legacy exports for backward compatibility
export const LOCALHOST_ADDRESSES = {
  GOVERNANCE_TOKEN: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  DAO: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
  TREASURY: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
};

// Arbitrum Sepolia addresses (production deployment)
export const SEPOLIA_ADDRESSES = {
  // Main Stylus contract
  SHADOWID_STYLUS: "0x6d687a8D96D3306D62152d12d036c62705fe7a46",
  // Supporting contracts
  GOVERNANCE_TOKEN: "0x2345678901234567890123456789012345678901",
  TREASURY: "0x3456789012345678901234567890123456789012",
  // Legacy compatibility
  DAO: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
};

// Governance parameters for proposal creation
export const GOVERNANCE_PARAMS = {
  VOTING_DELAY: 1, // 1 block delay before voting starts
  VOTING_PERIOD: 50400, // ~1 week in blocks (assuming 12s per block)
  PROPOSAL_THRESHOLD: "100000000000000000000", // 100 tokens minimum to create proposal
  QUORUM_PERCENTAGE: 4, // 4% quorum required
};
