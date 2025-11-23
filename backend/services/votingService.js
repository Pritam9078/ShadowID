const { ethers } = require('ethers');

/**
 * Voting Service - Vote casting, validation, and eligibility checks
 * Handles all voting-related operations with security and integrity measures
 */
class VotingService {
  constructor(proposalService) {
    this.proposalService = proposalService;
    this.voteCache = new Map(); // Cache for performance
    this.eventListeners = new Set();
  }

  /**
   * Validate user's eligibility to vote
   */
  async validateVotingEligibility(proposalId, voterAddress) {
    try {
      const proposal = this.proposalService.getProposal(proposalId);
      
      // Time-based validation
      const now = Math.floor(Date.now() / 1000);
      if (now < proposal.startTime) {
        return {
          eligible: false,
          reason: 'Voting has not started yet',
          startTime: proposal.startTime
        };
      }
      
      if (now >= proposal.endTime) {
        return {
          eligible: false,
          reason: 'Voting period has ended',
          endTime: proposal.endTime
        };
      }

      // Double-vote prevention
      if (proposal.voters.has(voterAddress.toLowerCase())) {
        return {
          eligible: false,
          reason: 'You have already voted on this proposal'
        };
      }

      // Voting power verification
      const votingPower = await this.getVotingPowerAtSnapshot(voterAddress, proposal.startTime);
      if (BigInt(votingPower) === 0n) {
        return {
          eligible: false,
          reason: 'No voting power at proposal creation time'
        };
      }

      return {
        eligible: true,
        votingPower,
        timeRemaining: proposal.endTime - now
      };

    } catch (error) {
      console.error('Error validating voting eligibility:', error);
      return {
        eligible: false,
        reason: 'Error validating eligibility: ' + error.message
      };
    }
  }

  /**
   * Get voting power at specific snapshot time
   * totalVotingPower = ownedTokens + receivedDelegations - givenDelegations
   */
  async getVotingPowerAtSnapshot(voterAddress, snapshotTime) {
    try {
      // In production, this would query the governance token contract
      // for historical voting power at the snapshot block
      
      // Mock implementation with realistic calculation
      const ownedTokens = await this.getOwnedTokens(voterAddress, snapshotTime);
      const receivedDelegations = await this.getReceivedDelegations(voterAddress, snapshotTime);
      const givenDelegations = await this.getGivenDelegations(voterAddress, snapshotTime);
      
      const totalPower = BigInt(ownedTokens) + BigInt(receivedDelegations) - BigInt(givenDelegations);
      
      return totalPower.toString();
    } catch (error) {
      console.error('Error calculating voting power:', error);
      return '0';
    }
  }

  /**
   * Get owned tokens at snapshot time
   */
  async getOwnedTokens(address, snapshotTime) {
    // Mock implementation - in production, query governance token contract
    const mockBalances = {
      '0xa62463A56EE9D742F810920F56cEbc4B696eBd0a': '5000000000000000000000', // 5000 tokens
      // Add more mock addresses as needed
    };
    
    return mockBalances[address.toLowerCase()] || '1000000000000000000000'; // Default 1000 tokens
  }

  /**
   * Get received delegations at snapshot time
   */
  async getReceivedDelegations(address, snapshotTime) {
    // Mock implementation
    return '0'; // No delegations for simplicity
  }

  /**
   * Get given delegations at snapshot time
   */
  async getGivenDelegations(address, snapshotTime) {
    // Mock implementation
    return '0'; // No delegations for simplicity
  }

  /**
   * Process vote with complete validation and security checks
   */
  async processVote(proposalId, voterAddress, support, reason = '', signature = null) {
    try {
      // Validate eligibility
      const eligibility = await this.validateVotingEligibility(proposalId, voterAddress);
      if (!eligibility.eligible) {
        throw new Error(eligibility.reason);
      }

      // Validate support value
      if (![0, 1, 2].includes(support)) {
        throw new Error('Invalid vote type. Must be 0 (Against), 1 (For), or 2 (Abstain)');
      }

      // Validate reason length
      if (reason && reason.length > 1000) {
        throw new Error('Vote reason must be less than 1000 characters');
      }

      // Record vote intention (before blockchain submission)
      const voteData = {
        proposalId,
        voter: voterAddress.toLowerCase(),
        support,
        votingPower: eligibility.votingPower,
        reason: reason.trim(),
        timestamp: Date.now(),
        status: 'pending',
        signature
      };

      // Cache the vote
      const voteKey = `${proposalId}-${voterAddress.toLowerCase()}`;
      this.voteCache.set(voteKey, voteData);

      // Prepare blockchain transaction data
      const transactionData = {
        to: process.env.DAO_CONTRACT_ADDRESS,
        data: this.encodeVoteCall(proposalId, support, reason),
        gasLimit: '200000'
      };

      return {
        success: true,
        voteData,
        transactionData,
        votingPower: eligibility.votingPower,
        message: 'Vote processed and ready for blockchain submission'
      };

    } catch (error) {
      console.error('Error processing vote:', error);
      throw error;
    }
  }

  /**
   * Encode vote function call for blockchain transaction
   */
  encodeVoteCall(proposalId, support, reason) {
    const iface = new ethers.Interface([
      'function castVote(uint256 proposalId, uint8 support) external',
      'function castVoteWithReason(uint256 proposalId, uint8 support, string calldata reason) external'
    ]);

    if (reason && reason.trim() !== '') {
      return iface.encodeFunctionData('castVoteWithReason', [proposalId, support, reason]);
    } else {
      return iface.encodeFunctionData('castVote', [proposalId, support]);
    }
  }

  /**
   * Confirm vote after successful blockchain transaction
   */
  async confirmVote(proposalId, voterAddress, transactionHash) {
    try {
      const voteKey = `${proposalId}-${voterAddress.toLowerCase()}`;
      const voteData = this.voteCache.get(voteKey);
      
      if (!voteData) {
        throw new Error('Vote data not found in cache');
      }

      // Update vote status
      voteData.status = 'confirmed';
      voteData.transactionHash = transactionHash;
      voteData.confirmedAt = Date.now();

      // Broadcast update
      this.broadcastVoteUpdate('voteConfirmed', voteData);

      return {
        success: true,
        voteData,
        message: 'Vote confirmed on blockchain'
      };

    } catch (error) {
      console.error('Error confirming vote:', error);
      throw error;
    }
  }

  /**
   * Get voting history for a user
   */
  async getUserVotingHistory(userAddress, options = {}) {
    const { page = 1, limit = 10, status = null } = options;
    
    // Filter votes for this user
    let userVotes = Array.from(this.voteCache.values())
      .filter(vote => vote.voter === userAddress.toLowerCase());

    // Apply status filter
    if (status) {
      userVotes = userVotes.filter(vote => vote.status === status);
    }

    // Sort by timestamp (newest first)
    userVotes.sort((a, b) => b.timestamp - a.timestamp);

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedVotes = userVotes.slice(startIndex, endIndex);

    // Enrich with proposal data
    const enrichedVotes = paginatedVotes.map(vote => {
      try {
        const proposal = this.proposalService.getProposal(vote.proposalId);
        return {
          ...vote,
          proposalTitle: proposal.title,
          proposalStatus: proposal.status
        };
      } catch (error) {
        return vote;
      }
    });

    return {
      votes: enrichedVotes,
      totalCount: userVotes.length,
      page,
      limit,
      totalPages: Math.ceil(userVotes.length / limit)
    };
  }

  /**
   * Get live vote tallies for a proposal
   */
  async getProposalVoteTally(proposalId) {
    try {
      const proposal = this.proposalService.getProposal(proposalId);
      
      const tally = {
        proposalId,
        forVotes: proposal.forVotes,
        againstVotes: proposal.againstVotes,
        abstainVotes: proposal.abstainVotes,
        totalVotes: (BigInt(proposal.forVotes) + BigInt(proposal.againstVotes) + BigInt(proposal.abstainVotes)).toString(),
        voterCount: proposal.voters.size,
        status: proposal.status,
        quorumReached: this.checkQuorum(proposal),
        percentages: this.calculatePercentages(proposal)
      };

      return tally;
    } catch (error) {
      console.error('Error getting vote tally:', error);
      throw error;
    }
  }

  /**
   * Check if quorum is reached
   */
  checkQuorum(proposal) {
    const totalVotes = BigInt(proposal.forVotes) + BigInt(proposal.againstVotes) + BigInt(proposal.abstainVotes);
    const quorumThreshold = BigInt('1000000000000000000000'); // 1000 tokens minimum
    
    return totalVotes >= quorumThreshold;
  }

  /**
   * Calculate vote percentages
   */
  calculatePercentages(proposal) {
    const forVotes = BigInt(proposal.forVotes);
    const againstVotes = BigInt(proposal.againstVotes);
    const abstainVotes = BigInt(proposal.abstainVotes);
    const totalVotes = forVotes + againstVotes + abstainVotes;

    if (totalVotes === 0n) {
      return { for: 0, against: 0, abstain: 0 };
    }

    return {
      for: Number((forVotes * 10000n) / totalVotes) / 100, // 2 decimal precision
      against: Number((againstVotes * 10000n) / totalVotes) / 100,
      abstain: Number((abstainVotes * 10000n) / totalVotes) / 100
    };
  }

  /**
   * Get voting statistics
   */
  async getVotingStatistics() {
    const votes = Array.from(this.voteCache.values());
    
    return {
      totalVotes: votes.length,
      confirmedVotes: votes.filter(v => v.status === 'confirmed').length,
      pendingVotes: votes.filter(v => v.status === 'pending').length,
      uniqueVoters: new Set(votes.map(v => v.voter)).size,
      averageVotingPower: this.calculateAverageVotingPower(votes)
    };
  }

  /**
   * Calculate average voting power
   */
  calculateAverageVotingPower(votes) {
    if (votes.length === 0) return '0';
    
    const totalPower = votes.reduce((sum, vote) => {
      return sum + BigInt(vote.votingPower);
    }, 0n);
    
    return (totalPower / BigInt(votes.length)).toString();
  }

  /**
   * Subscribe to voting events
   */
  subscribe(callback) {
    this.eventListeners.add(callback);
    return () => this.eventListeners.delete(callback);
  }

  /**
   * Broadcast vote updates
   */
  broadcastVoteUpdate(event, data) {
    this.eventListeners.forEach(callback => {
      try {
        callback({ event, data, timestamp: Date.now() });
      } catch (error) {
        console.error('Error in vote event listener:', error);
      }
    });
  }

  /**
   * Clean up expired cached votes
   */
  cleanupExpiredVotes() {
    const now = Date.now();
    const expiryTime = 24 * 60 * 60 * 1000; // 24 hours
    
    for (const [key, vote] of this.voteCache.entries()) {
      if (now - vote.timestamp > expiryTime && vote.status === 'pending') {
        this.voteCache.delete(key);
      }
    }
  }
}

// Express router for API endpoints
const express = require('express');
const router = express.Router();

// Create service instance
const votingService = new VotingService();

// API Routes
router.post('/cast', async (req, res) => {
  try {
    const result = await votingService.castVote(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/power/:address', async (req, res) => {
  try {
    const result = await votingService.getVotingPower(req.params.address);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/eligibility/:proposalId/:address', async (req, res) => {
  try {
    const result = await votingService.checkVotingEligibility(req.params.proposalId, req.params.address);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/history/:address', async (req, res) => {
  try {
    const result = await votingService.getUserVotingHistory(req.params.address);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = { VotingService, router };
