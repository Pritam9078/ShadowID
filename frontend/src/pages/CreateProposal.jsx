import React, { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useChainId } from 'wagmi';
import { useNavigate } from 'react-router-dom';
import { encodeFunctionData, parseEther } from 'viem';
import { 
  Loader2, 
  Upload, 
  Wallet, 
  CheckCircle, 
  AlertCircle, 
  X, 
  Plus, 
  Trash2,
  ArrowLeft
} from 'lucide-react';

import { CONTRACTS, LOCALHOST_ADDRESSES, SEPOLIA_ADDRESSES } from '../config/contracts';
import { DAO_CONTRACT_ADDRESS } from '../config.js';
import { DAO_ABI, TREASURY_ABI } from '../config/abis';
import PinataService from '../services/ipfs';
import IPFSFileUpload from '../components/IPFSFileUpload';

export default function CreateProposal() {
  const { address: walletAddress, isConnected } = useAccount();
  const chainId = useChainId();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    proposalType: 'poll',
    category: 'Treasury',
    funding: '',
    deadline: '',
    target: '',
    value: '',
    calldata: '',
    file: null,
    options: ['', ''],
    attachments: [],
    // Treasury withdrawal specific fields
    recipientAddress: '',
    withdrawAmount: '',
    // Token transfer specific fields
    tokenAddress: '',
    tokenAmount: '',
    tokenRecipient: '',
    tokenDecimals: '',
    tokenSymbol: '',
    // Custom action specific fields
    contractAddress: '',
    functionName: '',
    functionParams: [],
    contractValue: '',
    customCalldata: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [fileName, setFileName] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [estimatedGas, setEstimatedGas] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: '' });

  const { writeContract: createProposal, data: hash, isPending, error: writeError } = useWriteContract({
    mutation: {
      onSuccess: (data) => {
        console.log('[DVote] Transaction sent successfully:', data);
        showToast('Transaction sent! Waiting for confirmation...', 'info');
      },
      onError: (error) => {
        console.error('[DVote] Transaction failed:', error);
        if (error.message?.includes('User rejected')) {
          showToast('Transaction was rejected in wallet', 'error');
        } else if (error.message?.includes('insufficient funds')) {
          showToast('Insufficient funds for transaction', 'error');
        } else {
          showToast(`Transaction failed: ${error.message}`, 'error');
        }
      }
    }
  });
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    console.log('[DVote] CreateProposal component mounted');
    console.log('[DVote] Contract addresses:', CONTRACTS);
    console.log('[DVote] DAO ABI check:', {
      type: typeof DAO_ABI,
      isArray: Array.isArray(DAO_ABI),
      length: DAO_ABI?.length,
      sample: DAO_ABI?.slice(0, 2)
    });
    
    if (isConnected && walletAddress) {
      estimateGasFee();
    }
  }, [isConnected, walletAddress]);

  // Handle transaction confirmation
  useEffect(() => {
    if (isConfirmed) {
      showToast('🎉 Proposal created and confirmed on blockchain!', 'success');
      setTimeout(() => {
        navigate('/proposals');
      }, 2000);
    }
  }, [isConfirmed, navigate]);

  const showToast = (message, type = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: '' }), 5000);
  };

  const estimateGasFee = async () => {
    try {
      if (typeof window.ethereum !== 'undefined') {
        const gasPrice = await window.ethereum.request({ method: 'eth_gasPrice' });
        const estimatedGasUnits = 300000; // Reduced from 150000 to account for proposal creation
        const gasPriceInWei = parseInt(gasPrice, 16);
        const estimatedCost = (gasPriceInWei * estimatedGasUnits) / 1e18;
        setEstimatedGas(estimatedCost.toFixed(6));
        console.log('[DVote] Gas estimation:', {
          gasPrice: gasPriceInWei,
          gasUnits: estimatedGasUnits,
          totalCost: estimatedCost.toFixed(6)
        });
      }
    } catch (error) {
      console.error('Gas estimation error:', error);
    }
  };

  const proposalTypes = [
    {
      id: 'poll',
      name: 'Poll Proposal',
      description: 'Community poll with multiple voting options'
    },
    {
      id: 'simple',
      name: 'Simple Proposal',
      description: 'A basic proposal without any on-chain actions'
    },
    {
      id: 'treasury-withdrawal',
      name: 'Treasury Withdrawal',
      description: 'Withdraw ETH from the DAO treasury'
    },
    {
      id: 'treasury-token',
      name: 'Token Transfer',
      description: 'Transfer ERC20 tokens from treasury'
    },
    {
      id: 'custom',
      name: 'Custom Action',
      description: 'Execute custom smart contract call'
    }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData(prev => ({
      ...prev,
      options: newOptions
    }));
    if (errors.options) {
      setErrors(prev => ({
        ...prev,
        options: ''
      }));
    }
  };

  const addOption = () => {
    if (formData.options.length < 10) {
      setFormData(prev => ({
        ...prev,
        options: [...prev.options, '']
      }));
    } else {
      showToast('Maximum 10 options allowed', 'warning');
    }
  };

  const removeOption = (index) => {
    if (formData.options.length > 2) {
      const newOptions = formData.options.filter((_, i) => i !== index);
      setFormData(prev => ({
        ...prev,
        options: newOptions
      }));
    } else {
      showToast('Minimum 2 options required', 'warning');
    }
  };

  const handleProposalTypeChange = (type) => {
    setFormData(prev => ({
      ...prev,
      proposalType: type,
      target: type === 'treasury-withdrawal' || type === 'treasury-token' ? CONTRACTS.Treasury.address : '',
      calldata: '',
      // Reset type-specific fields
      recipientAddress: '',
      withdrawAmount: '',
      tokenAddress: '',
      tokenAmount: '',
      tokenRecipient: '',
      tokenDecimals: '',
      tokenSymbol: '',
      contractAddress: '',
      functionName: '',
      functionParams: [],
      contractValue: '',
      customCalldata: ''
    }));
  };

  // Render form fields based on proposal type
  const renderProposalTypeFields = () => {
    switch (formData.proposalType) {
      case 'poll':
        return (
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-semibold text-gray-700">
                Voting Options <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={addOption}
                className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 font-semibold"
              >
                <Plus className="w-4 h-4" />
                Add Option
              </button>
            </div>
            
            <div className="space-y-3">
              {formData.options.map((option, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-semibold flex-shrink-0">
                    {index + 1}
                  </div>
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  />
                  {formData.options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOption(index)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            
            {errors.options && (
              <p className="text-red-500 text-sm mt-2 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.options}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-2">
              Add 2-10 options for members to vote on. Each vote counts toward the chosen option.
            </p>
          </div>
        );

      case 'treasury-withdrawal':
        return (
          <div className="space-y-6">
            {/* Description for treasury withdrawal */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Withdrawal Justification <span className="text-red-500">*</span>
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Explain why this withdrawal is necessary and how the funds will be used..."
                rows={4}
                className={`w-full px-4 py-3 border ${errors.description ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none`}
              />
              {errors.description && (
                <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.description}
                </p>
              )}
            </div>

            {/* Recipient Address */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Recipient Address <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="recipientAddress"
                value={formData.recipientAddress}
                onChange={handleInputChange}
                placeholder="0x742d35Cc6644C4532B69d44B85688Ba1e055c07A"
                className={`w-full px-4 py-3 border ${errors.recipientAddress ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-mono`}
              />
              {errors.recipientAddress && (
                <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.recipientAddress}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                The Ethereum address that will receive the withdrawn ETH
              </p>
            </div>
            
            {/* Withdrawal Amount */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Withdrawal Amount (ETH) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="withdrawAmount"
                value={formData.withdrawAmount}
                onChange={handleInputChange}
                placeholder="1.5"
                step="0.001"
                min="0"
                className={`w-full px-4 py-3 border ${errors.withdrawAmount ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all`}
              />
              {errors.withdrawAmount && (
                <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.withdrawAmount}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Amount in ETH to withdraw from the treasury
              </p>
            </div>
          </div>
        );

      case 'treasury-token':
        return (
          <div className="space-y-6">
            {/* Description for token transfer */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Token Transfer Justification <span className="text-red-500">*</span>
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Explain why this token transfer is necessary and how the tokens will be used..."
                rows={4}
                className={`w-full px-4 py-3 border ${errors.description ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none`}
              />
              {errors.description && (
                <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.description}
                </p>
              )}
            </div>

            {/* Token Address */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Token Contract Address <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="tokenAddress"
                value={formData.tokenAddress}
                onChange={handleInputChange}
                placeholder="0xA0b86991c431C24b363AEd556e6C90440395D433"
                className={`w-full px-4 py-3 border ${errors.tokenAddress ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-mono`}
              />
              {errors.tokenAddress && (
                <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.tokenAddress}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                The contract address of the ERC20 token to transfer
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Token Symbol */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Token Symbol
                </label>
                <input
                  type="text"
                  name="tokenSymbol"
                  value={formData.tokenSymbol}
                  onChange={handleInputChange}
                  placeholder="USDC"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Token symbol (e.g., USDC, DAI)
                </p>
              </div>

              {/* Token Decimals */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Token Decimals
                </label>
                <input
                  type="number"
                  name="tokenDecimals"
                  value={formData.tokenDecimals}
                  onChange={handleInputChange}
                  placeholder="18"
                  min="0"
                  max="18"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Usually 18 for most tokens
                </p>
              </div>
            </div>
            
            {/* Recipient Address */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Recipient Address <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="tokenRecipient"
                value={formData.tokenRecipient}
                onChange={handleInputChange}
                placeholder="0x742d35Cc6644C4532B69d44B85688Ba1e055c07A"
                className={`w-full px-4 py-3 border ${errors.tokenRecipient ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-mono`}
              />
              {errors.tokenRecipient && (
                <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.tokenRecipient}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                The address that will receive the tokens
              </p>
            </div>
            
            {/* Token Amount */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Token Amount <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="tokenAmount"
                value={formData.tokenAmount}
                onChange={handleInputChange}
                placeholder="1000"
                step="0.000001"
                min="0"
                className={`w-full px-4 py-3 border ${errors.tokenAmount ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all`}
              />
              {errors.tokenAmount && (
                <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.tokenAmount}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Amount of tokens to transfer (in token units, not wei)
              </p>
            </div>
          </div>
        );

      case 'custom':
        return (
          <div className="space-y-6">
            {/* Description for custom action */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Custom Action Description <span className="text-red-500">*</span>
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Describe what this custom smart contract call will do and why it's needed..."
                rows={4}
                className={`w-full px-4 py-3 border ${errors.description ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none`}
              />
              {errors.description && (
                <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.description}
                </p>
              )}
            </div>

            {/* Contract Address */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Target Contract Address <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="contractAddress"
                value={formData.contractAddress}
                onChange={handleInputChange}
                placeholder="0x742d35Cc6644C4532B69d44B85688Ba1e055c07A"
                className={`w-full px-4 py-3 border ${errors.contractAddress ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-mono`}
              />
              {errors.contractAddress && (
                <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.contractAddress}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Address of the smart contract to interact with
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Function Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Function Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="functionName"
                  value={formData.functionName}
                  onChange={handleInputChange}
                  placeholder="transfer"
                  className={`w-full px-4 py-3 border ${errors.functionName ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-mono`}
                />
                {errors.functionName && (
                  <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.functionName}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Name of the function to call
                </p>
              </div>

              {/* ETH Value */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  ETH Value (Optional)
                </label>
                <input
                  type="number"
                  name="contractValue"
                  value={formData.contractValue}
                  onChange={handleInputChange}
                  placeholder="0.0"
                  step="0.001"
                  min="0"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                />
                <p className="text-xs text-gray-500 mt-1">
                  ETH to send with the transaction
                </p>
              </div>
            </div>
            
            {/* Custom Calldata */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Function Calldata <span className="text-red-500">*</span>
              </label>
              <textarea
                name="customCalldata"
                value={formData.customCalldata}
                onChange={handleInputChange}
                placeholder="0x095ea7b3000000000000000000000000742d35cc6644c4532b69d44b85688ba1e055c07a0000000000000000000000000000000000000000000000000de0b6b3a7640000"
                rows={4}
                className={`w-full px-4 py-3 border ${errors.customCalldata ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none font-mono text-sm`}
              />
              {errors.customCalldata && (
                <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.customCalldata}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Encoded function call data. Use tools like Etherscan or Remix to generate calldata.
              </p>
            </div>
          </div>
        );

      default:
        return (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Provide a detailed description of your proposal..."
              rows={4}
              className={`w-full px-4 py-3 border ${errors.description ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all resize-none`}
            />
            {errors.description && (
              <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {errors.description}
              </p>
            )}
          </div>
        );
    }
  };

  const generateCalldata = () => {
    const { proposalType } = formData;
    
    switch (proposalType) {
      case 'treasury-withdrawal':
        if (!formData.recipientAddress || !formData.withdrawAmount) return '';
        try {
          return encodeFunctionData({
            abi: TREASURY_ABI,
            functionName: 'withdrawETH',
            args: [formData.recipientAddress, parseEther(formData.withdrawAmount)]
          });
        } catch (error) {
          console.error('Error generating treasury withdrawal calldata:', error);
          return '';
        }
      
      case 'treasury-token':
        if (!formData.tokenAddress || !formData.tokenRecipient || !formData.tokenAmount) return '';
        try {
          // Generate calldata for ERC20 token transfer from treasury
          const decimals = formData.tokenDecimals || 18;
          const amount = parseFloat(formData.tokenAmount) * Math.pow(10, decimals);
          
          return encodeFunctionData({
            abi: TREASURY_ABI,
            functionName: 'transferToken',
            args: [
              formData.tokenAddress,
              formData.tokenRecipient,
              BigInt(Math.floor(amount))
            ]
          });
        } catch (error) {
          console.error('Error generating token transfer calldata:', error);
          return '';
        }

      case 'custom':
        return formData.customCalldata || '0x';
      
      case 'simple':
      case 'poll':
        return '0x';
      
      default:
        return '0x';
    }
  };

  const getProposalTarget = () => {
    switch (formData.proposalType) {
      case 'treasury-withdrawal':
      case 'treasury-token':
        return CONTRACTS.Treasury.address;
      case 'custom':
        return formData.contractAddress;
      default:
        return '0x0000000000000000000000000000000000000000';
    }
  };

  const getProposalValue = () => {
    switch (formData.proposalType) {
      case 'treasury-withdrawal':
        return formData.withdrawAmount || '0';
      case 'custom':
        return formData.contractValue || '0';
      default:
        return '0';
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        showToast('File size must be less than 10MB', 'error');
        return;
      }
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        showToast('Only PDF and image files are allowed', 'error');
        return;
      }
      setFormData(prev => ({
        ...prev,
        file: file
      }));
      setFileName(file.name);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Title validation (required for all types)
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.length < 5 || formData.title.length > 100) {
      newErrors.title = 'Title must be between 5-100 characters';
    }

    // Proposal type specific validations
    switch (formData.proposalType) {
      case 'poll':
        // Poll options validation
        const filledOptions = formData.options.filter(opt => opt.trim() !== '');
        if (filledOptions.length < 2) {
          newErrors.options = 'At least 2 voting options are required';
        }

        const uniqueOptions = new Set(filledOptions.map(opt => opt.trim().toLowerCase()));
        if (uniqueOptions.size !== filledOptions.length) {
          newErrors.options = 'All options must be unique';
        }

        formData.options.forEach((opt, index) => {
          if (opt.trim() && (opt.length < 2 || opt.length > 100)) {
            newErrors.options = 'Each option must be between 2-100 characters';
          }
        });
        break;

      case 'treasury-withdrawal':
        // Description validation
        if (!formData.description.trim()) {
          newErrors.description = 'Withdrawal justification is required';
        }

        // Recipient address validation
        if (!formData.recipientAddress.trim()) {
          newErrors.recipientAddress = 'Recipient address is required';
        } else if (!formData.recipientAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
          newErrors.recipientAddress = 'Please enter a valid Ethereum address';
        }

        // Withdrawal amount validation
        if (!formData.withdrawAmount) {
          newErrors.withdrawAmount = 'Withdrawal amount is required';
        } else if (parseFloat(formData.withdrawAmount) <= 0) {
          newErrors.withdrawAmount = 'Amount must be greater than 0';
        }
        break;

      case 'treasury-token':
        // Description validation
        if (!formData.description.trim()) {
          newErrors.description = 'Token transfer justification is required';
        }

        // Token address validation
        if (!formData.tokenAddress.trim()) {
          newErrors.tokenAddress = 'Token contract address is required';
        } else if (!formData.tokenAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
          newErrors.tokenAddress = 'Please enter a valid contract address';
        }

        // Token recipient validation
        if (!formData.tokenRecipient.trim()) {
          newErrors.tokenRecipient = 'Recipient address is required';
        } else if (!formData.tokenRecipient.match(/^0x[a-fA-F0-9]{40}$/)) {
          newErrors.tokenRecipient = 'Please enter a valid Ethereum address';
        }

        // Token amount validation
        if (!formData.tokenAmount) {
          newErrors.tokenAmount = 'Token amount is required';
        } else if (parseFloat(formData.tokenAmount) <= 0) {
          newErrors.tokenAmount = 'Amount must be greater than 0';
        }
        break;

      case 'custom':
        // Description validation
        if (!formData.description.trim()) {
          newErrors.description = 'Custom action description is required';
        }

        // Contract address validation
        if (!formData.contractAddress.trim()) {
          newErrors.contractAddress = 'Target contract address is required';
        } else if (!formData.contractAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
          newErrors.contractAddress = 'Please enter a valid contract address';
        }

        // Function name validation
        if (!formData.functionName.trim()) {
          newErrors.functionName = 'Function name is required';
        }

        // Calldata validation
        if (!formData.customCalldata.trim()) {
          newErrors.customCalldata = 'Function calldata is required';
        } else if (!formData.customCalldata.startsWith('0x')) {
          newErrors.customCalldata = 'Calldata must start with 0x';
        }
        break;

      default:
        // Default description validation
        if (!formData.description.trim()) {
          newErrors.description = 'Description is required';
        }
        break;
    }

    // Common validations for all types
    if (!formData.deadline) {
      newErrors.deadline = 'Voting deadline is required';
    } else {
      const selectedDate = new Date(formData.deadline);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate <= today) {
        newErrors.deadline = 'Deadline must be in the future';
      }
    }

    // Funding validation (optional field)
    if (formData.funding && (isNaN(formData.funding) || parseFloat(formData.funding) <= 0)) {
      newErrors.funding = 'Funding must be a positive number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const togglePreview = () => {
    if (!showPreview && !validateForm()) {
      showToast('Please fill in all required fields correctly', 'error');
      return;
    }
    setShowPreview(!showPreview);
  };

  const createProposalMetadata = async () => {
    const metadata = {
      title: formData.title,
      description: formData.description,
      proposalType: formData.proposalType,
      attachments: formData.attachments,
      creator: walletAddress,
      creatorAddress: walletAddress,
      walletConnected: isConnected,
      createdAt: new Date().toISOString(),
      createdAtTimestamp: Math.floor(Date.now() / 1000),
      blockchainNetwork: 'localhost',
      target: formData.target,
      value: formData.value,
      version: "2.0",
      metadataStandard: "DAO-Proposal-v2",
      activityLog: [
        {
          action: "proposal_created",
          timestamp: new Date().toISOString(),
          actor: walletAddress,
          details: {
            proposalType: formData.proposalType,
            hasAttachments: formData.attachments.length > 0,
            targetAddress: formData.target || null,
            valueRequested: formData.value || null
          }
        }
      ]
    };

    console.log('📝 Creating proposal metadata with wallet info:', {
      creator: walletAddress,
      proposalType: formData.proposalType,
      timestamp: metadata.createdAt
    });

    const result = await PinataService.pinJSON(
      metadata, 
      `dao-proposal-${walletAddress.slice(0, 6)}-${Date.now()}`
    );

    if (result.success) {
      console.log('✅ Proposal metadata uploaded to IPFS:', {
        ipfsHash: result.ipfsHash,
        creator: walletAddress,
        url: result.url
      });
      return result.ipfsHash;
    } else {
      throw new Error('Failed to upload proposal metadata to IPFS');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    console.log('[DVote] ========== PROPOSAL SUBMISSION STARTED ==========');
    console.log('[DVote] Event:', e);
    console.log('[DVote] Form submitted - starting validation...');
    
    if (!isConnected || !walletAddress) {
      console.log('[DVote] ❌ Wallet not connected');
      showToast('Please connect your wallet to create proposals', 'error');
      return;
    }

    console.log('[DVote] ✅ Wallet connected:', { walletAddress, chainId });

    // Get current network and expected addresses - use the working DAO address
    const currentDAO = DAO_CONTRACT_ADDRESS; // Use the original working address
    const currentChainId = chainId;
    
    console.log('[DVote] Current state:', {
      currentDAO,
      currentChainId,
      isLocalhost: currentChainId === 31337,
      isArbitrumSepolia: currentChainId === 421614,
      contractsObject: CONTRACTS
    });

    // Validate network - support both localhost and Arbitrum Sepolia
    if (currentChainId !== 31337 && currentChainId !== 421614) {
      console.log('[DVote] ❌ Wrong network:', currentChainId);
      showToast('Please switch to localhost (31337) or Arbitrum Sepolia (421614) network in your wallet.', 'error');
      return;
    }

    // Validate contract address
    if (!currentDAO || currentDAO === '0x0000000000000000000000000000000000000000') {
      console.log('[DVote] ❌ Invalid DAO address:', currentDAO);
      showToast('DAO contract address is not available. Please check network configuration.', 'error');
      return;
    }

    console.log('[DVote] ✅ Network validation passed - proceeding with proposal creation...');

    // Additional network validation - force refresh contract addresses
    console.log('[DVote] Current contract addresses:', {
      currentDAO,
      localhostDAO: LOCALHOST_ADDRESSES.DAO,
      sepoliaDAO: SEPOLIA_ADDRESSES.DAO,
      expectedForNetwork: currentChainId === 31337 ? LOCALHOST_ADDRESSES.DAO : SEPOLIA_ADDRESSES.DAO
    });
    
    // Ensure we're using the correct contract address for the network
    let finalContractAddress = currentDAO;
    if (currentChainId === 31337) {
      finalContractAddress = LOCALHOST_ADDRESSES.DAO;
      console.log('[DVote] 🔄 Forcing localhost DAO address:', finalContractAddress);
    } else if (currentChainId === 421614) {
      // Use the main DAO address for Arbitrum Sepolia
      finalContractAddress = currentDAO; 
      console.log('[DVote] 🔄 Using Arbitrum Sepolia DAO address:', finalContractAddress);
    }

    if (!validateForm()) {
      console.log('[DVote] ❌ Form validation failed');
      showToast('Please fix the errors in the form', 'error');
      return;
    }

      console.log('[DVote] ✅ Form validation passed');
      
      // Validate ABI before proceeding
      if (!DAO_ABI || !Array.isArray(DAO_ABI)) {
        console.error('[DVote] ❌ Invalid DAO ABI:', DAO_ABI);
        showToast('Contract ABI is not loaded properly. Please refresh the page.', 'error');
        setIsSubmitting(false);
        return;
      }
      
      console.log('[DVote] ✅ ABI validation passed:', {
        abiLength: DAO_ABI.length,
        hasCreateProposal: DAO_ABI.some(fn => fn.name === 'createProposal')
      });
      
      setIsSubmitting(true);    try {
      let ipfsHash = '';
      const { title, description, proposalType } = formData;

      console.log('[DVote] Form validation passed - processing proposal...');

      // Handle file upload if needed
      if (formData.file) {
        showToast('Uploading file to IPFS...', 'info');
        console.log('[DVote] Uploading file to IPFS...');
        const result = await PinataService.pinFile(formData.file, `proposal-attachment-${Date.now()}`);
        if (result.success) {
          ipfsHash = result.ipfsHash;
          showToast('File uploaded to IPFS successfully!', 'success');
          console.log('[DVote] File uploaded to IPFS:', ipfsHash);
        }
      }

      showToast('Creating proposal on blockchain...', 'info');
      console.log('[DVote] Creating proposal with params:', {
        walletAddress,
        chainId: currentChainId,
        contractAddress: currentDAO,
        proposalType,
        title,
        description
      });
      
      // Upload proposal metadata to IPFS
      const metadataHash = await createProposalMetadata();
      console.log('[DVote] Metadata uploaded to IPFS:', metadataHash);

      const targetAddress = getProposalTarget();
      const etherValue = getProposalValue() !== '0' ? parseEther(getProposalValue()) : 0n;

      // Create description with metadata
      let finalDescription = description || `Poll: ${formData.title}`;
      if (formData.proposalType === 'poll') {
        const filledOptions = formData.options.filter(opt => opt.trim() !== '');
        finalDescription = `Options: ${filledOptions.join(', ')}`;
      }
      finalDescription += `\n\nCreated by: ${walletAddress}\nIPFS Metadata: ${metadataHash}`;

      console.log('[DVote] Calling writeContract with:', {
        address: finalContractAddress,
        functionName: 'createProposal',
        args: [title, finalDescription, targetAddress, etherValue],
        abiType: typeof DAO_ABI,
        abiIsArray: Array.isArray(DAO_ABI),
        abiLength: DAO_ABI?.length,
        network: currentChainId,
        gasLimit: 500000,
        // Debug the actual values
        argTypes: [typeof title, typeof finalDescription, typeof targetAddress, typeof etherValue],
        argValues: {
          title: title,
          description: finalDescription.substring(0, 100) + '...',
          target: targetAddress,
          value: etherValue.toString()
        }
      });

      // Ensure ABI is valid before making the call
      if (!Array.isArray(DAO_ABI) || DAO_ABI.length === 0) {
        throw new Error('Invalid ABI: ABI must be a non-empty array');
      }

      // This should trigger MetaMask confirmation
      const result = await createProposal({
        address: finalContractAddress,
        abi: DAO_ABI,
        functionName: 'createProposal',
        args: [
          title,
          finalDescription,
          targetAddress,
          etherValue
        ],
        value: 0n, // No ETH sent with the transaction itself
        gas: 300000n, // Reduced gas limit for cheaper transactions
      });

      console.log('[DVote] WriteContract call initiated - result:', result);

    } catch (error) {
      console.error('[DVote] Error creating proposal:', error);
      
      // Handle specific ABI-related errors
      if (error.message?.includes('abi.filter is not a function')) {
        console.error('[DVote] ABI Error Details:', {
          DAO_ABI_type: typeof DAO_ABI,
          DAO_ABI_isArray: Array.isArray(DAO_ABI),
          DAO_ABI_value: DAO_ABI
        });
        showToast('Contract ABI error. Please refresh the page and try again.', 'error');
      } else if (error.message?.includes('User rejected')) {
        showToast('Transaction was rejected in wallet', 'error');
      } else if (error.message?.includes('insufficient funds')) {
        showToast('Insufficient funds for transaction', 'error');
      } else if (error.message?.includes('Invalid ABI')) {
        showToast('Contract configuration error. Please refresh the page.', 'error');
      } else {
        showToast(`Failed to create proposal: ${error.message}`, 'error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const ToastNotification = () => {
    if (!toast.show) return null;

    const bgColors = {
      success: 'bg-green-500',
      error: 'bg-red-500',
      info: 'bg-blue-500',
      warning: 'bg-yellow-500'
    };

    return (
      <div className="fixed top-4 right-4 z-50 animate-slide-in">
        <div className={`${bgColors[toast.type]} text-white px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 max-w-md`}>
          <span>{toast.message}</span>
          <button onClick={() => setToast({ show: false, message: '', type: '' })} className="ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  if (!isConnected || !walletAddress) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
        <ToastNotification />
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="flex justify-start mb-4">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors duration-200"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          </div>
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-8 h-8 text-indigo-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Wallet Connection Required</h2>
          <p className="text-gray-600 mb-6">
            Please connect your wallet to create a proposal and participate in DAO governance.
          </p>
          <button
            onClick={() => showToast('Please use the Connect Wallet button in the navigation', 'info')}
            className="w-full bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-indigo-700 transition-colors duration-200 flex items-center justify-center gap-2"
          >
            <Wallet className="w-5 h-5" />
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  // Preview Mode
  if (showPreview) {
    const filledOptions = formData.options.filter(opt => opt.trim() !== '');
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-12 px-4">
        <ToastNotification />
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back</span>
              </button>
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-6">Preview Your Proposal</h2>
            
            <div className="space-y-4 mb-8">
              <div>
                <label className="text-sm font-semibold text-gray-600">Proposal Title</label>
                <p className="text-lg font-semibold text-gray-800 mt-1">{formData.title}</p>
              </div>
              
              {formData.proposalType === 'poll' && (
                <div>
                  <label className="text-sm font-semibold text-gray-600">Voting Options</label>
                  <div className="mt-2 space-y-2">
                    {filledOptions.map((option, index) => (
                      <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-semibold">
                          {index + 1}
                        </div>
                        <span className="text-gray-800 font-medium">{option}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {formData.description && (
                <div>
                  <label className="text-sm font-semibold text-gray-600">Description</label>
                  <p className="text-gray-800 mt-1">{formData.description}</p>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-gray-600">Type</label>
                  <p className="text-gray-800 mt-1">{formData.proposalType}</p>
                </div>
                
                <div>
                  <label className="text-sm font-semibold text-gray-600">Category</label>
                  <p className="text-gray-800 mt-1">{formData.category}</p>
                </div>
              </div>
              
              {formData.funding && (
                <div>
                  <label className="text-sm font-semibold text-gray-600">Funding Requested</label>
                  <p className="text-gray-800 mt-1">{formData.funding} ETH</p>
                </div>
              )}
              
              <div>
                <label className="text-sm font-semibold text-gray-600">Voting Deadline</label>
                <p className="text-gray-800 mt-1">{formData.deadline ? new Date(formData.deadline).toLocaleDateString() : 'Not set'}</p>
              </div>
              
              <div>
                <label className="text-sm font-semibold text-gray-600">Proposer</label>
                <p className="text-gray-800 mt-1 font-mono text-sm">{walletAddress}</p>
              </div>
              
              {fileName && (
                <div>
                  <label className="text-sm font-semibold text-gray-600">Attached File</label>
                  <p className="text-gray-800 mt-1">{fileName}</p>
                </div>
              )}
            </div>
            
            <div className="flex gap-4">
              <button
                onClick={togglePreview}
                className="flex-1 bg-gray-200 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-300 transition-colors duration-200"
              >
                Edit Proposal
              </button>
              <button
                onClick={(e) => {
                  console.log('[DVote] ========== BUTTON CLICKED ==========');
                  console.log('[DVote] Button event:', e);
                  console.log('[DVote] Form data:', formData);
                  console.log('[DVote] Is submitting:', isSubmitting);
                  console.log('[DVote] Is connected:', isConnected);
                  console.log('[DVote] Wallet address:', walletAddress);
                  console.log('[DVote] Chain ID:', chainId);
                  handleSubmit(e);
                }}
                disabled={isSubmitting}
                className="flex-1 bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-indigo-700 transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Confirm & Submit
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main Form
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-12 px-4">
      <ToastNotification />
      
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back</span>
              </button>
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Create a New DAO Proposal</h1>
            <p className="text-gray-600">
              Create a proposal for community voting and governance decisions.
            </p>
          </div>

          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center">
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700">Connected Wallet</p>
                <p className="text-xs text-gray-600 font-mono">
                  {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
                </p>
              </div>
            </div>
            {estimatedGas && (
              <div className="text-right">
                <p className="text-xs text-gray-600">Est. Gas Fee</p>
                <p className="text-sm font-semibold text-gray-800">~{parseFloat(estimatedGas).toFixed(6)} ETH</p>
              </div>
            )}
          </div>

          <div className="space-y-6">
            {/* Proposal Type Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Proposal Type
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {proposalTypes.map((type) => (
                  <div
                    key={type.id}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      formData.proposalType === type.id
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleProposalTypeChange(type.id)}
                  >
                    <h4 className="font-medium text-gray-900 mb-1">{type.name}</h4>
                    <p className="text-sm text-gray-600">{type.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-semibold text-gray-700 mb-2">
                Proposal Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="e.g., Should we allocate funds for marketing campaign?"
                className={`w-full px-4 py-3 border ${errors.title ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all`}
              />
              {errors.title && (
                <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.title}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">{formData.title.length}/100 characters</p>
            </div>

            {/* Dynamic form fields based on proposal type */}
            {renderProposalTypeFields()}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="category" className="block text-sm font-semibold text-gray-700 mb-2">
                  Category
                </label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all bg-white"
                >
                  <option value="Treasury">Treasury</option>
                  <option value="Governance">Governance</option>
                  <option value="Community">Community</option>
                  <option value="Development">Development</option>
                </select>
              </div>

              <div>
                <label htmlFor="funding" className="block text-sm font-semibold text-gray-700 mb-2">
                  Funding Requested (ETH)
                </label>
                <input
                  type="number"
                  id="funding"
                  name="funding"
                  value={formData.funding}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className={`w-full px-4 py-3 border ${errors.funding ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all`}
                />
                {errors.funding && (
                  <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.funding}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="deadline" className="block text-sm font-semibold text-gray-700 mb-2">
                Voting Deadline <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="deadline"
                name="deadline"
                value={formData.deadline}
                onChange={handleInputChange}
                min={new Date().toISOString().split('T')[0]}
                className={`w-full px-4 py-3 border ${errors.deadline ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all`}
              />
              {errors.deadline && (
                <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.deadline}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Supporting Documents (Optional)
              </label>
              <IPFSFileUpload 
                onFileUploaded={(uploadedFiles) => {
                  setFormData(prev => ({
                    ...prev,
                    attachments: [...prev.attachments, ...uploadedFiles]
                  }));
                }}
                maxFiles={3}
                maxSize={10485760} // 10MB
              />
              {formData.attachments.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm text-gray-600 mb-2">Uploaded files:</p>
                  <div className="space-y-2">
                    {formData.attachments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm">{file.fileName}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              attachments: prev.attachments.filter((_, i) => i !== index)
                            }));
                          }}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={togglePreview}
                className="flex-1 bg-gray-200 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-300 transition-colors duration-200"
              >
                Preview
              </button>
              <button
                type="button"
                onClick={(e) => {
                  console.log('[DVote] ========== FORM BUTTON CLICKED ==========');
                  console.log('[DVote] Button event:', e);
                  console.log('[DVote] Form data:', formData);
                  console.log('[DVote] Is submitting:', isSubmitting);
                  console.log('[DVote] Is connected:', isConnected);
                  console.log('[DVote] Wallet address:', walletAddress);
                  console.log('[DVote] Chain ID:', chainId);
                  handleSubmit(e);
                }}
                disabled={isSubmitting}
                className="flex-1 bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-indigo-700 transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating Proposal...
                  </>
                ) : (
                  'Create Proposal'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}