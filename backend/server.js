const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const WebSocket = require('ws');
const path = require('path');
require('dotenv').config();

// Import services
const NoirService = require('./zk/noir.js');
const KYCService = require('./kyc.js');
const DAOService = require('./dao.js');
// Temporarily disabled to prevent crashes
// const analyticsService = require('./services/analyticsService');
const { pinataService } = require('./services/pinataService');
const { alchemyService } = require('./services/alchemyService');
const { arbiscanService } = require('./services/arbiscanService');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Initialize services
const noirService = new NoirService();
const kycService = new KYCService();
const daoService = new DAOService();

// Middleware
app.use(cors({
  origin: [
    'http://localhost:3001', 
    'http://localhost:3000', 
    'http://localhost:5173',
    'http://10.4.4.178:3000',
    /^http:\/\/10\.\d+\.\d+\.\d+:3000$/,  // Allow any 10.x.x.x:3000
    /^http:\/\/192\.168\.\d+\.\d+:3000$/,  // Allow any 192.168.x.x:3000
    /^http:\/\/172\.(1[6-9]|2\d|3[01])\.\d+\.\d+:3000$/,  // Allow 172.16-31.x.x:3000
    // Production domains
    'https://shadowid-frontend.netlify.app',
    'https://shadowid.netlify.app',
    /^https:\/\/.*\.netlify\.app$/,  // Allow any Netlify subdomain
    /^https:\/\/.*\.vercel\.app$/,   // Allow any Vercel subdomain
    process.env.FRONTEND_URL,       // Environment variable for custom domain
  ].filter(Boolean),  // Remove undefined values
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static frontend files (only in development)
if (process.env.NODE_ENV !== 'production') {
  app.use(express.static(path.join(__dirname, 'public')));
}

// Root API endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'DVote Backend API',
    version: '1.0.0',
    description: 'Backend API for DVote DAO Governance Platform with Arbitrum Sepolia Integration',
    endpoints: {
      health: '/health',
      proposals: '/api/proposals',
      users: '/api/users',
      treasury: '/api/treasury',
      ipfs: '/api/ipfs',
      pinata: '/api/pinata',
      alchemy: '/api/alchemy',
      arbiscan: '/api/arbiscan',
      analytics: '/api/analytics',
      webhooks: '/api/webhooks'
    },
    services: {
      blockchain: 'Arbitrum Sepolia via Alchemy',
      storage: 'IPFS via Pinata',
      explorer: 'Arbiscan API',
      websocket: 'Real-time updates'
    },
    network: {
      name: 'Arbitrum Sepolia',
      chainId: 421614,
      rpc: 'https://arb-sepolia.g.alchemy.com/v2/mUJMHrybqfzOlpVeT0cj7'
    },
    github: 'https://github.com/Pritam9078/dvt',
    frontend: process.env.NODE_ENV === 'production' 
      ? 'Deployed separately as static site' 
      : 'http://localhost:5173'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    services: {
      proposals: 'active',
      voting: 'active',
      realTime: 'active'
    }
  });
});

// API Routes
app.use('/api/proposals', require('./routes/proposalRoutes'));
app.use('/api/treasury', require('./routes/treasuryRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/ipfs', require('./routes/ipfsRoutes'));
app.use('/api/pinata', require('./routes/pinataRoutes'));
app.use('/api/alchemy', require('./routes/alchemyRoutes'));
app.use('/api/arbiscan', require('./routes/arbiscanRoutes'));
app.use('/api/crowdfunding', require('./routes/crowdfundingRoutes'));

// ShadowID Routes (KYC/KYB and ZK Proof Operations)
app.use('/api/kyc', require('./routes/kycRoutes'));
app.use('/api/kyb', require('./routes/kybRoutes'));
app.use('/api/zk', require('./routes/zkRoutes'));

// ZK Routes (Zero-Knowledge Proof Operations) - Simple version for testing
app.use('/zk', require('./zk/zkRoutes-simple'));

// Webhook routes
const { router: webhookRouter, setBroadcastFunction } = require('./routes/webhookRoutes');
app.use('/api/webhooks', webhookRouter);

// Enhanced treasury routes
app.use('/api/treasury/enhanced', require('./routes/treasuryAnalyticsRoutes'));

// Analytics endpoints
app.get('/api/analytics', async (req, res) => {
  try {
    const { timeframe = '30d' } = req.query;
    
    // Mock analytics data for now
    const analytics = {
      totalProposals: 42,
      activeVoters: 156,
      totalVotes: 234,
      treasuryValue: 125000,
      proposalGrowth: '+12%',
      voterGrowth: '+8%',
      voteGrowth: '+15%',
      treasuryGrowth: '+3%',
      proposalActivity: [
        { date: '2025-10-20', proposals: 5 },
        { date: '2025-10-21', proposals: 8 },
        { date: '2025-10-22', proposals: 12 },
        { date: '2025-10-23', proposals: 7 },
        { date: '2025-10-24', proposals: 15 },
        { date: '2025-10-25', proposals: 10 },
        { date: '2025-10-26', proposals: 18 }
      ],
      votingDistribution: [
        { name: 'For', value: 65 },
        { name: 'Against', value: 25 },
        { name: 'Abstain', value: 10 }
      ],
      userEngagement: [
        { date: '2025-10-20', activeUsers: 45, newUsers: 8 },
        { date: '2025-10-21', activeUsers: 52, newUsers: 12 },
        { date: '2025-10-22', activeUsers: 48, newUsers: 6 },
        { date: '2025-10-23', activeUsers: 67, newUsers: 15 },
        { date: '2025-10-24', activeUsers: 71, newUsers: 9 },
        { date: '2025-10-25', activeUsers: 58, newUsers: 11 },
        { date: '2025-10-26', activeUsers: 75, newUsers: 18 }
      ],
      treasuryFlow: [
        { date: '2025-10-20', inflow: 15000, outflow: 8000 },
        { date: '2025-10-21', inflow: 22000, outflow: 12000 },
        { date: '2025-10-22', inflow: 18000, outflow: 5000 },
        { date: '2025-10-23', inflow: 25000, outflow: 15000 },
        { date: '2025-10-24', inflow: 20000, outflow: 7000 },
        { date: '2025-10-25', inflow: 28000, outflow: 18000 },
        { date: '2025-10-26', inflow: 32000, outflow: 22000 }
      ],
      recentActivity: [
        {
          type: 'proposal',
          title: 'Treasury Fund Allocation for Q1 2026',
          description: 'New proposal for treasury allocation submitted',
          timestamp: new Date().toISOString()
        },
        {
          type: 'vote',
          title: 'Community Governance Update',
          description: 'New vote submitted on governance proposal',
          timestamp: new Date(Date.now() - 3600000).toISOString()
        },
        {
          type: 'treasury',
          title: 'Treasury Transaction',
          description: 'Treasury balance updated with new transaction',
          timestamp: new Date(Date.now() - 7200000).toISOString()
        }
      ],
      proposalStatus: {
        executed: 25,
        pending: 12,
        defeated: 5
      }
    };
    
    res.json(analytics);
  } catch (error) {
    console.error('Failed to get analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

app.get('/api/analytics/treasury', async (req, res) => {
  try {
    // Mock treasury analytics data
    const treasuryAnalytics = {
      totalBalance: 125000,
      monthlyGrowth: 12.5,
      transactions: [
        {
          id: 1,
          type: 'inflow',
          amount: 25000,
          description: 'Community contribution',
          timestamp: new Date().toISOString()
        },
        {
          id: 2,
          type: 'outflow',
          amount: 8000,
          description: 'Development grant',
          timestamp: new Date(Date.now() - 86400000).toISOString()
        }
      ],
      monthlyFlow: [
        { month: 'Oct', inflow: 75000, outflow: 45000 },
        { month: 'Sep', inflow: 65000, outflow: 38000 },
        { month: 'Aug', inflow: 58000, outflow: 42000 }
      ]
    };
    
    res.json(treasuryAnalytics);
  } catch (error) {
    console.error('Failed to get treasury analytics:', error);
    res.status(500).json({ error: 'Failed to fetch treasury analytics' });
  }
});

app.get('/api/analytics/dashboard', async (req, res) => {
  // Temporarily return mock data while analytics service is disabled
  res.json({
    message: 'Analytics service temporarily disabled',
    proposals: { total: 0, active: 0, executed: 0 },
    votes: { total: 0, participation: 0 },
    treasury: { balance: '0', transactions: 0 },
    users: { total: 0, active: 0 }
  });
});

// WebSocket connection handling (will be initialized after server starts)
const activeConnections = new Map();

// Broadcast message to all connections in a room
const broadcastToRoom = (room, message) => {
  activeConnections.forEach((conn) => {
    if (conn.rooms.has(room) && conn.ws.readyState === 1) {
      conn.ws.send(JSON.stringify(message));
    }
  });
};

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// Catch-all handler: serve React app for all non-API routes (only in development)
app.get('*', (req, res) => {
  // Only serve React app for non-API routes in development
  if (process.env.NODE_ENV !== 'production' && !req.originalUrl.startsWith('/api/') && !req.originalUrl.startsWith('/health')) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  } else {
    // In production or for API routes, return 404
    res.status(404).json({
      error: 'Not found',
      message: `Route ${req.originalUrl} not found`
    });
  }
});

// Create HTTP server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 DVote Backend Server running on port ${PORT}`);
  console.log(`📡 WebSocket server ready`);
  console.log(`🌐 CORS enabled for frontend origins`);
  console.log(`📊 Health check: http://0.0.0.0:${PORT}/health`);
});

// Add error handlers for the server
server.on('error', (error) => {
  console.error('❌ Server error:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use`);
  }
});

server.on('listening', () => {
  console.log(`✅ Server is successfully listening on 0.0.0.0:${PORT}`);
});

// WebSocket Server
const wss = new WebSocket.Server({ server });

// Setup webhook broadcast function
setBroadcastFunction(broadcastToRoom);

// WebSocket connection handling
wss.on('connection', (ws, req) => {
  console.log('New WebSocket connection established');
  
  const connectionId = Date.now() + Math.random();
  activeConnections.set(connectionId, {
    ws,
    rooms: new Set(),
    connectedAt: Date.now()
  });
  
  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      console.log('WebSocket message received:', data);
      
      switch (data.type) {
        case 'join-room':
          activeConnections.get(connectionId)?.rooms.add(data.room);
          console.log(`Client joined room: ${data.room}`);
          break;
          
        case 'leave-room':
          activeConnections.get(connectionId)?.rooms.delete(data.room);
          console.log(`Client left room: ${data.room}`);
          break;
          
        case 'authenticate':
          if (activeConnections.has(connectionId)) {
            activeConnections.get(connectionId).address = data.address;
          }
          console.log(`Client authenticated: ${data.address}`);
          break;
          
        default:
          console.log('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format'
      }));
    }
  });
  
  ws.on('close', () => {
    console.log('WebSocket connection closed');
    activeConnections.delete(connectionId);
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    activeConnections.delete(connectionId);
  });
});

// Health check endpoint for Render
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = { app, server, wss };
