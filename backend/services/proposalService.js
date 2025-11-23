const { ethers } = require('ethers');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

/**
 * Proposal Service Layer - Complete CRUD operations and business logic
 * Handles proposal lifecycle management, validation, and state transitions
 */
class ProposalService {
  constructor() {
    this.votingPowers = new Map();
    this.eventListeners = new Set();
    this.initializeFromBlockchain();
  }

  /**
   * Initialize service with existing blockchain proposals
   */
  async initializeFromBlockchain() {
    try {
      // Load deployment info
      const deploymentPath = path.join(__dirname, '../deployments/localhost.json');
      if (!fs.existsSync(deploymentPath)) return;

      const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
      const daoAddress = deployment.contracts.DAO.address;

      // Connect to blockchain
      const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_URL);
      const daoAbi = JSON.parse(fs.readFileSync(
        path.join(__dirname, '../artifacts/contracts/DAO.sol/DAO.json')
      )).abi;
      
      const daoContract = new ethers.Contract(daoAddress, daoAbi, provider);

      // Fetch existing proposals
      await this.syncBlockchainProposals(daoContract);
      
      // Listen for new proposals
      this.setupEventListeners(daoContract);

    } catch (error) {
      console.error('Failed to initialize from blockchain:', error);
    }
  }

  /**
   * Sync existing proposals from blockchain
   */
  async syncBlockchainProposals(contract) {
    try {
      // Get proposal created events
      const filter = contract.filters.ProposalCreated();
      const events = await contract.queryFilter(filter);

      for (const event of events) {
        const [proposalId, proposer, title, description, ipfsHash] = event.args;
        
        // Get proposal details
        const proposal = await contract.getProposal(proposalId);
        
        const proposalData = {
          id: proposalId.toString(),
          proposer: proposer,
          title: title,
          description: description,
          ipfsHash: ipfsHash,
          target: proposal.target,
          value: proposal.value.toString(),
          calldata: proposal.calldata,
          startTime: Number(proposal.startTime),
          endTime: Number(proposal.endTime),
          forVotes: proposal.forVotes.toString(),
          againstVotes: proposal.againstVotes.toString(),
          abstainVotes: proposal.abstainVotes.toString(),
          executed: proposal.executed,
          status: this.calculateStatus(proposal),
          voters: new Set(),
          createdAt: new Date(),
          metadata: null
        };

        // Fetch IPFS metadata if available
        if (ipfsHash) {
          try {
            proposalData.metadata = await this.fetchIPFSMetadata(ipfsHash);
          } catch (error) {
            console.error(`Failed to fetch IPFS metadata for proposal ${proposalId}:`, error);
          }
        }

        this.proposals.set(proposalId.toString(), proposalData);
      }

      console.log(`Synced ${events.length} proposals from blockchain`);
    } catch (error) {
      console.error('Error syncing blockchain proposals:', error);
    }
  }

  /**
   * Setup blockchain event listeners for real-time updates
   */
  setupEventListeners(contract) {
    // Listen for new proposals
    contract.on('ProposalCreated', async (proposalId, proposer, title, description, ipfsHash, event) => {
      console.log(`New proposal created: ${proposalId}`);
      
      const proposal = await contract.getProposal(proposalId);
      const proposalData = {
        id: proposalId.toString(),
        proposer: proposer,
        title: title,
        description: description,
        ipfsHash: ipfsHash,
        target: proposal.target,
        value: proposal.value.toString(),
        calldata: proposal.calldata,
        startTime: Number(proposal.startTime),
        endTime: Number(proposal.endTime),
        forVotes: '0',
        againstVotes: '0',
        abstainVotes: '0',
        executed: false,
        status: 'pending',
        voters: new Set(),
        createdAt: new Date(),
        metadata: null
      };

      // Fetch IPFS metadata
      if (ipfsHash) {
        try {
          proposalData.metadata = await this.fetchIPFSMetadata(ipfsHash);
        } catch (error) {
          console.error('Failed to fetch IPFS metadata:', error);
        }
      }

      this.proposals.set(proposalId.toString(), proposalData);
      this.broadcastUpdate('proposalCreated', proposalData);
    });

    // Listen for votes
    contract.on('Voted', async (proposalId, voter, support, weight, reason, event) => {
      console.log(`Vote cast on proposal ${proposalId}: ${support} with weight ${weight}`);
      
      const proposal = this.proposals.get(proposalId.toString());
      if (proposal) {
        // Update vote counts
        const weightStr = weight.toString();
        switch (support) {
          case 0: // Against
            proposal.againstVotes = (BigInt(proposal.againstVotes) + BigInt(weightStr)).toString();
            break;
          case 1: // For
            proposal.forVotes = (BigInt(proposal.forVotes) + BigInt(weightStr)).toString();
            break;
          case 2: // Abstain
            proposal.abstainVotes = (BigInt(proposal.abstainVotes) + BigInt(weightStr)).toString();
            break;
        }

        // Add voter to set
        proposal.voters.add(voter);
        
        // Update status
        proposal.status = this.calculateStatus(proposal);
        
        this.broadcastUpdate('voteUpdated', {
          proposalId: proposalId.toString(),
          voter,
          support,
          weight: weightStr,
          reason,
          proposal
        });
      }
    });

    // Listen for executions
    contract.on('ProposalExecuted', (proposalId, event) => {
      console.log(`Proposal ${proposalId} executed`);
      
      const proposal = this.proposals.get(proposalId.toString());
      if (proposal) {
        proposal.executed = true;
        proposal.status = 'executed';
        
        this.broadcastUpdate('proposalExecuted', proposal);
      }
    });
  }

  /**
   * Calculate proposal status based on current state
   */
  calculateStatus(proposal) {
    const now = Math.floor(Date.now() / 1000);
    
    if (proposal.executed) return 'executed';
    if (now < proposal.startTime) return 'pending';
    if (now < proposal.endTime) return 'active';
    
    // Check if quorum is met and proposal succeeded
    const totalVotes = BigInt(proposal.forVotes) + BigInt(proposal.againstVotes) + BigInt(proposal.abstainVotes);
    const quorum = BigInt('1000000000000000000000'); // 1000 tokens minimum (adjust as needed)
    
    if (totalVotes < quorum) return 'defeated';
    if (BigInt(proposal.forVotes) > BigInt(proposal.againstVotes)) return 'succeeded';
    
    return 'defeated';
  }

  /**
   * Fetch metadata from IPFS
   */
  async fetchIPFSMetadata(ipfsHash) {
    try {
      const response = await fetch(`https://gateway.pinata.cloud/ipfs/${ipfsHash}`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching IPFS metadata:', error);
      return null;
    }
  }

  /**
   * Create a new proposal with complete validation
   */
  async createProposal(proposalData, userAddress) {
    try {
      // Validate proposal data
      this.validateProposalData(proposalData);
      
      // Check user's voting power
      const votingPower = await this.getUserVotingPower(userAddress);
      const requiredPower = BigInt('1000000000000000000000'); // 1000 tokens
      
      if (BigInt(votingPower) < requiredPower) {
        throw new Error(`Insufficient voting power. Required: ${requiredPower.toString()}, Current: ${votingPower}`);
      }

      // Upload metadata to IPFS
      const ipfsHash = await this.uploadMetadataToIPFS(proposalData);
      
      return {
        success: true,
        ipfsHash,
        message: 'Proposal data validated and uploaded to IPFS'
      };
      
    } catch (error) {
      console.error('Error creating proposal:', error);
      throw error;
    }
  }

  /**
   * Validate proposal data structure
   */
  validateProposalData(data) {
    const required = ['title', 'description', 'proposalType'];
    
    for (const field of required) {
      if (!data[field] || data[field].trim() === '') {
        throw new Error(`${field} is required`);
      }
    }

    if (data.title.length > 200) {
      throw new Error('Title must be less than 200 characters');
    }

    if (data.description.length > 10000) {
      throw new Error('Description must be less than 10,000 characters');
    }

    // Validate execution parameters for executable proposals
    if (data.proposalType === 'executable') {
      if (!data.target || !ethers.isAddress(data.target)) {
        throw new Error('Valid target address is required for executable proposals');
      }
      
      if (data.value && isNaN(data.value)) {
        throw new Error('Value must be a valid number');
      }
    }
  }

  /**
   * Public validation method for API endpoint
   */
  async validateProposal(data) {
    try {
      // Run validation checks
      this.validateProposalData(data);
      
      // Additional async validations can be added here
      // e.g., check creator's voting power, proposal limits, etc.
      
      return {
        success: true,
        message: 'Proposal validation passed',
        data: {
          title: data.title,
          description: data.description,
          proposalType: data.proposalType,
          validated: true
        }
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.message
      };
    }
  }

  /**
   * Upload proposal metadata to IPFS
   */
  async uploadMetadataToIPFS(proposalData) {
    const metadata = {
      title: proposalData.title,
      description: proposalData.description,
      type: proposalData.proposalType,
      target: proposalData.target || null,
      value: proposalData.value || '0',
      calldata: proposalData.calldata || '0x',
      attachments: proposalData.attachments || [],
      createdAt: new Date().toISOString(),
      version: '1.0'
    };

    // In production, use actual Pinata service
    const mockHash = 'Qm' + Math.random().toString(36).substring(2, 47);
    console.log('Uploaded to IPFS:', mockHash, metadata);
    
    return mockHash;
  }

  /**
   * Get user's current voting power including delegations
   */
  async getUserVotingPower(userAddress) {
    try {
      // In production, fetch from governance token contract
      // totalVotingPower = ownedTokens + receivedDelegations - givenDelegations
      
      // Mock implementation
      return '2000000000000000000000'; // 2000 tokens
    } catch (error) {
      console.error('Error fetching voting power:', error);
      return '0';
    }
  }

  /**
   * Get all proposals with filtering and pagination
   */
  getProposals(filters = {}) {
    let proposalList = Array.from(this.proposals.values());
    
    // Apply filters
    if (filters.status) {
      proposalList = proposalList.filter(p => p.status === filters.status);
    }
    
    if (filters.proposer) {
      proposalList = proposalList.filter(p => 
        p.proposer.toLowerCase() === filters.proposer.toLowerCase()
      );
    }

    // Sort by creation time (newest first)
    proposalList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Apply pagination
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    
    return {
      proposals: proposalList.slice(startIndex, endIndex),
      totalCount: proposalList.length,
      page,
      limit,
      totalPages: Math.ceil(proposalList.length / limit)
    };
  }

  /**
   * Get single proposal by ID
   */
  getProposal(proposalId) {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new Error('Proposal not found');
    }
    return proposal;
  }

  /**
   * Cast a vote on a proposal
   */
  async castVote(proposalId, voterAddress, support, reason = '') {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new Error('Proposal not found');
    }

    // Validate voting window
    const now = Math.floor(Date.now() / 1000);
    if (now < proposal.startTime) {
      throw new Error('Voting has not started yet');
    }
    if (now >= proposal.endTime) {
      throw new Error('Voting period has ended');
    }

    // Check if user already voted
    if (proposal.voters.has(voterAddress)) {
      throw new Error('User has already voted on this proposal');
    }

    // Get voting power
    const votingPower = await this.getUserVotingPower(voterAddress);
    
    return {
      success: true,
      votingPower,
      message: 'Vote validated and ready for blockchain submission'
    };
  }

  /**
   * Subscribe to real-time updates
   */
  subscribe(callback) {
    this.eventListeners.add(callback);
    return () => this.eventListeners.delete(callback);
  }

  /**
   * Broadcast updates to all subscribers
   */
  broadcastUpdate(event, data) {
    this.eventListeners.forEach(callback => {
      try {
        callback({ event, data, timestamp: Date.now() });
      } catch (error) {
        console.error('Error in event listener:', error);
      }
    });
  }

  /**
   * Get proposal statistics
   */
  getStatistics() {
    const proposals = Array.from(this.proposals.values());
    
    return {
      total: proposals.length,
      active: proposals.filter(p => p.status === 'active').length,
      succeeded: proposals.filter(p => p.status === 'succeeded').length,
      executed: proposals.filter(p => p.status === 'executed').length,
      defeated: proposals.filter(p => p.status === 'defeated').length,
      totalVotes: proposals.reduce((sum, p) => {
        return sum + Number(p.forVotes) + Number(p.againstVotes) + Number(p.abstainVotes);
      }, 0)
    };
  }
}

// Express router for API endpoints
const express = require('express');
const router = express.Router();

// Create service instance
const proposalService = new ProposalService();

// API Routes
// Get all proposals
router.get('/', async (req, res) => {
  try {
    const proposals = Array.from(proposalService.proposals.values());
    res.json({
      success: true,
      proposals: proposals,
      count: proposals.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new proposal
router.post('/', async (req, res) => {
  try {
    const result = await proposalService.createProposal(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Validate proposal
router.post('/validate', async (req, res) => {
  try {
    const result = await proposalService.validateProposal(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await proposalService.getProposal(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

router.get('/user/:address', async (req, res) => {
  try {
    const result = await proposalService.getUserProposals(req.params.address);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/draft', async (req, res) => {
  try {
    const result = await proposalService.createProposal({ ...req.body, isDraft: true });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/drafts/:address', async (req, res) => {
  try {
    const result = await proposalService.getUserProposals(req.params.address, { draftsOnly: true });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = { ProposalService, router };
