const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const blockchainService = require('../services/blockchainService');
// Temporarily disabled
// const analyticsService = require('../services/analyticsService');
const { PrismaClient } = require('@prisma/client');

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

// GET /api/proposals/categories - Get all proposal categories (BEFORE /:id routes)
router.get('/categories', async (req, res) => {
  try {
    const categories = await prisma.proposal.groupBy({
      by: ['category'],
      _count: { category: true },
      orderBy: { _count: { category: 'desc' } }
    });

    res.json(categories.map(c => ({
      name: c.category,
      count: c._count.category
    })));
  } catch (error) {
    console.error('Failed to get categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// GET /api/proposals/filters - Get advanced filter options (for frontend compatibility)
router.get('/filters', async (req, res) => {
  try {
    const [categories, states, dateRanges] = await Promise.all([
      // Get all categories
      prisma.proposal.groupBy({
        by: ['category'],
        _count: { category: true },
        orderBy: { _count: { category: 'desc' } }
      }),
      // Get proposal states with counts
      prisma.proposal.groupBy({
        by: ['state'],
        _count: { state: true }
      }),
      // Get date range info
      prisma.proposal.aggregate({
        _min: { createdAt: true },
        _max: { createdAt: true }
      })
    ]);

    res.json({
      categories: categories.map(c => ({
        name: c.category,
        count: c._count.category
      })),
      states: states.map(s => ({
        name: s.state,
        count: s._count.state
      })),
      dateRange: {
        earliest: dateRanges._min.createdAt,
        latest: dateRanges._max.createdAt
      },
      sortOptions: [
        { value: 'createdAt', label: 'Created Date', order: ['asc', 'desc'] },
        { value: 'endTime', label: 'End Date', order: ['asc', 'desc'] },
        { value: 'title', label: 'Title', order: ['asc', 'desc'] }
      ]
    });
  } catch (error) {
    console.error('Failed to get advanced filters:', error);
    res.status(500).json({ error: 'Failed to fetch advanced filters' });
  }
});

// GET /api/proposals/search - Search proposals (BEFORE /:id routes)
router.get('/search', [
  query('q').optional().isString(),
  query('category').optional().isString(),
  query('state').optional().isIn(['PENDING', 'ACTIVE', 'CANCELLED', 'DEFEATED', 'SUCCEEDED', 'QUEUED', 'EXPIRED', 'EXECUTED']),
  query('sortBy').optional().isIn(['createdAt', 'endTime', 'title']),
  query('sortOrder').optional().isIn(['asc', 'desc']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
], handleValidationErrors, async (req, res) => {
  try {
    const {
      q,
      category,
      state,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      page = 1,
      limit = 20
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build where clause
    const where = {};
    
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } }
      ];
    }
    
    if (category) where.category = category;
    if (state) where.state = state;

    // Build order by
    const orderBy = {};
    orderBy[sortBy] = sortOrder;

    const [proposals, total] = await Promise.all([
      prisma.proposal.findMany({
        where,
        include: {
          creator: true,
          _count: {
            select: { votes: true, comments: true }
          }
        },
        orderBy,
        skip: offset,
        take: parseInt(limit)
      }),
      prisma.proposal.count({ where })
    ]);

    res.json({
      proposals,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Failed to search proposals:', error);
    res.status(500).json({ error: 'Failed to search proposals' });
  }
});

// GET /api/proposals - Get all proposals with filtering and pagination
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('state').optional().isIn(['PENDING', 'ACTIVE', 'CANCELLED', 'DEFEATED', 'SUCCEEDED', 'QUEUED', 'EXPIRED', 'EXECUTED']),
  query('category').optional().isString(),
  query('search').optional().isString(),
], handleValidationErrors, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    // Build filters
    const where = {};
    if (req.query.state) where.state = req.query.state;
    if (req.query.category) where.category = req.query.category;
    if (req.query.search) {
      where.OR = [
        { title: { contains: req.query.search, mode: 'insensitive' } },
        { description: { contains: req.query.search, mode: 'insensitive' } }
      ];
    }

    const [proposals, total] = await Promise.all([
      prisma.proposal.findMany({
        where,
        include: {
          creator: true,
          _count: {
            select: { votes: true, comments: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit
      }),
      prisma.proposal.count({ where })
    ]);

    res.json({
      proposals,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Failed to get proposals:', error);
    res.status(500).json({ error: 'Failed to fetch proposals' });
  }
});

// GET /api/proposals/:id - Get specific proposal with full details
router.get('/:id', [
  param('id').isString(),
], handleValidationErrors, async (req, res) => {
  try {
    const proposal = await blockchainService.getProposal(req.params.id);
    if (!proposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }
    res.json(proposal);
  } catch (error) {
    console.error('Failed to get proposal:', error);
    res.status(500).json({ error: 'Failed to fetch proposal' });
  }
});

// POST /api/proposals - Create new proposal (metadata only, blockchain tx separate)
router.post('/', [
  body('title').isString().isLength({ min: 1, max: 200 }),
  body('description').isString().isLength({ min: 1, max: 5000 }),
  body('category').optional().isString(),
  body('proposer').isEthereumAddress(),
  body('target').optional().isEthereumAddress(),
  body('value').optional().isString(),
  body('tags').optional().isArray(),
], handleValidationErrors, async (req, res) => {
  try {
    const { title, description, category, proposer, target, value, tags } = req.body;

    // Ensure user exists
    await prisma.user.upsert({
      where: { address: proposer },
      update: { lastActive: new Date() },
      create: { address: proposer }
    });

    // Create proposal in database
    const proposal = await prisma.proposal.create({
      data: {
        title,
        description,
        category: category || 'General',
        proposer,
        target: target || '0x0000000000000000000000000000000000000000',
        value: value || '0',
        tags: tags ? JSON.stringify(tags) : null,
        onChainId: 0, // Will be updated when blockchain transaction is confirmed
        snapshotBlock: 0,
        startTime: new Date(),
        endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        state: 'PENDING'
      },
      include: {
        creator: true
      }
    });

    res.status(201).json(proposal);
  } catch (error) {
    console.error('Failed to create proposal:', error);
    res.status(500).json({ error: 'Failed to create proposal' });
  }
});

// PUT /api/proposals/:id - Update proposal (for blockchain confirmation)
router.put('/:id', [
  param('id').isString(),
  body('onChainId').optional().isInt(),
  body('snapshotBlock').optional().isInt(),
  body('startTime').optional().isISO8601(),
  body('endTime').optional().isISO8601(),
  body('state').optional().isIn(['PENDING', 'ACTIVE', 'CANCELLED', 'DEFEATED', 'SUCCEEDED', 'QUEUED', 'EXPIRED', 'EXECUTED']),
], handleValidationErrors, async (req, res) => {
  try {
    const updates = {};
    const allowedUpdates = ['onChainId', 'snapshotBlock', 'startTime', 'endTime', 'state'];
    
    for (const field of allowedUpdates) {
      if (req.body[field] !== undefined) {
        if (field === 'startTime' || field === 'endTime') {
          updates[field] = new Date(req.body[field]);
        } else {
          updates[field] = req.body[field];
        }
      }
    }

    const proposal = await prisma.proposal.update({
      where: { id: req.params.id },
      data: updates,
      include: {
        creator: true,
        _count: {
          select: { votes: true, comments: true }
        }
      }
    });

    res.json(proposal);
  } catch (error) {
    console.error('Failed to update proposal:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Proposal not found' });
    }
    res.status(500).json({ error: 'Failed to update proposal' });
  }
});

// POST /api/proposals/:id/vote - Cast vote (metadata only)
router.post('/:id/vote', [
  param('id').isString(),
  body('voter').isEthereumAddress(),
  body('support').isIn(['FOR', 'AGAINST', 'ABSTAIN']),
  body('weight').isString(),
  body('reason').optional().isString(),
], handleValidationErrors, async (req, res) => {
  try {
    const { voter, support, weight, reason } = req.body;

    // Ensure user exists
    await prisma.user.upsert({
      where: { address: voter },
      update: { lastActive: new Date() },
      create: { address: voter }
    });

    // Create or update vote
    const vote = await prisma.vote.upsert({
      where: {
        proposalId_voter: {
          proposalId: req.params.id,
          voter
        }
      },
      update: {
        support,
        weight,
        reason
      },
      create: {
        proposalId: req.params.id,
        voter,
        support,
        weight,
        reason
      },
      include: {
        user: true,
        proposal: true
      }
    });

    res.json(vote);
  } catch (error) {
    console.error('Failed to cast vote:', error);
    res.status(500).json({ error: 'Failed to cast vote' });
  }
});

// GET /api/proposals/:id/votes - Get votes for a proposal
router.get('/:id/votes', [
  param('id').isString(),
], handleValidationErrors, async (req, res) => {
  try {
    const votes = await prisma.vote.findMany({
      where: { proposalId: req.params.id },
      include: {
        user: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // Calculate vote summary
    const summary = {
      total: votes.length,
      FOR: votes.filter(v => v.support === 'FOR').length,
      AGAINST: votes.filter(v => v.support === 'AGAINST').length,
      ABSTAIN: votes.filter(v => v.support === 'ABSTAIN').length,
      totalWeight: votes.reduce((sum, v) => sum + BigInt(v.weight), BigInt(0)).toString()
    };

    res.json({
      votes,
      summary
    });
  } catch (error) {
    console.error('Failed to get votes:', error);
    res.status(500).json({ error: 'Failed to fetch votes' });
  }
});

// POST /api/proposals/:id/comments - Add comment to proposal
router.post('/:id/comments', [
  param('id').isString(),
  body('author').isEthereumAddress(),
  body('content').isString().isLength({ min: 1, max: 2000 }),
  body('parentId').optional().isString(),
], handleValidationErrors, async (req, res) => {
  try {
    const { author, content, parentId } = req.body;

    // Ensure user exists
    await prisma.user.upsert({
      where: { address: author },
      update: { lastActive: new Date() },
      create: { address: author }
    });

    // Create comment
    const comment = await prisma.comment.create({
      data: {
        proposalId: req.params.id,
        author,
        content,
        parentId: parentId || null
      },
      include: {
        user: true,
        replies: {
          include: { user: true }
        }
      }
    });

    res.status(201).json(comment);
  } catch (error) {
    console.error('Failed to create comment:', error);
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

// GET /api/proposals/:id/comments - Get comments for a proposal
router.get('/:id/comments', [
  param('id').isString(),
], handleValidationErrors, async (req, res) => {
  try {
    const comments = await prisma.comment.findMany({
      where: {
        proposalId: req.params.id,
        parentId: null // Only top-level comments
      },
      include: {
        user: true,
        replies: {
          include: { user: true },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(comments);
  } catch (error) {
    console.error('Failed to get comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

module.exports = router;
