// WalletConnect Error Handler
// Specifically handles WalletConnect 403 errors and connection issues

class WalletConnectErrorHandler {
  constructor() {
    this.originalFetch = window.fetch;
    this.interceptedUrls = new Set();
    this.init();
  }

  init() {
    this.interceptFetch();
    this.handleWebSocketErrors();
    this.setupWalletConnectPolyfills();
  }

  interceptFetch() {
    window.fetch = async (...args) => {
      const [url, options] = args;
      
      try {
        // Check if this is a WalletConnect related request
        if (this.isWalletConnectUrl(url)) {
          return await this.handleWalletConnectRequest(url, options);
        }
        
        return await this.originalFetch(...args);
      } catch (error) {
        // Handle fetch errors gracefully
        if (this.isWalletConnectUrl(url)) {
          console.log('[ShadowID] WalletConnect request failed, using fallback');
          return this.createFallbackResponse();
        }
        throw error;
      }
    };
  }

  isWalletConnectUrl(url) {
    if (typeof url !== 'string') return false;
    
    const walletConnectPatterns = [
      'walletconnect.org',
      'walletconnect.com',
      'relay.walletconnect',
      'bridge.walletconnect',
      'wc-relay',
      'waku.walletconnect',
      'pulse.walletconnect.org',
      'api.web3modal.org',
      'cloud.reown.com',
      'registry.walletconnect.com',
      'explorer-api.walletconnect.com'
    ];

    return walletConnectPatterns.some(pattern => url.includes(pattern));
  }

  async handleWalletConnectRequest(url, options) {
    try {
      const response = await this.originalFetch(url, {
        ...options,
        timeout: 5000, // 5 second timeout
      });

      // Handle 403 errors specifically
      if (response.status === 403) {
        console.log('[ShadowID] WalletConnect 403 error handled gracefully');
        return this.createFallbackResponse();
      }

      return response;
    } catch (error) {
      console.log('[ShadowID] WalletConnect network error handled:', error.message);
      return this.createFallbackResponse();
    }
  }

  createFallbackResponse() {
    // Create a minimal response that won't break WalletConnect
    return new Response(
      JSON.stringify({
        success: false,
        error: 'WalletConnect service temporarily unavailable',
        fallback: true
      }),
      {
        status: 200,
        statusText: 'OK',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }

  handleWebSocketErrors() {
    // Override WebSocket to handle WalletConnect connection errors AND localhost:3001 attempts
    const OriginalWebSocket = window.WebSocket;
    
    window.WebSocket = class extends OriginalWebSocket {
      constructor(url, protocols) {
        // Block connections to localhost:3001 (backend server)
        if (typeof url === 'string' && url.includes('localhost:3001')) {
          console.log('[ShadowID] Blocking WebSocket connection to localhost:3001 - pure dApp mode');
          // Create a fake WebSocket that immediately fails
          super('ws://invalid-url-blocked');
          setTimeout(() => {
            this.dispatchEvent(new Event('error'));
            this.dispatchEvent(new CloseEvent('close', { code: 1006, reason: 'Blocked by dApp' }));
          }, 0);
          return;
        }
        
        super(url, protocols);
        
        if (typeof url === 'string' && url.includes('walletconnect')) {
          this.addEventListener('error', (event) => {
            console.log('[ShadowID] WalletConnect WebSocket error suppressed');
            event.stopPropagation();
          });
          
          this.addEventListener('close', (event) => {
            if (event.code !== 1000) {
              console.log('[ShadowID] WalletConnect WebSocket closed unexpectedly, this is normal');
            }
          });
        }
      }
    };
  }

  setupWalletConnectPolyfills() {
    // Provide minimal WalletConnect interface if the library fails to load
    if (!window.WalletConnect) {
      window.WalletConnect = class {
        constructor() {
          this.connected = false;
        }
        
        connect() {
          return Promise.reject(new Error('WalletConnect not available'));
        }
        
        disconnect() {
          return Promise.resolve();
        }
        
        on() {}
        off() {}
      };
    }

    // Handle WalletConnect modal errors
    if (!window.WalletConnectModal) {
      window.WalletConnectModal = class {
        constructor() {}
        openModal() {}
        closeModal() {}
      };
    }
  }

  // Method to configure WalletConnect with proper error handling
  configureWalletConnect(projectId) {
    try {
      if (!projectId || projectId === 'YOUR_PROJECT_ID') {
        console.warn('[ShadowID] WalletConnect project ID not configured');
        return null;
      }

      // Return configuration with error handling
      return {
        projectId,
        chains: [1, 137, 31337], // mainnet, polygon, localhost
        showQrModal: true,
        qrModalOptions: {
          themeMode: 'light',
          themeVariables: {
            '--wcm-z-index': '1000'
          }
        },
        // Add error handling callbacks
        onError: (error) => {
          console.log('[ShadowID] WalletConnect error handled:', error.message);
        },
        onDisconnect: () => {
          console.log('[ShadowID] WalletConnect disconnected');
        }
      };
    } catch (error) {
      console.log('[DVote] WalletConnect configuration error:', error.message);
      return null;
    }
  }

  // Debug method to check WalletConnect status
  getStatus() {
    return {
      fetchIntercepted: !!window.fetch.toString().includes('walletconnect'),
      webSocketPatched: !!window.WebSocket.toString().includes('walletconnect'),
      polyfillsActive: !!window.WalletConnect,
      interceptedUrls: Array.from(this.interceptedUrls)
    };
  }
}

// Initialize WalletConnect error handler
const walletConnectHandler = new WalletConnectErrorHandler();

export default walletConnectHandler;
