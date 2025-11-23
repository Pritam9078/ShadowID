// WebSocket configuration and constants
import { WS_BASE } from '../config/api.js';

export const WEBSOCKET_CONFIG = {
  url: WS_BASE, // This will be null in pure dApp mode
  options: {
    reconnect: false, // Disabled for pure dApp mode
    reconnectInterval: 3000,
    maxReconnectAttempts: 0, // No reconnection attempts
    heartbeat: false, // Disabled
    heartbeatInterval: 30000
  }
};

// Keep the old export for compatibility
export const websocketConfig = WEBSOCKET_CONFIG;

// Message types for the WebSocket communication
export const MESSAGE_TYPES = {
  // Incoming message types
  PROPOSAL_UPDATE: 'proposalUpdate',
  VOTE_CAST: 'voteCast',
  PROPOSAL_CREATED: 'proposalCreated',
  TREASURY_UPDATE: 'treasuryUpdate',
  USER_CONNECTED: 'userConnected',
  USER_DISCONNECTED: 'userDisconnected',
  
  // Outgoing message types
  CAST_VOTE: 'castVote',
  CREATE_PROPOSAL: 'createProposal',
  SUBSCRIBE_PROPOSALS: 'subscribeProposals',
  UNSUBSCRIBE_PROPOSALS: 'unsubscribeProposals',
  HEARTBEAT: 'heartbeat',
};

// WebSocket connection states
export const CONNECTION_STATES = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
};

// Helper function to create standardized messages
export const createMessage = (type, data, metadata = {}) => ({
  type,
  data,
  timestamp: new Date().toISOString(),
  ...metadata,
});

// Helper function to validate incoming messages
export const validateMessage = (message) => {
  try {
    const parsed = typeof message === 'string' ? JSON.parse(message) : message;
    return {
      isValid: parsed && typeof parsed.type === 'string',
      message: parsed,
    };
  } catch (error) {
    return {
      isValid: false,
      error: error.message,
    };
  }
};
