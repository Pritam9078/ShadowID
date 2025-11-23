const { PrismaClient } = require('@prisma/client');
const { ethers } = require('ethers');

const prisma = new PrismaClient();

/**
 * Analytics Service - Handles DAO metrics, analytics, and reporting
 */
class AnalyticsService {
  constructor() {
    this.metricsCache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
    
    // Start periodic metrics calculation
    this.startMetricsCollection();
  }

  startMetricsCollection() {
    // Calculate metrics every hour
    setInterval(async () => {
      await this.calculateDailyMetrics();
    }, 60 * 60 * 1000);

    // Initial calculation
    setTimeout(() => this.calculateDailyMetrics(), 5000);
  }

  async calculateDailyMetrics() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Check if today's metrics already exist
      const existingMetrics = await prisma.daoMetrics.findUnique({
        where: { date: today }
      });

      const metrics = await this.calculateMetricsForDate(today);

      if (existingMetrics) {
        await prisma.daoMetrics.update({
          where: { date: today },
          data: metrics
        });
      } else {
        await prisma.daoMetrics.create({
          data: {
            date: today,
            ...metrics
          }
        });
      }

      console.log('📊 Daily metrics calculated successfully');
    } catch (error) {
      console.error('❌ Failed to calculate daily metrics:', error);
    }
  }

  async calculateMetricsForDate(date) {
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);

    // Proposal metrics
    const totalProposals = await prisma.proposal.count();
    const activeProposals = await prisma.proposal.count({
      where: { state: 'ACTIVE' }
    });
    const proposalsCreated = await prisma.proposal.count({
      where: {
        createdAt: {
          gte: date,
          lt: endDate
        }
      }
    });
    const proposalsExecuted = await prisma.proposal.count({
      where: {
        executed: true,
        executionTime: {
          gte: date,
          lt: endDate
        }
      }
    });

    // Voting metrics
    const totalVotes = await prisma.vote.count();
    const votesToday = await prisma.vote.count({
      where: {
        createdAt: {
          gte: date,
          lt: endDate
        }
      }
    });
    const uniqueVoters = await prisma.vote.groupBy({
      by: ['voter'],
      _count: { voter: true }
    });

    // Treasury metrics
    const treasuryTransactions = await prisma.treasuryTransaction.findMany({
      where: {
        status: 'CONFIRMED'
      }
    });

    let totalDeposits = '0';
    let totalWithdrawals = '0';
    let treasuryBalance = '0';

    for (const tx of treasuryTransactions) {
      if (tx.type === 'DEPOSIT') {
        totalDeposits = (BigInt(totalDeposits) + BigInt(tx.amount)).toString();
      } else if (tx.type === 'WITHDRAWAL') {
        totalWithdrawals = (BigInt(totalWithdrawals) + BigInt(tx.amount)).toString();
      }
    }
    treasuryBalance = (BigInt(totalDeposits) - BigInt(totalWithdrawals)).toString();

    // User metrics
    const totalUsers = await prisma.user.count();
    const activeUsers = await prisma.user.count({
      where: {
        lastActive: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      }
    });
    const newUsers = await prisma.user.count({
      where: {
        createdAt: {
          gte: date,
          lt: endDate
        }
      }
    });

    // Calculate participation rate
    const votingParticipation = totalProposals > 0 ? 
      (uniqueVoters.length / totalUsers) * 100 : 0;

    return {
      totalProposals,
      activeProposals,
      proposalsCreated,
      proposalsExecuted,
      totalVotes,
      uniqueVoters: uniqueVoters.length,
      votingParticipation,
      treasuryBalance,
      totalDeposits,
      totalWithdrawals,
      totalUsers,
      activeUsers,
      newUsers
    };
  }

  async getDashboardMetrics() {
    const cacheKey = 'dashboard_metrics';
    const cached = this.metricsCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }

    try {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const lastWeek = new Date(today);
      lastWeek.setDate(lastWeek.getDate() - 7);

      // Get latest metrics
      const latestMetrics = await prisma.daoMetrics.findFirst({
        orderBy: { date: 'desc' }
      });

      // Proposal analytics
      const proposalsByState = await prisma.proposal.groupBy({
        by: ['state'],
        _count: { state: true }
      });

      const proposalsByCategory = await prisma.proposal.groupBy({
        by: ['category'],
        _count: { category: true }
      });

      // Recent activity
      const recentProposals = await prisma.proposal.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { creator: true }
      });

      const recentVotes = await prisma.vote.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { user: true, proposal: true }
      });

      // Top voters
      const topVoters = await prisma.vote.groupBy({
        by: ['voter'],
        _count: { voter: true },
        orderBy: { _count: { voter: 'desc' } },
        take: 10
      });

      // Treasury activity
      const treasuryActivity = await prisma.treasuryTransaction.findMany({
        take: 10,
        orderBy: { blockTimestamp: 'desc' }
      });

      const metrics = {
        overview: latestMetrics || {},
        proposalsByState: proposalsByState.reduce((acc, item) => {
          acc[item.state] = item._count.state;
          return acc;
        }, {}),
        proposalsByCategory: proposalsByCategory.reduce((acc, item) => {
          acc[item.category] = item._count.category;
          return acc;
        }, {}),
        recentActivity: {
          proposals: recentProposals,
          votes: recentVotes
        },
        topVoters: await this.enrichTopVoters(topVoters),
        treasuryActivity
      };

      // Cache the results
      this.metricsCache.set(cacheKey, {
        data: metrics,
        timestamp: Date.now()
      });

      return metrics;
    } catch (error) {
      console.error('❌ Failed to get dashboard metrics:', error);
      return {};
    }
  }

  async enrichTopVoters(topVoters) {
    const enriched = [];
    for (const voter of topVoters) {
      const user = await prisma.user.findUnique({
        where: { address: voter.voter }
      });
      enriched.push({
        ...voter,
        user: user || { address: voter.voter, username: null }
      });
    }
    return enriched;
  }

  async getProposalAnalytics(proposalId) {
    try {
      const proposal = await prisma.proposal.findUnique({
        where: { id: proposalId },
        include: {
          votes: {
            include: { user: true }
          },
          events: {
            orderBy: { createdAt: 'asc' }
          }
        }
      });

      if (!proposal) {
        throw new Error('Proposal not found');
      }

      // Vote distribution
      const voteDistribution = {
        FOR: proposal.votes.filter(v => v.support === 'FOR').length,
        AGAINST: proposal.votes.filter(v => v.support === 'AGAINST').length,
        ABSTAIN: proposal.votes.filter(v => v.support === 'ABSTAIN').length
      };

      // Voting timeline
      const votingTimeline = proposal.votes.map(vote => ({
        date: vote.createdAt,
        support: vote.support,
        voter: vote.user.username || vote.user.address,
        weight: vote.weight
      })).sort((a, b) => new Date(a.date) - new Date(b.date));

      // Participation metrics
      const totalVotingPower = proposal.votes.reduce((sum, vote) => 
        sum + BigInt(vote.weight), BigInt(0)
      );

      const participationRate = proposal.votes.length; // Could calculate against total eligible voters

      return {
        proposal,
        voteDistribution,
        votingTimeline,
        participationMetrics: {
          totalVotes: proposal.votes.length,
          totalVotingPower: totalVotingPower.toString(),
          participationRate
        },
        eventTimeline: proposal.events
      };
    } catch (error) {
      console.error('❌ Failed to get proposal analytics:', error);
      throw error;
    }
  }

  async getTreasuryAnalytics(period = '30d') {
    try {
      const now = new Date();
      const periodStart = new Date();
      
      switch (period) {
        case '7d':
          periodStart.setDate(now.getDate() - 7);
          break;
        case '30d':
          periodStart.setDate(now.getDate() - 30);
          break;
        case '90d':
          periodStart.setDate(now.getDate() - 90);
          break;
        case '1y':
          periodStart.setFullYear(now.getFullYear() - 1);
          break;
        default:
          periodStart.setDate(now.getDate() - 30);
      }

      const transactions = await prisma.treasuryTransaction.findMany({
        where: {
          blockTimestamp: {
            gte: periodStart,
            lte: now
          },
          status: 'CONFIRMED'
        },
        orderBy: { blockTimestamp: 'asc' }
      });

      // Calculate running balance
      let runningBalance = BigInt(0);
      const balanceHistory = [];
      const dailyActivity = {};

      for (const tx of transactions) {
        const amount = BigInt(tx.amount);
        
        if (tx.type === 'DEPOSIT') {
          runningBalance += amount;
        } else if (tx.type === 'WITHDRAWAL') {
          runningBalance -= amount;
        }

        balanceHistory.push({
          date: tx.blockTimestamp,
          balance: runningBalance.toString(),
          transaction: tx
        });

        // Group by day for daily activity
        const day = tx.blockTimestamp.toISOString().split('T')[0];
        if (!dailyActivity[day]) {
          dailyActivity[day] = { deposits: BigInt(0), withdrawals: BigInt(0), count: 0 };
        }
        
        if (tx.type === 'DEPOSIT') {
          dailyActivity[day].deposits += amount;
        } else if (tx.type === 'WITHDRAWAL') {
          dailyActivity[day].withdrawals += amount;
        }
        dailyActivity[day].count++;
      }

      // Convert daily activity to array
      const dailyActivityArray = Object.entries(dailyActivity).map(([date, data]) => ({
        date,
        deposits: data.deposits.toString(),
        withdrawals: data.withdrawals.toString(),
        net: (data.deposits - data.withdrawals).toString(),
        transactionCount: data.count
      }));

      // Calculate summary stats
      const totalDeposits = transactions
        .filter(tx => tx.type === 'DEPOSIT')
        .reduce((sum, tx) => sum + BigInt(tx.amount), BigInt(0));
      
      const totalWithdrawals = transactions
        .filter(tx => tx.type === 'WITHDRAWAL')
        .reduce((sum, tx) => sum + BigInt(tx.amount), BigInt(0));

      return {
        period,
        summary: {
          currentBalance: runningBalance.toString(),
          totalDeposits: totalDeposits.toString(),
          totalWithdrawals: totalWithdrawals.toString(),
          netFlow: (totalDeposits - totalWithdrawals).toString(),
          transactionCount: transactions.length
        },
        balanceHistory,
        dailyActivity: dailyActivityArray,
        transactions
      };
    } catch (error) {
      console.error('❌ Failed to get treasury analytics:', error);
      throw error;
    }
  }

  async getUserAnalytics(address) {
    try {
      const user = await prisma.user.findUnique({
        where: { address },
        include: {
          proposals: true,
          votes: {
            include: { proposal: true }
          }
        }
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Voting patterns
      const votesByChoice = {
        FOR: user.votes.filter(v => v.support === 'FOR').length,
        AGAINST: user.votes.filter(v => v.support === 'AGAINST').length,
        ABSTAIN: user.votes.filter(v => v.support === 'ABSTAIN').length
      };

      // Voting timeline
      const votingTimeline = user.votes.map(vote => ({
        date: vote.createdAt,
        proposal: vote.proposal.title,
        support: vote.support,
        weight: vote.weight
      })).sort((a, b) => new Date(b.date) - new Date(a.date));

      // Proposal success rate
      const proposalStates = user.proposals.reduce((acc, proposal) => {
        acc[proposal.state] = (acc[proposal.state] || 0) + 1;
        return acc;
      }, {});

      return {
        user,
        statistics: {
          totalProposals: user.proposals.length,
          totalVotes: user.votes.length,
          votesByChoice,
          proposalStates
        },
        activity: {
          votingTimeline,
          recentProposals: user.proposals.slice(0, 5),
          recentVotes: user.votes.slice(0, 10)
        }
      };
    } catch (error) {
      console.error('❌ Failed to get user analytics:', error);
      throw error;
    }
  }

  // Express router for analytics endpoints
  get router() {
    const express = require('express');
    const router = express.Router();

    // Dashboard metrics
    router.get('/dashboard', async (req, res) => {
      try {
        const metrics = await this.getDashboardMetrics();
        res.json(metrics);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Proposal analytics
    router.get('/proposal/:id', async (req, res) => {
      try {
        const analytics = await this.getProposalAnalytics(req.params.id);
        res.json(analytics);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Treasury analytics
    router.get('/treasury', async (req, res) => {
      try {
        const period = req.query.period || '30d';
        const analytics = await this.getTreasuryAnalytics(period);
        res.json(analytics);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // User analytics
    router.get('/user/:address', async (req, res) => {
      try {
        const analytics = await this.getUserAnalytics(req.params.address);
        res.json(analytics);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    return router;
  }
}

module.exports = new AnalyticsService();
