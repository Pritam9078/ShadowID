// Ultra-Aggressive Crypto Polyfill - Must load before any extension scripts
// This prevents crypto.randomUUID errors in browser extension scripts

(function() {
  'use strict';
  
  // Create the randomUUID function once
  const createRandomUUID = function() {
    const getRandomValues = function(array) {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
      return array;
    };
    
    return function() {
      return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
        (c ^ getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
      );
    };
  };
  
  const randomUUIDFunc = createRandomUUID();
  
  // More aggressive polyfill function
  function installCryptoPolyfill() {
    // Ensure crypto exists on all possible global objects
    const targets = [window, globalThis];
    if (typeof self !== 'undefined') targets.push(self);
    if (typeof global !== 'undefined') targets.push(global);
    
    targets.forEach(target => {
      try {
        if (!target.crypto) {
          target.crypto = {};
        }
        
        // Polyfill getRandomValues
        if (!target.crypto.getRandomValues) {
          target.crypto.getRandomValues = function(array) {
            for (let i = 0; i < array.length; i++) {
              array[i] = Math.floor(Math.random() * 256);
            }
            return array;
          };
        }
        
        // Polyfill randomUUID with multiple fallback strategies
        if (!target.crypto.randomUUID) {
          try {
            // Try to define as writable first
            Object.defineProperty(target.crypto, 'randomUUID', {
              value: randomUUIDFunc,
              writable: true,
              configurable: true,
              enumerable: true
            });
          } catch (e1) {
            try {
              // Fallback: direct assignment
              target.crypto.randomUUID = randomUUIDFunc;
            } catch (e2) {
              // Last resort: try to override the descriptor
              try {
                Object.defineProperty(target.crypto, 'randomUUID', {
                  get: function() { return randomUUIDFunc; },
                  configurable: true
                });
              } catch (e3) {
                // If all else fails, log and continue
                console.warn('[DVote] Could not install randomUUID on target:', e3);
              }
            }
          }
        }
      } catch (e) {
        console.warn('[DVote] Error installing crypto polyfill on target:', e);
      }
    });
    
    // Handle the native crypto object specially
    if (typeof crypto !== 'undefined' && crypto !== window.crypto) {
      try {
        if (!crypto.randomUUID) {
          // Try multiple strategies for the native crypto object
          try {
            crypto.randomUUID = randomUUIDFunc;
          } catch (e1) {
            try {
              Object.defineProperty(crypto, 'randomUUID', {
                value: randomUUIDFunc,
                writable: true,
                configurable: true
              });
            } catch (e2) {
              try {
                Object.defineProperty(crypto, 'randomUUID', {
                  get: function() { return randomUUIDFunc; },
                  configurable: true
                });
              } catch (e3) {
                // Crypto object is read-only, create a proxy
                try {
                  const originalCrypto = crypto;
                  window.crypto = new Proxy(originalCrypto, {
                    get(target, prop) {
                      if (prop === 'randomUUID') {
                        return randomUUIDFunc;
                      }
                      return target[prop];
                    }
                  });
                } catch (e4) {
                  console.warn('[DVote] All crypto polyfill strategies failed:', e4);
                }
              }
            }
          }
        }
      } catch (e) {
        console.warn('[DVote] Error handling native crypto object:', e);
      }
    }
  }
  
  // Install immediately and repeatedly
  installCryptoPolyfill();
  
  // Rapid fire installation to beat extension loading
  const rapidInstall = [1, 5, 10, 25, 50, 100, 200, 500];
  rapidInstall.forEach(delay => {
    setTimeout(installCryptoPolyfill, delay);
  });
  
  // Install on various events
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installCryptoPolyfill);
  }
  
  window.addEventListener('load', installCryptoPolyfill);
  
  // Monitor continuously for the first few seconds
  let checkCount = 0;
  const maxChecks = 100; // Check for 20 seconds
  const checkInterval = setInterval(() => {
    checkCount++;
    if (checkCount > maxChecks) {
      clearInterval(checkInterval);
      return;
    }
    
    try {
      if (!window.crypto || !window.crypto.randomUUID) {
        installCryptoPolyfill();
      }
    } catch (e) {
      // Continue checking even if there's an error
      installCryptoPolyfill();
    }
  }, 200);
  
  console.log('[DVote] Ultra-aggressive crypto polyfill installed');
})();
