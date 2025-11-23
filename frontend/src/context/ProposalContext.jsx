import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { CONTRACT_ADDRESSES } from '../config/contracts';
import { DAO_ABI } from '../config/abis';
import useWebSocket from '../hooks/useWebSocketHook';
import { MESSAGE_TYPES, createMessage } from '../utils/websocketConfig';
import toast from 'react-hot-toast';

// Create the context
const ProposalContext = createContext();

// Mock data for initial proposals (can be removed once real data is available)
const initialMockProposals = [
  {
    id: 1,
    title: 'Increase Treasury Allocation',
    description: 'Allocate 50 ETH for development',
    status: 'Active',
    votesFor: 450,
    votesAgainst: 120,
    votesAbstain: 30,
    endTime: '2 days left',
    creator: '0x742d...8c9a',
    category: 'Treasury',
    fundingAmount: '50 ETH',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    totalVotes: 600
  },
  {
    id: 2,
    title: 'Onboard Marketing Partner',
    description: 'Partner with Web3 agency',
    status: 'Passed',
    votesFor: 580,
    votesAgainst: 45,
    votesAbstain: 15,
    endTime: 'Ended',
    creator: '0x1a3f...4b2c',
    category: 'Partnership',
    fundingAmount: null,
    createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    deadline: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    totalVotes: 640
  },
  {
    id: 3,
    title: 'Update Governance Parameters',
    description: 'Reduce quorum to 15%',
    status: 'Active',
    votesFor: 320,
    votesAgainst: 280,
    votesAbstain: 50,
    endTime: '5 days left',
    creator: '0x8e2d...9f1a',
    category: 'Governance',
    fundingAmount: null,
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    totalVotes: 650
  }
];

// Provider component
export const ProposalProvider = ({ children }) => {
  const { address, isConnected } = useAccount();
  const [proposals, setProposals] = useState(initialMockProposals);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // WebSocket integration
  const { 
    connectionStatus, 
    lastMessage, 
    sendMessage, 
    isConnected: wsConnected,
    subscribe,
    unsubscribe,
    reconnect
  } = useWebSocket();

  // Read proposal count from contract
  const { data: proposalCount } = useReadContract({
    address: CONTRACT_ADDRESSES.DAO,
    abi: DAO_ABI,
    functionName: 'proposalCount',
    enabled: isConnected,
  });

  // Function to add a new proposal
  const addProposal = (proposalData) => {
    const newProposal = {
      id: Date.now(), // Use timestamp for unique ID
      title: proposalData.title,
      description: proposalData.description,
      status: 'Active',
      votesFor: 0,
      votesAgainst: 0,
      votesAbstain: 0,
      endTime: proposalData.duration + ' days left',
      creator: address ? address.slice(0, 6) + '...' + address.slice(-4) : 'Unknown',
      category: proposalData.category || 'General',
      fundingAmount: proposalData.fundingAmount || null,
      createdAt: new Date().toISOString(),
      deadline: new Date(Date.now() + parseInt(proposalData.duration) * 24 * 60 * 60 * 1000).toISOString(),
      totalVotes: 0
    };

    setProposals(prev => [newProposal, ...prev]);

    // Send WebSocket message for real-time updates
    if (wsConnected) {
      const message = createMessage(MESSAGE_TYPES.PROPOSAL_CREATED, {
        proposal: newProposal,
        creator: address
      });
      sendMessage(message);
    }

    // Show success notification
    toast.success('Proposal created successfully! 🎉');
    
    return newProposal;
  };

  // Function to update a proposal (for voting)
  const updateProposal = (proposalId, updates) => {
    setProposals(prev => 
      prev.map(p => 
        p.id === proposalId 
          ? { ...p, ...updates, totalVotes: (updates.votesFor || p.votesFor) + (updates.votesAgainst || p.votesAgainst) + (updates.votesAbstain || p.votesAbstain) }
          : p
      )
    );

    // Send WebSocket message for real-time updates
    if (wsConnected) {
      const message = createMessage(MESSAGE_TYPES.VOTE_CAST, {
        proposalId,
        updates,
        voter: address
      });
      sendMessage(message);
    }

    // Show success notification
    toast.success('Vote recorded successfully! ✅');
  };

  // Function to get proposals by status
  const getProposalsByStatus = (status) => {
    if (status === 'all' || status === 'All') return proposals;
    return proposals.filter(p => p.status.toLowerCase() === status.toLowerCase());
  };

  // Function to get active proposals
  const getActiveProposals = () => {
    return proposals.filter(p => p.status === 'Active');
  };

  // Function to get recent proposals (last 5)
  const getRecentProposals = () => {
    return proposals.slice(0, 5);
  };

  // Handle incoming WebSocket messages
  useEffect(() => {
    if (lastMessage) {
      const { type, data } = lastMessage;

      switch (type) {
        case MESSAGE_TYPES.PROPOSAL_CREATED:
          if (data.proposal && data.creator !== address) {
            // Add proposal from another user
            setProposals(prev => [data.proposal, ...prev]);
            toast.success('🆕 New proposal created by another user!');
          }
          break;

        case MESSAGE_TYPES.VOTE_CAST:
          if (data.proposalId && data.updates && data.voter !== address) {
            // Update proposal votes from another user
            updateProposal(data.proposalId, data.updates);
            toast.info('📊 Someone voted on a proposal!');
          }
          break;

        case MESSAGE_TYPES.PROPOSAL_UPDATE:
          if (data.proposalId && data.updates) {
            // General proposal update
            updateProposal(data.proposalId, data.updates);
          }
          break;

        default:
          console.log('Unhandled message type:', type);
      }
    }
  }, [lastMessage, address]);

  // Subscribe to proposal updates when connected
  useEffect(() => {
    if (wsConnected) {
      subscribe(MESSAGE_TYPES.PROPOSAL_CREATED);
      subscribe(MESSAGE_TYPES.VOTE_CAST);
      subscribe(MESSAGE_TYPES.PROPOSAL_UPDATE);
    }

    return () => {
      if (wsConnected) {
        unsubscribe(MESSAGE_TYPES.PROPOSAL_CREATED);
        unsubscribe(MESSAGE_TYPES.VOTE_CAST);
        unsubscribe(MESSAGE_TYPES.PROPOSAL_UPDATE);
      }
    };
  }, [wsConnected, subscribe, unsubscribe]);

  const value = {
    proposals,
    setProposals,
    loading,
    setLoading,
    error,
    setError,
    proposalCount: proposalCount ? Number(proposalCount) : proposals.length,
    addProposal,
    updateProposal,
    getProposalsByStatus,
    getActiveProposals,
    getRecentProposals,
    // WebSocket related
    connectionStatus,
    wsConnected,
    reconnect
  };

  return (
    <ProposalContext.Provider value={value}>
      {children}
    </ProposalContext.Provider>
  );
};

// Custom hook to use the context
export const useProposals = () => {
  const context = useContext(ProposalContext);
  
  if (context === undefined) {
    throw new Error('useProposals must be used within a ProposalProvider');
  }
  
  return context;
};

export default ProposalContext;
