/**
 * Alchemy Blockchain Analytics API Routes
 * 
 * Handles blockchain data and analytics using Alchemy service
 */

const express = require('express');
const { alchemyService } = require('../services/alchemyService');
const router = express.Router();

/**
 * GET /api/alchemy/status
 * Get Alchemy service status and connection
 */
router.get('/status', async (req, res) => {
  try {
    const blockNumber = await alchemyService.getCurrentBlock();
    const network = await alchemyService.getNetwork();
    
    res.json({
      success: true,
      status: 'connected',
      network: network.name,
      chainId: network.chainId,
      currentBlock: blockNumber,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Alchemy status error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * GET /api/alchemy/block/:number
 * Get block information by block number
 */
router.get('/block/:number', async (req, res) => {
  try {
    const { number } = req.params;
    const includeTransactions = req.query.transactions === 'true';

    let block;
    if (number === 'latest') {
      block = await alchemyService.getCurrentBlock();
    } else {
      block = await alchemyService.getBlock(parseInt(number), includeTransactions);
    }
    
    res.json({
      success: true,
      block
    });
  } catch (error) {
    console.error('Block retrieval error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * GET /api/alchemy/transaction/:hash
 * Get transaction details by hash
 */
router.get('/transaction/:hash', async (req, res) => {
  try {
    const { hash } = req.params;
    const transaction = await alchemyService.getTransaction(hash);
    
    res.json({
      success: true,
      transaction
    });
  } catch (error) {
    console.error('Transaction retrieval error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * GET /api/alchemy/balance/:address
 * Get account balance for address
 */
router.get('/balance/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const blockTag = req.query.block || 'latest';
    
    const balance = await alchemyService.getBalance(address, blockTag);
    
    res.json({
      success: true,
      address,
      balance: balance.toString(),
      balanceEth: balance.toString(),
      blockTag
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
 * GET /api/alchemy/tokens/:address
 * Get token balances for address
 */
router.get('/tokens/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const tokenBalances = await alchemyService.getTokenBalances(address);
    
    res.json({
      success: true,
      address,
      tokens: tokenBalances
    });
  } catch (error) {
    console.error('Token balance retrieval error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * GET /api/alchemy/token-transfers/:address
 * Get token transfer history for address
 */
router.get('/token-transfers/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const fromBlock = req.query.fromBlock || '0x0';
    const toBlock = req.query.toBlock || 'latest';
    const category = req.query.category; // erc20, erc721, erc1155
    
    const transfers = await alchemyService.getTokenTransfers({
      fromBlock,
      toBlock,
      fromAddress: address,
      toAddress: address,
      category: category ? [category] : undefined
    });
    
    res.json({
      success: true,
      address,
      transfers: transfers.transfers || [],
      pageKey: transfers.pageKey
    });
  } catch (error) {
    console.error('Token transfers retrieval error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * POST /api/alchemy/treasury/analytics
 * Get treasury analytics for specified address
 */
router.post('/treasury/analytics', async (req, res) => {
  try {
    const { treasuryAddress, timeframe = '7d' } = req.body;

    if (!treasuryAddress) {
      return res.status(400).json({
        success: false,
        error: 'Treasury address is required'
      });
    }

    const analytics = await alchemyService.getTreasuryAnalytics(treasuryAddress, timeframe);
    
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
 * GET /api/alchemy/nfts/:address
 * Get NFTs owned by address
 */
router.get('/nfts/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const withMetadata = req.query.metadata === 'true';
    
    const nfts = await alchemyService.getNFTs(address, withMetadata);
    
    res.json({
      success: true,
      address,
      nfts: nfts.ownedNfts || [],
      totalCount: nfts.totalCount,
      pageKey: nfts.pageKey
    });
  } catch (error) {
    console.error('NFTs retrieval error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * POST /api/alchemy/gas-estimate
 * Get gas estimate for transaction
 */
router.post('/gas-estimate', async (req, res) => {
  try {
    const { to, data, value, from } = req.body;

    if (!to) {
      return res.status(400).json({
        success: false,
        error: 'Transaction "to" address is required'
      });
    }

    const gasEstimate = await alchemyService.estimateGas({
      to,
      data: data || '0x',
      value: value || '0x0',
      from
    });
    
    res.json({
      success: true,
      gasEstimate: gasEstimate.toString(),
      transaction: { to, data, value, from }
    });
  } catch (error) {
    console.error('Gas estimation error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * GET /api/alchemy/contract/:address
 * Get contract information and metadata
 */
router.get('/contract/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    // Get contract code and metadata
    const code = await alchemyService.getCode(address);
    const isContract = code && code !== '0x';
    
    let contractMetadata = null;
    if (isContract) {
      try {
        contractMetadata = await alchemyService.getContractMetadata(address);
      } catch (metadataError) {
        console.warn('Contract metadata not available:', metadataError.message);
      }
    }
    
    res.json({
      success: true,
      address,
      isContract,
      code: isContract ? code : null,
      metadata: contractMetadata
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
 * POST /api/alchemy/webhook
 * Handle Alchemy webhook notifications
 */
router.post('/webhook', async (req, res) => {
  try {
    const webhookData = req.body;
    
    console.log('Received Alchemy webhook:', {
      id: webhookData.id,
      type: webhookData.type,
      timestamp: new Date().toISOString()
    });

    // Process webhook data
    const result = await alchemyService.processWebhook(webhookData);
    
    res.json({
      success: true,
      processed: true,
      webhookId: webhookData.id,
      result
    });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * GET /api/alchemy/logs
 * Get contract event logs
 */
router.get('/logs', async (req, res) => {
  try {
    const {
      address,
      fromBlock = 'earliest',
      toBlock = 'latest',
      topics
    } = req.query;

    const filter = {
      address,
      fromBlock,
      toBlock,
      topics: topics ? JSON.parse(topics) : undefined
    };

    const logs = await alchemyService.getLogs(filter);
    
    res.json({
      success: true,
      filter,
      logs
    });
  } catch (error) {
    console.error('Logs retrieval error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * GET /api/alchemy/network-stats
 * Get network statistics and metrics
 */
router.get('/network-stats', async (req, res) => {
  try {
    const currentBlock = await alchemyService.getCurrentBlock();
    const network = await alchemyService.getNetwork();
    const gasPrice = await alchemyService.getGasPrice();
    
    res.json({
      success: true,
      network: {
        name: network.name,
        chainId: network.chainId,
        currentBlock,
        gasPrice: gasPrice.toString(),
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Network stats error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;