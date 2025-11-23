// Development Console Helper
// Provides debugging tools and error tracking for development

class DevConsoleHelper {
  constructor() {
    this.errorCounts = new Map();
    this.suppressedErrors = [];
    this.startTime = Date.now();
    this.isDevMode = import.meta.env.DEV;
    
    if (this.isDevMode) {
      this.init();
    }
  }

  init() {
    this.createConsoleCommands();
    this.setupPeriodicReporting();
    this.addToWindow();
  }

  createConsoleCommands() {
    // Add helpful debug commands to window
    window.dvoteDebug = {
      // Show suppressed error statistics
      showSuppressedErrors: () => {
        console.group('🔇 DVote Suppressed Errors Report');
        console.log('Total suppressed errors:', this.suppressedErrors.length);
        
        const errorTypes = new Map();
        this.suppressedErrors.forEach(error => {
          const type = this.categorizeError(error.message);
          errorTypes.set(type, (errorTypes.get(type) || 0) + 1);
        });

        console.table(Object.fromEntries(errorTypes));
        
        if (this.suppressedErrors.length > 0) {
          console.log('Recent suppressed errors:');
          this.suppressedErrors.slice(-10).forEach((error, index) => {
            console.log(`${index + 1}. ${error.type}: ${error.message.substring(0, 100)}...`);
          });
        }
        console.groupEnd();
      },

      // Show browser compatibility status
      showCompatibility: () => {
        console.group('🌐 Browser Compatibility Status');
        
        const features = {
          crypto: !!window.crypto,
          randomUUID: !!window.crypto?.randomUUID,
          webGL: !!window.WebGLRenderingContext,
          webRTC: !!window.RTCPeerConnection,
          ethereum: !!window.ethereum,
          solana: !!window.solana,
          walletConnect: !!window.WalletConnect
        };

        console.table(features);
        console.groupEnd();
      },

      // Show wallet provider status
      showWalletProviders: () => {
        console.group('👛 Wallet Provider Status');
        
        const providers = {
          ethereum: !!window.ethereum,
          isMetaMask: !!window.ethereum?.isMetaMask,
          isCoinbase: !!window.ethereum?.isCoinbaseWallet,
          isTrust: !!window.ethereum?.isTrust,
          isBrave: !!window.ethereum?.isBraveWallet,
          solana: !!window.solana,
          phantom: !!window.phantom
        };

        console.table(providers);
        
        if (window.ethereum) {
          console.log('Ethereum provider details:', {
            chainId: window.ethereum.chainId,
            selectedAddress: window.ethereum.selectedAddress,
            networkVersion: window.ethereum.networkVersion
          });
        }
        console.groupEnd();
      },

      // Clear error history
      clearErrorHistory: () => {
        this.suppressedErrors = [];
        this.errorCounts.clear();
        console.log('🧹 Error history cleared');
      },

      // Show performance metrics
      showPerformance: () => {
        const uptime = Date.now() - this.startTime;
        const totalErrors = this.suppressedErrors.length;
        const errorsPerMinute = totalErrors / (uptime / 60000);

        console.group('📊 DVote Performance Metrics');
        console.log(`Uptime: ${Math.round(uptime / 1000)}s`);
        console.log(`Total suppressed errors: ${totalErrors}`);
        console.log(`Errors per minute: ${errorsPerMinute.toFixed(2)}`);
        console.log(`Memory usage:`, performance.memory ? {
          used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) + 'MB',
          total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024) + 'MB'
        } : 'Not available');
        console.groupEnd();
      }
    };
  }

  categorizeError(message) {
    const categories = {
      'WalletConnect': ['walletconnect', 'wc-', 'relay.wallet'],
      'Phantom': ['phantom', 'solana'],
      'MetaMask': ['metamask', 'ethereum'],
      'evmAsk': ['evmask.js', 'evmask'],
      'Crypto API': ['crypto.randomuuid', 'crypto is not defined'],
      'Network': ['failed to fetch', 'network error', 'net::err'],
      'Extension': ['extension', 'chrome-extension', 'moz-extension'],
      'Other': []
    };

    const lowerMessage = message.toLowerCase();
    
    for (const [category, patterns] of Object.entries(categories)) {
      if (patterns.some(pattern => lowerMessage.includes(pattern))) {
        return category;
      }
    }
    
    return 'Other';
  }

  logSuppressedError(type, message, source = 'unknown') {
    const error = {
      type,
      message,
      source,
      timestamp: new Date().toISOString(),
      category: this.categorizeError(message)
    };

    this.suppressedErrors.push(error);
    
    // Keep only last 100 errors to prevent memory issues
    if (this.suppressedErrors.length > 100) {
      this.suppressedErrors = this.suppressedErrors.slice(-100);
    }

    // Update counts
    const key = `${type}:${error.category}`;
    this.errorCounts.set(key, (this.errorCounts.get(key) || 0) + 1);
  }

  setupPeriodicReporting() {
    // Show periodic summary in development mode
    if (this.isDevMode) {
      setInterval(() => {
        const recentErrors = this.suppressedErrors.filter(
          error => Date.now() - new Date(error.timestamp).getTime() < 60000
        );
        
        if (recentErrors.length > 10) {
          console.log(
            `🔇 DVote: Suppressed ${recentErrors.length} errors in the last minute. Use dvoteDebug.showSuppressedErrors() for details.`
          );
        }
      }, 60000); // Every minute
    }
  }

  addToWindow() {
    // Add debug helper to window for easy access
    window.dvoteConsoleHelper = this;
    
    // Show welcome message
    if (this.isDevMode) {
      console.log(
        '%c🚀 DVote Development Mode',
        'color: #10B981; font-size: 16px; font-weight: bold;'
      );
      console.log(
        '%cConsole noise filtering is active. Use dvoteDebug.showSuppressedErrors() to see what\'s being filtered.',
        'color: #6B7280; font-size: 12px;'
      );
      console.log(
        '%cAvailable debug commands:',
        'color: #3B82F6; font-weight: bold;'
      );
      console.log('• dvoteDebug.showSuppressedErrors()');
      console.log('• dvoteDebug.showCompatibility()');
      console.log('• dvoteDebug.showWalletProviders()');
      console.log('• dvoteDebug.showPerformance()');
      console.log('• dvoteDebug.clearErrorHistory()');
    }
  }

  getStats() {
    return {
      totalSuppressed: this.suppressedErrors.length,
      errorsByCategory: Object.fromEntries(
        Array.from(this.errorCounts.entries()).map(([key, count]) => [
          key.split(':')[1], count
        ])
      ),
      uptime: Date.now() - this.startTime,
      recentErrors: this.suppressedErrors.slice(-5)
    };
  }
}

// Initialize development console helper
const devConsoleHelper = new DevConsoleHelper();

export default devConsoleHelper;
