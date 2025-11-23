// Network Request Filter - Prevents blocked external API calls
// Load this before any other network-dependent scripts

(function() {
  'use strict';
  
  // Store original fetch
  const originalFetch = window.fetch;
  
  // URLs to block/filter
  const blockedDomains = [
    'pulse.walletconnect.org',
    'api.web3modal.org',
    'chrome-extension://'
  ];
  
  // Override fetch to filter blocked requests
  window.fetch = function(url, options) {
    // Convert URL to string if it's a URL object
    const urlString = typeof url === 'string' ? url : url.toString();
    
    // Check if URL should be blocked
    const shouldBlock = blockedDomains.some(domain => urlString.includes(domain));
    
    if (shouldBlock) {
      console.log(`[DVote] Blocked network request to: ${urlString}`);
      // Return a resolved promise with a mock response
      return Promise.resolve(new Response('{}', {
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'Content-Type': 'application/json' })
      }));
    }
    
    // Allow other requests
    return originalFetch.apply(this, arguments);
  };
  
  console.log('[DVote] Network request filter loaded');
})();
