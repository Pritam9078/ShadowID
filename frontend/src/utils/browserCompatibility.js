// Browser API Polyfills and Compatibility Layer
// Handles missing or conflicting browser APIs

class BrowserCompatibility {
  constructor() {
    this.init();
  }

  init() {
    this.polyfillCryptoRandomUUID();
    this.polyfillWebCrypto();
    this.handleBrowserExtensionConflicts();
    this.setupGlobalErrorHandlers();
  }

  polyfillCryptoRandomUUID() {
    // Polyfill for crypto.randomUUID
    if (!window.crypto) {
      window.crypto = {};
    }

    if (!window.crypto.randomUUID) {
      window.crypto.randomUUID = function() {
        // RFC 4122 version 4 UUID
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      };
    }
  }

  polyfillWebCrypto() {
    // Ensure crypto.getRandomValues exists
    if (!window.crypto.getRandomValues) {
      window.crypto.getRandomValues = function(array) {
        for (let i = 0; i < array.length; i++) {
          array[i] = Math.floor(Math.random() * 256);
        }
        return array;
      };
    }

    // Polyfill for crypto.subtle if needed
    if (!window.crypto.subtle) {
      window.crypto.subtle = {
        digest: () => Promise.reject(new Error('WebCrypto not supported')),
        encrypt: () => Promise.reject(new Error('WebCrypto not supported')),
        decrypt: () => Promise.reject(new Error('WebCrypto not supported')),
        sign: () => Promise.reject(new Error('WebCrypto not supported')),
        verify: () => Promise.reject(new Error('WebCrypto not supported')),
        generateKey: () => Promise.reject(new Error('WebCrypto not supported')),
        importKey: () => Promise.reject(new Error('WebCrypto not supported')),
        exportKey: () => Promise.reject(new Error('WebCrypto not supported'))
      };
    }
  }

  handleBrowserExtensionConflicts() {
    // Handle Phantom wallet conflicts
    this.handlePhantomConflicts();
    
    // Handle MetaMask conflicts
    this.handleMetaMaskConflicts();
    
    // Handle other wallet conflicts
    this.handleGenericWalletConflicts();
  }

  handlePhantomConflicts() {
    // Prevent Phantom wallet errors when Solana is not needed
    try {
      if (!window.solana && !window.phantom) {
        // Create a minimal Solana interface to prevent errors
        const solanaInterface = {
          isPhantom: false,
          isConnected: false,
          publicKey: null,
          connect: () => Promise.reject(new Error('Solana not available')),
          disconnect: () => Promise.resolve(),
          on: () => {},
          off: () => {},
          removeListener: () => {}
        };

        // Use a safer approach to define the property
        try {
          Object.defineProperty(window, 'solana', {
            value: solanaInterface,
            writable: false,
            configurable: false
          });
        } catch (error) {
          // If defineProperty fails, just assign it
          window.solana = solanaInterface;
        }
      }
    } catch (error) {
      console.log('[DVote] Phantom conflict handling skipped:', error.message);
    }

    // Handle Phantom-specific errors
    window.addEventListener('error', (event) => {
      if (event.message && event.message.includes('phantom')) {
        event.preventDefault();
        console.log('[DVote] Phantom wallet error suppressed');
      }
    });
  }

  handleMetaMaskConflicts() {
    // Handle MetaMask provider conflicts
    if (window.ethereum) {
      const originalEthereum = window.ethereum;
      
      // Prevent multiple provider conflicts with safer approach
      try {
        const descriptor = Object.getOwnPropertyDescriptor(window, 'ethereum');
        if (!descriptor || descriptor.configurable !== false) {
          Object.defineProperty(window, 'ethereum', {
            get: () => originalEthereum,
            set: (newProvider) => {
              // Allow setting but log conflicts
              console.log('[DVote] Ethereum provider conflict detected, using existing provider');
              return originalEthereum;
            },
            configurable: true
          });
        }
      } catch (error) {
        // Property is already non-configurable, which is fine
        console.log('[DVote] Ethereum property already protected');
      }
    }
  }

  handleGenericWalletConflicts() {
    // Handle generic wallet provider conflicts with safer approach
    const protectedProperties = ['web3', 'ethereum', 'solana'];
    
    protectedProperties.forEach(prop => {
      if (window[prop]) {
        const originalValue = window[prop];
        
        // Use a safer approach to prevent redefinition
        try {
          const descriptor = Object.getOwnPropertyDescriptor(window, prop);
          if (!descriptor || descriptor.configurable !== false) {
            Object.defineProperty(window, prop, {
              get: () => originalValue,
              set: (newValue) => {
                console.log(`[DVote] Attempt to override ${prop} prevented`);
                return originalValue;
              },
              configurable: false
            });
          }
        } catch (error) {
          // Property already exists and is non-configurable, which is fine
          console.log(`[DVote] ${prop} property already protected`);
        }
      }
    });
  }

  setupGlobalErrorHandlers() {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason;
      
      if (this.isWalletRelatedError(reason)) {
        event.preventDefault();
        console.log('[DVote] Wallet-related promise rejection suppressed:', reason?.message);
      }
    });

    // Handle global errors
    window.addEventListener('error', (event) => {
      if (this.isWalletRelatedError(event.error) || this.isPropertyRedefinitionError(event.error)) {
        event.preventDefault();
        console.log('[DVote] Wallet-related or property redefinition error suppressed:', event.error?.message);
      }
    });
    
    // Handle specific TypeError for property redefinition
    const originalObjectDefineProperty = Object.defineProperty;
    Object.defineProperty = function(obj, prop, descriptor) {
      try {
        return originalObjectDefineProperty.call(this, obj, prop, descriptor);
      } catch (error) {
        if (error.message.includes('Cannot redefine property')) {
          console.log(`[DVote] Property redefinition prevented for: ${prop}`);
          return obj;
        }
        throw error;
      }
    };
  }

  isPropertyRedefinitionError(error) {
    if (!error) return false;
    
    const message = (error.message || error.toString()).toLowerCase();
    return message.includes('cannot redefine property') || 
           message.includes('redefine property');
  }

  isWalletRelatedError(error) {
    if (!error) return false;
    
    const message = (error.message || error.toString()).toLowerCase();
    const walletPatterns = [
      'phantom',
      'metamask',
      'walletconnect',
      'web3',
      'ethereum',
      'solana',
      'crypto.randomuuid',
      'evmask',
      'user rejected',
      'user denied',
      'connection failed',
      'network error',
      'failed to fetch'
    ];

    return walletPatterns.some(pattern => message.includes(pattern));
  }

  // Method to check browser compatibility
  checkCompatibility() {
    const features = {
      webCrypto: !!window.crypto,
      randomUUID: !!window.crypto?.randomUUID,
      getRandomValues: !!window.crypto?.getRandomValues,
      subtleCrypto: !!window.crypto?.subtle,
      webGL: !!window.WebGLRenderingContext,
      webRTC: !!window.RTCPeerConnection,
      localStorage: !!window.localStorage,
      sessionStorage: !!window.sessionStorage,
      indexedDB: !!window.indexedDB,
      webWorkers: !!window.Worker,
      serviceWorkers: !!navigator.serviceWorker,
      pushNotifications: !!window.PushManager
    };

    console.log('[DVote] Browser compatibility check:', features);
    return features;
  }
}

// Initialize browser compatibility layer
const browserCompatibility = new BrowserCompatibility();

// Export for debugging purposes
export default browserCompatibility;
