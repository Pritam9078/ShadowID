/**
 * Wallet System Index
 * 
 * Complete wallet connection and transaction system for Arbitrum Sepolia
 * Exports all components and utilities for integration with ShadowID project
 */

// Core wallet components
export { WalletProvider, useWallet } from './WalletContext.jsx';
export { ConnectWalletButton, WalletStatus, NetworkIndicator } from './ConnectWalletButton.jsx';
export { SendTransactionForm } from './SendTransactionForm.jsx';

// Transaction service and utilities
export { 
  TransactionService, 
  TransactionUtils, 
  TransactionStatus, 
  TransactionError,
  parseEther, 
  formatEther, 
  parseUnits, 
  formatUnits 
} from './TransactionService.js';

// Configuration and constants
export {
  ARBITRUM_SEPOLIA_CONFIG,
  ARBITRUM_SEPOLIA_NETWORK_PARAMS,
  SUPPORTED_NETWORKS,
  DEFAULT_NETWORK,
  CONTRACT_ADDRESSES,
  GAS_CONFIG,
  TX_CONFIG,
  METAMASK_CONFIG,
  NetworkUtils,
  currentEnvConfig
} from './walletConfig.js';

/**
 * Quick setup hook for wallet integration
 * Provides everything needed for wallet functionality
 */
export function useWalletIntegration() {
  const wallet = useWallet();
  
  return {
    ...wallet,
    // Helper methods
    isReady: wallet.isConnected && wallet.isCorrectNetwork,
    canTransact: wallet.isConnected && wallet.isCorrectNetwork && wallet.signer,
    
    // Formatted data
    shortAddress: wallet.account ? TransactionUtils.formatAddress(wallet.account) : '',
    balanceFormatted: wallet.balance ? TransactionUtils.formatEthAmount(wallet.balance) : '0.0000'
  };
}

/**
 * Complete wallet setup component
 * Combines all wallet functionality in a single component
 */
export function WalletSetup({ children, className = '' }) {
  return (
    <WalletProvider>
      <div className={`wallet-setup ${className}`}>
        {children}
      </div>
    </WalletProvider>
  );
}

export default {
  WalletProvider,
  useWallet,
  ConnectWalletButton,
  SendTransactionForm,
  TransactionService,
  TransactionUtils
};