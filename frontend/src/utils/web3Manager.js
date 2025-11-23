// Web3 Provider Manager
// Handles multiple wallet provider conflicts and provides a unified interface

class Web3ProviderManager {
  constructor() {
    this.providers = new Map();
    this.activeProvider = null;
    this.initialized = false;
    
    this.init();
  }

  init() {
    if (this.initialized) return;
    
    try {
      this.detectProviders();
      this.handleProviderConflicts();
      this.setupProviderListeners();
      this.initialized = true;
    } catch (error) {
      console.warn('[ShadowID] Failed to initialize Web3 provider manager:', error.message);
    }
  }

  detectProviders() {
    // Detect MetaMask
    if (window.ethereum?.isMetaMask) {
      this.providers.set('metamask', window.ethereum);
    }
    
    // Detect Coinbase Wallet
    if (window.ethereum?.isCoinbaseWallet) {
      this.providers.set('coinbase', window.ethereum);
    }
    
    // Detect Trust Wallet
    if (window.ethereum?.isTrust) {
      this.providers.set('trust', window.ethereum);
    }
    
    // Detect Brave Wallet
    if (window.ethereum?.isBraveWallet) {
      this.providers.set('brave', window.ethereum);
    }
    
    // Detect generic Ethereum provider
    if (window.ethereum && !this.providers.size) {
      this.providers.set('generic', window.ethereum);
    }
    
    // Suppress Phantom/Solana warnings if detected
    if (window.solana || window.phantom) {
      this.suppressSolanaWarnings();
    }
  }

  handleProviderConflicts() {
    // If multiple providers exist, choose the preferred one
    const preferenceOrder = ['metamask', 'coinbase', 'trust', 'brave', 'generic'];
    
    for (const provider of preferenceOrder) {
      if (this.providers.has(provider)) {
        this.activeProvider = this.providers.get(provider);
        break;
      }
    }
    
    // Suppress provider conflict warnings
    this.suppressProviderConflicts();
  }

  suppressProviderConflicts() {
    // Override Object.defineProperty to prevent provider redefinition errors
    const originalDefineProperty = Object.defineProperty;
    
    Object.defineProperty = function(obj, prop, descriptor) {
      if (prop === 'ethereum' && obj === window) {
        // Check if the property already exists and is non-configurable
        const existingDescriptor = Object.getOwnPropertyDescriptor(obj, prop);
        if (existingDescriptor && existingDescriptor.configurable === false) {
          // Silently ignore attempts to redefine non-configurable properties
          console.log('[ShadowID] Prevented redefinition of non-configurable ethereum property');
          return obj;
        }
      }
      
      if ((prop === 'web3' || prop === 'solana') && obj === window) {
        // Check if the property already exists and is non-configurable
        const existingDescriptor = Object.getOwnPropertyDescriptor(obj, prop);
        if (existingDescriptor && existingDescriptor.configurable === false) {
          // Silently ignore attempts to redefine non-configurable properties
          console.log(`[ShadowID] Prevented redefinition of non-configurable ${prop} property`);
          return obj;
        }
      }
      
      try {
        return originalDefineProperty.call(this, obj, prop, descriptor);
      } catch (error) {
        if (error.message.includes('Cannot redefine property')) {
          console.log(`[ShadowID] Property redefinition prevented: ${prop}`);
          return obj;
        }
        throw error;
      }
    };
  }

  suppressSolanaWarnings() {
    // Provide a minimal Solana interface to prevent errors
    if (!window.solana) {
      window.solana = {
        isPhantom: false,
        isConnected: false,
        publicKey: null,
        connect: () => Promise.reject(new Error('Solana wallet not available')),
        disconnect: () => Promise.resolve(),
        signTransaction: () => Promise.reject(new Error('Solana wallet not available')),
        signAllTransactions: () => Promise.reject(new Error('Solana wallet not available')),
        on: () => {},
        off: () => {},
        removeListener: () => {}
      };
    }
  }

  setupProviderListeners() {
    if (!this.activeProvider) return;

    // Handle account changes
    this.activeProvider.on?.('accountsChanged', (accounts) => {
      console.log('[ShadowID] Accounts changed:', accounts.length > 0 ? 'Connected' : 'Disconnected');
    });

    // Handle chain changes
    this.activeProvider.on?.('chainChanged', (chainId) => {
      console.log('[ShadowID] Chain changed:', chainId);
    });

    // Handle connection
    this.activeProvider.on?.('connect', (connectInfo) => {
      console.log('[ShadowID] Wallet connected:', connectInfo);
    });

    // Handle disconnection
    this.activeProvider.on?.('disconnect', (error) => {
      console.log('[ShadowID] Wallet disconnected:', error?.message || 'Unknown reason');
    });
  }

  getProvider() {
    return this.activeProvider;
  }

  isProviderAvailable() {
    return !!this.activeProvider;
  }

  getProviderInfo() {
    if (!this.activeProvider) return null;
    
    return {
      isMetaMask: this.activeProvider.isMetaMask,
      isCoinbaseWallet: this.activeProvider.isCoinbaseWallet,
      isTrust: this.activeProvider.isTrust,
      isBraveWallet: this.activeProvider.isBraveWallet,
      chainId: this.activeProvider.chainId,
      selectedAddress: this.activeProvider.selectedAddress
    };
  }

  async requestAccounts() {
    if (!this.activeProvider) {
      throw new Error('No Web3 provider available');
    }

    try {
      return await this.activeProvider.request({ method: 'eth_requestAccounts' });
    } catch (error) {
      if (error.code === 4001) {
        throw new Error('User rejected the connection request');
      }
      throw error;
    }
  }
}

// Create global instance
const web3Manager = new Web3ProviderManager();

// Export for use in components
export default web3Manager;
