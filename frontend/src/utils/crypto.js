/**
 * Crypto Utilities - Polyfills for crypto.randomUUID
 * This module provides fallbacks for environments where crypto.randomUUID is not available
 */

/**
 * Aggressive polyfill for crypto.randomUUID - applies to all global contexts
 * Generates a RFC 4122 version 4 UUID
 */
function polyfillRandomUUID() {
  // Ensure crypto exists on window
  if (!window.crypto) {
    window.crypto = {};
  }
  
  // Ensure crypto exists on globalThis
  if (!globalThis.crypto) {
    globalThis.crypto = window.crypto;
  }
  
  // Ensure crypto exists on global scope
  if (typeof self !== 'undefined' && !self.crypto) {
    self.crypto = window.crypto;
  }

  // Polyfill getRandomValues first
  const polyfillGetRandomValues = function(array) {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  };

  if (!window.crypto.getRandomValues) {
    window.crypto.getRandomValues = polyfillGetRandomValues;
  }
  if (!globalThis.crypto.getRandomValues) {
    globalThis.crypto.getRandomValues = polyfillGetRandomValues;
  }
  if (typeof self !== 'undefined' && !self.crypto.getRandomValues) {
    self.crypto.getRandomValues = polyfillGetRandomValues;
  }

  // Create randomUUID function
  const randomUUIDFunc = function() {
    const getRandomValues = window.crypto.getRandomValues || globalThis.crypto.getRandomValues || polyfillGetRandomValues;
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
      (c ^ getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
  };

  // Apply to all possible global contexts
  if (!window.crypto.randomUUID) {
    window.crypto.randomUUID = randomUUIDFunc;
  }
  if (!globalThis.crypto.randomUUID) {
    globalThis.crypto.randomUUID = randomUUIDFunc;
  }
  if (typeof self !== 'undefined' && !self.crypto.randomUUID) {
    self.crypto.randomUUID = randomUUIDFunc;
  }
  
  // Apply to global crypto if it exists separately
  if (typeof crypto !== 'undefined' && crypto !== window.crypto && !crypto.randomUUID) {
    try {
      crypto.randomUUID = randomUUIDFunc;
    } catch (e) {
      // May be read-only in some environments
    }
  }
  
  console.log('[DVote] crypto.randomUUID polyfill installed on all global contexts');
}

/**
 * Safe UUID generation function
 * @returns {string} A valid UUID v4 string
 */
export function generateUUID() {
  try {
    // Ensure polyfill is installed
    if (!window.crypto?.randomUUID && !globalThis.crypto?.randomUUID) {
      polyfillRandomUUID();
    }
    
    // Try various global contexts
    if (window.crypto?.randomUUID) {
      return window.crypto.randomUUID();
    }
    if (globalThis.crypto?.randomUUID) {
      return globalThis.crypto.randomUUID();
    }
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    
    throw new Error('No randomUUID available');
  } catch (error) {
    console.warn('[DVote] crypto.randomUUID failed, using fallback:', error.message);
    // Manual UUID generation as final fallback
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

/**
 * Initialize crypto polyfills
 * Call this early in your application
 */
export function initializeCrypto() {
  try {
    polyfillRandomUUID();
    
    // Test that it works
    const testId = generateUUID();
    console.log('[DVote] Crypto polyfills initialized, test UUID:', testId);
    return true;
  } catch (error) {
    console.error('[DVote] Failed to initialize crypto polyfills:', error);
    return false;
  }
}

// Auto-initialize when module is imported
if (typeof window !== 'undefined') {
  // Apply immediately and also on DOMContentLoaded
  initializeCrypto();
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeCrypto);
  }
  
  // Also apply on window load as a fallback
  window.addEventListener('load', initializeCrypto);
}

export default {
  generateUUID,
  initializeCrypto,
  polyfillRandomUUID
};
