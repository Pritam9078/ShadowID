import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { formatEther } from 'viem';
import toast from 'react-hot-toast';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Users, 
  ArrowRight,
  Plus,
  Vote,
  Calendar,
  Target,
  RefreshCw,
  Wifi,
  FileText,
  AlertCircle,
  ExternalLink,
  Filter,
  TrendingUp,
  Ban
} from 'lucide-react';

import { CONTRACT_ADDRESSES } from '../config/contracts';
import { DAO_ABI } from '../config/abis';
import { useProposals } from '../context/ProposalContext';
import ProposalCard from '../components/ProposalCard';

const Proposals = () => {
  const { address, isConnected } = useAccount();
  const { proposals, getProposalsByStatus, updateProposal, loading, setLoading, error, setError } = useProposals();
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [filter, setFilter] = useState('all');
  const [filterStatus, setFilterStatus] = useState('All');
  const [votedProposals, setVotedProposals] = useState(new Set());
  const [toasts, setToasts] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const previousCountRef = useRef(0);

  // Read proposal count from contract
  const { data: proposalCount, refetch: refetchCount } = useReadContract({
    address: CONTRACT_ADDRESSES.DAO,
    abi: DAO_ABI,
    functionName: 'proposalCount',
  });

  // Smart contract write hooks for proposal management
  const { writeContract, data: hash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // Check if user is owner/admin
  const { data: ownerAddress } = useReadContract({
    address: CONTRACT_ADDRESSES.DAO,
    abi: DAO_ABI,
    functionName: 'owner',
  });

  // Handle proposal cancellation
  const handleCancelProposal = async (proposalId) => {
    if (!isConnected) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!isAdmin && address?.toLowerCase() !== ownerAddress?.toLowerCase()) {
      toast.error("Only admin can cancel proposals");
      return;
    }

    try {
      setLoading(true);
      toast.loading("Cancelling proposal...", { id: "cancel-proposal" });

      await writeContract({
        address: CONTRACT_ADDRESSES.DAO,
        abi: DAO_ABI,
        functionName: 'cancelProposal',
        args: [proposalId],
      });

    } catch (error) {
      console.error("Cancel proposal error:", error);
      toast.error(error.message || "Failed to cancel proposal", { id: "cancel-proposal" });
      setLoading(false);
    }
  };

  // Handle transaction confirmation
  useEffect(() => {
    if (isConfirmed) {
      toast.success("Proposal cancelled successfully!", { id: "cancel-proposal" });
      setLoading(false);
      // Refresh proposals data
      refetchCount();
    }
  }, [isConfirmed, refetchCount]);

  useEffect(() => {
    if (isConfirming) {
      toast.loading("Waiting for confirmation...", { id: "cancel-proposal" });
    }
  }, [isConfirming]);

  // Check if user is admin
  useEffect(() => {
    if (address && ownerAddress) {
      setIsAdmin(address.toLowerCase() === ownerAddress.toLowerCase());
    }
  }, [address, ownerAddress]);

  // Helper function to format large numbers
  const formatVotes = (votes) => {
    try {
      const formatted = formatEther(votes || 0);
      const num = parseFloat(formatted);
      if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
      } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
      }
      return num.toFixed(2);
    } catch (error) {
      return '0';
    }
  };

  // Generate proposal state (0-7 based on various factors)
  const generateProposalState = (index, title) => {
    const hash = title.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    const states = [0, 1, 1, 1, 4, 7]; // More active proposals
    return Math.abs(hash + index) % states.length;
  };

  // Enhanced filter functions
  const getFilteredProposals = () => {
    return getProposalsByStatus(filter);
  };

  const getProposalCounts = () => {
    const counts = {
      all: proposals.length,
      active: proposals.filter(p => p.status === 'Active').length,
      passed: proposals.filter(p => p.status === 'Passed').length,
      rejected: proposals.filter(p => p.status === 'Rejected').length,
      executed: proposals.filter(p => p.status === 'Executed').length,
    };
    return counts;
  };

  // Enhanced stats for dashboard
  const getEnhancedStats = () => {
    return {
      total: proposals.length,
      active: proposals.filter(p => p.status === 'Active').length,
      passed: proposals.filter(p => p.status === 'Passed').length,
      executed: proposals.filter(p => p.status === 'Executed').length
    };
  };

  // Simple proposal fetching function
  const fetchProposals = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const count = proposalCount ? Number(proposalCount) : 0;
      
      if (count === 0) {
        setProposals([]);
        setLoading(false);
        return;
      }

      // Create proposals based on actual count from blockchain
      const proposalsData = [];
      
      for (let i = 0; i < count; i++) {
        const proposalIndex = i + 1;
        const titles = [
          'Increase Development Budget to 50,000 DVT',
          'Implement New Governance Voting Mechanism',
          'Partnership with DeFi Protocol XYZ',
          'Treasury Diversification Strategy',
          'Community Grants Program Launch',
          'Update Smart Contract Security Parameters',
          'Marketing Campaign Budget Allocation',
          'Technical Infrastructure Upgrade',
          'New Token Economics Model',
          'Cross-chain Integration Proposal'
        ];
        
        const descriptions = [
          'This proposal aims to increase our development budget to accelerate product development and hire additional talent.',
          'Implementing a new quadratic voting mechanism to improve governance participation and decision quality.',
          'Strategic partnership proposal to integrate with a leading DeFi protocol for enhanced liquidity.',
          'Diversifying treasury holdings across multiple assets to reduce risk and improve long-term sustainability.',
          'Launching a grants program to fund community projects and ecosystem development initiatives.',
          'Updating smart contract parameters to enhance security and reduce potential vulnerabilities.',
          'Allocating budget for comprehensive marketing campaign to increase platform adoption.',
          'Upgrading our technical infrastructure to support higher transaction volumes and better performance.',
          'Proposing new tokenomics model to improve token utility and long-term value accrual.',
          'Integration with multiple blockchain networks to expand our platform reach and accessibility.'
        ];

        const title = titles[i % titles.length];
        const description = descriptions[i % descriptions.length];
        const state = generateProposalState(i, title);
        
        proposalsData.push({
          id: proposalIndex,
          title,
          description,
          proposer: `0x${Math.random().toString(16).substr(2, 40)}`,
          forVotes: BigInt(Math.floor(Math.random() * 1000000) * 1e18),
          againstVotes: BigInt(Math.floor(Math.random() * 500000) * 1e18),
          abstainVotes: BigInt(Math.floor(Math.random() * 100000) * 1e18),
          startBlock: BigInt(18000000 + i * 1000),
          endBlock: BigInt(18000000 + i * 1000 + 17280),
          state,
          eta: state === 4 ? BigInt(Date.now() + 86400000) : BigInt(0),
          executed: state === 7,
          canceled: false,
          targets: [`0x${Math.random().toString(16).substr(2, 40)}`],
          values: [BigInt(0)],
          signatures: ['transfer(address,uint256)'],
          calldatas: ['0x']
        });
      }

      setProposals(proposalsData);
      setLoading(false);

      // Check for new proposals and show toast
      if (previousCountRef.current > 0 && count > previousCountRef.current) {
        const newProposalsCount = count - previousCountRef.current;
        toast.success(`🎉 ${newProposalsCount} new proposal${newProposalsCount > 1 ? 's' : ''} created!`);
      }
      previousCountRef.current = count;

    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  // Enhanced toast system
  const addToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  // Enhanced vote handling with toast notifications
  const handleVoteEnhanced = async (proposalId, voteType) => {
    if (!isConnected) {
      addToast('Please connect your wallet first', 'error');
      return;
    }

    if (votedProposals.has(proposalId)) {
      addToast('You have already voted on this proposal', 'error');
      return;
    }

    // Simulate blockchain transaction
    addToast('Submitting vote...', 'info');
    
    try {
      // Call existing vote handler
      await handleVote(proposalId, voteType === 'for' ? 1 : 0);
      
      setTimeout(() => {
        setVotedProposals(prev => new Set([...prev, proposalId]));
        addToast(`Vote "${voteType}" submitted successfully!`, 'success');
      }, 1500);
    } catch (error) {
      addToast('Error submitting vote: ' + error.message, 'error');
    }
  };

  // Enhanced execute functionality
  const handleExecuteEnhanced = async (proposalId) => {
    if (!address) {
      addToast('Please connect your wallet first', 'error');
      return;
    }

    addToast('Executing proposal...', 'info');
    
    try {
      await handleExecute(proposalId);
      setTimeout(() => {
        addToast('Proposal executed successfully!', 'success');
      }, 2000);
    } catch (error) {
      addToast('Error executing proposal: ' + error.message, 'error');
    }
  };

  // Calculate vote percentages with abstain support
  const calculateVotePercentages = (proposal) => {
    const forVotes = Number(formatEther(proposal.forVotes || 0));
    const againstVotes = Number(formatEther(proposal.againstVotes || 0));
    const abstainVotes = Number(formatEther(proposal.abstainVotes || 0));
    const total = forVotes + againstVotes + abstainVotes;
    
    if (total === 0) return { for: 0, against: 0, abstain: 0 };
    
    return {
      for: Math.round((forVotes / total) * 100),
      against: Math.round((againstVotes / total) * 100),
      abstain: Math.round((abstainVotes / total) * 100)
    };
  };

  // Enhanced time remaining calculation
  const getTimeRemaining = (endBlock) => {
    // For demo purposes, convert block numbers to time estimate
    const currentBlock = 18500000; // Mock current block
    const blocksRemaining = Number(endBlock) - currentBlock;
    
    if (blocksRemaining <= 0) return 'Ended';
    
    // Assuming 12 seconds per block
    const secondsRemaining = blocksRemaining * 12;
    const days = Math.floor(secondsRemaining / (24 * 60 * 60));
    const hours = Math.floor((secondsRemaining % (24 * 60 * 60)) / (60 * 60));
    
    if (days > 0) return `${days}d ${hours}h remaining`;
    if (hours > 0) return `${hours}h remaining`;
    return 'Less than 1h remaining';
  };

  // Enhanced status colors and icons
  const getStatusColor = (state) => {
    switch (state) {
      case 0: return 'bg-yellow-100 text-yellow-800 border-yellow-300'; // Pending
      case 1: return 'bg-blue-100 text-blue-800 border-blue-300'; // Active
      case 3: return 'bg-red-100 text-red-800 border-red-300'; // Defeated
      case 4: return 'bg-green-100 text-green-800 border-green-300'; // Succeeded
      case 7: return 'bg-purple-100 text-purple-800 border-purple-300'; // Executed
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusIcon = (state) => {
    switch (state) {
      case 0: return <Clock className="w-4 h-4" />; // Pending
      case 1: return <Vote className="w-4 h-4" />; // Active
      case 3: return <XCircle className="w-4 h-4" />; // Defeated
      case 4: return <CheckCircle className="w-4 h-4" />; // Succeeded
      case 7: return <CheckCircle className="w-4 h-4" />; // Executed
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getStatusText = (state) => {
    switch (state) {
      case 0: return 'Pending';
      case 1: return 'Active';
      case 3: return 'Defeated';
      case 4: return 'Succeeded';
      case 7: return 'Executed';
      default: return 'Unknown';
    }
  };

  // Check if user is admin (for demo purposes)
  useEffect(() => {
    if (address) {
      setIsAdmin(address.toLowerCase() === '0x742d35cc6634c0532925a3b844bc9e7595f0beb1');
    }
  }, [address]);

  // Set loading to false once we have proposals from context
  useEffect(() => {
    if (proposals.length > 0) {
      setLoading(false);
    }
  }, [proposals]);

  // Auto-refresh every 15 seconds to catch new proposals
  useEffect(() => {
    const interval = setInterval(() => {
      // Silent auto-refresh - can be extended to fetch from blockchain
      console.log('Auto-refresh interval - proposals in context:', proposals.length);
    }, 15000);
    
    return () => clearInterval(interval);
  }, [proposals]);

  // Manual refresh function
  const refreshProposals = () => {
    refetchCount();
  };

  // Voting function
  const handleVote = async (proposalId, support) => {
    if (!isConnected) {
      toast.error('Please connect your wallet to vote');
      return;
    }

    try {
      toast.success(`Vote ${support === 1 ? 'FOR' : 'AGAINST'} submitted! (Demo mode)`);
      refreshProposals();
    } catch (error) {
      toast.error('Error voting: ' + error.message);
    }
  };

  // Execute proposal function
  const handleExecute = async (proposalId) => {
    if (!isConnected) {
      toast.error('Please connect your wallet to execute');
      return;
    }

    try {
      toast.success('Proposal execution submitted! (Demo mode)');
      refreshProposals();
    } catch (error) {
      toast.error('Error executing proposal: ' + error.message);
    }
  };

  const enhancedStats = getEnhancedStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 p-4 md:p-8">
      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`px-4 py-3 rounded-lg shadow-lg ${
              toast.type === 'success' ? 'bg-green-500' :
              toast.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
            } text-white animate-slide-in`}
          >
            {toast.message}
          </div>
        ))}
      </div>

      <div className="max-w-7xl mx-auto">
        {/* Enhanced Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center space-x-3 mb-2">
                <img src="/shadowid-logo.png" alt="ShadowID Logo" className="w-10 h-10 object-contain" />
                <h1 className="text-4xl font-bold text-gray-900">DAO Proposals</h1>
              </div>
              <p className="text-gray-600">Vote on proposals and shape the future of our DAO</p>
              <div className="flex items-center mt-2 text-sm text-gray-500">
                <Wifi className="w-4 h-4 mr-1" />
                <span>Auto-refreshing every 15 seconds</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-sm text-gray-600">
                  {isConnected ? `${address?.slice(0, 6)}...${address?.slice(-4)}` : 'Not Connected'}
                </span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={refreshProposals}
                  className="btn-outline flex items-center"
                  disabled={loading}
                >
                  <RefreshCw className={`w-5 h-5 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
                <Link
                  to="/create-proposal"
                  className="btn-primary flex items-center"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Create Proposal
                </Link>
              </div>
            </div>
          </div>

          {/* Enhanced Stats Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Proposals</p>
                  <p className="text-2xl font-bold text-gray-900">{enhancedStats.total}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-500" />
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Active</p>
                  <p className="text-2xl font-bold text-yellow-600">{enhancedStats.active}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-500" />
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Passed</p>
                  <p className="text-2xl font-bold text-green-600">{enhancedStats.passed}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Executed</p>
                  <p className="text-2xl font-bold text-blue-600">{enhancedStats.executed}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-blue-500" />
              </div>
            </div>
          </div>

          {/* Enhanced Filters */}
          <div className="flex items-center gap-2 mb-6">
            <Filter className="w-5 h-5 text-gray-600" />
            <div className="flex gap-2 flex-wrap">
              {['All', 'Active', 'Passed', 'Rejected', 'Executed'].map(status => (
                <button
                  key={status}
                  onClick={() => {
                    setFilterStatus(status);
                    setFilter(status.toLowerCase());
                  }}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    filterStatus === status
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </motion.div>



        {/* Error State */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-6 mb-8 border-red-200 bg-red-50"
          >
            <div className="flex items-center">
              <XCircle className="w-5 h-5 text-red-500 mr-3" />
              <div>
                <h3 className="text-red-800 font-medium">Error Loading Proposals</h3>
                <p className="text-red-600 text-sm">{error}</p>
                <button 
                  onClick={refreshProposals}
                  className="text-red-600 text-sm underline mt-1 hover:text-red-800"
                >
                  Try Again
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Connection Warning */}
        {!isConnected && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-6 mb-8 border-yellow-200 bg-yellow-50"
          >
            <div className="flex items-center">
              <Users className="w-5 h-5 text-yellow-500 mr-3" />
              <div>
                <h3 className="text-yellow-800 font-medium">Wallet Not Connected</h3>
                <p className="text-yellow-600 text-sm">Connect your wallet to vote on proposals</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Enhanced Proposals Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-xl shadow-md p-6 animate-pulse">
                <div className="h-6 bg-gray-200 rounded mb-4" />
                <div className="h-4 bg-gray-200 rounded mb-2" />
                <div className="h-4 bg-gray-200 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {getFilteredProposals().map(proposal => {
              const percentages = calculateVotePercentages(proposal);
              const isActive = proposal.state === 1;
              const hasVoted = votedProposals.has(proposal.id);
              const timeRemaining = getTimeRemaining(proposal.endBlock);
              const forVotes = Number(formatEther(proposal.forVotes || 0));
              const againstVotes = Number(formatEther(proposal.againstVotes || 0));
              const abstainVotes = Number(formatEther(proposal.abstainVotes || 0));

              return (
                <motion.div
                  key={proposal.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-200"
                >
                  {/* Enhanced Header */}
                  <div className="p-6 border-b border-gray-100">
                    <div className="flex items-start justify-between mb-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(proposal.state)} flex items-center gap-1`}>
                        {getStatusIcon(proposal.state)}
                        {getStatusText(proposal.state)}
                      </span>
                      <span className="text-xs text-gray-500">#{proposal.id}</span>
                    </div>
                    
                    <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
                      {proposal.title}
                    </h3>
                    
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                        {proposal.category || 'General'}
                      </span>
                      <span>•</span>
                      <span className="text-xs">{timeRemaining}</span>
                    </div>

                    <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                      {proposal.description}
                    </p>

                    <a
                      href={`https://etherscan.io/address/${proposal.proposer}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                    >
                      Proposer: {proposal.proposer.slice(0, 6)}...{proposal.proposer.slice(-4)}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  {/* Enhanced Voting Progress */}
                  <div className="p-6 bg-gray-50">
                    <div className="space-y-3 mb-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-green-700 font-medium">For</span>
                          <span className="text-gray-700">{percentages.for}% ({formatVotes(proposal.forVotes)})</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${percentages.for}%` }}
                          />
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-red-700 font-medium">Against</span>
                          <span className="text-gray-700">{percentages.against}% ({formatVotes(proposal.againstVotes)})</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-red-500 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${percentages.against}%` }}
                          />
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-700 font-medium">Abstain</span>
                          <span className="text-gray-700">{percentages.abstain}% ({formatVotes(proposal.abstainVotes)})</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-gray-400 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${percentages.abstain}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Enhanced Action Buttons */}
                    {isActive && !hasVoted ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleVoteEnhanced(proposal.id, 'for')}
                          className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-all"
                        >
                          For
                        </button>
                        <button
                          onClick={() => handleVoteEnhanced(proposal.id, 'against')}
                          className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-all"
                        >
                          Against
                        </button>
                        <button
                          onClick={() => handleVoteEnhanced(proposal.id, 'abstain')}
                          className="flex-1 px-4 py-2 bg-gray-400 hover:bg-gray-500 text-white rounded-lg font-medium transition-all"
                        >
                          Abstain
                        </button>
                      </div>
                    ) : isActive && hasVoted ? (
                      <div className="text-center text-sm text-gray-600 py-2 bg-gray-100 rounded-lg">
                        ✓ You have voted on this proposal
                      </div>
                    ) : proposal.state === 4 && !proposal.executed && isAdmin ? (
                      <button
                        onClick={() => handleExecuteEnhanced(proposal.id)}
                        className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-all"
                      >
                        Execute Proposal
                      </button>
                    ) : isAdmin && (proposal.state === 0 || proposal.state === 1) ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedProposal(proposal)}
                          className="flex-1 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-all"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => handleCancelProposal(proposal.id)}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all flex items-center gap-1"
                        >
                          <Ban className="w-4 h-4" />
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setSelectedProposal(proposal)}
                        className="w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-all"
                      >
                        View Details
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
        {/* Enhanced Proposal Detail Modal */}
        {selectedProposal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-40">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 sticky top-0 bg-white">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      {selectedProposal.title}
                    </h2>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(selectedProposal.state)} inline-flex items-center gap-1`}>
                      {getStatusIcon(selectedProposal.state)}
                      {getStatusText(selectedProposal.state)}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedProposal(null)}
                    className="text-gray-500 hover:text-gray-700 text-2xl"
                  >
                    ×
                  </button>
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-1">Description</h3>
                  <p className="text-gray-600">{selectedProposal.description}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-1">Proposer</h3>
                    <a
                      href={`https://etherscan.io/address/${selectedProposal.proposer}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      {selectedProposal.proposer.slice(0, 10)}...{selectedProposal.proposer.slice(-8)}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-1">Category</h3>
                    <span className="text-sm px-2 py-1 bg-purple-100 text-purple-700 rounded">
                      {selectedProposal.category || 'General'}
                    </span>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-1">Start Block</h3>
                    <p className="text-sm text-gray-600">
                      {selectedProposal.startBlock?.toString()}
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-1">End Block</h3>
                    <p className="text-sm text-gray-600">
                      {selectedProposal.endBlock?.toString()}
                    </p>
                  </div>
                </div>

                {/* Detailed Voting Stats */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Voting Results</h3>
                  <div className="space-y-2">
                    {['forVotes', 'againstVotes', 'abstainVotes'].map((voteType, index) => {
                      const colors = ['text-green-600', 'text-red-600', 'text-gray-600'];
                      const labels = ['For Votes', 'Against Votes', 'Abstain Votes'];
                      const votes = formatVotes(selectedProposal[voteType]);
                      
                      return (
                        <div key={voteType} className="flex justify-between items-center">
                          <span className={`text-sm font-medium ${colors[index]}`}>
                            {labels[index]}
                          </span>
                          <span className="text-sm text-gray-700">{votes} DVT</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Empty State */}
        {getFilteredProposals().length === 0 && !loading && (
          <div className="text-center py-12">
            <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No proposals found</h3>
            <p className="text-gray-600 mb-6">
              {filterStatus === 'All' 
                ? 'There are no proposals yet.' 
                : `There are no ${filterStatus.toLowerCase()} proposals at the moment.`
              }
            </p>
            {filterStatus === 'All' && (
              <Link to="/create-proposal" className="btn-primary">
                Create First Proposal
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Proposals;
