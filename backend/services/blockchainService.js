const { ethers } = require('ethers');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

/**
 * Blockchain Service - Handles all blockchain interactions and event indexing
 */
class BlockchainService {
  constructor() {
    this.provider = null;
    this.daoContract = null;
    this.treasuryContract = null;
    this.tokenContract = null;
    this.lastProcessedBlock = 0;
    this.isIndexing = false;
    
    this.initialize();
  }

  async initialize() {
    try {
      // Initialize provider
      this.provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'http://127.0.0.1:8545');
      
      // Load contract addresses and ABIs
      await this.loadContracts();
      
      // Start event indexing
      await this.startEventIndexing();
      
      console.log('✅ Blockchain service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize blockchain service:', error);
    }
  }

  async loadContracts() {
    try {
      // Try Arbitrum Sepolia first, then localhost as fallback
      let deploymentPath = path.join(__dirname, '../deployments/arbitrum-sepolia.json');
      if (!fs.existsSync(deploymentPath)) {
        deploymentPath = path.join(__dirname, '../deployments/localhost.json');
      }
      
      if (!fs.existsSync(deploymentPath)) {
        console.warn('⚠️ No deployment file found, running in development mode');
        return;
      }
      
      console.log(`📋 Loading contracts from: ${path.basename(deploymentPath)}`);

      // Read and validate JSON
      const fileContent = fs.readFileSync(deploymentPath, 'utf8').trim();
      if (!fileContent) {
        console.warn('⚠️ Deployment file is empty, running in development mode');
        return;
      }

      const deployment = JSON.parse(fileContent);
      
      // Try to load ABIs if they exist
      const artifactsPath = path.join(__dirname, '../artifacts/contracts');
      if (fs.existsSync(artifactsPath)) {
        try {
          const daoABI = JSON.parse(fs.readFileSync(path.join(artifactsPath, 'DAO.sol/DAO.json'), 'utf8')).abi;
          const treasuryABI = JSON.parse(fs.readFileSync(path.join(artifactsPath, 'Treasury.sol/Treasury.json'), 'utf8')).abi;
          const tokenABI = JSON.parse(fs.readFileSync(path.join(artifactsPath, 'GovernanceToken.sol/GovernanceToken.json'), 'utf8')).abi;

          // Initialize contracts if addresses exist
          if (deployment.contracts?.DAO?.address) {
            this.daoContract = new ethers.Contract(deployment.contracts.DAO.address, daoABI, this.provider);
          }
          if (deployment.contracts?.Treasury?.address) {
            this.treasuryContract = new ethers.Contract(deployment.contracts.Treasury.address, treasuryABI, this.provider);
          }
          if (deployment.contracts?.GovernanceToken?.address) {
            this.tokenContract = new ethers.Contract(deployment.contracts.GovernanceToken.address, tokenABI, this.provider);
          }

          console.log('📄 Contracts loaded successfully');
        } catch (abiError) {
          console.warn('⚠️ Contract ABIs not found, running in development mode');
        }
      } else {
        console.warn('⚠️ Contract artifacts not found, running in development mode');
      }
    } catch (error) {
      console.warn('⚠️ Contract loading failed, running in development mode:', error.message);
    }
  }

  async startEventIndexing() {
    if (!this.daoContract || this.isIndexing) return;

    this.isIndexing = true;
    console.log('🔍 Starting blockchain event indexing...');

    try {
      // Get last processed block from database or start from deployment block
      const lastMetric = await prisma.daoMetrics.findFirst({
        orderBy: { date: 'desc' }
      });
      
      this.lastProcessedBlock = lastMetric?.blockNumber || 0;
      
      // Index historical events
      await this.indexHistoricalEvents();
      
      // Set up real-time event listeners
      this.setupEventListeners();
      
    } catch (error) {
      console.error('❌ Failed to start event indexing:', error);
      this.isIndexing = false;
    }
  }

  async indexHistoricalEvents() {
    const currentBlock = await this.provider.getBlockNumber();
    const fromBlock = Math.max(0, this.lastProcessedBlock);
    
    console.log(`📊 Indexing events from block ${fromBlock} to ${currentBlock}`);
    
    // Index in chunks to avoid RPC limits
    const chunkSize = 1000;
    for (let start = fromBlock; start <= currentBlock; start += chunkSize) {
      const end = Math.min(start + chunkSize - 1, currentBlock);
      await this.indexBlockRange(start, end);
    }
    
    this.lastProcessedBlock = currentBlock;
  }

  async indexBlockRange(fromBlock, toBlock) {
    try {
      // Get all DAO events in this range
      const proposalCreatedEvents = await this.daoContract.queryFilter(
        this.daoContract.filters.ProposalCreated(),
        fromBlock,
        toBlock
      );
      
      const voteCastEvents = await this.daoContract.queryFilter(
        this.daoContract.filters.Voted(),
        fromBlock,
        toBlock
      );
      
      const proposalExecutedEvents = await this.daoContract.queryFilter(
        this.daoContract.filters.ProposalExecuted(),
        fromBlock,
        toBlock
      );

      // Process proposal created events
      for (const event of proposalCreatedEvents) {
        await this.processProposalCreatedEvent(event);
      }

      // Process vote cast events
      for (const event of voteCastEvents) {
        await this.processVoteCastEvent(event);
      }

      // Process proposal executed events
      for (const event of proposalExecutedEvents) {
        await this.processProposalExecutedEvent(event);
      }

      // Index treasury events
      await this.indexTreasuryEvents(fromBlock, toBlock);

    } catch (error) {
      console.error(`❌ Failed to index block range ${fromBlock}-${toBlock}:`, error);
    }
  }

  async processProposalCreatedEvent(event) {
    try {
      const { proposalId, proposer, targets, values, description } = event.args;
      const block = await event.getBlock();
      
      // Check if proposal already exists
      const existing = await prisma.proposal.findUnique({
        where: { onChainId: Number(proposalId) }
      });
      
      if (existing) return;

      // Get proposal details from contract
      const proposalData = await this.daoContract.getProposal(proposalId);
      
      // Create user if doesn't exist
      await this.ensureUserExists(proposer);
      
      // Create proposal in database
      await prisma.proposal.create({
        data: {
          onChainId: Number(proposalId),
          title: description.split('\n')[0] || `Proposal #${proposalId}`,
          description: description,
          proposer: proposer,
          target: targets[0] || ethers.ZeroAddress,
          value: values[0]?.toString() || '0',
          snapshotBlock: Number(proposalData.snapshotBlock),
          startTime: new Date(Number(proposalData.startTime) * 1000),
          endTime: new Date(Number(proposalData.endTime) * 1000),
          state: this.mapProposalState(proposalData.state),
          votesFor: proposalData.votesFor.toString(),
          votesAgainst: proposalData.votesAgainst.toString(),
          votesAbstain: proposalData.votesAbstain.toString(),
        }
      });

      // Create event record
      await prisma.proposalEvent.create({
        data: {
          proposalId: `proposal_${proposalId}`,
          type: 'CREATED',
          data: JSON.stringify({ proposalId, proposer, description }),
          transactionHash: event.transactionHash,
          blockNumber: event.blockNumber,
          blockTimestamp: new Date(block.timestamp * 1000),
        }
      });

      console.log(`✅ Indexed proposal created: ${proposalId}`);
    } catch (error) {
      console.error('❌ Failed to process ProposalCreated event:', error);
    }
  }

  async processVoteCastEvent(event) {
    try {
      const { voter, proposalId, support, weight } = event.args;
      const block = await event.getBlock();
      
      // Create user if doesn't exist
      await this.ensureUserExists(voter);
      
      // Create or update vote record
      await prisma.vote.upsert({
        where: {
          proposalId_voter: {
            proposalId: `proposal_${proposalId}`,
            voter: voter
          }
        },
        update: {
          support: this.mapVoteChoice(support),
          weight: weight.toString(),
          transactionHash: event.transactionHash,
          blockNumber: event.blockNumber,
          blockTimestamp: new Date(block.timestamp * 1000),
        },
        create: {
          proposalId: `proposal_${proposalId}`,
          voter: voter,
          support: this.mapVoteChoice(support),
          weight: weight.toString(),
          transactionHash: event.transactionHash,
          blockNumber: event.blockNumber,
          blockTimestamp: new Date(block.timestamp * 1000),
        }
      });

      // Update proposal vote tallies
      await this.updateProposalTallies(proposalId);

      console.log(`✅ Indexed vote cast: ${voter} on proposal ${proposalId}`);
    } catch (error) {
      console.error('❌ Failed to process Voted event:', error);
    }
  }

  async processProposalExecutedEvent(event) {
    try {
      const { proposalId } = event.args;
      const block = await event.getBlock();
      
      // Update proposal execution status
      await prisma.proposal.update({
        where: { onChainId: Number(proposalId) },
        data: {
          executed: true,
          executionTime: new Date(block.timestamp * 1000),
          state: 'EXECUTED'
        }
      });

      console.log(`✅ Indexed proposal executed: ${proposalId}`);
    } catch (error) {
      console.error('❌ Failed to process ProposalExecuted event:', error);
    }
  }

  async indexTreasuryEvents(fromBlock, toBlock) {
    if (!this.treasuryContract) return;

    try {
      // Get treasury events
      const depositEvents = await this.treasuryContract.queryFilter(
        this.treasuryContract.filters.DepositedETH(),
        fromBlock,
        toBlock
      );

      const withdrawalEvents = await this.treasuryContract.queryFilter(
        this.treasuryContract.filters.WithdrawnETH(),
        fromBlock,
        toBlock
      );

      // Process deposit events
      for (const event of depositEvents) {
        await this.processTreasuryDepositEvent(event);
      }

      // Process withdrawal events
      for (const event of withdrawalEvents) {
        await this.processTreasuryWithdrawalEvent(event);
      }

    } catch (error) {
      console.error('❌ Failed to index treasury events:', error);
    }
  }

  async processTreasuryDepositEvent(event) {
    try {
      const { from, amount } = event.args;
      const block = await event.getBlock();
      
      await prisma.treasuryTransaction.create({
        data: {
          transactionHash: event.transactionHash,
          type: 'DEPOSIT',
          amount: amount.toString(),
          from: from,
          blockNumber: event.blockNumber,
          blockTimestamp: new Date(block.timestamp * 1000),
          gasUsed: '0', // Would need transaction receipt for this
          gasPrice: '0',
          status: 'CONFIRMED'
        }
      });

      console.log(`✅ Indexed treasury deposit: ${ethers.formatEther(amount)} ETH`);
    } catch (error) {
      console.error('❌ Failed to process treasury deposit:', error);
    }
  }

  async processTreasuryWithdrawalEvent(event) {
    try {
      const { to, amount } = event.args;
      const block = await event.getBlock();
      
      await prisma.treasuryTransaction.create({
        data: {
          transactionHash: event.transactionHash,
          type: 'WITHDRAWAL',
          amount: amount.toString(),
          to: to,
          blockNumber: event.blockNumber,
          blockTimestamp: new Date(block.timestamp * 1000),
          gasUsed: '0',
          gasPrice: '0',
          status: 'CONFIRMED'
        }
      });

      console.log(`✅ Indexed treasury withdrawal: ${ethers.formatEther(amount)} ETH`);
    } catch (error) {
      console.error('❌ Failed to process treasury withdrawal:', error);
    }
  }

  setupEventListeners() {
    if (!this.daoContract) return;

    // Listen for new proposal events
    this.daoContract.on('ProposalCreated', async (...args) => {
      const event = args[args.length - 1];
      await this.processProposalCreatedEvent(event);
    });

    // Listen for vote events
    this.daoContract.on('Voted', async (...args) => {
      const event = args[args.length - 1];
      await this.processVoteCastEvent(event);
    });

    // Listen for execution events
    this.daoContract.on('ProposalExecuted', async (...args) => {
      const event = args[args.length - 1];
      await this.processProposalExecutedEvent(event);
    });

    console.log('👂 Real-time event listeners setup complete');
  }

  async ensureUserExists(address) {
    try {
      await prisma.user.upsert({
        where: { address },
        update: { lastActive: new Date() },
        create: {
          address,
          lastActive: new Date()
        }
      });
    } catch (error) {
      console.error('❌ Failed to ensure user exists:', error);
    }
  }

  async updateProposalTallies(proposalId) {
    try {
      const proposalData = await this.daoContract.getProposal(proposalId);
      
      await prisma.proposal.update({
        where: { onChainId: Number(proposalId) },
        data: {
          votesFor: proposalData.votesFor.toString(),
          votesAgainst: proposalData.votesAgainst.toString(),
          votesAbstain: proposalData.votesAbstain.toString(),
          state: this.mapProposalState(proposalData.state)
        }
      });
    } catch (error) {
      console.error('❌ Failed to update proposal tallies:', error);
    }
  }

  mapProposalState(state) {
    const states = ['PENDING', 'ACTIVE', 'CANCELLED', 'DEFEATED', 'SUCCEEDED', 'QUEUED', 'EXPIRED', 'EXECUTED'];
    return states[state] || 'PENDING';
  }

  mapVoteChoice(support) {
    const choices = ['AGAINST', 'FOR', 'ABSTAIN'];
    return choices[support] || 'ABSTAIN';
  }

  // Public API methods
  async getProposals(filters = {}) {
    return await prisma.proposal.findMany({
      where: filters,
      include: {
        creator: true,
        votes: true,
        _count: {
          select: { votes: true, comments: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getProposal(id) {
    return await prisma.proposal.findUnique({
      where: { id },
      include: {
        creator: true,
        votes: {
          include: { user: true }
        },
        comments: {
          include: { user: true },
          orderBy: { createdAt: 'desc' }
        },
        events: {
          orderBy: { createdAt: 'desc' }
        }
      }
    });
  }

  async getTreasuryTransactions(limit = 50) {
    return await prisma.treasuryTransaction.findMany({
      take: limit,
      orderBy: { blockTimestamp: 'desc' }
    });
  }

  async getUserVotes(address) {
    return await prisma.vote.findMany({
      where: { voter: address },
      include: { proposal: true },
      orderBy: { createdAt: 'desc' }
    });
  }
}

module.exports = new BlockchainService();
