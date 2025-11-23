import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';

import { createWebSocketConnection, API_ENDPOINTS } from '../config/api.js';

/**
 * WebSocket Service for real-time updates
 */
class WebSocketService {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.listeners = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 3000;
  }

  connect(url = API_ENDPOINTS.websocket) {
    // Skip WebSocket connection if URL is not configured (pure dApp mode)
    if (!url || url === null) {
      console.log('🔌 WebSocket disabled - running in pure dApp mode');
      this.connected = false;
      return;
    }

    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      return;
    }

    this.isConnecting = true;
    
    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.emit('connected');
        toast.success('Real-time updates connected');
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.emit(data.type, data.payload);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.reason);
        this.isConnecting = false;
        this.emit('disconnected');
        
        if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isConnecting = false;
        this.emit('error', error);
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.isConnecting = false;
    }
  }

  reconnect() {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  disconnect() {
    if (this.ws) {
      this.ws.close(1000, 'User disconnected');
      this.ws = null;
    }
  }

  send(type, payload) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    } else {
      console.warn('WebSocket not connected. Cannot send message:', { type, payload });
    }
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in WebSocket event callback:', error);
        }
      });
    }
  }

  isConnected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Singleton instance
const webSocketService = new WebSocketService();

// React hook for WebSocket integration
export const useWebSocket = (events = []) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const eventCallbacks = useRef(new Map());

  useEffect(() => {
    // Connect to WebSocket
    webSocketService.connect();

    // Set up connection status listeners
    const handleConnected = () => {
      setIsConnected(true);
      setConnectionError(null);
    };

    const handleDisconnected = () => {
      setIsConnected(false);
    };

    const handleError = (error) => {
      setConnectionError(error);
    };

    webSocketService.on('connected', handleConnected);
    webSocketService.on('disconnected', handleDisconnected);
    webSocketService.on('error', handleError);

    // Set up event listeners
    events.forEach(({ event, callback }) => {
      eventCallbacks.current.set(event, callback);
      webSocketService.on(event, callback);
    });

    // Cleanup
    return () => {
      webSocketService.off('connected', handleConnected);
      webSocketService.off('disconnected', handleDisconnected);
      webSocketService.off('error', handleError);

      // Remove event listeners
      eventCallbacks.current.forEach((callback, event) => {
        webSocketService.off(event, callback);
      });
      eventCallbacks.current.clear();
    };
  }, []);

  // Update event listeners when they change
  useEffect(() => {
    // Remove old listeners
    eventCallbacks.current.forEach((callback, event) => {
      webSocketService.off(event, callback);
    });
    eventCallbacks.current.clear();

    // Add new listeners
    events.forEach(({ event, callback }) => {
      eventCallbacks.current.set(event, callback);
      webSocketService.on(event, callback);
    });
  }, [events]);

  const sendMessage = (type, payload) => {
    webSocketService.send(type, payload);
  };

  return {
    isConnected,
    connectionError,
    sendMessage,
    webSocketService
  };
};

// React component for real-time notifications
export const RealTimeNotifications = () => {
  // If WebSocket is disabled (pure dApp mode), don't render anything
  if (!API_ENDPOINTS.websocket) {
    return null;
  }

  const [notifications, setNotifications] = useState([]);

  const handleProposalUpdate = (data) => {
    toast.success(`Proposal "${data.title}" has been updated`);
    setNotifications(prev => [...prev, {
      id: Date.now(),
      type: 'proposal',
      message: `Proposal "${data.title}" has been updated`,
      timestamp: new Date()
    }]);
  };

  const handleNewVote = (data) => {
    toast.info(`New vote cast on proposal "${data.proposalTitle}"`);
    setNotifications(prev => [...prev, {
      id: Date.now(),
      type: 'vote',
      message: `New vote cast on proposal "${data.proposalTitle}"`,
      timestamp: new Date()
    }]);
  };

  const handleNewComment = (data) => {
    toast.info(`New comment on proposal "${data.proposalTitle}"`);
    setNotifications(prev => [...prev, {
      id: Date.now(),
      type: 'comment',
      message: `New comment on proposal "${data.proposalTitle}"`,
      timestamp: new Date()
    }]);
  };

  const handleTreasuryUpdate = (data) => {
    toast.success(`Treasury updated: ${data.message}`);
    setNotifications(prev => [...prev, {
      id: Date.now(),
      type: 'treasury',
      message: `Treasury updated: ${data.message}`,
      timestamp: new Date()
    }]);
  };

  const { isConnected, connectionError } = useWebSocket([
    { event: 'proposalUpdate', callback: handleProposalUpdate },
    { event: 'newVote', callback: handleNewVote },
    { event: 'newComment', callback: handleNewComment },
    { event: 'treasuryUpdate', callback: handleTreasuryUpdate }
  ]);

  return (
    <div className="fixed top-4 right-4 z-50">
      {/* Connection Status Indicator */}
      <div className={`mb-2 px-3 py-1 rounded-full text-xs font-medium ${
        isConnected 
          ? 'bg-green-100 text-green-800' 
          : 'bg-red-100 text-red-800'
      }`}>
        {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
      </div>

      {/* Error Message */}
      {connectionError && (
        <div className="mb-2 px-3 py-2 bg-yellow-100 text-yellow-800 rounded-lg text-sm">
          Connection issue detected. Attempting to reconnect...
        </div>
      )}
    </div>
  );
};

// Hook for real-time proposal updates
export const useRealTimeProposals = (initialProposals = []) => {
  const [proposals, setProposals] = useState(initialProposals);

  const handleProposalUpdate = (data) => {
    setProposals(prev => 
      prev.map(proposal => 
        proposal.id === data.id 
          ? { ...proposal, ...data }
          : proposal
      )
    );
  };

  const handleNewProposal = (data) => {
    setProposals(prev => [data, ...prev]);
  };

  const handleVoteUpdate = (data) => {
    setProposals(prev => 
      prev.map(proposal => 
        proposal.id === data.proposalId
          ? {
              ...proposal,
              votes: {
                ...proposal.votes,
                for: data.votes.for,
                against: data.votes.against,
                abstain: data.votes.abstain
              }
            }
          : proposal
      )
    );
  };

  useWebSocket([
    { event: 'proposalUpdate', callback: handleProposalUpdate },
    { event: 'newProposal', callback: handleNewProposal },
    { event: 'voteUpdate', callback: handleVoteUpdate }
  ]);

  return proposals;
};

// Hook for real-time treasury updates
export const useRealTimeTreasury = (initialTreasury = {}) => {
  const [treasury, setTreasury] = useState(initialTreasury);

  const handleTreasuryUpdate = (data) => {
    setTreasury(prev => ({ ...prev, ...data }));
  };

  const handleTransactionUpdate = (data) => {
    setTreasury(prev => ({
      ...prev,
      transactions: [data, ...(prev.transactions || [])]
    }));
  };

  useWebSocket([
    { event: 'treasuryUpdate', callback: handleTreasuryUpdate },
    { event: 'newTransaction', callback: handleTransactionUpdate }
  ]);

  return treasury;
};

export default webSocketService;
