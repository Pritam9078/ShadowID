import { useState, useCallback, useEffect } from 'react';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { parseEther, formatEther, encodeFunctionData } from 'viem';
import { apiRequest, API_ENDPOINTS } from '../config/api.js';

/**
 * Custom hook for proposal service integration
 * Handles proposal creation, validation, and blockchain interaction
 */
export const useProposalService = () => {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Using centralized API configuration

  /**
   * Validate proposal data before submission
   */
  const validateProposal = useCallback(async (proposalData) => {
    try {
      const response = await apiRequest(API_ENDPOINTS.proposalsValidate, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...proposalData,
          creator: address
        })
      });

      if (!response.ok) {
        throw new Error('Validation failed');
      }

      return await response.json();
    } catch (err) {
      console.error('Proposal validation error:', err);
      throw err;
    }
  }, [address]);

  /**
   * Upload proposal metadata to IPFS
   */
  const uploadToIPFS = useCallback(async (metadata) => {
    try {
      const response = await apiRequest(API_ENDPOINTS.ipfsUpload, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metadata)
      });

      if (!response.ok) {
        throw new Error('IPFS upload failed');
      }

      const result = await response.json();
      return result.hash;
    } catch (err) {
      console.error('IPFS upload error:', err);
      throw err;
    }
  }, []);

  /**
   * Upload file attachments to IPFS
   */
  const uploadAttachment = useCallback(async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiRequest(API_ENDPOINTS.ipfsUploadFile, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('File upload failed');
      }

      const result = await response.json();
      return {
        ...file,
        ipfsHash: result.hash,
        ipfsUrl: `https://gateway.pinata.cloud/ipfs/${result.hash}`
      };
    } catch (err) {
      console.error('File upload error:', err);
      throw err;
    }
  }, []);

  /**
   * Create a new proposal
   */
  const createProposal = useCallback(async (proposalData) => {
    if (!address || !walletClient) {
      throw new Error('Wallet not connected');
    }

    setIsLoading(true);
    setError(null);

    try {
      // 1. Validate proposal
      const validation = await validateProposal(proposalData);
      if (validation.errors && validation.errors.length > 0) {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }

      // 2. Upload attachments to IPFS
      let attachments = [];
      if (proposalData.attachments && proposalData.attachments.length > 0) {
        attachments = await Promise.all(
          proposalData.attachments.map(file => uploadAttachment(file))
        );
      }

      // 3. Prepare metadata
      const metadata = {
        title: proposalData.title,
        description: proposalData.description,
        category: proposalData.category,
        tags: proposalData.tags || [],
        attachments: attachments.map(att => ({
          name: att.name,
          size: att.size,
          type: att.type,
          ipfsHash: att.ipfsHash,
          ipfsUrl: att.ipfsUrl
        })),
        author: address,
        timestamp: Date.now(),
        version: '1.0'
      };

      // 4. Upload metadata to IPFS
      const metadataHash = await uploadToIPFS(metadata);

      // 5. Prepare blockchain transaction
      const proposalParams = {
        targets: proposalData.proposalType === 'executable' && proposalData.target 
          ? [proposalData.target] 
          : [],
        values: proposalData.proposalType === 'executable' && proposalData.value 
          ? [parseEther(proposalData.value.toString())] 
          : [],
        calldatas: proposalData.proposalType === 'executable' && proposalData.calldata 
          ? [proposalData.calldata] 
          : ['0x'],
        description: `${proposalData.title}\n\nipfs://${metadataHash}`
      };

      // 6. Submit to backend service
      const response = await apiRequest(API_ENDPOINTS.proposals, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...proposalParams,
          metadata: metadata,
          metadataHash: metadataHash,
          creator: address,
          isDraft: proposalData.isDraft || false
        })
      });

      if (!response.ok) {
        throw new Error('Backend submission failed');
      }

      const result = await response.json();
      
      // 7. If not a draft, submit to blockchain
      if (!proposalData.isDraft) {
        // This would typically use the DAO contract's propose function
        // For now, we'll simulate the blockchain interaction
        console.log('Submitting to blockchain:', proposalParams);
      }

      return {
        ...result,
        metadataHash,
        transactionHash: result.transactionHash
      };

    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [address, walletClient, validateProposal, uploadAttachment, uploadToIPFS]);

  /**
   * Get proposal by ID
   */
  const getProposal = useCallback(async (proposalId) => {
    try {
      const response = await apiRequest(API_ENDPOINTS.proposalById(proposalId));
      
      if (!response.ok) {
        throw new Error('Failed to fetch proposal');
      }

      return await response.json();
    } catch (err) {
      console.error('Get proposal error:', err);
      throw err;
    }
  }, []);

  /**
   * Get user's proposals
   */
  const getUserProposals = useCallback(async (userAddress = address) => {
    if (!userAddress) return [];

    try {
      const response = await apiRequest(API_ENDPOINTS.proposalsByUser(userAddress));
      
      if (!response.ok) {
        throw new Error('Failed to fetch user proposals');
      }

      return await response.json();
    } catch (err) {
      console.error('Get user proposals error:', err);
      return [];
    }
  }, [address]);

  /**
   * Get all proposals with pagination
   */
  const getProposals = useCallback(async (page = 1, limit = 10, filters = {}) => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...filters
      });

      const response = await apiRequest(`${API_ENDPOINTS.proposals}?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch proposals');
      }

      return await response.json();
    } catch (err) {
      console.error('Get proposals error:', err);
      return { proposals: [], total: 0, page: 1, totalPages: 0 };
    }
  }, []);

  /**
   * Estimate execution cost for executable proposals
   */
  const estimateExecutionCost = useCallback(async (target, calldata, value = '0') => {
    if (!publicClient || !target) return null;

    try {
      const gasEstimate = await publicClient.estimateGas({
        to: target,
        data: calldata || '0x',
        value: value ? parseEther(value.toString()) : 0n
      });

      const gasPrice = await publicClient.getGasPrice();
      const totalCost = gasEstimate * gasPrice + (value ? parseEther(value.toString()) : 0n);

      return {
        gasEstimate: Number(gasEstimate),
        gasPrice: Number(gasPrice),
        totalCost: totalCost,
        gasCostEth: formatEther(gasEstimate * gasPrice),
        totalCostEth: formatEther(totalCost)
      };
    } catch (err) {
      console.error('Gas estimation error:', err);
      return null;
    }
  }, [publicClient]);

  /**
   * Save proposal as draft
   */
  const saveDraft = useCallback(async (proposalData) => {
    try {
      const response = await apiRequest(API_ENDPOINTS.proposalsDraft, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...proposalData,
          creator: address,
          isDraft: true
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save draft');
      }

      return await response.json();
    } catch (err) {
      console.error('Save draft error:', err);
      throw err;
    }
  }, [address]);

  /**
   * Get user's drafts
   */
  const getDrafts = useCallback(async () => {
    if (!address) return [];

    try {
      const response = await apiRequest(API_ENDPOINTS.proposalsDraftsByUser(address));
      
      if (!response.ok) {
        throw new Error('Failed to fetch drafts');
      }

      return await response.json();
    } catch (err) {
      console.error('Get drafts error:', err);
      return [];
    }
  }, [address]);

  return {
    // Core functions
    createProposal,
    validateProposal,
    getProposal,
    getUserProposals,
    getProposals,
    
    // Draft management
    saveDraft,
    getDrafts,
    
    // Utility functions
    uploadAttachment,
    estimateExecutionCost,
    
    // State
    isLoading,
    error,
    
    // Service URL for direct API calls
    serviceUrl: SERVICE_URL
  };
};
