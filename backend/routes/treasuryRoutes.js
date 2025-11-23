const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const blockchainService = require('../services/blockchainService');
// Temporarily disabled
// const analyticsService = require('../services/analyticsService');

const router = express.Router();
const prisma = new PrismaClient();

// Middleware for validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// GET /api/treasury/balance - Get current treasury balance
router.get('/balance', async (req, res) => {
  try {
    // Use mock data for now since blockchain service doesn't have getTreasuryBalance method
    const balance = '125.5'; // Mock balance in ETH
    
    res.json({ 
      balance,
      currency: 'ETH',
      formatted: `${balance} ETH`
    });
  } catch (error) {
    console.error('Treasury balance error:', error);
    res.status(500).json({ 
      error: 'Failed to get treasury balance',
      balance: '0',
      currency: 'ETH'
    });
  }
});

// GET /api/treasury/transactions - Get treasury transactions with pagination
router.get('/transactions', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('type').optional().isIn(['DEPOSIT', 'WITHDRAWAL']).withMessage('Type must be DEPOSIT or WITHDRAWAL'),
  handleValidationErrors
], async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const type = req.query.type;
    const offset = (page - 1) * limit;

    const where = {};
    if (type) {
      where.type = type;
    }

    const [transactions, total] = await Promise.all([
      prisma.treasuryTransaction.findMany({
        where,
        orderBy: { blockTimestamp: 'desc' },
        skip: offset,
        take: limit,
        select: {
          id: true,
          transactionHash: true,
          type: true,
          amount: true,
          token: true,
          from: true,
          to: true,
          description: true,
          blockNumber: true,
          blockTimestamp: true,
          status: true
        }
      }),
      prisma.treasuryTransaction.count({ where })
    ]);

    res.json({
      transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Treasury transactions error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch treasury transactions',
      transactions: [],
      pagination: { page: 1, limit: 20, total: 0, pages: 0 }
    });
  }
});

// GET /api/treasury/analytics - Get treasury analytics
router.get('/analytics', [
  query('period').optional().isIn(['24h', '7d', '30d', '90d']).withMessage('Period must be one of: 24h, 7d, 30d, 90d'),
  handleValidationErrors
], async (req, res) => {
  try {
    const period = req.query.period || '30d';
    
    // Mock analytics data for now
    res.json({
      period,
      totalBalance: '125.5',
      totalDeposits: '200.0',
      totalWithdrawals: '74.5',
      transactionCount: 45,
      averageTransactionSize: '6.1',
      dailyVolume: [
        { date: '2024-01-15', deposits: '15.2', withdrawals: '8.1' },
        { date: '2024-01-16', deposits: '22.8', withdrawals: '12.4' },
        { date: '2024-01-17', deposits: '18.5', withdrawals: '9.8' }
      ],
      topTransactions: [
        {
          id: 'tx-1',
          type: 'DEPOSIT',
          amount: '50.0',
          from: '0x1234...5678',
          timestamp: '2024-01-17T10:30:00Z'
        },
        {
          id: 'tx-2',
          type: 'WITHDRAWAL',
          amount: '25.0',
          to: '0x8765...4321',
          timestamp: '2024-01-17T09:15:00Z'
        }
      ]
    });
  } catch (error) {
    console.error('Treasury analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch treasury analytics' });
  }
});

// GET /api/treasury/summary - Get treasury summary
router.get('/summary', async (req, res) => {
  try {
    // Mock summary data with correct field names
    res.json({
      currentBalance: '125.5',
      currency: 'ETH',
      totalDeposits: {
        amount: '200.0',
        count: 28
      },
      totalWithdrawals: {
        amount: '74.5',
        count: 17
      },
      recentTransactions: [
        {
          id: 'tx-1',
          type: 'DEPOSIT',
          amount: '15.2',
          transactionHash: '0xabc123...',
          blockTimestamp: new Date().toISOString(),
          from: '0x1234...5678'
        },
        {
          id: 'tx-2',
          type: 'WITHDRAWAL',
          amount: '8.1',
          transactionHash: '0xdef456...',
          blockTimestamp: new Date(Date.now() - 3600000).toISOString(),
          to: '0x8765...4321'
        }
      ],
      monthlyStats: {
        currentMonth: {
          deposits: '45.8',
          withdrawals: '23.2',
          netFlow: '22.6'
        },
        previousMonth: {
          deposits: '52.1',
          withdrawals: '28.9',
          netFlow: '23.2'
        }
      }
    });
  } catch (error) {
    console.error('Treasury summary error:', error);
    res.status(500).json({ error: 'Failed to fetch treasury summary' });
  }
});

// POST /api/treasury/transactions - Create new treasury transaction (webhook endpoint)
router.post('/transactions', [
  body('transactionHash').isString().notEmpty().withMessage('Transaction hash is required'),
  body('type').isIn(['DEPOSIT', 'WITHDRAWAL']).withMessage('Type must be DEPOSIT or WITHDRAWAL'),
  body('amount').isString().notEmpty().withMessage('Amount is required'),
  body('blockNumber').isInt().withMessage('Block number must be an integer'),
  body('blockTimestamp').isISO8601().withMessage('Block timestamp must be a valid ISO date'),
  handleValidationErrors
], async (req, res) => {
  try {
    const {
      transactionHash,
      type,
      amount,
      token,
      from,
      to,
      description,
      proposalId,
      blockNumber,
      blockTimestamp,
      gasUsed,
      gasPrice
    } = req.body;

    const transaction = await prisma.treasuryTransaction.create({
      data: {
        transactionHash,
        type,
        amount,
        token,
        from,
        to,
        description,
        proposalId,
        blockNumber,
        blockTimestamp: new Date(blockTimestamp),
        gasUsed: gasUsed || '0',
        gasPrice: gasPrice || '0',
        status: 'CONFIRMED'
      }
    });

    res.status(201).json(transaction);
  } catch (error) {
    console.error('Create treasury transaction error:', error);
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Transaction already exists' });
    }
    res.status(500).json({ error: 'Failed to create treasury transaction' });
  }
});

// PUT /api/treasury/transactions/:id/status - Update transaction status
router.put('/transactions/:id/status', [
  param('id').isString().notEmpty().withMessage('Transaction ID is required'),
  body('status').isIn(['PENDING', 'CONFIRMED', 'FAILED']).withMessage('Status must be PENDING, CONFIRMED, or FAILED'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const transaction = await prisma.treasuryTransaction.update({
      where: { id },
      data: { status }
    });

    res.json(transaction);
  } catch (error) {
    console.error('Update transaction status error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    res.status(500).json({ error: 'Failed to update transaction status' });
  }
});

// GET /api/treasury/health - Health check endpoint
router.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    service: 'treasury',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
