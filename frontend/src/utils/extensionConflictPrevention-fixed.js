/**
 * EFFICIENT EXTENSION CONFLICT PREVENTION SYSTEM
 * Cleaned up version that runs once and avoids infinite loops
 */

// Global guard to prevent multiple executions
if (window._dVoteExtensionConflictPreventionLoaded) {
  // Already loaded, create dummy function
  window.initializeExtensionConflictPrevention = function() {
    return; // No-op
  };
} else {
  // Mark as loaded immediately
  window._dVoteExtensionConflictPreventionLoaded = true;
  
  /**
   * Creates bulletproof crypto.randomUUID implementation
   */
  function createRandomUUID() {
    // Generate 16 random bytes
    const bytes = new Uint8Array(16);
    
    // Try to use native crypto
    if (window.crypto && window.crypto.getRandomValues) {
      try {
        window.crypto.getRandomValues(bytes);
      } catch (e) {
        // Fallback to Math.random
        for (let i = 0; i < 16; i++) {
          bytes[i] = Math.floor(Math.random() * 256);
        }
      }
    } else {
      // Fallback to Math.random with better entropy
      const now = Date.now();
      const perf = typeof performance !== 'undefined' ? performance.now() : 0;
      let seed = now + perf;
      
      for (let i = 0; i < 16; i++) {
        seed = (seed * 9301 + 49297) % 233280;
        bytes[i] = Math.floor((seed / 233280 + Math.random()) * 256) % 256;
      }
    }
    
    // Set version (4) and variant bits
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    
    // Convert to UUID string
    const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20,32)}`;
  }
  
  /**
   * Install crypto.randomUUID on target object
   */
  function installRandomUUID(target) {
    if (!target || typeof target !== 'object') return false;
    
    try {
      // Check if it already exists and works
      if (target.crypto && target.crypto.randomUUID && typeof target.crypto.randomUUID === 'function') {
        try {
          target.crypto.randomUUID(); // Test it
          return true; // It works, no need to replace
        } catch (e) {
          // Exists but broken, will replace below
        }
      }
      
      // Ensure crypto object exists
      if (!target.crypto) {
        target.crypto = {};
      }
      
      // Install our randomUUID function
      if (typeof Object.defineProperty === 'function') {
        try {
          Object.defineProperty(target.crypto, 'randomUUID', {
            value: createRandomUUID,
            writable: false,
            configurable: true,
            enumerable: true
          });
        } catch (e) {
          // Fallback to direct assignment
          target.crypto.randomUUID = createRandomUUID;
        }
      } else {
        target.crypto.randomUUID = createRandomUUID;
      }
      
      return true;
    } catch (error) {
      console.warn('[ShadowID] Failed to install randomUUID on target:', error.message);
      return false;
    }
  }
  
  /**
   * Main initialization function
   */
  window.initializeExtensionConflictPrevention = function() {
    if (window._dVoteExtensionConflictPreventionInitialized) {
      return; // Already initialized
    }
    
    console.log('[ShadowID] Initializing extension conflict prevention...');
    
    // Install on all relevant targets
    const targets = [window, globalThis, self].filter(Boolean);
    let successCount = 0;
    
    targets.forEach(target => {
      if (installRandomUUID(target)) {
        successCount++;
      }
    });
    
    // Test the installation
    try {
      const testUUID = window.crypto.randomUUID();
      console.log('[ShadowID] ✅ Extension conflict prevention verified. Test UUID:', testUUID);
    } catch (error) {
      console.warn('[ShadowID] ⚠️ Extension conflict prevention installed but test failed:', error.message);
    }
    
    // Mark as initialized
    window._dVoteExtensionConflictPreventionInitialized = true;
  };
  
  // Auto-initialize if in browser environment
  if (typeof window !== 'undefined') {
    // Use a short delay to ensure DOM is ready
    setTimeout(() => {
      window.initializeExtensionConflictPrevention();
    }, 10);
  }
}