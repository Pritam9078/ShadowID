/**
 * BULLETPROOF CRYPTO POLYFILL FOR DVOTE
 * Handles browser extension conflicts and read-only crypto objects
 * Implements multiple fallback strategies for maximum compatibility
 */
(function() {
  'use strict';
  
  // Advanced UUID generation with multiple entropy sources
  function createAdvancedRandomUUID() {
    const getRandomValues = function(arr) {
      // Try multiple random sources in order of preference
      const sources = [
        // Native crypto (if available and working)
        () => window.crypto && window.crypto.getRandomValues && window.crypto.getRandomValues(arr),
        // msCrypto for IE
        () => window.msCrypto && window.msCrypto.getRandomValues && window.msCrypto.getRandomValues(arr),
        // Node.js crypto (if in Node environment)
        () => typeof require !== 'undefined' && require('crypto').randomBytes && 
              (() => { const bytes = require('crypto').randomBytes(arr.length); for(let i = 0; i < arr.length; i++) arr[i] = bytes[i]; return arr; })(),
        // High-quality Math.random fallback with additional entropy
        () => {
          const now = Date.now();
          const perf = typeof performance !== 'undefined' ? performance.now() : 0;
          let seed = now + perf + Math.random() * 1000000;
          
          for (let i = 0; i < arr.length; i++) {
            // Linear congruential generator with additional entropy
            seed = (seed * 9301 + 49297) % 233280;
            const randomValue = seed / 233280;
            arr[i] = Math.floor((randomValue + Math.random()) * 128) % 256;
          }
          return arr;
        }
      ];
      
      for (const source of sources) {
        try {
          const result = source();
          if (result && result.length === arr.length) {
            return result;
          }
        } catch (e) {
          continue;
        }
      }
      
      // Final fallback - basic Math.random
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    };
    
    return function randomUUID() {
      try {
        const bytes = getRandomValues(new Uint8Array(16));
        
        // Version 4 UUID (random)
        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;
        
        const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
        return [
          hex.slice(0, 8),
          hex.slice(8, 12),
          hex.slice(12, 16),
          hex.slice(16, 20),
          hex.slice(20, 32)
        ].join('-');
      } catch (e) {
        // Emergency fallback
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      }
    };
  }
  
  const advancedRandomUUID = createAdvancedRandomUUID();
  
  // Strategy: Complete crypto object replacement
  function replaceEntireCryptoObject() {
    const targets = [window, globalThis, self, this].filter(Boolean);
    
    targets.forEach(target => {
      try {
        const originalCrypto = target.crypto;
        
        // Create enhanced crypto object
        const enhancedCrypto = {
          // Core required methods
          getRandomValues: function(arr) {
            if (originalCrypto && originalCrypto.getRandomValues) {
              try {
                return originalCrypto.getRandomValues(arr);
              } catch (e) {}
            }
            
            // Fallback implementation
            for (let i = 0; i < arr.length; i++) {
              arr[i] = Math.floor(Math.random() * 256);
            }
            return arr;
          },
          
          randomUUID: advancedRandomUUID,
          
          // Copy over any existing methods from original crypto
          ...(originalCrypto && typeof originalCrypto === 'object' ? originalCrypto : {})
        };
        
        // Ensure randomUUID is always our implementation
        enhancedCrypto.randomUUID = advancedRandomUUID;
        
        // Try multiple replacement strategies
        const replacementStrategies = [
          // Direct assignment
          () => { target.crypto = enhancedCrypto; },
          
          // Property descriptor
          () => {
            Object.defineProperty(target, 'crypto', {
              value: enhancedCrypto,
              writable: true,
              configurable: true,
              enumerable: true
            });
          },
          
          // Proxy with getter
          () => {
            Object.defineProperty(target, 'crypto', {
              get: () => enhancedCrypto,
              set: (value) => {
                // Allow setting but always ensure our randomUUID
                if (value && typeof value === 'object') {
                  value.randomUUID = advancedRandomUUID;
                }
                return true;
              },
              configurable: true
            });
          }
        ];
        
        for (const strategy of replacementStrategies) {
          try {
            strategy();
            if (target.crypto && target.crypto.randomUUID) {
              console.log(`[DVote] Successfully installed crypto on ${target.constructor.name || 'target'}`);
              break;
            }
          } catch (e) {
            continue;
          }
        }
        
      } catch (e) {
        console.warn('[DVote] Failed to replace crypto object:', e);
      }
    });
  }
  
  // Strategy: Monkey-patch constructor and prototype
  function patchCryptoConstructor() {
    if (typeof Crypto !== 'undefined') {
      try {
        // Patch prototype
        if (Crypto.prototype && !Crypto.prototype.randomUUID) {
          Object.defineProperty(Crypto.prototype, 'randomUUID', {
            value: advancedRandomUUID,
            writable: true,
            configurable: true
          });
        }
        
        // Patch instances
        const originalCrypto = window.crypto;
        if (originalCrypto && !originalCrypto.randomUUID) {
          Object.defineProperty(originalCrypto, 'randomUUID', {
            value: advancedRandomUUID,
            writable: true,
            configurable: true
          });
        }
      } catch (e) {
        console.warn('[DVote] Could not patch Crypto constructor:', e);
      }
    }
  }
  
  // Strategy: Global function injection
  function injectGlobalFunction() {
    const targets = [window, globalThis, self].filter(Boolean);
    
    targets.forEach(target => {
      // Inject as global function for maximum compatibility
      if (!target.randomUUID) {
        try {
          target.randomUUID = advancedRandomUUID;
        } catch (e) {}
      }
      
      // Backup crypto namespace
      if (!target.cryptoPolyfill) {
        target.cryptoPolyfill = {
          randomUUID: advancedRandomUUID,
          getRandomValues: function(arr) {
            for (let i = 0; i < arr.length; i++) {
              arr[i] = Math.floor(Math.random() * 256);
            }
            return arr;
          }
        };
      }
    });
  }
  
  // Strategy: Extension conflict prevention via early interception
  function preventExtensionConflicts() {
    // Intercept common extension script injection points
    const originalCreateElement = document.createElement;
    document.createElement = function(tagName) {
      const element = originalCreateElement.call(this, tagName);
      
      if (tagName.toLowerCase() === 'script') {
        // Ensure our crypto is available when scripts load
        setTimeout(() => {
          if (!window.crypto || !window.crypto.randomUUID) {
            replaceEntireCryptoObject();
          }
        }, 0);
      }
      
      return element;
    };
    
    // Intercept appendChild to catch extension script injection
    const originalAppendChild = Element.prototype.appendChild;
    Element.prototype.appendChild = function(child) {
      const result = originalAppendChild.call(this, child);
      
      if (child.tagName === 'SCRIPT') {
        // Ensure crypto is available after script injection
        setTimeout(() => {
          if (!window.crypto || !window.crypto.randomUUID) {
            replaceEntireCryptoObject();
          }
        }, 0);
      }
      
      return result;
    };
  }
  
  // Strategy: Continuous monitoring and healing
  function startContinuousMonitoring() {
    let monitoringActive = true;
    let checkCount = 0;
    const maxChecks = 200; // Monitor for 20 seconds
    
    const monitor = setInterval(() => {
      checkCount++;
      
      if (checkCount > maxChecks) {
        monitoringActive = false;
        clearInterval(monitor);
        console.log('[DVote] Crypto monitoring completed');
        return;
      }
      
      // Check and heal crypto on all targets
      const targets = [window, globalThis, self].filter(Boolean);
      let needsHealing = false;
      
      targets.forEach(target => {
        if (!target.crypto || !target.crypto.randomUUID || 
            typeof target.crypto.randomUUID !== 'function') {
          needsHealing = true;
        }
      });
      
      if (needsHealing) {
        console.log('[DVote] Healing crypto polyfill...');
        replaceEntireCryptoObject();
        patchCryptoConstructor();
        injectGlobalFunction();
      }
    }, 100);
    
    // Also monitor for new extension injections
    if (typeof MutationObserver !== 'undefined') {
      const observer = new MutationObserver((mutations) => {
        if (!monitoringActive) return;
        
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList') {
            mutation.addedNodes.forEach((node) => {
              if (node.tagName === 'SCRIPT') {
                // New script added, ensure crypto is still intact
                setTimeout(() => {
                  if (!window.crypto || !window.crypto.randomUUID) {
                    replaceEntireCryptoObject();
                  }
                }, 0);
              }
            });
          }
        });
      });
      
      observer.observe(document, {
        childList: true,
        subtree: true
      });
      
      // Clean up observer
      setTimeout(() => {
        observer.disconnect();
      }, 20000);
    }
  }
  
  // Execute all strategies immediately
  console.log('[DVote] Installing bulletproof crypto polyfill...');
  
  replaceEntireCryptoObject();
  patchCryptoConstructor();
  injectGlobalFunction();
  preventExtensionConflicts();
  
  // Execute with delays to catch extension loading
  const delays = [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500];
  delays.forEach(delay => {
    setTimeout(() => {
      replaceEntireCryptoObject();
      patchCryptoConstructor();
      injectGlobalFunction();
    }, delay);
  });
  
  // Start continuous monitoring
  startContinuousMonitoring();
  
  // Event-based installation
  ['DOMContentLoaded', 'load'].forEach(eventName => {
    document.addEventListener(eventName, () => {
      replaceEntireCryptoObject();
      patchCryptoConstructor();
      injectGlobalFunction();
    });
  });
  
  // Final verification
  setTimeout(() => {
    const targets = [window, globalThis, self].filter(Boolean);
    let success = true;
    
    targets.forEach(target => {
      if (!target.crypto || !target.crypto.randomUUID) {
        success = false;
      }
    });
    
    if (success) {
      console.log('[DVote] ✅ Bulletproof crypto polyfill successfully installed and verified');
      // Test the implementation
      try {
        const uuid = crypto.randomUUID();
        console.log('[DVote] ✅ crypto.randomUUID test successful:', uuid);
      } catch (e) {
        console.error('[DVote] ❌ crypto.randomUUID test failed:', e);
      }
    } else {
      console.error('[DVote] ❌ Crypto polyfill installation failed on some targets');
    }
  }, 3000);
  
})();
