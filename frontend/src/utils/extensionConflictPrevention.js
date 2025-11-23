/**
 * ULTIMATE EXTENSION CONFLICT PREVENTION SYSTEM
 * This handles all browser extension conflicts with crypto APIs
 */

// Global flag to track if we've initialized
if (window._dVoteExtensionConflictPreventionLoaded) {
  // Already loaded, exit early
  export function initializeExtensionConflictPrevention() {
    // No-op to maintain interface
  }
  return;
}

let _cryptoPolyfillInitialized = false;

/**
 * Creates the most robust crypto.randomUUID implementation possible
 */
function createBulletproofRandomUUID() {
  const getRandomValuesAdvanced = (arr) => {
    // Multiple entropy sources for maximum randomness
    const sources = [
      // Try native crypto first
      () => {
        if (window.crypto && window.crypto.getRandomValues) {
          return window.crypto.getRandomValues(arr);
        }
        throw new Error('Native crypto unavailable');
      },
      // Try msCrypto (IE)
      () => {
        if (window.msCrypto && window.msCrypto.getRandomValues) {
          return window.msCrypto.getRandomValues(arr);
        }
        throw new Error('msCrypto unavailable');
      },
      // High-quality Math.random with timing entropy
      () => {
        const now = Date.now();
        const perf = typeof performance !== 'undefined' ? performance.now() : 0;
        let seed = now + perf + Math.random() * 1000000;
        
        for (let i = 0; i < arr.length; i++) {
          // Multiple LCG passes for better distribution
          seed = (seed * 16807) % 2147483647;
          seed = (seed * 48271) % 2147483647;
          arr[i] = (seed % 256);
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

    // Ultimate fallback
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
    return arr;
  };

  return function randomUUID() {
    try {
      const bytes = getRandomValuesAdvanced(new Uint8Array(16));
      
      // UUID v4 format
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

/**
 * Installs crypto polyfill on all possible global objects
 */
function installCryptoEveryywhere() {
  const bulletproofRandomUUID = createBulletproofRandomUUID();
  
  // Enhanced getRandomValues with fallbacks
  const enhancedGetRandomValues = function(arr) {
    try {
      // Try original implementation first
      if (this._originalGetRandomValues) {
        return this._originalGetRandomValues(arr);
      }
      if (window.crypto && window.crypto._originalGetRandomValues) {
        return window.crypto._originalGetRandomValues(arr);
      }
    } catch (e) {}
    
    // Fallback implementation
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
    return arr;
  };

  // Get all possible global targets
  const targets = [];
  if (typeof window !== 'undefined') targets.push(window);
  if (typeof globalThis !== 'undefined') targets.push(globalThis);
  if (typeof self !== 'undefined') targets.push(self);
  if (typeof global !== 'undefined') targets.push(global);
  
  targets.forEach(target => {
    try {
      // Ensure crypto object exists
      if (!target.crypto) {
        target.crypto = {};
      }
      
      const cryptoObj = target.crypto;
      
      // Backup original methods if they exist
      if (cryptoObj.getRandomValues && !cryptoObj._originalGetRandomValues) {
        cryptoObj._originalGetRandomValues = cryptoObj.getRandomValues;
      }
      
      // Install enhanced getRandomValues
      if (!cryptoObj.getRandomValues) {
        cryptoObj.getRandomValues = enhancedGetRandomValues;
      }
      
      // Install randomUUID with maximum force
      const installStrategies = [
        // Direct assignment
        () => {
          cryptoObj.randomUUID = bulletproofRandomUUID;
        },
        
        // Property descriptor with maximum permissions
        () => {
          Object.defineProperty(cryptoObj, 'randomUUID', {
            value: bulletproofRandomUUID,
            writable: true,
            configurable: true,
            enumerable: true
          });
        },
        
        // Getter/setter approach
        () => {
          Object.defineProperty(cryptoObj, 'randomUUID', {
            get: () => bulletproofRandomUUID,
            set: () => {}, // Ignore attempts to override
            configurable: true
          });
        },
        
        // Proxy the entire crypto object if necessary
        () => {
          if (target === window || target === globalThis) {
            const originalCrypto = cryptoObj;
            const proxiedCrypto = new Proxy(originalCrypto, {
              get(obj, prop) {
                if (prop === 'randomUUID') return bulletproofRandomUUID;
                if (prop === 'getRandomValues') return enhancedGetRandomValues;
                return obj[prop];
              },
              set(obj, prop, value) {
                if (prop === 'randomUUID') return true; // Block overwrites
                if (prop === 'getRandomValues' && !obj._originalGetRandomValues) {
                  obj._originalGetRandomValues = value;
                  return true;
                }
                obj[prop] = value;
                return true;
              },
              has(obj, prop) {
                if (prop === 'randomUUID') return true;
                return prop in obj;
              },
              ownKeys(obj) {
                const keys = Object.getOwnPropertyNames(obj);
                if (!keys.includes('randomUUID')) keys.push('randomUUID');
                return keys;
              },
              getOwnPropertyDescriptor(obj, prop) {
                if (prop === 'randomUUID') {
                  return {
                    value: bulletproofRandomUUID,
                    writable: true,
                    enumerable: true,
                    configurable: true
                  };
                }
                return Object.getOwnPropertyDescriptor(obj, prop);
              }
            });
            
            target.crypto = proxiedCrypto;
          }
        }
      ];
      
      // Try strategies until one works
      for (const strategy of installStrategies) {
        try {
          strategy();
          if (cryptoObj.randomUUID) {
            console.log(`[DVote] Successfully installed randomUUID on ${target.constructor?.name || 'target'}`);
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      // Verify installation
      if (typeof cryptoObj.randomUUID !== 'function') {
        console.warn(`[DVote] Failed to install randomUUID on ${target.constructor?.name || 'target'}`);
      }
      
    } catch (e) {
      console.warn('[DVote] Failed to install crypto on target:', e);
    }
  });
}

/**
 * Patches constructor prototypes to catch new instances
 */
function patchConstructorPrototypes() {
  try {
    if (typeof Crypto !== 'undefined' && Crypto.prototype) {
      const bulletproofRandomUUID = createBulletproofRandomUUID();
      
      if (!Crypto.prototype.randomUUID) {
        Object.defineProperty(Crypto.prototype, 'randomUUID', {
          value: bulletproofRandomUUID,
          writable: true,
          configurable: true
        });
        
        console.log('[DVote] Patched Crypto.prototype.randomUUID');
      }
      
      // Also patch any existing instances
      if (window.crypto && window.crypto instanceof Crypto && !window.crypto.randomUUID) {
        try {
          Object.defineProperty(window.crypto, 'randomUUID', {
            value: bulletproofRandomUUID,
            writable: true,
            configurable: true
          });
        } catch (e) {
          window.crypto.randomUUID = bulletproofRandomUUID;
        }
      }
    }
  } catch (e) {
    console.warn('[DVote] Could not patch constructor prototypes:', e);
  }
}

/**
 * Intercepts DOM manipulation to catch extension script injection
 */
function interceptExtensionScripts() {
  // Intercept script creation
  const originalCreateElement = document.createElement;
  document.createElement = function(tagName) {
    const element = originalCreateElement.call(this, tagName);
    
    if (tagName.toLowerCase() === 'script') {
      // When a script is created, check crypto after it loads
      element.addEventListener('load', () => {
        setTimeout(() => {
          if (!window.crypto || !window.crypto.randomUUID) {
            console.log('[DVote] Script injection detected, reinforcing crypto...');
            installCryptoEveryywhere();
            patchConstructorPrototypes();
          }
        }, 0);
      });
      
      element.addEventListener('error', () => {
        // Even on error, check crypto state
        setTimeout(() => {
          if (!window.crypto || !window.crypto.randomUUID) {
            installCryptoEveryywhere();
          }
        }, 0);
      });
    }
    
    return element;
  };
  
  // Intercept appendChild for script injection
  const originalAppendChild = Element.prototype.appendChild;
  Element.prototype.appendChild = function(child) {
    const result = originalAppendChild.call(this, child);
    
    if (child && child.tagName === 'SCRIPT') {
      // Script was injected, check crypto after next tick
      setTimeout(() => {
        if (!window.crypto || !window.crypto.randomUUID) {
          console.log('[DVote] Script appendChild detected, reinforcing crypto...');
          installCryptoEveryywhere();
          patchConstructorPrototypes();
        }
      }, 0);
    }
    
    return result;
  };
  
  // Intercept insertBefore for script injection
  const originalInsertBefore = Element.prototype.insertBefore;
  Element.prototype.insertBefore = function(newNode, referenceNode) {
    const result = originalInsertBefore.call(this, newNode, referenceNode);
    
    if (newNode && newNode.tagName === 'SCRIPT') {
      setTimeout(() => {
        if (!window.crypto || !window.crypto.randomUUID) {
          console.log('[DVote] Script insertBefore detected, reinforcing crypto...');
          installCryptoEveryywhere();
          patchConstructorPrototypes();
        }
      }, 0);
    }
    
    return result;
  };
}

/**
 * Monitors crypto object for tampering and self-heals
 */
function startContinuousMonitoring() {
  let healingAttempts = 0;
  const maxHealingAttempts = 100; // Monitor for about 10 seconds
  
  const monitor = setInterval(() => {
    healingAttempts++;
    
    if (healingAttempts > maxHealingAttempts) {
      clearInterval(monitor);
      console.log('[DVote] Crypto monitoring completed');
      return;
    }
    
    // Check all targets for crypto health
    const targets = [window, globalThis, self].filter(Boolean);
    let needsHealing = false;
    
    targets.forEach(target => {
      if (!target.crypto || 
          !target.crypto.randomUUID || 
          typeof target.crypto.randomUUID !== 'function') {
        needsHealing = true;
      }
      
      // Test if randomUUID actually works
      if (target.crypto && target.crypto.randomUUID) {
        try {
          const uuid = target.crypto.randomUUID();
          if (!uuid || typeof uuid !== 'string' || !uuid.includes('-')) {
            needsHealing = true;
          }
        } catch (e) {
          needsHealing = true;
        }
      }
    });
    
    if (needsHealing) {
      console.log(`[DVote] Crypto tampering detected (attempt ${healingAttempts}), healing...`);
      installCryptoEveryywhere();
      patchConstructorPrototypes();
    }
  }, 100);
  
  // Also use MutationObserver for DOM changes
  if (typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver((mutations) => {
      let scriptAdded = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.tagName === 'SCRIPT' || 
                (node.querySelector && node.querySelector('script'))) {
              scriptAdded = true;
            }
          });
        }
      });
      
      if (scriptAdded) {
        setTimeout(() => {
          if (!window.crypto || !window.crypto.randomUUID) {
            console.log('[DVote] MutationObserver detected script injection, healing...');
            installCryptoEveryywhere();
            patchConstructorPrototypes();
          }
        }, 0);
      }
    });
    
    observer.observe(document, {
      childList: true,
      subtree: true
    });
    
    // Clean up observer after monitoring period
    setTimeout(() => {
      observer.disconnect();
    }, 10000);
  }
}

/**
 * Main initialization function
 */
export function initializeExtensionConflictPrevention() {
  if (_cryptoPolyfillInitialized) {
    console.log('[DVote] Extension conflict prevention already initialized');
    return;
  }
  
  console.log('[DVote] Initializing ultimate extension conflict prevention...');
  
  // Execute all strategies immediately
  installCryptoEveryywhere();
  patchConstructorPrototypes();
  interceptExtensionScripts();
  
  // Execute with various delays to catch late-loading extensions
  const delays = [1, 5, 10, 25, 50, 100, 250, 500, 1000];
  delays.forEach(delay => {
    setTimeout(() => {
      installCryptoEveryywhere();
      patchConstructorPrototypes();
    }, delay);
  });
  
  // Start continuous monitoring
  startContinuousMonitoring();
  
  // Event-based reinforcement
  ['DOMContentLoaded', 'load'].forEach(eventName => {
    document.addEventListener(eventName, () => {
      installCryptoEveryywhere();
      patchConstructorPrototypes();
    });
  });
  
  // Mark as initialized
  _cryptoPolyfillInitialized = true;
  
  // Final verification
  setTimeout(() => {
    const targets = [window, globalThis, self].filter(Boolean);
    let allGood = true;
    
    targets.forEach(target => {
      if (!target.crypto || !target.crypto.randomUUID) {
        allGood = false;
      } else {
        try {
          const uuid = target.crypto.randomUUID();
          if (!uuid || !uuid.includes('-')) {
            allGood = false;
          }
        } catch (e) {
          allGood = false;
        }
      }
    });
    
    if (allGood) {
      console.log('[DVote] ✅ Extension conflict prevention successfully verified');
      console.log('[DVote] ✅ crypto.randomUUID test:', crypto.randomUUID());
    } else {
      console.error('[DVote] ❌ Extension conflict prevention verification failed');
    }
  }, 2000);
}

/**
 * Force re-initialization (useful for testing)
 */
export function forceReinitialize() {
  _cryptoPolyfillInitialized = false;
  initializeExtensionConflictPrevention();
}

/**
 * Check if crypto is working properly
 */
export function checkCryptoHealth() {
  const results = {
    window: false,
    globalThis: false,
    self: false
  };
  
  const targets = { window, globalThis, self };
  
  Object.entries(targets).forEach(([name, target]) => {
    if (target && target.crypto && target.crypto.randomUUID) {
      try {
        const uuid = target.crypto.randomUUID();
        if (uuid && typeof uuid === 'string' && uuid.includes('-')) {
          results[name] = true;
        }
      } catch (e) {
        results[name] = false;
      }
    }
  });
  
  return results;
}

// Auto-initialize if we're in a browser environment
if (typeof window !== 'undefined' && !window._dVoteExtensionConflictPreventionLoaded) {
  // Mark as loaded to prevent multiple executions
  window._dVoteExtensionConflictPreventionLoaded = true;
  
  // Wait for the next tick to ensure other polyfills load first
  setTimeout(() => {
    initializeExtensionConflictPrevention();
  }, 0);
}
