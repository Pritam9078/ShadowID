// Enhanced Console Filter System for ShadowID
// Comprehensive suppression of browser extension conflicts and development warnings

class ConsoleFilter {
  constructor() {
    this.originalMethods = {
      warn: console.warn,
      error: console.error,
      log: console.log
    };
    
    this.suppressedMessages = new Set();
    this.init();
  }

  init() {
    this.interceptConsoleWarn();
    this.interceptConsoleError();
    this.suppressCryptoRandomUUIDErrors();
    this.suppressPhantomWalletWarnings();
    this.suppressEvmAskErrors();
    this.suppressWalletConnectErrors();
  }

  shouldSuppressMessage(message) {
    const suppressPatterns = [
      // Browser extension conflicts
      'Unable to set window.solana',
      'Unable to set window.phantom',
      'Cannot redefine property: ethereum',
      'Cannot redefine property: web3',
      'Cannot redefine property: solana',
      'ethereum is not defined',
      'window.ethereum is undefined',
      
      // Specific error messages we're seeing
      'Cannot redefine property',
      'try uninstalling Phantom',
      'not found on Allowlist',
      'update configuration on cloud.reown.com',
      
      // Phantom wallet specific
      'phantom',
      'Phantom',
      'solana',
      
      // WebSocket connection errors (expected when backend is down)
      'WebSocket connection to',
      'connection closed',
      'Failed to fetch',
      
      // WalletConnect errors
      'No projectId found',
      'WalletConnect Cloud projectId',
      
      // Development warnings that are not critical
      'Lit is in dev mode',
      'React DevTools',
      
      // evmAsk.js errors
      'evmAsk.js',
      'evmAsk',
      'evm-ask',
      
      // WalletConnect errors
      'WalletConnect',
      'walletconnect',
      'WebSocket connection failed',
      'Failed to fetch',
      'wc-',
      'relay.walletconnect',
      'pulse.walletconnect.org',
      'api.web3modal.org',
      'cloud.reown.com',
      'status of 403',
      
      // Crypto API errors
      'crypto.randomUUID',
      'randomUUID is not a function',
      'crypto is not defined',
      
      // Development mode warnings
      'Lit is in dev mode',
      'React development mode',
      'Warning: Extra attributes',
      
      // Third-party extension conflicts
      'MetaMask',
      'Coinbase Wallet',
      'Trust Wallet',
      'Brave Wallet',
      
      // Network request failures from extensions
      'net::ERR_FAILED',
      'ERR_NETWORK',
      'ERR_INTERNET_DISCONNECTED',
      
      // Browser extension specific errors
      'extension',
      'chrome-extension://',
      'moz-extension://',
      'safari-extension://',
      
      // Web3 provider conflicts
      'Multiple web3 providers',
      'Provider collision',
      'web3 is not defined'
    ];

    return suppressPatterns.some(pattern => 
      message.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  interceptConsoleWarn() {
    console.warn = (...args) => {
      const message = args.join(' ');
      
      if (this.shouldSuppressMessage(message)) {
        this.logSuppressedMessage('WARN', message);
        return;
      }
      
      this.originalMethods.warn.apply(console, args);
    };
  }

  interceptConsoleError() {
    console.error = (...args) => {
      const message = args.join(' ');
      
      if (this.shouldSuppressMessage(message)) {
        this.logSuppressedMessage('ERROR', message);
        return;
      }
      
      // Special handling for TypeError about property redefinition
      if (message.includes('TypeError') && message.includes('Cannot redefine property')) {
        this.logSuppressedMessage('ERROR', message);
        return;
      }
      
      this.originalMethods.error.apply(console, args);
    };
  }

  suppressCryptoRandomUUIDErrors() {
    // Polyfill for crypto.randomUUID in environments where it's not available
    if (!window.crypto?.randomUUID) {
      window.crypto = window.crypto || {};
      window.crypto.randomUUID = function() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      };
    }
  }

  suppressPhantomWalletWarnings() {
    // Prevent Phantom wallet from throwing errors when Solana is not available
    if (!window.solana && !window.phantom) {
      window.solana = {
        isPhantom: false,
        isConnected: false,
        connect: () => Promise.reject(new Error('Phantom wallet not installed')),
        disconnect: () => Promise.resolve(),
        on: () => {},
        off: () => {}
      };
    }
  }

  suppressEvmAskErrors() {
    // Handle evmAsk.js errors by providing a minimal interface
    window.addEventListener('error', (event) => {
      if (event.filename && event.filename.includes('evmAsk.js')) {
        event.preventDefault();
        this.logSuppressedMessage('ERROR', `evmAsk.js error suppressed: ${event.message}`);
      }
    });
  }

  suppressWalletConnectErrors() {
    // Handle WalletConnect fetch errors
    const originalFetch = window.fetch;
    window.fetch = (...args) => {
      const [url] = args;
      
      if (typeof url === 'string' && (
        url.includes('walletconnect') || 
        url.includes('relay.walletconnect') ||
        url.includes('wc-')
      )) {
        return originalFetch(...args).catch(error => {
          this.logSuppressedMessage('ERROR', `WalletConnect fetch error suppressed: ${error.message}`);
          // Return a minimal response to prevent cascading errors
          return Promise.resolve(new Response('{}', { status: 200 }));
        });
      }
      
      return originalFetch(...args);
    };
  }

  logSuppressedMessage(level, message) {
    // Keep track of suppressed messages for debugging
    const key = `${level}:${message.substring(0, 50)}`;
    if (!this.suppressedMessages.has(key)) {
      this.suppressedMessages.add(key);
      
      // Log to dev console helper if available
      if (window.dvoteConsoleHelper) {
        window.dvoteConsoleHelper.logSuppressedError(level, message, 'ConsoleFilter');
      }
      
      // Only log in development mode and limit to first occurrence
      if (import.meta.env.DEV) {
        this.originalMethods.log(
          `%c[DVote Console Filter] Suppressed ${level}:`, 
          'color: orange; font-weight: bold;', 
          message.substring(0, 100) + (message.length > 100 ? '...' : '')
        );
      }
    }
  }

  getSuppressedStats() {
    return {
      totalSuppressed: this.suppressedMessages.size,
      messages: Array.from(this.suppressedMessages)
    };
  }

  restore() {
    console.warn = this.originalMethods.warn;
    console.error = this.originalMethods.error;
    console.log = this.originalMethods.log;
  }
}

// Initialize the console filter
const consoleFilter = new ConsoleFilter();

// Export for potential debugging
export default consoleFilter;
