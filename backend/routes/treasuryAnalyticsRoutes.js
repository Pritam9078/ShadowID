/**
 * Enhanced Treasury Analytics with Alchemy Integration
 * 
 * GET /api/treasury/analytics - Enhanced treasury data
 * GET /api/treasury/transfers - Transaction history via Alchemy
 * GET /api/treasury/tokens - Token balances and metadata
 */

const express = require('express');
const router = express.Router();
const alchemyService = require('../services/alchemyService');

/**
 * GET /api/treasury/analytics - Enhanced analytics
 */
router.get('/analytics', async (req, res) => {
  try {
    const treasuryAddress = process.env.TREASURY_ADDRESS;
    
    if (!treasuryAddress) {
      return res.status(400).json({ error: 'Treasury address not configured' });
    }

    // Get transfers via Alchemy API
    const transfersResult = await alchemyService.getTransfersForAddress(treasuryAddress, {
      limit: 100
    });

    // Get token balances
    const balancesResult = await alchemyService.getTokenBalances(treasuryAddress);

    // Calculate analytics
    const analytics = {
      address: treasuryAddress,
      totalTransactions: transfersResult.success ? transfersResult.transfers.length : 0,
      recentTransfers: transfersResult.success ? transfersResult.transfers.slice(0, 10) : [],
      tokenBalances: balancesResult.success ? balancesResult.balances : [],
      lastUpdated: new Date().toISOString()
    };

    // Process transfer data for insights
    if (transfersResult.success) {
      const transfers = transfersResult.transfers;
      
      // Calculate inflows vs outflows
      const inflows = transfers.filter(t => t.to?.toLowerCase() === treasuryAddress.toLowerCase());
      const outflows = transfers.filter(t => t.from?.toLowerCase() === treasuryAddress.toLowerCase());
      
      analytics.inflows = inflows.length;
      analytics.outflows = outflows.length;
      
      // Calculate total values (simplified for ETH)
      analytics.totalInflow = inflows
        .filter(t => t.asset === 'ETH')
        .reduce((sum, t) => sum + parseFloat(t.value || 0), 0);
        
      analytics.totalOutflow = outflows
        .filter(t => t.asset === 'ETH')
        .reduce((sum, t) => sum + parseFloat(t.value || 0), 0);
    }

    res.json(analytics);

  } catch (error) {
    console.error('Treasury analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch treasury analytics' });
  }
});

/**
 * GET /api/treasury/transfers - Detailed transfer history
 */
router.get('/transfers', async (req, res) => {
  try {
    const { limit = 50, pageKey, category = 'all' } = req.query;
    const treasuryAddress = process.env.TREASURY_ADDRESS;

    if (!treasuryAddress) {
      return res.status(400).json({ error: 'Treasury address not configured' });
    }

    const options = {
      limit: parseInt(limit),
      pageKey
    };

    // Add category filter
    if (category !== 'all') {
      options.category = [category];
    }

    const result = await alchemyService.getTransfersForAddress(treasuryAddress, options);

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    // Enhance transfer data
    const enhancedTransfers = await Promise.all(
      result.transfers.map(async (transfer) => {
        // Get token metadata if it's an ERC20 transfer
        if (transfer.erc20TokenAddress) {
          const metadata = await alchemyService.getTokenMetadata(transfer.erc20TokenAddress);
          if (metadata.success) {
            transfer.tokenMetadata = metadata.metadata;
          }
        }
        return transfer;
      })
    );

    res.json({
      transfers: enhancedTransfers,
      pageKey: result.pageKey,
      hasMore: !!result.pageKey
    });

  } catch (error) {
    console.error('Treasury transfers error:', error);
    res.status(500).json({ error: 'Failed to fetch treasury transfers' });
  }
});

/**
 * GET /api/treasury/tokens - Token balances with metadata
 */
router.get('/tokens', async (req, res) => {
  try {
    const treasuryAddress = process.env.TREASURY_ADDRESS;

    if (!treasuryAddress) {
      return res.status(400).json({ error: 'Treasury address not configured' });
    }

    const balancesResult = await alchemyService.getTokenBalances(treasuryAddress);

    if (!balancesResult.success) {
      return res.status(500).json({ error: balancesResult.error });
    }

    // Enhance with metadata
    const enhancedBalances = await Promise.all(
      balancesResult.balances.map(async (balance) => {
        if (balance.contractAddress) {
          const metadata = await alchemyService.getTokenMetadata(balance.contractAddress);
          if (metadata.success) {
            balance.metadata = metadata.metadata;
          }
        }
        return balance;
      })
    );

    res.json({
      address: treasuryAddress,
      balances: enhancedBalances,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Treasury tokens error:', error);
    res.status(500).json({ error: 'Failed to fetch treasury tokens' });
  }
});

/**
 * POST /api/treasury/simulate - Simulate treasury transaction
 */
router.post('/simulate', async (req, res) => {
  try {
    const { to, value, data } = req.body;
    const treasuryAddress = process.env.TREASURY_ADDRESS;

    const transaction = {
      from: treasuryAddress,
      to,
      value,
      data
    };

    const result = await alchemyService.simulateTransaction(transaction);

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.json(result.simulation);

  } catch (error) {
    console.error('Treasury simulation error:', error);
    res.status(500).json({ error: 'Failed to simulate transaction' });
  }
});

module.exports = router;