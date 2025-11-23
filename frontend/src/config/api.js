/**
 * API Configuration - Centralized endpoint management
 * Provides consistent API URLs and error handling
 */

/**
 * Get API base URL from environment
 * Note: This dApp connects directly to blockchain, backend is optional
 */
export const API_BASE = import.meta.env.VITE_BACKEND_URL || null;
export const WS_BASE = import.meta.env.VITE_WS_URL || null;

/**
 * API Endpoints configuration
 */
export const API_ENDPOINTS = {
  // Proposal endpoints
  proposals: `${API_BASE}/api/proposals`,
  proposalById: (id) => `${API_BASE}/api/proposals/${id}`,
  proposalsByUser: (address) => `${API_BASE}/api/proposals/user/${address}`,
  proposalsValidate: `${API_BASE}/api/proposals/validate`,
  proposalsDraft: `${API_BASE}/api/proposals/draft`,
  proposalsDraftsByUser: (address) => `${API_BASE}/api/proposals/drafts/${address}`,
  proposalsCategories: `${API_BASE}/api/proposals/categories`,
  proposalsSearch: `${API_BASE}/api/proposals/search`,
  proposalsFilters: `${API_BASE}/api/proposals/filters`,
  
  // User endpoints
  userProfile: (address) => `${API_BASE}/api/users/profile/${address}`,
  userProfileCurrent: `${API_BASE}/api/users/profile`,
  
  // ZK (Zero-Knowledge) Proof endpoints
  zkCommitment: `${API_BASE}/zk/commitment`,
  zkProve: (circuit) => `${API_BASE}/zk/prove/${circuit}`,
  zkSubmitProof: `${API_BASE}/zk/submit-proof`,
  zkVerify: `${API_BASE}/zk/verify`,
  zkCircuits: `${API_BASE}/zk/circuits`,
  zkStatus: (proofHash) => `${API_BASE}/zk/status/${proofHash}`,
  
  // IPFS endpoints
  ipfsUpload: `${API_BASE}/api/ipfs/upload`,
  ipfsUploadFile: `${API_BASE}/api/ipfs/upload-file`,
  
  // Analytics endpoints
  analytics: `${API_BASE}/api/analytics`,
  analyticsDashboard: `${API_BASE}/api/analytics/dashboard`,
  analyticsTreasury: `${API_BASE}/api/analytics/treasury`,
  
  // Health check
  health: `${API_BASE}/health`,
  
  // WebSocket - disabled for pure dApp mode
  websocket: null
};

/**
 * Enhanced fetch wrapper with error handling
 */
export async function apiRequest(url, options = {}) {
  try {
    // Ensure URL is absolute
    const absoluteUrl = url.startsWith('http') ? url : `${API_BASE}${url.startsWith('/') ? url : `/${url}`}`;
    
    const response = await fetch(absoluteUrl, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return response;
  } catch (error) {
    console.error(`[DVote API] Request failed for ${url}:`, error.message);
    throw error;
  }
}

/**
 * Validate backend connectivity
 */
export async function validateBackendConnection() {
  try {
    const response = await apiRequest(API_ENDPOINTS.health);
    const data = await response.json();
    console.log('[DVote API] Backend connection validated:', data);
    return true;
  } catch (error) {
    console.error('[DVote API] Backend connection failed:', error.message);
    return false;
  }
}

/**
 * Create WebSocket connection with proper error handling
 */
export function createWebSocketConnection(url = API_ENDPOINTS.websocket) {
  try {
    const ws = new WebSocket(url);
    
    ws.onopen = () => {
      console.log('[DVote WS] WebSocket connected to:', url);
    };
    
    ws.onclose = (event) => {
      console.log('[DVote WS] WebSocket closed:', event.code, event.reason);
    };
    
    ws.onerror = (error) => {
      console.error('[DVote WS] WebSocket error:', error);
    };
    
    return ws;
  } catch (error) {
    console.error('[DVote WS] Failed to create WebSocket:', error.message);
    return null;
  }
}

export default {
  API_BASE,
  WS_BASE,
  API_ENDPOINTS,
  apiRequest,
  validateBackendConnection,
  createWebSocketConnection
};
