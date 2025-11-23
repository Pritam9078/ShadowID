import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Vote as VoteIcon } from 'lucide-react';
import VotingSystem from '../components/Voting';
import { ethers } from 'ethers';
import { useChainId } from 'wagmi';
import { CONTRACT_ADDRESSES } from '../config/contracts';
import { DAO_ABI } from '../config/abis';

const VotingPage = () => {
  const { proposalId } = useParams();
  const navigate = useNavigate();
  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProposal = async () => {
      if (!proposalId) return;

      try {
        setLoading(true);
        
        // Get current chain and determine RPC URL
        const currentChainId = window.ethereum ? parseInt(await window.ethereum.request({ method: 'eth_chainId' }), 16) : 421614;
        let rpcUrl;
        
        if (currentChainId === 421614) {
          // Arbitrum Sepolia
          rpcUrl = 'https://arb-sepolia.g.alchemy.com/v2/mUJMHrybqfzOlpVeT0cj7';
        } else if (currentChainId === 31337) {
          // Local development
          rpcUrl = 'http://127.0.0.1:8545';
        } else {
          // Default to Arbitrum Sepolia
          rpcUrl = 'https://arb-sepolia.g.alchemy.com/v2/mUJMHrybqfzOlpVeT0cj7';
        }
        
        // Create provider using appropriate RPC
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        
        // Create contract instance
        const daoContract = new ethers.Contract(
          CONTRACT_ADDRESSES.DAO,
          DAO_ABI,
          provider
        );

        // Fetch proposal data
        const proposalData = await daoContract.getProposal(proposalId);
        const [
          id,
          proposer,
          title,
          description,
          ipfsHash,
          target,
          value,
          startTime,
          endTime,
          forVotes,
          againstVotes,
          abstainVotes,
          executed,
          cancelled
        ] = proposalData;

        // Get proposal state
        const state = await daoContract.getProposalState(proposalId);

        const formattedProposal = {
          id: Number(id),
          proposer: proposer,
          title: title,
          description: description,
          ipfsHash: ipfsHash,
          target: target,
          value: Number(value),
          startTime: Number(startTime),
          endTime: Number(endTime),
          forVotes: Number(forVotes),
          againstVotes: Number(againstVotes),
          abstainVotes: Number(abstainVotes),
          executed: executed,
          cancelled: cancelled,
          state: Number(state),
          timestamp: Number(startTime) * 1000,
          deadline: Number(endTime) * 1000
        };

        setProposal(formattedProposal);
      } catch (err) {
        console.error('Failed to fetch proposal:', err);
        setError('Failed to load proposal');
      } finally {
        setLoading(false);
      }
    };

    fetchProposal();
  }, [proposalId]);

  const handleVoteSuccess = () => {
    // Refresh proposal data after successful vote
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <VoteIcon className="w-12 h-12 text-blue-600 animate-pulse mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Proposal...</h2>
          <p className="text-gray-600">Fetching proposal data from blockchain</p>
        </div>
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Proposal Not Found</h2>
          <p className="text-gray-600 mb-6">{error || 'The requested proposal could not be found.'}</p>
          <button
            onClick={() => navigate('/proposals')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Back to Proposals
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <button
            onClick={() => navigate('/proposals')}
            className="flex items-center text-blue-600 hover:text-blue-700 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Proposals
          </button>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Vote on Proposal #{proposal.id}
          </h1>
          <p className="text-gray-600">
            Cast your vote on this governance proposal
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Proposal Details */}
          <motion.div
            className="lg:col-span-2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                {proposal.title || `Proposal #${proposal.id}`}
              </h2>
              
              <div className="prose max-w-none mb-6">
                <p className="text-gray-700 leading-relaxed">
                  {proposal.description}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Proposer:</span>
                  <p className="font-mono text-gray-900">
                    {`${proposal.proposer.slice(0, 6)}...${proposal.proposer.slice(-4)}`}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Created:</span>
                  <p className="text-gray-900">
                    {new Date(proposal.timestamp).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Deadline:</span>
                  <p className="text-gray-900">
                    {new Date(proposal.deadline).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Status:</span>
                  <p className="text-gray-900">
                    {proposal.executed ? 'Executed' : 
                     proposal.cancelled ? 'Cancelled' :
                     proposal.state === 1 ? 'Active' : 'Inactive'}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Voting Interface */}
          <motion.div
            className="lg:col-span-1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <VotingSystem 
              proposalId={proposal.id}
              proposalData={proposal}
              onVoteSuccess={handleVoteSuccess}
            />
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default VotingPage;
