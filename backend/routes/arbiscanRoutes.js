/**
 * Arbiscan Explorer API Routes
 * 
 * Handles blockchain explorer data using Arbiscan service
 */

const express = require('express');
const { arbiscanService } = require('../services/arbiscanService');
const router = express.Router();

/**
 * GET /api/arbiscan/status
 * Get Arbiscan service status and API connection
 */
router.get('/status', async (req, res) => {
  try {
    // Test API connection with a simple balance query
    const testAddress = '0x0000000000000000000000000000000000000000';
    await arbiscanService.getAccountBalance(testAddress);
    
    res.json({
      success: true,
      status: 'connected',
      network: 'Arbitrum Sepolia',
      apiEndpoint: 'https://api-sepolia.arbiscan.io',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Arbiscan status error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * GET /api/arbiscan/balance/:address
 * Get account balance from Arbiscan
 */
router.get('/balance/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const balance = await arbiscanService.getAccountBalance(address);
    
    res.json({
      success: true,
      address,
      balance,
      balanceEth: (parseFloat(balance) / 1e18).toString(),
      source: 'arbiscan'
    });
  } catch (error) {
    console.error('Balance retrieval error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * GET /api/arbiscan/transactions/:address
 * Get transaction history for address
 */
router.get('/transactions/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const {
      page = 1,
      offset = 100,
      startblock = 0,
      endblock = 'latest',
      sort = 'desc'
    } = req.query;

    const options = {
      page: parseInt(page),
      offset: parseInt(offset),
      startblock: startblock === 'latest' ? startblock : parseInt(startblock),
      endblock: endblock === 'latest' ? endblock : parseInt(endblock),
      sort
    };

    const transactions = await arbiscanService.getTransactionHistory(address, options);
    
    res.json({
      success: true,
      address,
      transactions,
      pagination: {
        page: options.page,
        offset: options.offset,
        total: transactions.length
      }
    });
  } catch (error) {
    console.error('Transaction history error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * GET /api/arbiscan/transaction/:hash
 * Get transaction details by hash
 */
router.get('/transaction/:hash', async (req, res) => {
  try {
    const { hash } = req.params;
    const transaction = await arbiscanService.getTransactionByHash(hash);
    
    res.json({
      success: true,
      hash,
      transaction
    });
  } catch (error) {
    console.error('Transaction details error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * GET /api/arbiscan/token-transfers/:address
 * Get ERC-20 token transfers for address
 */
router.get('/token-transfers/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const {
      contractAddress,
      page = 1,
      offset = 100,
      startblock = 0,
      endblock = 'latest',
      sort = 'desc'
    } = req.query;

    const options = {
      contractAddress,
      page: parseInt(page),
      offset: parseInt(offset),
      startblock: startblock === 'latest' ? startblock : parseInt(startblock),
      endblock: endblock === 'latest' ? endblock : parseInt(endblock),
      sort
    };

    const transfers = await arbiscanService.getTokenTransfers(address, options);
    
    res.json({
      success: true,
      address,
      contractAddress: contractAddress || 'all',
      transfers,
      pagination: {
        page: options.page,
        offset: options.offset,
        total: transfers.length
      }
    });
  } catch (error) {
    console.error('Token transfers error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * GET /api/arbiscan/contract/:address
 * Get contract information and verification status
 */
router.get('/contract/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const contractInfo = await arbiscanService.getContractInfo(address);
    
    res.json({
      success: true,
      address,
      contract: contractInfo
    });
  } catch (error) {
    console.error('Contract info error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * GET /api/arbiscan/contract/:address/abi
 * Get contract ABI if verified
 */
router.get('/contract/:address/abi', async (req, res) => {
  try {
    const { address } = req.params;
    const abi = await arbiscanService.getContractABI(address);
    
    res.json({
      success: true,
      address,
      abi: typeof abi === 'string' ? JSON.parse(abi) : abi
    });
  } catch (error) {
    console.error('Contract ABI error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * GET /api/arbiscan/contract/:address/source
 * Get contract source code if verified
 */
router.get('/contract/:address/source', async (req, res) => {
  try {
    const { address } = req.params;
    const sourceCode = await arbiscanService.getContractSource(address);
    
    res.json({
      success: true,
      address,
      sourceCode
    });
  } catch (error) {
    console.error('Contract source error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * POST /api/arbiscan/treasury/analytics
 * Get treasury analytics using Arbiscan data
 */
router.post('/treasury/analytics', async (req, res) => {
  try {
    const { treasuryAddress, timeframe = '30d' } = req.body;

    if (!treasuryAddress) {
      return res.status(400).json({
        success: false,
        error: 'Treasury address is required'
      });
    }

    const analytics = await arbiscanService.getTreasuryAnalytics(treasuryAddress, timeframe);
    
    res.json({
      success: true,
      treasuryAddress,
      timeframe,
      analytics
    });
  } catch (error) {
    console.error('Treasury analytics error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * GET /api/arbiscan/blocks
 * Get latest blocks information
 */
router.get('/blocks', async (req, res) => {
  try {
    const { page = 1, offset = 10 } = req.query;
    
    const options = {
      page: parseInt(page),
      offset: parseInt(offset)
    };

    const blocks = await arbiscanService.getBlocks(options);
    
    res.json({
      success: true,
      blocks,
      pagination: options
    });
  } catch (error) {
    console.error('Blocks retrieval error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * GET /api/arbiscan/gas-tracker
 * Get current gas prices and network stats
 */
router.get('/gas-tracker', async (req, res) => {
  try {
    const gasData = await arbiscanService.getGasTracker();
    
    res.json({
      success: true,
      gasTracker: gasData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Gas tracker error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * GET /api/arbiscan/token/:contractAddress
 * Get ERC-20 token information
 */
router.get('/token/:contractAddress', async (req, res) => {
  try {
    const { contractAddress } = req.params;
    const tokenInfo = await arbiscanService.getTokenInfo(contractAddress);
    
    res.json({
      success: true,
      contractAddress,
      token: tokenInfo
    });
  } catch (error) {
    console.error('Token info error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * GET /api/arbiscan/account/:address/stats
 * Get comprehensive account statistics
 */
router.get('/account/:address/stats', async (req, res) => {
  try {
    const { address } = req.params;
    
    // Get balance
    const balance = await arbiscanService.getAccountBalance(address);
    
    // Get recent transactions (last 10)
    const transactions = await arbiscanService.getTransactionHistory(address, {
      page: 1,
      offset: 10,
      sort: 'desc'
    });
    
    // Get token transfers (last 10)
    const tokenTransfers = await arbiscanService.getTokenTransfers(address, {
      page: 1,
      offset: 10,
      sort: 'desc'
    });

    const stats = {
      address,
      balance,
      balanceEth: (parseFloat(balance) / 1e18).toString(),
      transactionCount: transactions.length,
      tokenTransferCount: tokenTransfers.length,
      recentTransactions: transactions.slice(0, 5),
      recentTokenTransfers: tokenTransfers.slice(0, 5)
    };
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Account stats error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * POST /api/arbiscan/multi-balance
 * Get balances for multiple addresses
 */
router.post('/multi-balance', async (req, res) => {
  try {
    const { addresses } = req.body;

    if (!addresses || !Array.isArray(addresses)) {
      return res.status(400).json({
        success: false,
        error: 'Array of addresses is required'
      });
    }

    if (addresses.length > 20) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 20 addresses allowed per request'
      });
    }

    const balances = await arbiscanService.getMultiBalance(addresses);
    
    res.json({
      success: true,
      addresses,
      balances
    });
  } catch (error) {
    console.error('Multi-balance error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * GET /api/arbiscan/search/:query
 * Search for transactions, addresses, or blocks
 */
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    
    let result = { success: true, query, type: 'unknown', data: null };
    
    // Detect query type and search accordingly
    if (query.length === 66 && query.startsWith('0x')) {
      // Transaction hash
      try {
        const transaction = await arbiscanService.getTransactionByHash(query);
        result.type = 'transaction';
        result.data = transaction;
      } catch (error) {
        result.error = 'Transaction not found';
      }
    } else if (query.length === 42 && query.startsWith('0x')) {
      // Address
      try {
        const balance = await arbiscanService.getAccountBalance(query);
        result.type = 'address';
        result.data = { address: query, balance };
      } catch (error) {
        result.error = 'Address not found or invalid';
      }
    } else if (/^\d+$/.test(query)) {
      // Block number
      try {
        // Note: Arbiscan doesn't have a direct block by number API
        // This would need to be implemented differently
        result.type = 'block';
        result.data = { blockNumber: query, message: 'Block search not implemented' };
      } catch (error) {
        result.error = 'Block not found';
      }
    } else {
      result.error = 'Invalid query format';
    }
    
    res.json(result);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;