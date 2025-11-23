/**
 * EFFICIENT CRYPTO POLYFILL FOR SHADOWID
 * Fixed version that runs once and avoids infinite loops
 */
(function() {
  'use strict';
  
  // Guard to prevent multiple executions
  if (window._dVoteCryptoPolyfillInstalled) {
    return;
  }
  
  console.log('[ShadowID] Installing crypto polyfill...');
  
  // Advanced UUID generation with multiple entropy sources
  function createAdvancedRandomUUID() {
    const getRandomValues = function(arr) {
      // Try native crypto first
      if (window.crypto && window.crypto.getRandomValues) {
        try {
          return window.crypto.getRandomValues(arr);
        } catch (e) {
          // Fall through to other methods
        }
      }
      
      // msCrypto for IE
      if (window.msCrypto && window.msCrypto.getRandomValues) {
        try {
          return window.msCrypto.getRandomValues(arr);
        } catch (e) {
          // Fall through
        }
      }
      
      // High-quality Math.random fallback
      const now = Date.now();
      const perf = typeof performance !== 'undefined' ? performance.now() : 0;
      let seed = now + perf + Math.random() * 1000000;
      
      for (let i = 0; i < arr.length; i++) {
        seed = (seed * 9301 + 49297) % 233280;
        const randomValue = seed / 233280;
        arr[i] = Math.floor((randomValue + Math.random()) * 128) % 256;
      }
      return arr;
    };
    
    // Generate UUID
    const bytes = new Uint8Array(16);
    getRandomValues(bytes);
    
    // Set version (4) and variant bits
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    
    // Convert to string
    const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20,32)}`;
  }
  
  // Create crypto object with all required methods
  const cryptoPolyfill = {
    getRandomValues: function(array) {
      if (!array || typeof array.length !== 'number') {
        throw new Error('Invalid array provided');
      }
      
      const uint8Array = new Uint8Array(array.length);
      
      // Try native first
      if (window.crypto && window.crypto.getRandomValues) {
        try {
          window.crypto.getRandomValues(uint8Array);
          for (let i = 0; i < array.length; i++) {
            array[i] = uint8Array[i];
          }
          return array;
        } catch (e) {
          // Fall through to polyfill
        }
      }
      
      // Polyfill implementation
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
      return array;
    },
    
    randomUUID: createAdvancedRandomUUID,
    
    // Additional Web Crypto API methods (stubs for compatibility)
    subtle: window.crypto?.subtle || {
      digest: () => Promise.reject(new Error('SubtleCrypto not available in polyfill')),
      encrypt: () => Promise.reject(new Error('SubtleCrypto not available in polyfill')),
      decrypt: () => Promise.reject(new Error('SubtleCrypto not available in polyfill'))
    }
  };
  
  // Install crypto polyfill safely
  function installCrypto(target) {
    if (!target || typeof target !== 'object') return;
    
    try {
      // Check if crypto exists and is working
      if (target.crypto && target.crypto.randomUUID && typeof target.crypto.randomUUID === 'function') {
        try {
          target.crypto.randomUUID(); // Test it
          return; // It's working, no need to replace
        } catch (e) {
          // It exists but doesn't work, replace it
        }
      }
      
      // Install our polyfill
      if (Object.defineProperty) {
        try {
          Object.defineProperty(target, 'crypto', {
            value: cryptoPolyfill,
            writable: false,
            configurable: true,
            enumerable: true
          });
        } catch (e) {
          // Fallback to direct assignment
          target.crypto = cryptoPolyfill;
        }
      } else {
        target.crypto = cryptoPolyfill;
      }
      
    } catch (error) {
      console.warn('[ShadowID] Failed to install crypto on target:', error.message);
    }
  }
  
  // Install on multiple targets
  const targets = [window, globalThis, self].filter(Boolean);
  targets.forEach(installCrypto);
  
  // Test the installation
  try {
    const testUUID = window.crypto.randomUUID();
    console.log('[ShadowID] ✅ Crypto polyfill installed successfully. Test UUID:', testUUID);
  } catch (error) {
    console.warn('[ShadowID] ⚠️ Crypto polyfill installed but test failed:', error.message);
  }
  
  // Mark as installed to prevent re-execution
  window._dVoteCryptoPolyfillInstalled = true;
  
})();