/**
 * Arbitrum Sepolia Explorer Service (Arbiscan)
 * 
 * Interacts with Arbiscan API for transaction history, contract verification,
 * and detailed blockchain analytics using your API key
 */

const axios = require('axios');

class ArbiscanService {
  constructor() {
    this.apiKey = process.env.ARBITRUM_EXPLORER_API_KEY || 'NW6QS9AAZAEYJ28B6K2DBFJ1EVPAJ4688X';
    this.baseUrl = process.env.ARBITRUM_EXPLORER_URL || 'https://api-sepolia.arbiscan.io/api';
    
    console.log('🔍 Arbiscan Service initialized');
    console.log(`📊 Explorer: ${this.baseUrl}`);
    console.log(`🔑 API Key: ${this.apiKey.slice(0, 8)}...`);
  }

  /**
   * Get account balance
   * 
   * @param {string} address - Address to check
   * @returns {Promise<Object>} Balance information
   */
  async getBalance(address) {
    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          module: 'account',
          action: 'balance',
          address: address,
          tag: 'latest',
          apikey: this.apiKey
        }
      });

      if (response.data.status === '1') {
        return {
          success: true,
          balance: response.data.result,
          balanceEth: (parseInt(response.data.result) / 1e18).toFixed(6),
          address
        };
      } else {
        throw new Error(response.data.message || 'Failed to get balance');
      }

    } catch (error) {
      console.error('❌ Arbiscan getBalance error:', error.message);
      return {
        success: false,
        error: error.message,
        address
      };
    }
  }

  /**
   * Get multiple account balances
   * 
   * @param {Array} addresses - Array of addresses
   * @returns {Promise<Object>} Multiple balance information
   */
  async getMultipleBalances(addresses) {
    try {
      const addressList = addresses.join(',');
      
      const response = await axios.get(this.baseUrl, {
        params: {
          module: 'account',
          action: 'balancemulti',
          address: addressList,
          tag: 'latest',
          apikey: this.apiKey
        }
      });

      if (response.data.status === '1') {
        return {
          success: true,
          balances: response.data.result.map(item => ({
            address: item.account,
            balance: item.balance,
            balanceEth: (parseInt(item.balance) / 1e18).toFixed(6)
          }))
        };
      } else {
        throw new Error(response.data.message || 'Failed to get balances');
      }

    } catch (error) {
      console.error('❌ Arbiscan getMultipleBalances error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get transaction history for address
   * 
   * @param {string} address - Address to check
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Transaction history
   */
  async getTransactionHistory(address, options = {}) {
    try {
      const params = {
        module: 'account',
        action: 'txlist',
        address: address,
        startblock: options.startBlock || 0,
        endblock: options.endBlock || 99999999,
        page: options.page || 1,
        offset: options.offset || 100,
        sort: options.sort || 'desc',
        apikey: this.apiKey
      };

      const response = await axios.get(this.baseUrl, { params });

      if (response.data.status === '1') {
        const transactions = response.data.result.map(tx => ({
          hash: tx.hash,
          blockNumber: parseInt(tx.blockNumber),
          timeStamp: parseInt(tx.timeStamp),
          from: tx.from,
          to: tx.to,
          value: tx.value,
          valueEth: (parseInt(tx.value) / 1e18).toFixed(6),
          gas: tx.gas,
          gasPrice: tx.gasPrice,
          gasUsed: tx.gasUsed,
          cumulativeGasUsed: tx.cumulativeGasUsed,
          isError: tx.isError === '1',
          methodId: tx.methodId,
          functionName: tx.functionName
        }));

        return {
          success: true,
          transactions,
          count: transactions.length,
          address
        };
      } else {
        throw new Error(response.data.message || 'Failed to get transactions');
      }

    } catch (error) {
      console.error('❌ Arbiscan getTransactionHistory error:', error.message);
      return {
        success: false,
        error: error.message,
        address
      };
    }
  }

  /**
   * Get internal transactions for address
   * 
   * @param {string} address - Address to check
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Internal transaction history
   */
  async getInternalTransactions(address, options = {}) {
    try {
      const params = {
        module: 'account',
        action: 'txlistinternal',
        address: address,
        startblock: options.startBlock || 0,
        endblock: options.endBlock || 99999999,
        page: options.page || 1,
        offset: options.offset || 100,
        sort: options.sort || 'desc',
        apikey: this.apiKey
      };

      const response = await axios.get(this.baseUrl, { params });

      if (response.data.status === '1') {
        return {
          success: true,
          transactions: response.data.result,
          count: response.data.result.length,
          address
        };
      } else {
        throw new Error(response.data.message || 'Failed to get internal transactions');
      }

    } catch (error) {
      console.error('❌ Arbiscan getInternalTransactions error:', error.message);
      return {
        success: false,
        error: error.message,
        address
      };
    }
  }

  /**
   * Get ERC20 token transfers for address
   * 
   * @param {string} address - Address to check
   * @param {string} contractAddress - Token contract address (optional)
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Token transfer history
   */
  async getTokenTransfers(address, contractAddress = null, options = {}) {
    try {
      const params = {
        module: 'account',
        action: 'tokentx',
        address: address,
        startblock: options.startBlock || 0,
        endblock: options.endBlock || 99999999,
        page: options.page || 1,
        offset: options.offset || 100,
        sort: options.sort || 'desc',
        apikey: this.apiKey
      };

      if (contractAddress) {
        params.contractaddress = contractAddress;
      }

      const response = await axios.get(this.baseUrl, { params });

      if (response.data.status === '1') {
        const transfers = response.data.result.map(tx => ({
          hash: tx.hash,
          blockNumber: parseInt(tx.blockNumber),
          timeStamp: parseInt(tx.timeStamp),
          from: tx.from,
          to: tx.to,
          value: tx.value,
          contractAddress: tx.contractAddress,
          tokenName: tx.tokenName,
          tokenSymbol: tx.tokenSymbol,
          tokenDecimal: parseInt(tx.tokenDecimal),
          gas: tx.gas,
          gasPrice: tx.gasPrice,
          gasUsed: tx.gasUsed
        }));

        return {
          success: true,
          transfers,
          count: transfers.length,
          address,
          contractAddress
        };
      } else {
        throw new Error(response.data.message || 'Failed to get token transfers');
      }

    } catch (error) {
      console.error('❌ Arbiscan getTokenTransfers error:', error.message);
      return {
        success: false,
        error: error.message,
        address
      };
    }
  }

  /**
   * Get contract ABI
   * 
   * @param {string} contractAddress - Contract address
   * @returns {Promise<Object>} Contract ABI
   */
  async getContractABI(contractAddress) {
    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          module: 'contract',
          action: 'getabi',
          address: contractAddress,
          apikey: this.apiKey
        }
      });

      if (response.data.status === '1') {
        return {
          success: true,
          abi: JSON.parse(response.data.result),
          contractAddress
        };
      } else {
        throw new Error(response.data.message || 'Contract ABI not found');
      }

    } catch (error) {
      console.error('❌ Arbiscan getContractABI error:', error.message);
      return {
        success: false,
        error: error.message,
        contractAddress
      };
    }
  }

  /**
   * Get contract source code
   * 
   * @param {string} contractAddress - Contract address
   * @returns {Promise<Object>} Contract source code
   */
  async getContractSource(contractAddress) {
    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          module: 'contract',
          action: 'getsourcecode',
          address: contractAddress,
          apikey: this.apiKey
        }
      });

      if (response.data.status === '1') {
        const result = response.data.result[0];
        return {
          success: true,
          sourceCode: result.SourceCode,
          contractName: result.ContractName,
          compilerVersion: result.CompilerVersion,
          optimizationUsed: result.OptimizationUsed,
          runs: result.Runs,
          constructorArguments: result.ConstructorArguments,
          evmVersion: result.EVMVersion,
          library: result.Library,
          licenseType: result.LicenseType,
          swarmSource: result.SwarmSource,
          contractAddress
        };
      } else {
        throw new Error(response.data.message || 'Contract source not found');
      }

    } catch (error) {
      console.error('❌ Arbiscan getContractSource error:', error.message);
      return {
        success: false,
        error: error.message,
        contractAddress
      };
    }
  }

  /**
   * Get transaction status
   * 
   * @param {string} txHash - Transaction hash
   * @returns {Promise<Object>} Transaction status
   */
  async getTransactionStatus(txHash) {
    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          module: 'transaction',
          action: 'gettxreceiptstatus',
          txhash: txHash,
          apikey: this.apiKey
        }
      });

      if (response.data.status === '1') {
        return {
          success: true,
          status: response.data.result.status === '1' ? 'success' : 'failed',
          txHash
        };
      } else {
        throw new Error(response.data.message || 'Failed to get transaction status');
      }

    } catch (error) {
      console.error('❌ Arbiscan getTransactionStatus error:', error.message);
      return {
        success: false,
        error: error.message,
        txHash
      };
    }
  }

  /**
   * Get gas price estimates
   * 
   * @returns {Promise<Object>} Gas price information
   */
  async getGasPrice() {
    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          module: 'proxy',
          action: 'eth_gasPrice',
          apikey: this.apiKey
        }
      });

      if (response.data.result) {
        const gasPriceWei = parseInt(response.data.result, 16);
        const gasPriceGwei = gasPriceWei / 1e9;

        return {
          success: true,
          gasPrice: {
            wei: gasPriceWei,
            gwei: gasPriceGwei.toFixed(2),
            hex: response.data.result
          }
        };
      } else {
        throw new Error('Failed to get gas price');
      }

    } catch (error) {
      console.error('❌ Arbiscan getGasPrice error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get treasury analytics using Arbiscan data
   * 
   * @param {string} treasuryAddress - Treasury address
   * @returns {Promise<Object>} Treasury analytics
   */
  async getTreasuryAnalytics(treasuryAddress) {
    try {
      // Get current balance
      const balanceResult = await this.getBalance(treasuryAddress);
      
      // Get transaction history
      const txHistory = await this.getTransactionHistory(treasuryAddress, {
        offset: 1000
      });

      // Get token transfers
      const tokenTransfers = await this.getTokenTransfers(treasuryAddress, null, {
        offset: 1000
      });

      if (!balanceResult.success || !txHistory.success) {
        throw new Error('Failed to get treasury data');
      }

      // Calculate analytics
      const analytics = this.calculateTreasuryMetrics(
        balanceResult.balanceEth,
        txHistory.transactions,
        tokenTransfers.success ? tokenTransfers.transfers : []
      );

      return {
        success: true,
        treasury: treasuryAddress,
        analytics: {
          currentBalance: balanceResult.balanceEth,
          transactionCount: txHistory.count,
          tokenTransferCount: tokenTransfers.success ? tokenTransfers.count : 0,
          ...analytics
        }
      };

    } catch (error) {
      console.error('❌ Failed to get treasury analytics:', error.message);
      return {
        success: false,
        error: error.message,
        treasury: treasuryAddress
      };
    }
  }

  /**
   * Calculate treasury metrics from transaction data
   * 
   * @param {string} currentBalance - Current balance in ETH
   * @param {Array} transactions - Transaction history
   * @param {Array} tokenTransfers - Token transfer history
   * @returns {Object} Calculated metrics
   */
  calculateTreasuryMetrics(currentBalance, transactions, tokenTransfers) {
    // Calculate inbound and outbound ETH flows
    const inboundTx = transactions.filter(tx => tx.to.toLowerCase() === tx.to.toLowerCase());
    const outboundTx = transactions.filter(tx => tx.from.toLowerCase() === tx.from.toLowerCase());

    const totalInbound = inboundTx.reduce((sum, tx) => sum + parseFloat(tx.valueEth), 0);
    const totalOutbound = outboundTx.reduce((sum, tx) => sum + parseFloat(tx.valueEth), 0);

    // Calculate monthly activity (last 30 days)
    const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);
    const recentTx = transactions.filter(tx => tx.timeStamp > thirtyDaysAgo);

    return {
      totalInflow: totalInbound.toFixed(6),
      totalOutflow: totalOutbound.toFixed(6),
      netFlow: (totalInbound - totalOutbound).toFixed(6),
      monthlyTransactions: recentTx.length,
      avgTransactionValue: transactions.length > 0 
        ? ((totalInbound + totalOutbound) / transactions.length).toFixed(6) 
        : '0.000000',
      uniqueAddresses: [...new Set([
        ...transactions.map(tx => tx.from),
        ...transactions.map(tx => tx.to)
      ])].length
    };
  }

  /**
   * Get service status
   * 
   * @returns {Promise<Object>} Service status
   */
  async getStatus() {
    try {
      // Test API with a simple balance check
      const testResult = await this.getBalance('0x0000000000000000000000000000000000000000');
      
      return {
        status: 'operational',
        connected: true,
        apiEndpoint: this.baseUrl,
        apiKey: this.apiKey ? `${this.apiKey.slice(0, 8)}...` : 'Not configured',
        rateLimit: '5 calls/second',
        network: 'Arbitrum Sepolia'
      };

    } catch (error) {
      return {
        status: 'error',
        connected: false,
        error: error.message,
        apiEndpoint: this.baseUrl
      };
    }
  }
}

// Create singleton instance
const arbiscanService = new ArbiscanService();

module.exports = {
  ArbiscanService,
  arbiscanService,
  
  // Export convenience functions
  getBalance: (address) => arbiscanService.getBalance(address),
  getTransactionHistory: (address, options) => arbiscanService.getTransactionHistory(address, options),
  getTokenTransfers: (address, contract, options) => arbiscanService.getTokenTransfers(address, contract, options),
  getContractABI: (address) => arbiscanService.getContractABI(address),
  getTreasuryAnalytics: (address) => arbiscanService.getTreasuryAnalytics(address),
  getStatus: () => arbiscanService.getStatus()
};