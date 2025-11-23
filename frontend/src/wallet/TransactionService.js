/**
 * TransactionService.js
 * 
 * Service for handling blockchain transactions on Arbitrum Sepolia
 * Includes ETH transfers, contract interactions, and Stylus contract support
 */

import { ethers, parseEther, formatEther, formatUnits, parseUnits } from 'ethers';
import { GAS_CONFIG, TX_CONFIG, NetworkUtils } from './walletConfig.js';

/**
 * Transaction status enum
 */
export const TransactionStatus = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  FAILED: 'failed',
  TIMEOUT: 'timeout'
};

/**
 * Transaction error types
 */
export const TransactionError = {
  INSUFFICIENT_FUNDS: 'insufficient_funds',
  INSUFFICIENT_GAS: 'insufficient_gas',
  USER_REJECTED: 'user_rejected',
  INVALID_ADDRESS: 'invalid_address',
  INVALID_AMOUNT: 'invalid_amount',
  CONTRACT_ERROR: 'contract_error',
  NETWORK_ERROR: 'network_error',
  TIMEOUT: 'timeout',
  UNKNOWN: 'unknown'
};

/**
 * Main Transaction Service Class
 */
export class TransactionService {
  constructor(provider, signer) {
    this.provider = provider;
    this.signer = signer;
    this.gasMultiplier = 1.1; // 10% gas buffer
  }

  /**
   * Send ETH to another address
   * 
   * @param {string} to - Recipient address
   * @param {string|number} amount - Amount in ETH (will be converted to wei)
   * @param {Object} options - Transaction options
   * @returns {Promise<Object>} Transaction result
   */
  async sendETH(to, amount, options = {}) {
    try {
      // Validate inputs
      if (!ethers.isAddress(to)) {
        throw new Error(`Invalid recipient address: ${to}`);
      }

      if (!amount || amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      // Convert amount to wei
      const value = parseEther(amount.toString());

      // Get current gas price
      const feeData = await this.provider.getFeeData();
      
      // Prepare transaction
      const txConfig = {
        to,
        value,
        gasLimit: options.gasLimit || GAS_CONFIG.limits.transfer,
        ...options
      };

      // Add gas price if not provided
      if (!txConfig.gasPrice && !txConfig.maxFeePerGas) {
        if (feeData.maxFeePerGas) {
          txConfig.maxFeePerGas = feeData.maxFeePerGas;
          txConfig.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
        } else {
          txConfig.gasPrice = feeData.gasPrice;
        }
      }

      console.log('Sending ETH transaction:', txConfig);

      // Send transaction
      const tx = await this.signer.sendTransaction(txConfig);

      console.log(`ETH transfer initiated: ${tx.hash}`);

      return {
        success: true,
        hash: tx.hash,
        transaction: tx,
        amount: amount.toString(),
        to,
        status: TransactionStatus.PENDING,
        explorerUrl: NetworkUtils.getExplorerTxUrl(tx.hash)
      };

    } catch (error) {
      console.error('ETH transfer failed:', error);
      return this.handleTransactionError(error);
    }
  }

  /**
   * Send contract transaction
   * 
   * @param {string} contractAddress - Contract address
   * @param {Array} abi - Contract ABI
   * @param {string} method - Method name
   * @param {Array} args - Method arguments
   * @param {Object} options - Transaction options
   * @returns {Promise<Object>} Transaction result
   */
  async sendContractTx(contractAddress, abi, method, args = [], options = {}) {
    try {
      // Validate contract address
      if (!ethers.isAddress(contractAddress)) {
        throw new Error(`Invalid contract address: ${contractAddress}`);
      }

      // Create contract instance
      const contract = new ethers.Contract(contractAddress, abi, this.signer);

      // Check if method exists
      if (typeof contract[method] !== 'function') {
        throw new Error(`Method '${method}' not found in contract`);
      }

      // Estimate gas
      let gasLimit;
      try {
        gasLimit = await contract[method].estimateGas(...args, options);
        gasLimit = BigInt(Math.floor(Number(gasLimit) * this.gasMultiplier));
      } catch (gasError) {
        console.warn('Gas estimation failed, using default:', gasError.message);
        gasLimit = BigInt(options.gasLimit || GAS_CONFIG.limits.contractCall);
      }

      // Get gas price
      const feeData = await this.provider.getFeeData();

      // Prepare transaction options
      const txOptions = {
        gasLimit,
        ...options
      };

      // Add gas price if not provided
      if (!txOptions.gasPrice && !txOptions.maxFeePerGas) {
        if (feeData.maxFeePerGas) {
          txOptions.maxFeePerGas = feeData.maxFeePerGas;
          txOptions.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
        } else {
          txOptions.gasPrice = feeData.gasPrice;
        }
      }

      console.log('Sending contract transaction:', {
        contract: contractAddress,
        method,
        args,
        options: txOptions
      });

      // Send transaction
      const tx = await contract[method](...args, txOptions);

      console.log(`Contract transaction initiated: ${tx.hash}`);

      return {
        success: true,
        hash: tx.hash,
        transaction: tx,
        contract: contractAddress,
        method,
        args,
        status: TransactionStatus.PENDING,
        explorerUrl: NetworkUtils.getExplorerTxUrl(tx.hash)
      };

    } catch (error) {
      console.error('Contract transaction failed:', error);
      return this.handleTransactionError(error);
    }
  }

  /**
   * Call Stylus contract (WASM-based contracts)
   * Future integration point for ZK proof verification
   * 
   * @param {string} contractAddress - Stylus contract address
   * @param {Array} abi - Contract ABI
   * @param {string} method - Method name
   * @param {Array} args - Method arguments
   * @param {Object} zkProofData - Optional ZK proof data for verification
   * @param {Object} options - Transaction options
   * @returns {Promise<Object>} Transaction result
   */
  async callStylusContract(contractAddress, abi, method, args = [], zkProofData = null, options = {}) {
    try {
      console.log('Calling Stylus contract:', {
        contract: contractAddress,
        method,
        hasZkProof: !!zkProofData
      });

      // TODO: ZK Proof Integration Point
      // When ZK proofs are ready, they will be processed here:
      // 
      // if (zkProofData) {
      //   // Format ZK proof for Stylus contract
      //   const formattedProof = this.formatZkProofForStylus(zkProofData);
      //   args = [...args, formattedProof.proofBytes, formattedProof.publicInputs];
      // }

      // For now, use standard contract call
      return await this.sendContractTx(contractAddress, abi, method, args, {
        ...options,
        gasLimit: options.gasLimit || GAS_CONFIG.limits.zkProofSubmission
      });

    } catch (error) {
      console.error('Stylus contract call failed:', error);
      return this.handleTransactionError(error);
    }
  }

  /**
   * Wait for transaction confirmation
   * 
   * @param {string} txHash - Transaction hash
   * @param {number} confirmations - Required confirmations
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise<Object>} Transaction receipt
   */
  async waitForTx(txHash, confirmations = 1, timeout = TX_CONFIG.timeouts.confirmation) {
    try {
      console.log(`Waiting for transaction: ${txHash}`);

      // Wait for transaction with timeout
      const receipt = await Promise.race([
        this.provider.waitForTransaction(txHash, confirmations),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Transaction timeout')), timeout)
        )
      ]);

      if (!receipt) {
        throw new Error('Transaction receipt not found');
      }

      const success = receipt.status === 1;
      const result = {
        success,
        receipt,
        hash: txHash,
        status: success ? TransactionStatus.CONFIRMED : TransactionStatus.FAILED,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        explorerUrl: NetworkUtils.getExplorerTxUrl(txHash)
      };

      console.log(`Transaction ${success ? 'confirmed' : 'failed'}:`, result);
      return result;

    } catch (error) {
      console.error('Transaction wait failed:', error);
      
      if (error.message === 'Transaction timeout') {
        return {
          success: false,
          error: error.message,
          hash: txHash,
          status: TransactionStatus.TIMEOUT,
          explorerUrl: NetworkUtils.getExplorerTxUrl(txHash)
        };
      }

      return this.handleTransactionError(error);
    }
  }

  /**
   * Get balance of an address
   * 
   * @param {string} address - Address to check
   * @param {string} tokenAddress - Optional ERC20 token address
   * @returns {Promise<Object>} Balance information
   */
  async getBalance(address, tokenAddress = null) {
    try {
      if (!ethers.isAddress(address)) {
        throw new Error(`Invalid address: ${address}`);
      }

      if (tokenAddress) {
        // ERC20 token balance
        if (!ethers.isAddress(tokenAddress)) {
          throw new Error(`Invalid token address: ${tokenAddress}`);
        }

        // Standard ERC20 ABI for balance checking
        const erc20Abi = [
          'function balanceOf(address owner) view returns (uint256)',
          'function decimals() view returns (uint8)',
          'function symbol() view returns (string)'
        ];

        const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, this.provider);
        
        const [balance, decimals, symbol] = await Promise.all([
          tokenContract.balanceOf(address),
          tokenContract.decimals(),
          tokenContract.symbol()
        ]);

        const formatted = formatUnits(balance, decimals);

        return {
          success: true,
          balance: balance.toString(),
          formatted,
          decimals,
          symbol,
          address,
          tokenAddress,
          type: 'erc20'
        };

      } else {
        // Native ETH balance
        const balance = await this.provider.getBalance(address);
        const formatted = formatEther(balance);

        return {
          success: true,
          balance: balance.toString(),
          formatted,
          decimals: 18,
          symbol: 'ETH',
          address,
          type: 'native'
        };
      }

    } catch (error) {
      console.error('Balance check failed:', error);
      return {
        success: false,
        error: error.message,
        address,
        tokenAddress
      };
    }
  }

  /**
   * Get current gas prices
   * 
   * @returns {Promise<Object>} Gas price information
   */
  async getGasPrices() {
    try {
      const feeData = await this.provider.getFeeData();
      
      return {
        success: true,
        gasPrice: feeData.gasPrice?.toString(),
        maxFeePerGas: feeData.maxFeePerGas?.toString(),
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.toString(),
        formatted: {
          gasPrice: feeData.gasPrice ? formatUnits(feeData.gasPrice, 'gwei') + ' gwei' : null,
          maxFeePerGas: feeData.maxFeePerGas ? formatUnits(feeData.maxFeePerGas, 'gwei') + ' gwei' : null
        }
      };
    } catch (error) {
      console.error('Failed to get gas prices:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Format ZK proof data for Stylus contract (Future Implementation)
   * 
   * @param {Object} zkProofData - ZK proof data from noir circuits
   * @returns {Object} Formatted proof for contract
   */
  formatZkProofForStylus(zkProofData) {
    // TODO: Implement ZK proof formatting
    // This will format noir circuit outputs for Stylus contract verification
    // 
    // Expected input format from ShadowID ZK system:
    // {
    //   proof: "0x...",           // Hex-encoded proof bytes
    //   publicInputs: ["0x..."],  // Array of field elements
    //   circuitName: "composite_business_proof"
    // }
    //
    // Expected output format for Stylus:
    // {
    //   proofBytes: Uint8Array,   // Raw proof bytes
    //   publicInputs: Uint8Array  // Concatenated field elements
    // }

    console.log('ZK proof formatting (placeholder):', zkProofData);
    
    return {
      proofBytes: new Uint8Array(), // TODO: Convert hex proof to bytes
      publicInputs: new Uint8Array() // TODO: Format field elements
    };
  }

  /**
   * Handle transaction errors and categorize them
   * 
   * @param {Error} error - Transaction error
   * @returns {Object} Formatted error response
   */
  handleTransactionError(error) {
    let errorType = TransactionError.UNKNOWN;
    let message = error.message;

    // Categorize common errors
    if (error.code === 'INSUFFICIENT_FUNDS' || message.includes('insufficient funds')) {
      errorType = TransactionError.INSUFFICIENT_FUNDS;
      message = 'Insufficient funds for transaction';
    } else if (error.code === 'UNPREDICTABLE_GAS_LIMIT' || message.includes('gas')) {
      errorType = TransactionError.INSUFFICIENT_GAS;
      message = 'Insufficient gas for transaction';
    } else if (error.code === 4001 || message.includes('user rejected')) {
      errorType = TransactionError.USER_REJECTED;
      message = 'Transaction rejected by user';
    } else if (message.includes('invalid address')) {
      errorType = TransactionError.INVALID_ADDRESS;
    } else if (message.includes('network')) {
      errorType = TransactionError.NETWORK_ERROR;
    }

    console.error('Transaction error:', { errorType, message, originalError: error });

    return {
      success: false,
      error: message,
      errorType,
      code: error.code
    };
  }
}

/**
 * Utility functions for transaction handling
 */
export const TransactionUtils = {
  /**
   * Validate Ethereum address
   */
  isValidAddress(address) {
    return ethers.isAddress(address);
  },

  /**
   * Validate amount
   */
  isValidAmount(amount) {
    try {
      const parsed = parseFloat(amount);
      return !isNaN(parsed) && parsed > 0 && isFinite(parsed);
    } catch {
      return false;
    }
  },

  /**
   * Format address for display
   */
  formatAddress(address, length = 4) {
    if (!address) return '';
    return `${address.slice(0, 2 + length)}...${address.slice(-length)}`;
  },

  /**
   * Format transaction hash for display
   */
  formatTxHash(hash, length = 6) {
    if (!hash) return '';
    return `${hash.slice(0, 2 + length)}...${hash.slice(-length)}`;
  },

  /**
   * Convert wei to ETH
   */
  weiToEth(wei) {
    return formatEther(wei);
  },

  /**
   * Convert ETH to wei
   */
  ethToWei(eth) {
    return parseEther(eth.toString());
  },

  /**
   * Format ETH amount for display
   */
  formatEthAmount(amount, decimals = 6) {
    const num = parseFloat(amount);
    return num.toFixed(decimals);
  }
};

// Re-export ethers utilities for convenience
export { parseEther, formatEther, parseUnits, formatUnits };

export default TransactionService;