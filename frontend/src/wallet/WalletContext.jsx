/**
 * WalletContext.jsx
 * 
 * React Context Provider for wallet state management
 * Handles MetaMask connection, network switching, and account management
 */

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { BrowserProvider } from 'ethers';
import { 
  ARBITRUM_SEPOLIA_CONFIG, 
  ARBITRUM_SEPOLIA_NETWORK_PARAMS, 
  METAMASK_CONFIG,
  NetworkUtils,
  currentEnvConfig
} from './walletConfig.js';

// Initial wallet state
const initialState = {
  // Connection status
  isConnected: false,
  isConnecting: false,
  
  // Account information
  account: null,
  balance: '0',
  
  // Network information
  chainId: null,
  network: null,
  isCorrectNetwork: false,
  
  // Provider instances
  provider: null,
  signer: null,
  
  // Error handling
  error: null,
  
  // MetaMask availability
  isMetaMaskInstalled: false,
  isMetaMaskAvailable: false
};

// Action types for reducer
const WalletActionTypes = {
  SET_CONNECTING: 'SET_CONNECTING',
  SET_CONNECTED: 'SET_CONNECTED',
  SET_DISCONNECTED: 'SET_DISCONNECTED',
  SET_ACCOUNT: 'SET_ACCOUNT',
  SET_BALANCE: 'SET_BALANCE',
  SET_NETWORK: 'SET_NETWORK',
  SET_PROVIDER: 'SET_PROVIDER',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  SET_METAMASK_STATUS: 'SET_METAMASK_STATUS'
};

// Wallet state reducer
function walletReducer(state, action) {
  switch (action.type) {
    case WalletActionTypes.SET_CONNECTING:
      return {
        ...state,
        isConnecting: action.payload,
        error: action.payload ? null : state.error
      };

    case WalletActionTypes.SET_CONNECTED:
      return {
        ...state,
        isConnected: true,
        isConnecting: false,
        error: null
      };

    case WalletActionTypes.SET_DISCONNECTED:
      return {
        ...initialState,
        isMetaMaskInstalled: state.isMetaMaskInstalled,
        isMetaMaskAvailable: state.isMetaMaskAvailable
      };

    case WalletActionTypes.SET_ACCOUNT:
      return {
        ...state,
        account: action.payload
      };

    case WalletActionTypes.SET_BALANCE:
      return {
        ...state,
        balance: action.payload
      };

    case WalletActionTypes.SET_NETWORK:
      const { chainId, network } = action.payload;
      return {
        ...state,
        chainId,
        network,
        isCorrectNetwork: chainId === ARBITRUM_SEPOLIA_CONFIG.chainId
      };

    case WalletActionTypes.SET_PROVIDER:
      return {
        ...state,
        provider: action.payload.provider,
        signer: action.payload.signer
      };

    case WalletActionTypes.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        isConnecting: false
      };

    case WalletActionTypes.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };

    case WalletActionTypes.SET_METAMASK_STATUS:
      return {
        ...state,
        isMetaMaskInstalled: action.payload.installed,
        isMetaMaskAvailable: action.payload.available
      };

    default:
      return state;
  }
}

// Create the context
const WalletContext = createContext();

/**
 * WalletProvider Component
 * Provides wallet functionality to the entire app
 */
export function WalletProvider({ children }) {
  const [state, dispatch] = useReducer(walletReducer, initialState);

  // Utility function for logging
  const log = useCallback((level, message, data = {}) => {
    if (currentEnvConfig.logLevel === 'debug' || 
        (currentEnvConfig.logLevel === 'warn' && level !== 'debug') ||
        (currentEnvConfig.logLevel === 'error' && level === 'error')) {
      console[level](`[WalletProvider] ${message}`, data);
    }
  }, []);

  // Check MetaMask availability
  const checkMetaMaskAvailability = useCallback(() => {
    const installed = typeof window !== 'undefined' && 
                     typeof window.ethereum !== 'undefined' &&
                     window.ethereum.isMetaMask;
    
    const available = installed && window.ethereum.isConnected?.();

    dispatch({
      type: WalletActionTypes.SET_METAMASK_STATUS,
      payload: { installed, available: available || installed }
    });

    log('debug', 'MetaMask status checked', { installed, available });
    return installed;
  }, [log]);

  // Initialize provider and signer
  const initializeProvider = useCallback(async () => {
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask not found');
      }

      const provider = new BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      const signer = await provider.getSigner();

      dispatch({
        type: WalletActionTypes.SET_PROVIDER,
        payload: { provider, signer }
      });

      dispatch({
        type: WalletActionTypes.SET_NETWORK,
        payload: {
          chainId: Number(network.chainId),
          network: NetworkUtils.getNetworkConfig(Number(network.chainId))
        }
      });

      log('debug', 'Provider initialized', { chainId: Number(network.chainId) });
      return { provider, signer };
    } catch (error) {
      log('error', 'Failed to initialize provider', { error: error.message });
      throw error;
    }
  }, [log]);

  // Get account balance
  const updateBalance = useCallback(async (address, provider) => {
    try {
      if (!provider || !address) return;
      
      const balance = await provider.getBalance(address);
      const formattedBalance = (Number(balance) / 1e18).toFixed(6);
      
      dispatch({
        type: WalletActionTypes.SET_BALANCE,
        payload: formattedBalance
      });

      log('debug', 'Balance updated', { address, balance: formattedBalance });
    } catch (error) {
      log('error', 'Failed to update balance', { error: error.message });
    }
  }, [log]);

  // Switch to Arbitrum Sepolia network
  const switchToArbitrumSepolia = useCallback(async () => {
    if (!window.ethereum) {
      throw new Error('MetaMask not available');
    }

    try {
      // First try to switch to the network
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: ARBITRUM_SEPOLIA_CONFIG.chainIdHex }]
      });

      log('debug', 'Switched to Arbitrum Sepolia');
    } catch (switchError) {
      // If the network doesn't exist, add it
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [ARBITRUM_SEPOLIA_NETWORK_PARAMS]
          });
          log('debug', 'Added and switched to Arbitrum Sepolia');
        } catch (addError) {
          log('error', 'Failed to add Arbitrum Sepolia network', { error: addError.message });
          throw addError;
        }
      } else {
        log('error', 'Failed to switch network', { error: switchError.message });
        throw switchError;
      }
    }
  }, [log]);

  // Connect wallet
  const connect = useCallback(async () => {
    if (!checkMetaMaskAvailability()) {
      const error = new Error('MetaMask is not installed');
      dispatch({ type: WalletActionTypes.SET_ERROR, payload: error.message });
      return false;
    }

    dispatch({ type: WalletActionTypes.SET_CONNECTING, payload: true });

    try {
      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }

      // Initialize provider and signer
      const { provider } = await initializeProvider();
      
      // Set account
      const account = accounts[0];
      dispatch({ type: WalletActionTypes.SET_ACCOUNT, payload: account });

      // Update balance
      await updateBalance(account, provider);

      // Check if we need to switch networks
      if (!state.isCorrectNetwork) {
        await switchToArbitrumSepolia();
        // Re-initialize after network switch
        await initializeProvider();
      }

      dispatch({ type: WalletActionTypes.SET_CONNECTED });
      log('debug', 'Wallet connected successfully', { account });
      
      return true;
    } catch (error) {
      log('error', 'Failed to connect wallet', { error: error.message });
      dispatch({ type: WalletActionTypes.SET_ERROR, payload: error.message });
      return false;
    }
  }, [checkMetaMaskAvailability, initializeProvider, updateBalance, switchToArbitrumSepolia, state.isCorrectNetwork, log]);

  // Disconnect wallet
  const disconnect = useCallback(() => {
    dispatch({ type: WalletActionTypes.SET_DISCONNECTED });
    log('debug', 'Wallet disconnected');
  }, [log]);

  // Handle account changes
  const handleAccountsChanged = useCallback((accounts) => {
    log('debug', 'Accounts changed', { accounts });
    
    if (accounts.length === 0) {
      disconnect();
    } else {
      dispatch({ type: WalletActionTypes.SET_ACCOUNT, payload: accounts[0] });
      if (state.provider) {
        updateBalance(accounts[0], state.provider);
      }
    }
  }, [disconnect, state.provider, updateBalance, log]);

  // Handle chain changes
  const handleChainChanged = useCallback(async (chainIdHex) => {
    const chainId = parseInt(chainIdHex, 16);
    log('debug', 'Chain changed', { chainId, chainIdHex });
    
    // Re-initialize provider to get updated network info
    try {
      await initializeProvider();
    } catch (error) {
      log('error', 'Failed to handle chain change', { error: error.message });
    }
  }, [initializeProvider, log]);

  // Handle disconnection
  const handleDisconnect = useCallback((error) => {
    log('debug', 'MetaMask disconnected', { error });
    disconnect();
  }, [disconnect, log]);

  // Clear error
  const clearError = useCallback(() => {
    dispatch({ type: WalletActionTypes.CLEAR_ERROR });
  }, []);

  // Auto-reconnect on page load
  const autoConnect = useCallback(async () => {
    if (!checkMetaMaskAvailability()) {
      return false;
    }

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_accounts'
      });

      if (accounts.length > 0) {
        log('debug', 'Auto-connecting to existing session');
        return await connect();
      }
    } catch (error) {
      log('error', 'Auto-connect failed', { error: error.message });
    }

    return false;
  }, [checkMetaMaskAvailability, connect, log]);

  // Initialize wallet on component mount
  useEffect(() => {
    checkMetaMaskAvailability();
    autoConnect();
  }, [checkMetaMaskAvailability, autoConnect]);

  // Set up event listeners
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
      window.ethereum.on('disconnect', handleDisconnect);

      // Cleanup listeners
      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
        window.ethereum.removeListener('disconnect', handleDisconnect);
      };
    }
  }, [handleAccountsChanged, handleChainChanged, handleDisconnect]);

  // Context value
  const contextValue = {
    // State
    ...state,
    
    // Actions
    connect,
    disconnect,
    switchToArbitrumSepolia,
    clearError,
    updateBalance: () => updateBalance(state.account, state.provider),
    
    // Utilities
    formatAddress: (address) => address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '',
    getExplorerTxUrl: (txHash) => NetworkUtils.getExplorerTxUrl(txHash, state.chainId),
    getExplorerAddressUrl: (address) => NetworkUtils.getExplorerAddressUrl(address, state.chainId)
  };

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  );
}

/**
 * useWallet Hook
 * Custom hook to access wallet context
 */
export function useWallet() {
  const context = useContext(WalletContext);
  
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  
  return context;
}

export default WalletContext;