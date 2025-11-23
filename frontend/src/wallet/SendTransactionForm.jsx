/**
 * SendTransactionForm.jsx
 * 
 * UI Component for sending ETH transactions
 * Includes validation, transaction handling, and status tracking
 */

import React, { useState, useEffect } from 'react';
import { useWallet } from './WalletContext.jsx';
import { TransactionService, TransactionUtils, TransactionStatus } from './TransactionService.js';

/**
 * SendTransactionForm Component
 */
export function SendTransactionForm({ onTransactionComplete, className = '' }) {
  const { provider, signer, account, isConnected, isCorrectNetwork } = useWallet();
  
  // Form state
  const [formData, setFormData] = useState({
    to: '',
    amount: '',
    gasLimit: '',
    note: ''
  });

  // Validation state
  const [errors, setErrors] = useState({});
  const [isValidForm, setIsValidForm] = useState(false);

  // Transaction state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transaction, setTransaction] = useState(null);
  const [transactionStatus, setTransactionStatus] = useState(null);

  // Balance and gas state
  const [balance, setBalance] = useState(null);
  const [gasPrice, setGasPrice] = useState(null);
  const [estimatedFee, setEstimatedFee] = useState(null);

  // Transaction service instance
  const [txService, setTxService] = useState(null);

  // Initialize transaction service
  useEffect(() => {
    if (provider && signer) {
      setTxService(new TransactionService(provider, signer));
    }
  }, [provider, signer]);

  // Load balance and gas prices
  useEffect(() => {
    if (txService && account && isConnected) {
      loadBalanceAndGas();
    }
  }, [txService, account, isConnected]);

  // Load balance and gas prices
  const loadBalanceAndGas = async () => {
    try {
      const [balanceResult, gasPrices] = await Promise.all([
        txService.getBalance(account),
        txService.getGasPrices()
      ]);

      if (balanceResult.success) {
        setBalance(balanceResult.formatted);
      }

      if (gasPrices.success) {
        setGasPrice(gasPrices.formatted.gasPrice || gasPrices.formatted.maxFeePerGas);
      }
    } catch (error) {
      console.error('Failed to load balance and gas:', error);
    }
  };

  // Calculate estimated fee
  useEffect(() => {
    if (gasPrice && formData.amount) {
      const gasLimit = formData.gasLimit || '21000';
      const gasPriceWei = parseFloat(gasPrice) * 1e9; // Convert gwei to wei
      const feeWei = parseInt(gasLimit) * gasPriceWei;
      const feeEth = (feeWei / 1e18).toFixed(6);
      setEstimatedFee(feeEth);
    }
  }, [gasPrice, formData.gasLimit, formData.amount]);

  // Handle form input changes
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear specific error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Validate form
  useEffect(() => {
    const newErrors = {};

    // Validate recipient address
    if (formData.to) {
      if (!TransactionUtils.isValidAddress(formData.to)) {
        newErrors.to = 'Invalid Ethereum address';
      } else if (formData.to.toLowerCase() === account?.toLowerCase()) {
        newErrors.to = 'Cannot send to yourself';
      }
    } else if (formData.to === '') {
      // Required field
      newErrors.to = 'Recipient address is required';
    }

    // Validate amount
    if (formData.amount) {
      if (!TransactionUtils.isValidAmount(formData.amount)) {
        newErrors.amount = 'Invalid amount';
      } else {
        const amount = parseFloat(formData.amount);
        const currentBalance = parseFloat(balance || '0');
        const fee = parseFloat(estimatedFee || '0');
        
        if (amount + fee > currentBalance) {
          newErrors.amount = `Insufficient balance (need ${(amount + fee).toFixed(6)} ETH)`;
        }
      }
    } else if (formData.amount === '') {
      newErrors.amount = 'Amount is required';
    }

    // Validate gas limit (optional)
    if (formData.gasLimit) {
      const gasLimit = parseInt(formData.gasLimit);
      if (isNaN(gasLimit) || gasLimit < 21000) {
        newErrors.gasLimit = 'Gas limit must be at least 21000';
      }
    }

    setErrors(newErrors);
    setIsValidForm(Object.keys(newErrors).length === 0 && formData.to && formData.amount);
  }, [formData, balance, estimatedFee, account]);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isValidForm || !txService) {
      return;
    }

    setIsSubmitting(true);
    setTransaction(null);
    setTransactionStatus(null);

    try {
      // Send transaction
      const result = await txService.sendETH(
        formData.to,
        formData.amount,
        formData.gasLimit ? { gasLimit: parseInt(formData.gasLimit) } : {}
      );

      if (result.success) {
        setTransaction(result);
        setTransactionStatus(TransactionStatus.PENDING);

        // Wait for confirmation
        const confirmation = await txService.waitForTx(result.hash);
        
        if (confirmation.success) {
          setTransactionStatus(TransactionStatus.CONFIRMED);
          
          // Reload balance
          loadBalanceAndGas();
          
          // Clear form on success
          setFormData({
            to: '',
            amount: '',
            gasLimit: '',
            note: ''
          });

          // Notify parent component
          if (onTransactionComplete) {
            onTransactionComplete(confirmation);
          }
        } else {
          setTransactionStatus(TransactionStatus.FAILED);
        }
      } else {
        console.error('Transaction failed:', result);
        setErrors({ submit: result.error });
      }

    } catch (error) {
      console.error('Transaction submission failed:', error);
      setErrors({ submit: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      to: '',
      amount: '',
      gasLimit: '',
      note: ''
    });
    setErrors({});
    setTransaction(null);
    setTransactionStatus(null);
  };

  // Set max amount (balance - fee)
  const setMaxAmount = () => {
    if (balance && estimatedFee) {
      const maxAmount = Math.max(0, parseFloat(balance) - parseFloat(estimatedFee));
      handleInputChange('amount', maxAmount.toFixed(6));
    }
  };

  if (!isConnected) {
    return (
      <div className={`send-transaction-form ${className}`}>
        <div className="p-6 text-center text-gray-600">
          <div className="mb-4">
            <svg className="w-12 h-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <p>Connect your wallet to send transactions</p>
        </div>
      </div>
    );
  }

  if (!isCorrectNetwork) {
    return (
      <div className={`send-transaction-form ${className}`}>
        <div className="p-6 text-center text-yellow-600 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="mb-4">
            <svg className="w-12 h-12 mx-auto text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p>Switch to Arbitrum Sepolia to send transactions</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`send-transaction-form bg-white border border-gray-200 rounded-lg ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900">Send ETH</h3>
        {balance && (
          <p className="text-sm text-gray-600 mt-1">
            Balance: {balance} ETH
          </p>
        )}
      </div>

      {/* Transaction Status */}
      {transaction && (
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            {transactionStatus === TransactionStatus.PENDING && (
              <div className="flex items-center gap-2 text-blue-600">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                  <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
                <span className="text-sm font-medium">Transaction Pending</span>
              </div>
            )}
            
            {transactionStatus === TransactionStatus.CONFIRMED && (
              <div className="flex items-center gap-2 text-green-600">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium">Transaction Confirmed</span>
              </div>
            )}
            
            {transactionStatus === TransactionStatus.FAILED && (
              <div className="flex items-center gap-2 text-red-600">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium">Transaction Failed</span>
              </div>
            )}
          </div>
          
          {transaction && (
            <div className="mt-2 text-sm text-gray-600">
              <span>Hash: </span>
              <a 
                href={transaction.explorerUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 font-mono"
              >
                {TransactionUtils.formatTxHash(transaction.hash)}
              </a>
            </div>
          )}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        {/* Recipient Address */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Recipient Address
          </label>
          <input
            type="text"
            value={formData.to}
            onChange={(e) => handleInputChange('to', e.target.value)}
            placeholder="0x..."
            className={`
              w-full px-3 py-2 border rounded-lg font-mono text-sm
              ${errors.to 
                ? 'border-red-300 bg-red-50 text-red-900' 
                : 'border-gray-300 bg-white text-gray-900'
              }
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            `}
            disabled={isSubmitting}
          />
          {errors.to && (
            <p className="mt-1 text-sm text-red-600">{errors.to}</p>
          )}
        </div>

        {/* Amount */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium text-gray-700">
              Amount (ETH)
            </label>
            {balance && (
              <button
                type="button"
                onClick={setMaxAmount}
                className="text-xs text-blue-600 hover:text-blue-800"
                disabled={isSubmitting}
              >
                Use Max
              </button>
            )}
          </div>
          <input
            type="number"
            step="0.000001"
            min="0"
            value={formData.amount}
            onChange={(e) => handleInputChange('amount', e.target.value)}
            placeholder="0.0"
            className={`
              w-full px-3 py-2 border rounded-lg text-sm
              ${errors.amount 
                ? 'border-red-300 bg-red-50 text-red-900' 
                : 'border-gray-300 bg-white text-gray-900'
              }
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            `}
            disabled={isSubmitting}
          />
          {errors.amount && (
            <p className="mt-1 text-sm text-red-600">{errors.amount}</p>
          )}
        </div>

        {/* Advanced Options */}
        <details className="border border-gray-200 rounded-lg">
          <summary className="px-3 py-2 cursor-pointer text-sm font-medium text-gray-700 bg-gray-50 rounded-t-lg">
            Advanced Options
          </summary>
          <div className="p-3 space-y-3 border-t border-gray-200">
            {/* Gas Limit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gas Limit (optional)
              </label>
              <input
                type="number"
                min="21000"
                value={formData.gasLimit}
                onChange={(e) => handleInputChange('gasLimit', e.target.value)}
                placeholder="21000"
                className={`
                  w-full px-3 py-2 border rounded-lg text-sm
                  ${errors.gasLimit 
                    ? 'border-red-300 bg-red-50 text-red-900' 
                    : 'border-gray-300 bg-white text-gray-900'
                  }
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                `}
                disabled={isSubmitting}
              />
              {errors.gasLimit && (
                <p className="mt-1 text-sm text-red-600">{errors.gasLimit}</p>
              )}
            </div>

            {/* Note */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Note (optional)
              </label>
              <input
                type="text"
                value={formData.note}
                onChange={(e) => handleInputChange('note', e.target.value)}
                placeholder="Transaction note..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isSubmitting}
              />
            </div>
          </div>
        </details>

        {/* Fee Estimation */}
        {estimatedFee && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <div className="text-sm text-gray-700">
              <div className="flex justify-between">
                <span>Estimated Fee:</span>
                <span className="font-medium">{estimatedFee} ETH</span>
              </div>
              {formData.amount && (
                <div className="flex justify-between mt-1">
                  <span>Total Cost:</span>
                  <span className="font-medium">
                    {(parseFloat(formData.amount) + parseFloat(estimatedFee)).toFixed(6)} ETH
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Submit Error */}
        {errors.submit && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {errors.submit}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={!isValidForm || isSubmitting}
            className={`
              flex-1 py-2 px-4 rounded-lg font-medium text-sm
              ${isValidForm && !isSubmitting
                ? 'bg-blue-500 hover:bg-blue-600 text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }
              transition-colors duration-200
            `}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                  <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
                Sending...
              </span>
            ) : (
              'Send Transaction'
            )}
          </button>
          
          <button
            type="button"
            onClick={resetForm}
            disabled={isSubmitting}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 hover:border-gray-400 rounded-lg text-sm transition-colors duration-200"
          >
            Reset
          </button>
        </div>
      </form>
    </div>
  );
}

export default SendTransactionForm;