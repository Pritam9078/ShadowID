import { useState, useEffect, useRef, useCallback } from 'react';
import { WEBSOCKET_CONFIG, CONNECTION_STATES, validateMessage, createMessage } from '../utils/websocketConfig';

// Custom hook for WebSocket connection with auto-reconnect
const useWebSocket = (url = WEBSOCKET_CONFIG.url, options = {}) => {
  const [socket, setSocket] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const [lastMessage, setLastMessage] = useState(null);
  const [connectionError, setConnectionError] = useState(null);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);

  // Skip all WebSocket functionality if URL is null/undefined (pure dApp mode)
  if (!url || url === null) {
    return {
      socket: null,
      connectionStatus: 'Disabled',
      lastMessage: null,
      connectionError: null,
      sendMessage: () => console.log('WebSocket disabled - pure dApp mode'),
      connect: () => console.log('WebSocket disabled - pure dApp mode'),
      disconnect: () => console.log('WebSocket disabled - pure dApp mode'),
      reconnect: () => console.log('WebSocket disabled - pure dApp mode')
    };
  }

  // Refs to maintain values across re-renders
  const reconnectTimeoutRef = useRef(null);
  const reconnectIntervalRef = useRef(WEBSOCKET_CONFIG.reconnectInterval);
  const shouldReconnect = useRef(true);
  const messageQueue = useRef([]);

  // Merge default options with provided options
  const config = {
    ...WEBSOCKET_CONFIG,
    ...options,
  };

  // Calculate reconnect delay with exponential backoff
  const getReconnectDelay = useCallback(() => {
    const delay = Math.min(
      reconnectIntervalRef.current * Math.pow(config.reconnectDecay, reconnectAttempt),
      config.maxReconnectInterval
    );
    return delay;
  }, [reconnectAttempt, config]);

  // Connect to WebSocket
  const connect = useCallback(() => {
    try {
      console.log(`🔌 Attempting to connect to WebSocket: ${url}`);
      setConnectionStatus('Connecting');
      setConnectionError(null);

      const ws = new WebSocket(url);

      ws.onopen = (event) => {
        console.log('✅ WebSocket connected successfully');
        setConnectionStatus('Connected');
        setSocket(ws);
        setReconnectAttempt(0);
        reconnectIntervalRef.current = config.reconnectInterval;
        
        // Send any queued messages
        while (messageQueue.current.length > 0) {
          const message = messageQueue.current.shift();
          ws.send(JSON.stringify(message));
        }

        // Send heartbeat to maintain connection
        const heartbeat = createMessage('heartbeat', { status: 'connected' });
        ws.send(JSON.stringify(heartbeat));
      };

      ws.onmessage = (event) => {
        const { isValid, message, error } = validateMessage(event.data);
        
        if (isValid) {
          console.log('📨 Received message:', message);
          setLastMessage(message);
        } else {
          console.error('❌ Invalid message received:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('🔌 WebSocket connection closed:', event.code, event.reason);
        setConnectionStatus('Disconnected');
        setSocket(null);

        // Attempt to reconnect if not manually closed
        if (shouldReconnect.current && reconnectAttempt < config.maxReconnectAttempts) {
          const delay = getReconnectDelay();
          console.log(`🔄 Reconnecting in ${delay}ms... (Attempt ${reconnectAttempt + 1})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectAttempt(prev => prev + 1);
            connect();
          }, delay);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setConnectionError('Connection error occurred');
        setConnectionStatus('Error');
      };

      return ws;
    } catch (error) {
      console.error('❌ Failed to create WebSocket connection:', error);
      setConnectionError('Failed to create connection');
      setConnectionStatus('Error');
      return null;
    }
  }, [url, reconnectAttempt, config, getReconnectDelay]);

  // Send message through WebSocket
  const sendMessage = useCallback((message) => {
    if (socket && socket.readyState === CONNECTION_STATES.OPEN) {
      try {
        const formattedMessage = typeof message === 'string' 
          ? message 
          : JSON.stringify(message);
        
        socket.send(formattedMessage);
        console.log('📤 Message sent:', message);
        return true;
      } catch (error) {
        console.error('❌ Failed to send message:', error);
        return false;
      }
    } else {
      // Queue message if not connected
      console.log('📝 Queueing message (not connected):', message);
      messageQueue.current.push(message);
      return false;
    }
  }, [socket]);

  // Manually reconnect
  const reconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (socket) {
      socket.close();
    }
    
    setReconnectAttempt(0);
    shouldReconnect.current = true;
    connect();
  }, [socket, connect]);

  // Disconnect WebSocket
  const disconnect = useCallback(() => {
    shouldReconnect.current = false;
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (socket) {
      socket.close();
    }
    
    setSocket(null);
    setConnectionStatus('Disconnected');
  }, [socket]);

  // Subscribe to specific message types
  const subscribe = useCallback((messageType) => {
    const subscribeMessage = createMessage('subscribe', { 
      type: messageType,
      timestamp: new Date().toISOString()
    });
    return sendMessage(subscribeMessage);
  }, [sendMessage]);

  // Unsubscribe from specific message types
  const unsubscribe = useCallback((messageType) => {
    const unsubscribeMessage = createMessage('unsubscribe', { 
      type: messageType,
      timestamp: new Date().toISOString()
    });
    return sendMessage(unsubscribeMessage);
  }, [sendMessage]);

  // Initialize connection on mount
  useEffect(() => {
    if (url) {
      connect();
    }

    // Cleanup on unmount
    return () => {
      shouldReconnect.current = false;
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (socket) {
        socket.close();
      }
    };
  }, [url]); // Only reconnect if URL changes

  // Heartbeat to keep connection alive
  useEffect(() => {
    if (socket && connectionStatus === 'Connected') {
      const heartbeatInterval = setInterval(() => {
        const heartbeat = createMessage('heartbeat', { status: 'alive' });
        sendMessage(heartbeat);
      }, 30000); // Send heartbeat every 30 seconds

      return () => clearInterval(heartbeatInterval);
    }
  }, [socket, connectionStatus, sendMessage]);

  return {
    socket,
    connectionStatus,
    lastMessage,
    connectionError,
    reconnectAttempt,
    isConnected: connectionStatus === 'Connected',
    isConnecting: connectionStatus === 'Connecting',
    isDisconnected: connectionStatus === 'Disconnected',
    sendMessage,
    reconnect,
    disconnect,
    subscribe,
    unsubscribe,
  };
};

export default useWebSocket;
