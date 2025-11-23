const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const router = express.Router();
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware for validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token is not valid' });
  }
};

// POST /api/users/register - Register a new user
router.post('/register', [
  body('address').isEthereumAddress(),
  body('username').optional().isLength({ min: 3, max: 30 }).matches(/^[a-zA-Z0-9_]+$/),
  body('email').optional().isEmail(),
  body('bio').optional().isLength({ max: 500 }),
], handleValidationErrors, async (req, res) => {
  try {
    const { address, username, email, bio } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { address: address.toLowerCase() }
    });

    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Check if username is taken
    if (username) {
      const existingUsername = await prisma.user.findUnique({
        where: { username }
      });
      if (existingUsername) {
        return res.status(409).json({ error: 'Username already taken' });
      }
    }

    const user = await prisma.user.create({
      data: {
        address: address.toLowerCase(),
        username,
        email,
        bio,
        role: 'MEMBER'
      }
    });

    // Generate JWT token
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      user: {
        id: user.id,
        address: user.address,
        username: user.username,
        email: user.email,
        bio: user.bio,
        role: user.role,
        createdAt: user.createdAt
      },
      token
    });
  } catch (error) {
    console.error('Failed to register user:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// POST /api/users/login - Login user
router.post('/login', [
  body('address').isEthereumAddress(),
], handleValidationErrors, async (req, res) => {
  try {
    const { address } = req.body;

    const user = await prisma.user.findUnique({
      where: { address: address.toLowerCase() }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.status === 'BANNED') {
      return res.status(403).json({ error: 'User account is banned' });
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    // Generate JWT token
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      user: {
        id: user.id,
        address: user.address,
        username: user.username,
        email: user.email,
        bio: user.bio,
        role: user.role,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      },
      token
    });
  } catch (error) {
    console.error('Failed to login user:', error);
    res.status(500).json({ error: 'Failed to login user' });
  }
});

// GET /api/users/profile - Get current user profile
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: {
        _count: {
          select: {
            proposals: true,
            votes: true,
            comments: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      address: user.address,
      username: user.username,
      email: user.email,
      bio: user.bio,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      stats: {
        proposalsCreated: user._count.proposals,
        votesCast: user._count.votes,
        commentsPosted: user._count.comments
      }
    });
  } catch (error) {
    console.error('Failed to get user profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// PUT /api/users/profile - Update user profile
router.put('/profile', verifyToken, [
  body('username').optional().isLength({ min: 3, max: 30 }).matches(/^[a-zA-Z0-9_]+$/),
  body('email').optional().isEmail(),
  body('bio').optional().isLength({ max: 500 }),
], handleValidationErrors, async (req, res) => {
  try {
    const { username, email, bio } = req.body;
    const updates = {};

    if (username !== undefined) {
      // Check if username is taken by another user
      const existingUsername = await prisma.user.findFirst({
        where: { 
          username,
          id: { not: req.user.userId }
        }
      });
      if (existingUsername) {
        return res.status(409).json({ error: 'Username already taken' });
      }
      updates.username = username;
    }

    if (email !== undefined) updates.email = email;
    if (bio !== undefined) updates.bio = bio;

    const user = await prisma.user.update({
      where: { id: req.user.userId },
      data: updates
    });

    res.json({
      id: user.id,
      address: user.address,
      username: user.username,
      email: user.email,
      bio: user.bio,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin
    });
  } catch (error) {
    console.error('Failed to update user profile:', error);
    res.status(500).json({ error: 'Failed to update user profile' });
  }
});

// GET /api/users/profile/:address - Get user profile by address (for frontend compatibility)
router.get('/profile/:address', [
  param('address').isEthereumAddress(),
], handleValidationErrors, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { address: req.params.address.toLowerCase() },
      include: {
        _count: {
          select: {
            proposals: true,
            votes: true,
            comments: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Public profile - don't return sensitive info
    res.json({
      id: user.id,
      address: user.address,
      username: user.username,
      bio: user.bio,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      stats: {
        proposalsCreated: user._count.proposals,
        votesCast: user._count.votes,
        commentsPosted: user._count.comments
      }
    });
  } catch (error) {
    console.error('Failed to get user profile by address:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// GET /api/users/:id - Get user by ID
router.get('/:id', [
  param('id').isString(),
], handleValidationErrors, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        _count: {
          select: {
            proposals: true,
            votes: true,
            comments: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Public profile - don't return sensitive info
    res.json({
      id: user.id,
      address: user.address,
      username: user.username,
      bio: user.bio,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      stats: {
        proposalsCreated: user._count.proposals,
        votesCast: user._count.votes,
        commentsPosted: user._count.comments
      }
    });
  } catch (error) {
    console.error('Failed to get user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// GET /api/users - Get all users (paginated)
router.get('/', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('role').optional().isIn(['ADMIN', 'MODERATOR', 'MEMBER']),
  query('status').optional().isIn(['ACTIVE', 'BANNED']),
  query('search').optional().isLength({ min: 1, max: 100 }),
], handleValidationErrors, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const where = {};
    if (req.query.role) where.role = req.query.role;
    if (req.query.status) where.status = req.query.status;
    if (req.query.search) {
      where.OR = [
        { username: { contains: req.query.search, mode: 'insensitive' } },
        { address: { contains: req.query.search, mode: 'insensitive' } }
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          address: true,
          username: true,
          bio: true,
          role: true,
          status: true,
          createdAt: true,
          lastLogin: true,
          _count: {
            select: {
              proposals: true,
              votes: true,
              comments: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit
      }),
      prisma.user.count({ where })
    ]);

    res.json({
      users: users.map(user => ({
        ...user,
        stats: {
          proposalsCreated: user._count.proposals,
          votesCast: user._count.votes,
          commentsPosted: user._count.comments
        },
        _count: undefined
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Failed to get users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /api/users/:id/voting-history - Get user's voting history
router.get('/:id/voting-history', [
  param('id').isString(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
], handleValidationErrors, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const [votes, total] = await Promise.all([
      prisma.vote.findMany({
        where: { userId: req.params.id },
        include: {
          proposal: {
            select: {
              id: true,
              title: true,
              status: true,
              createdAt: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit
      }),
      prisma.vote.count({ where: { userId: req.params.id } })
    ]);

    res.json({
      votes,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Failed to get voting history:', error);
    res.status(500).json({ error: 'Failed to fetch voting history' });
  }
});

module.exports = router;
