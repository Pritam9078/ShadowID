import { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount } from 'wagmi';
import { API_ENDPOINTS } from '../config/api.js';

/**
 * Custom hook for WebSocket real-time updates
 * Handles proposal updates, voting events, and live synchronization
 */
export const useWebSocket = (options = {}) => {
  const { address } = useAccount();
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [lastMessage, setLastMessage] = useState(null);
  const [error, setError] = useState(null);
  
  const ws = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = options.maxReconnectAttempts || 5;
  const reconnectInterval = options.reconnectInterval || 3000;
  const heartbeatInterval = useRef(null);
  
  // WebSocket URL - use API configuration
  const WS_URL = API_ENDPOINTS.websocket;

  /**
   * Connect to WebSocket server
   */
  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      setConnectionStatus('connecting');
      ws.current = new WebSocket(WS_URL);

      ws.current.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setConnectionStatus('connected');
        setError(null);
        reconnectAttempts.current = 0;

        // Send authentication if user is connected
        if (address) {
          ws.current.send(JSON.stringify({
            type: 'authenticate',
            address: address
          }));
        }

        // Start heartbeat
        heartbeatInterval.current = setInterval(() => {
          if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000);
      };

      ws.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          setLastMessage(message);
          
          // Handle different message types
          switch (message.type) {
            case 'pong':
              // Heartbeat response - do nothing
              break;
            case 'proposal-updated':
              handleProposalUpdate(message.data);
              break;
            case 'vote-cast':
              handleVoteCast(message.data);
              break;
            case 'proposal-created':
              handleProposalCreated(message.data);
              break;
            case 'real-time-update':
              handleRealTimeUpdate(message.data);
              break;
            default:
              console.log('Unknown message type:', message.type);
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      ws.current.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        setConnectionStatus('disconnected');
        
        // Clear heartbeat
        if (heartbeatInterval.current) {
          clearInterval(heartbeatInterval.current);
          heartbeatInterval.current = null;
        }

        // Attempt to reconnect if not intentionally closed
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          setConnectionStatus('reconnecting');
          
          setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('WebSocket connection error');
        setConnectionStatus('error');
      };

    } catch (err) {
      console.error('Failed to create WebSocket connection:', err);
      setError(err.message);
      setConnectionStatus('error');
    }
  }, [address, WS_URL, maxReconnectAttempts, reconnectInterval]);

  /**
   * Disconnect from WebSocket server
   */
  const disconnect = useCallback(() => {
    if (ws.current) {
      ws.current.close(1000, 'User disconnected');
    }
    
    if (heartbeatInterval.current) {
      clearInterval(heartbeatInterval.current);
      heartbeatInterval.current = null;
    }
    
    setIsConnected(false);
    setConnectionStatus('disconnected');
  }, []);

  /**
   * Send message to server
   */
  const sendMessage = useCallback((message) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
      return true;
    } else {
      console.warn('WebSocket not connected, cannot send message');
      return false;
    }
  }, []);

  /**
   * Subscribe to proposal updates
   */
  const subscribeToProposal = useCallback((proposalId) => {
    return sendMessage({
      type: 'subscribe',
      channel: 'proposal',
      proposalId: proposalId
    });
  }, [sendMessage]);

  /**
   * Unsubscribe from proposal updates
   */
  const unsubscribeFromProposal = useCallback((proposalId) => {
    return sendMessage({
      type: 'unsubscribe',
      channel: 'proposal',
      proposalId: proposalId
    });
  }, [sendMessage]);

  /**
   * Subscribe to general proposal feed
   */
  const subscribeToProposalFeed = useCallback(() => {
    return sendMessage({
      type: 'subscribe',
      channel: 'proposals'
    });
  }, [sendMessage]);

  /**
   * Subscribe to user-specific updates
   */
  const subscribeToUserUpdates = useCallback(() => {
    if (!address) return false;
    
    return sendMessage({
      type: 'subscribe',
      channel: 'user',
      address: address
    });
  }, [sendMessage, address]);

  // Message handlers
  const handleProposalUpdate = useCallback((data) => {
    // Emit custom event for components to listen to
    window.dispatchEvent(new CustomEvent('proposal-updated', { detail: data }));
  }, []);

  const handleVoteCast = useCallback((data) => {
    window.dispatchEvent(new CustomEvent('vote-cast', { detail: data }));
  }, []);

  const handleProposalCreated = useCallback((data) => {
    window.dispatchEvent(new CustomEvent('proposal-created', { detail: data }));
  }, []);

  const handleRealTimeUpdate = useCallback((data) => {
    window.dispatchEvent(new CustomEvent('real-time-update', { detail: data }));
  }, []);

  // Effect to manage connection
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Effect to handle user authentication changes
  useEffect(() => {
    if (isConnected && address) {
      sendMessage({
        type: 'authenticate',
        address: address
      });
    }
  }, [isConnected, address, sendMessage]);

  /**
   * Custom event listeners for real-time updates
   */
  const useRealTimeListener = useCallback((eventType, handler) => {
    useEffect(() => {
      window.addEventListener(eventType, handler);
      return () => window.removeEventListener(eventType, handler);
    }, [eventType, handler]);
  }, []);

  return {
    // Connection state
    isConnected,
    connectionStatus,
    error,
    lastMessage,
    
    // Connection management
    connect,
    disconnect,
    
    // Messaging
    sendMessage,
    
    // Subscriptions
    subscribeToProposal,
    unsubscribeFromProposal,
    subscribeToProposalFeed,
    subscribeToUserUpdates,
    
    // Event listener helper
    useRealTimeListener
  };
};

/**
 * Specialized hook for proposal real-time updates
 */
export const useProposalRealTime = (proposalId) => {
  const webSocket = useWebSocket();
  const [proposalData, setProposalData] = useState(null);
  const [votingStats, setVotingStats] = useState(null);
  const [recentVotes, setRecentVotes] = useState([]);

  // Subscribe to proposal updates when component mounts
  useEffect(() => {
    if (webSocket.isConnected && proposalId) {
      webSocket.subscribeToProposal(proposalId);
      
      return () => {
        webSocket.unsubscribeFromProposal(proposalId);
      };
    }
  }, [webSocket.isConnected, proposalId, webSocket]);

  // Listen for proposal updates
  useEffect(() => {
    const handleProposalUpdate = (event) => {
      const data = event.detail;
      if (data.proposalId === proposalId) {
        setProposalData(data.proposal);
        setVotingStats(data.votingStats);
      }
    };

    const handleVoteCast = (event) => {
      const data = event.detail;
      if (data.proposalId === proposalId) {
        setRecentVotes(prev => [data, ...prev.slice(0, 4)]); // Keep last 5 votes
        // Update voting stats if provided
        if (data.updatedStats) {
          setVotingStats(data.updatedStats);
        }
      }
    };

    window.addEventListener('proposal-updated', handleProposalUpdate);
    window.addEventListener('vote-cast', handleVoteCast);

    return () => {
      window.removeEventListener('proposal-updated', handleProposalUpdate);
      window.removeEventListener('vote-cast', handleVoteCast);
    };
  }, [proposalId]);

  return {
    ...webSocket,
    proposalData,
    votingStats,
    recentVotes
  };
};

/**
 * Hook for real-time proposal feed
 */
export const useProposalFeed = () => {
  const webSocket = useWebSocket();
  const [proposals, setProposals] = useState([]);
  const [newProposalCount, setNewProposalCount] = useState(0);

  // Subscribe to proposal feed
  useEffect(() => {
    if (webSocket.isConnected) {
      webSocket.subscribeToProposalFeed();
    }
  }, [webSocket.isConnected, webSocket]);

  // Listen for new proposals
  useEffect(() => {
    const handleProposalCreated = (event) => {
      const data = event.detail;
      setProposals(prev => [data, ...prev]);
      setNewProposalCount(prev => prev + 1);
    };

    const handleProposalUpdate = (event) => {
      const data = event.detail;
      setProposals(prev => 
        prev.map(p => p.id === data.proposalId ? { ...p, ...data.proposal } : p)
      );
    };

    window.addEventListener('proposal-created', handleProposalCreated);
    window.addEventListener('proposal-updated', handleProposalUpdate);

    return () => {
      window.removeEventListener('proposal-created', handleProposalCreated);
      window.removeEventListener('proposal-updated', handleProposalUpdate);
    };
  }, []);

  const markAsRead = useCallback(() => {
    setNewProposalCount(0);
  }, []);

  return {
    ...webSocket,
    proposals,
    newProposalCount,
    markAsRead
  };
};
