const WebSocket = require('ws');
const EventEmitter = require('events');

/**
 * Real-time Service - WebSocket events and live updates
 * Handles real-time synchronization for multi-user poll updates
 */
class RealTimeService extends EventEmitter {
  constructor(proposalService, votingService) {
    super();
    this.proposalService = proposalService;
    this.votingService = votingService;
    this.clients = new Map(); // Map of client connections
    this.rooms = new Map(); // Map of proposal rooms
    this.wss = null;
    
    this.setupEventListeners();
  }

  /**
   * Initialize WebSocket server
   */
  initialize(server) {
    this.wss = new WebSocket.Server({ server });
    
    this.wss.on('connection', (ws, request) => {
      this.handleConnection(ws, request);
    });

    console.log('Real-time service initialized with WebSocket server');
  }

  /**
   * Handle new WebSocket connection
   */
  handleConnection(ws, request) {
    const clientId = this.generateClientId();
    
    const client = {
      id: clientId,
      ws: ws,
      address: null,
      subscribedRooms: new Set(),
      lastActivity: Date.now()
    };

    this.clients.set(clientId, client);
    
    // Send welcome message
    this.sendToClient(clientId, {
      type: 'connected',
      clientId: clientId,
      timestamp: Date.now()
    });

    // Handle messages from client
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        this.handleClientMessage(clientId, message);
      } catch (error) {
        console.error('Error parsing client message:', error);
        this.sendToClient(clientId, {
          type: 'error',
          message: 'Invalid message format'
        });
      }
    });

    // Handle client disconnect
    ws.on('close', () => {
      this.handleClientDisconnect(clientId);
    });

    // Handle errors
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.handleClientDisconnect(clientId);
    });

    console.log(`Client ${clientId} connected`);
  }

  /**
   * Handle messages from clients
   */
  handleClientMessage(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client) return;
    
    client.lastActivity = Date.now();

    switch (message.type) {
      case 'authenticate':
        this.handleAuthentication(clientId, message);
        break;
        
      case 'subscribe_proposal':
        this.handleProposalSubscription(clientId, message);
        break;
        
      case 'unsubscribe_proposal':
        this.handleProposalUnsubscription(clientId, message);
        break;
        
      case 'get_live_tally':
        this.handleLiveTallyRequest(clientId, message);
        break;
        
      case 'ping':
        this.sendToClient(clientId, { type: 'pong', timestamp: Date.now() });
        break;
        
      default:
        this.sendToClient(clientId, {
          type: 'error',
          message: `Unknown message type: ${message.type}`
        });
    }
  }

  /**
   * Handle client authentication
   */
  handleAuthentication(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client) return;

    // In production, verify signature and authenticate user
    client.address = message.address;
    
    this.sendToClient(clientId, {
      type: 'authenticated',
      address: message.address,
      timestamp: Date.now()
    });

    console.log(`Client ${clientId} authenticated as ${message.address}`);
  }

  /**
   * Handle proposal subscription
   */
  async handleProposalSubscription(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client) return;

    const proposalId = message.proposalId;
    
    // Add client to proposal room
    if (!this.rooms.has(proposalId)) {
      this.rooms.set(proposalId, new Set());
    }
    
    this.rooms.get(proposalId).add(clientId);
    client.subscribedRooms.add(proposalId);

    // Send current proposal state
    try {
      const proposal = this.proposalService.getProposal(proposalId);
      const tally = await this.votingService.getProposalVoteTally(proposalId);
      
      this.sendToClient(clientId, {
        type: 'proposal_state',
        proposalId,
        proposal,
        tally,
        timestamp: Date.now()
      });
      
      console.log(`Client ${clientId} subscribed to proposal ${proposalId}`);
    } catch (error) {
      this.sendToClient(clientId, {
        type: 'error',
        message: `Failed to subscribe to proposal: ${error.message}`
      });
    }
  }

  /**
   * Handle proposal unsubscription
   */
  handleProposalUnsubscription(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client) return;

    const proposalId = message.proposalId;
    
    // Remove client from proposal room
    if (this.rooms.has(proposalId)) {
      this.rooms.get(proposalId).delete(clientId);
      
      // Clean up empty rooms
      if (this.rooms.get(proposalId).size === 0) {
        this.rooms.delete(proposalId);
      }
    }
    
    client.subscribedRooms.delete(proposalId);

    this.sendToClient(clientId, {
      type: 'unsubscribed',
      proposalId,
      timestamp: Date.now()
    });

    console.log(`Client ${clientId} unsubscribed from proposal ${proposalId}`);
  }

  /**
   * Handle live tally request
   */
  async handleLiveTallyRequest(clientId, message) {
    try {
      const tally = await this.votingService.getProposalVoteTally(message.proposalId);
      
      this.sendToClient(clientId, {
        type: 'live_tally',
        proposalId: message.proposalId,
        tally,
        timestamp: Date.now()
      });
    } catch (error) {
      this.sendToClient(clientId, {
        type: 'error',
        message: `Failed to get live tally: ${error.message}`
      });
    }
  }

  /**
   * Handle client disconnect
   */
  handleClientDisconnect(clientId) {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Remove client from all rooms
    for (const proposalId of client.subscribedRooms) {
      if (this.rooms.has(proposalId)) {
        this.rooms.get(proposalId).delete(clientId);
        
        // Clean up empty rooms
        if (this.rooms.get(proposalId).size === 0) {
          this.rooms.delete(proposalId);
        }
      }
    }

    // Remove client
    this.clients.delete(clientId);
    
    console.log(`Client ${clientId} disconnected`);
  }

  /**
   * Setup event listeners for proposal and voting services
   */
  setupEventListeners() {
    // Listen to proposal service events
    this.proposalService.subscribe((event) => {
      this.handleProposalEvent(event);
    });

    // Listen to voting service events
    this.votingService.subscribe((event) => {
      this.handleVotingEvent(event);
    });
  }

  /**
   * Handle proposal service events
   */
  handleProposalEvent(event) {
    switch (event.event) {
      case 'proposalCreated':
        this.broadcastToAll({
          type: 'proposal_created',
          proposal: event.data,
          timestamp: event.timestamp
        });
        break;
        
      case 'proposalExecuted':
        this.broadcastToProposalRoom(event.data.id, {
          type: 'proposal_executed',
          proposal: event.data,
          timestamp: event.timestamp
        });
        break;
    }
  }

  /**
   * Handle voting service events
   */
  async handleVotingEvent(event) {
    switch (event.event) {
      case 'voteUpdated':
        const { proposalId, proposal } = event.data;
        const tally = await this.votingService.getProposalVoteTally(proposalId);
        
        this.broadcastToProposalRoom(proposalId, {
          type: 'vote_updated',
          proposalId,
          proposal,
          tally,
          timestamp: event.timestamp
        });
        break;
        
      case 'voteConfirmed':
        this.broadcastToProposalRoom(event.data.proposalId, {
          type: 'vote_confirmed',
          vote: event.data,
          timestamp: event.timestamp
        });
        break;
    }
  }

  /**
   * Send message to specific client
   */
  sendToClient(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      client.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('Error sending message to client:', error);
      this.handleClientDisconnect(clientId);
      return false;
    }
  }

  /**
   * Broadcast message to all clients in a proposal room
   */
  broadcastToProposalRoom(proposalId, message) {
    const room = this.rooms.get(proposalId);
    if (!room) return;

    let sentCount = 0;
    for (const clientId of room) {
      if (this.sendToClient(clientId, message)) {
        sentCount++;
      }
    }

    console.log(`Broadcasted to ${sentCount} clients in proposal ${proposalId}`);
  }

  /**
   * Broadcast message to all connected clients
   */
  broadcastToAll(message) {
    let sentCount = 0;
    for (const clientId of this.clients.keys()) {
      if (this.sendToClient(clientId, message)) {
        sentCount++;
      }
    }

    console.log(`Broadcasted to ${sentCount} clients`);
  }

  /**
   * Generate unique client ID
   */
  generateClientId() {
    return 'client_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
  }

  /**
   * Get connection statistics
   */
  getStatistics() {
    return {
      connectedClients: this.clients.size,
      activeRooms: this.rooms.size,
      totalSubscriptions: Array.from(this.rooms.values()).reduce((sum, room) => sum + room.size, 0),
      averageSubscriptionsPerClient: this.clients.size > 0 ? 
        Array.from(this.clients.values()).reduce((sum, client) => sum + client.subscribedRooms.size, 0) / this.clients.size : 0
    };
  }

  /**
   * Clean up inactive connections
   */
  cleanupInactiveConnections() {
    const now = Date.now();
    const inactivityTimeout = 5 * 60 * 1000; // 5 minutes

    for (const [clientId, client] of this.clients.entries()) {
      if (now - client.lastActivity > inactivityTimeout) {
        console.log(`Cleaning up inactive client: ${clientId}`);
        client.ws.terminate();
        this.handleClientDisconnect(clientId);
      }
    }
  }

  /**
   * Start periodic cleanup
   */
  startCleanupInterval() {
    setInterval(() => {
      this.cleanupInactiveConnections();
      this.votingService.cleanupExpiredVotes();
    }, 60000); // Run every minute
  }
}

module.exports = RealTimeService;
