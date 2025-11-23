/**
 * Enhanced Alchemy Integration Service
 * 
 * Provides comprehensive blockchain analytics and real-time monitoring
 * Using your Alchemy API key: mUJMHrybqfzOlpVeT0cj7
 */

const axios = require('axios');
const { ethers } = require('ethers');

class AlchemyService {
  constructor() {
    this.apiKey = process.env.ALCHEMY_API_KEY || 'mUJMHrybqfzOlpVeT0cj7';
    this.network = process.env.ALCHEMY_NETWORK || 'arb-sepolia';
    this.baseUrl = `https://${this.network}.g.alchemy.com/v2/${this.apiKey}`;
    this.webhookSecret = process.env.ALCHEMY_WEBHOOK_SECRET;
    
    // Initialize ethers provider with Alchemy
    this.provider = new ethers.JsonRpcProvider(this.baseUrl);
    
    console.log('🔗 Enhanced Alchemy Service initialized for Arbitrum Sepolia');
    console.log(`📡 RPC Endpoint: https://arb-sepolia.g.alchemy.com/v2/${this.apiKey.slice(0, 8)}...`);
  }

  /**
   * Get transfers for address (Treasury analytics)
   */
  async getTransfersForAddress(address, options = {}) {
    try {
      const response = await axios.post(`${this.baseUrl}`, {
        id: 1,
        jsonrpc: '2.0',
        method: 'alchemy_getAssetTransfers',
        params: [{
          fromAddress: options.from || null,
          toAddress: address,
          category: ['external', 'internal', 'erc20', 'erc721'],
          maxCount: options.limit || 100,
          pageKey: options.pageKey || null,
          ...options
        }]
      });

      return {
        success: true,
        transfers: response.data.result.transfers,
        pageKey: response.data.result.pageKey
      };
    } catch (error) {
      console.error('Alchemy getTransfers error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get token balances for address
   */
  async getTokenBalances(address, tokenAddresses = []) {
    try {
      const response = await axios.post(`${this.baseUrl}`, {
        id: 1,
        jsonrpc: '2.0',
        method: 'alchemy_getTokenBalances',
        params: [address, tokenAddresses.length > 0 ? tokenAddresses : 'DEFAULT_TOKENS']
      });

      return {
        success: true,
        balances: response.data.result.tokenBalances
      };
    } catch (error) {
      console.error('Alchemy getTokenBalances error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get token metadata
   */
  async getTokenMetadata(tokenAddress) {
    try {
      const response = await axios.post(`${this.baseUrl}`, {
        id: 1,
        jsonrpc: '2.0',
        method: 'alchemy_getTokenMetadata',
        params: [tokenAddress]
      });

      return {
        success: true,
        metadata: response.data.result
      };
    } catch (error) {
      console.error('Alchemy getTokenMetadata error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get enhanced transaction receipts
   */
  async getTransactionReceipt(txHash) {
    try {
      const response = await axios.post(`${this.baseUrl}`, {
        id: 1,
        jsonrpc: '2.0',
        method: 'eth_getTransactionReceipt',
        params: [txHash]
      });

      return {
        success: true,
        receipt: response.data.result
      };
    } catch (error) {
      console.error('Alchemy getTransactionReceipt error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Simulate transaction before execution
   */
  async simulateTransaction(transaction) {
    try {
      const response = await axios.post(`${this.baseUrl}`, {
        id: 1,
        jsonrpc: '2.0',
        method: 'alchemy_simulateExecution',
        params: [transaction]
      });

      return {
        success: true,
        simulation: response.data.result
      };
    } catch (error) {
      console.error('Alchemy simulateTransaction error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get current gas price estimates
   */
  async getGasEstimates() {
    try {
      const response = await axios.get(`https://gas-api.alchemy.com/prices`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` }
      });

      return {
        success: true,
        gasEstimates: response.data
      };
    } catch (error) {
      console.error('Alchemy getGasEstimates error:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create webhook for address monitoring
   */
  async createWebhook(webhookUrl, addresses, webhookType = 'ADDRESS_ACTIVITY') {
    try {
      const response = await axios.post('https://dashboard.alchemy.com/api/create-webhook', {
        webhook_type: webhookType,
        webhook_url: webhookUrl,
        addresses: addresses
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        success: true,
        webhook: response.data
      };
    } catch (error) {
      console.error('Alchemy createWebhook error:', error.message);
      return { success: false, error: error.message };
    }
  }
}

// Create singleton instance
const alchemyService = new AlchemyService();

module.exports = alchemyService;