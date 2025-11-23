// src/config.js
// Configuration file for DAO contract deployment and Alchemy RPC settings

/**
 * DAO Contract Address on Arbitrum Sepolia Testnet  
 * This is our deployed Stylus WASM contract address
 * Successfully deployed and verified on Arbitrum Sepolia
 */
export const DAO_CONTRACT_ADDRESS = "0x6d687a8D96D3306D62152d12d036c62705fe7a46"; // Stylus WASM contract

/**
 * Alchemy API Configuration
 * Alchemy provides enterprise-grade Ethereum infrastructure
 * Sign up at https://dashboard.alchemy.com/ to get your API key
 */
export const ALCHEMY_API_KEY = import.meta.env.VITE_ALCHEMY_API_KEY || "mUJMHrybqfzOlpVeT0cj7";

/**
 * Alchemy RPC Endpoint for Arbitrum Sepolia Testnet
 * This endpoint allows us to read blockchain data without requiring wallet connection
 */
export const ALCHEMY_RPC_URL = `https://arb-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;

/**
 * Network Configuration
 */
export const NETWORK_CONFIG = {
  chainId: 421614, // Arbitrum Sepolia testnet chain ID
  name: "Arbitrum Sepolia",
  rpcUrl: ALCHEMY_RPC_URL,
  blockExplorer: "https://sepolia.arbiscan.io"
};

/**
 * Contract Event Topics
 * These are used for filtering specific events from the blockchain
 */
export const EVENT_TOPICS = {
  PROPOSAL_CREATED: "ProposalCreated(uint256,string,address,uint256)"
};
