import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { motion } from 'framer-motion';
import { formatEther } from 'viem';
import toast from 'react-hot-toast';
import { 
  Vote, 
  Users, 
  UserCheck,
  TrendingUp,
  Settings,
  Shield,
  Clock,
  Target,
  Award,
  BarChart3,
  AlertCircle,
  CheckCircle2,
  Wallet,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  User,
  ExternalLink,
  FileText,
  Calendar,
  DollarSign
} from 'lucide-react';

import { CONTRACTS, CONTRACT_ADDRESSES, GOVERNANCE_PARAMS } from '../config/contracts';
import { GOVERNANCE_TOKEN_ABI, DAO_ABI } from '../config/abis';

// Mock data for proposals
const mockProposals = [
  {
    id: 1,
    title: "Increase Treasury Allocation for Development",
    description: "This proposal seeks to allocate an additional 50 ETH from the treasury to fund the development of new features including governance improvements, mobile app, and security audits.",
    proposer: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1",
    category: "Treasury",
    status: "Active",
    votesFor: 15420,
    votesAgainst: 3200,
    deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    fundingAmount: "50 ETH",
    ipfsLink: "ipfs://QmX7Y8Z9...",
    totalVotes: 18620
  },
  {
    id: 2,
    title: "Implement New Voting Mechanism",
    description: "Proposal to implement quadratic voting to ensure more democratic decision-making and prevent whale dominance in governance.",
    proposer: "0x8ba1f109551bD432803012645Ac136ddd64DBA72",
    category: "Governance",
    status: "Active",
    votesFor: 8900,
    votesAgainst: 7100,
    deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    fundingAmount: null,
    ipfsLink: "ipfs://QmA1B2C3...",
    totalVotes: 16000
  },
  {
    id: 3,
    title: "Partnership with DeFi Protocol",
    description: "Strategic partnership proposal with a major DeFi protocol to enhance liquidity and create new revenue streams for the DAO.",
    proposer: "0x9C7E4A5F8D1234567890ABCDef123456789aBcDe",
    category: "Partnership",
    status: "Executed",
    votesFor: 25000,
    votesAgainst: 2000,
    deadline: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    fundingAmount: null,
    ipfsLink: "ipfs://QmD4E5F6...",
    totalVotes: 27000
  },
  {
    id: 4,
    title: "Community Grants Program",
    description: "Establish a community grants program with 100 ETH budget to support community-driven initiatives and projects.",
    proposer: "0x1234567890ABCDef1234567890ABCDef12345678",
    category: "Community",
    status: "Rejected",
    votesFor: 4500,
    votesAgainst: 12000,
    deadline: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    fundingAmount: "100 ETH",
    ipfsLink: "ipfs://QmG7H8I9...",
    totalVotes: 16500
  },
  {
    id: 5,
    title: "Update Smart Contract Parameters",
    description: "Modify quorum requirements from 10% to 15% to ensure more engaged participation in governance decisions.",
    proposer: "0xABCDef1234567890ABCDef1234567890ABCDef12",
    category: "Technical",
    status: "Pending",
    votesFor: 0,
    votesAgainst: 0,
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 0.5 * 24 * 60 * 60 * 1000).toISOString(),
    fundingAmount: null,
    ipfsLink: "ipfs://QmJ1K2L3...",
    totalVotes: 0
  }
];

// ProposalStats Component
const ProposalStats = ({ proposals }) => {
  const stats = {
    total: proposals.length,
    active: proposals.filter(p => p.status === 'Active').length,
    executed: proposals.filter(p => p.status === 'Executed').length,
    rejected: proposals.filter(p => p.status === 'Rejected').length
  };

  const statCards = [
    { label: 'Total Proposals', value: stats.total, icon: FileText, color: 'blue' },
    { label: 'Active Proposals', value: stats.active, icon: TrendingUp, color: 'green' },
    { label: 'Executed Proposals', value: stats.executed, icon: CheckCircle, color: 'indigo' },
    { label: 'Rejected Proposals', value: stats.rejected, icon: XCircle, color: 'red' }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {statCards.map((stat, idx) => (
        <div key={idx} className="bg-white rounded-lg shadow-md p-6 border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">{stat.label}</p>
              <p className="text-3xl font-bold text-gray-800 mt-2">{stat.value}</p>
            </div>
            <stat.icon className={`w-10 h-10 text-${stat.color}-500 opacity-70`} />
          </div>
        </div>
      ))}
    </div>
  );
};

// ProposalCard Component
const ProposalCard = ({ proposal, onViewDetails, userVote }) => {
  const getStatusBadge = (status) => {
    const badges = {
      Active: 'bg-green-100 text-green-800 border-green-300',
      Pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      Executed: 'bg-blue-100 text-blue-800 border-blue-300',
      Rejected: 'bg-red-100 text-red-800 border-red-300'
    };
    return badges[status] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getTimeRemaining = (deadline) => {
    const now = new Date();
    const end = new Date(deadline);
    const diff = end - now;
    
    if (diff <= 0) return 'Ended';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h remaining`;
    return `${hours}h remaining`;
  };

  const votePercentage = proposal.totalVotes > 0 
    ? ((proposal.votesFor / proposal.totalVotes) * 100).toFixed(1)
    : 0;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-xl transition-shadow border border-gray-200">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-gray-500 text-sm font-medium">#{proposal.id}</span>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(proposal.status)}`}>
              {proposal.status}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
              {proposal.category}
            </span>
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">{proposal.title}</h3>
          <p className="text-gray-600 text-sm line-clamp-2">{proposal.description}</p>
        </div>
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <User className="w-4 h-4" />
          <span className="font-mono text-xs">{proposal.proposer.slice(0, 10)}...{proposal.proposer.slice(-8)}</span>
        </div>
        
        {proposal.fundingAmount && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <DollarSign className="w-4 h-4" />
            <span className="font-medium">{proposal.fundingAmount}</span>
          </div>
        )}

        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Calendar className="w-4 h-4" />
          <span>{getTimeRemaining(proposal.deadline)}</span>
        </div>
      </div>

      {/* Voting Progress */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-600">Support: {votePercentage}%</span>
          <span className="text-gray-600">{proposal.totalVotes.toLocaleString()} votes</span>
        </div>
        <div className="bg-gray-200 rounded-full h-2">
          <div 
            className="bg-green-500 h-2 rounded-full transition-all duration-300" 
            style={{ width: `${votePercentage}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>For: {proposal.votesFor.toLocaleString()}</span>
          <span>Against: {proposal.votesAgainst.toLocaleString()}</span>
        </div>
      </div>

      {/* User Vote Status */}
      {userVote && (
        <div className={`flex items-center gap-2 text-sm mb-4 p-2 rounded ${
          userVote === 'for' ? 'bg-green-50 text-green-700' : 
          userVote === 'against' ? 'bg-red-50 text-red-700' : 
          'bg-gray-50 text-gray-700'
        }`}>
          {userVote === 'for' ? <CheckCircle className="w-4 h-4" /> : 
           userVote === 'against' ? <XCircle className="w-4 h-4" /> : 
           <AlertCircle className="w-4 h-4" />}
          <span>You voted: {userVote}</span>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => onViewDetails(proposal)}
          className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          View Details
        </button>
        {proposal.ipfsLink && (
          <button className="bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors">
            <ExternalLink className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};

// ProposalModal Component
const ProposalModal = ({ proposal, onClose, isConnected, walletAddress, onVote, onExecute, userVote }) => {
  const [voting, setVoting] = useState(false);
  const [executing, setExecuting] = useState(false);

  const handleVote = async (voteType) => {
    setVoting(true);
    try {
      await onVote(proposal.id, voteType);
    } finally {
      setVoting(false);
    }
  };

  const handleExecute = async () => {
    setExecuting(true);
    try {
      await onExecute(proposal.id);
    } finally {
      setExecuting(false);
    }
  };

  const votePercentage = proposal.totalVotes > 0 
    ? ((proposal.votesFor / proposal.totalVotes) * 100).toFixed(1)
    : 0;

  return (
    <motion.div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800">Proposal #{proposal.id}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2">
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    proposal.status === 'Active' ? 'bg-green-100 text-green-800' :
                    proposal.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                    proposal.status === 'Executed' ? 'bg-blue-100 text-blue-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {proposal.status}
                  </span>
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
                    {proposal.category}
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">{proposal.title}</h3>
                <p className="text-gray-600 leading-relaxed">{proposal.description}</p>
              </div>

              {/* Voting Section */}
              {isConnected && proposal.status === 'Active' && (
                <div className="bg-gray-50 rounded-lg p-6 mb-6">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">Cast Your Vote</h4>
                  {userVote ? (
                    <div className={`flex items-center gap-2 p-4 rounded-lg ${
                      userVote === 'for' ? 'bg-green-50 border border-green-200' :
                      userVote === 'against' ? 'bg-red-50 border border-red-200' :
                      'bg-gray-50 border border-gray-200'
                    }`}>
                      {userVote === 'for' ? <CheckCircle className="w-5 h-5 text-green-600" /> :
                       userVote === 'against' ? <XCircle className="w-5 h-5 text-red-600" /> :
                       <AlertCircle className="w-5 h-5 text-gray-600" />}
                      <span className="font-medium">You have already voted: {userVote}</span>
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleVote('for')}
                        disabled={voting}
                        className="flex-1 bg-green-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-300 transition-colors"
                      >
                        {voting ? 'Voting...' : 'Vote For'}
                      </button>
                      <button
                        onClick={() => handleVote('against')}
                        disabled={voting}
                        className="flex-1 bg-red-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-red-700 disabled:bg-gray-300 transition-colors"
                      >
                        {voting ? 'Voting...' : 'Vote Against'}
                      </button>
                      <button
                        onClick={() => handleVote('abstain')}
                        disabled={voting}
                        className="flex-1 bg-gray-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-gray-700 disabled:bg-gray-300 transition-colors"
                      >
                        {voting ? 'Voting...' : 'Abstain'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Execution Section */}
              {proposal.status === 'Active' && votePercentage > 50 && (
                <div className="bg-blue-50 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-800 mb-4">Execute Proposal</h4>
                  <p className="text-gray-600 mb-4">
                    This proposal has passed and can now be executed.
                  </p>
                  <button
                    onClick={handleExecute}
                    disabled={executing}
                    className="bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
                  >
                    {executing ? 'Executing...' : 'Execute Proposal'}
                  </button>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Voting Results */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-gray-800 mb-4">Voting Results</h4>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">For ({votePercentage}%)</span>
                      <span className="font-medium">{proposal.votesFor.toLocaleString()}</span>
                    </div>
                    <div className="bg-gray-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{ width: `${votePercentage}%` }} />
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">Against ({(100 - votePercentage).toFixed(1)}%)</span>
                      <span className="font-medium">{proposal.votesAgainst.toLocaleString()}</span>
                    </div>
                    <div className="bg-gray-200 rounded-full h-2">
                      <div className="bg-red-500 h-2 rounded-full" style={{ width: `${100 - votePercentage}%` }} />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-200">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Votes</span>
                      <span className="font-medium">{proposal.totalVotes.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Proposal Details */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-gray-800 mb-4">Details</h4>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm text-gray-600">Proposer</span>
                    <p className="font-mono text-sm">{proposal.proposer}</p>
                  </div>
                  
                  {proposal.fundingAmount && (
                    <div>
                      <span className="text-sm text-gray-600">Funding Amount</span>
                      <p className="font-semibold text-green-600">{proposal.fundingAmount}</p>
                    </div>
                  )}
                  
                  <div>
                    <span className="text-sm text-gray-600">Created</span>
                    <p className="text-sm">{new Date(proposal.createdAt).toLocaleDateString()}</p>
                  </div>
                  
                  <div>
                    <span className="text-sm text-gray-600">Deadline</span>
                    <p className="text-sm">{new Date(proposal.deadline).toLocaleDateString()}</p>
                  </div>
                  
                  {proposal.ipfsLink && (
                    <div>
                      <span className="text-sm text-gray-600">IPFS Link</span>
                      <a 
                        href={`https://ipfs.io/ipfs/${proposal.ipfsLink.replace('ipfs://', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
                      >
                        View on IPFS <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const Governance = () => {
  const { address, isConnected } = useAccount();
  const [delegateAddress, setDelegateAddress] = useState('');
  const [isDelegating, setIsDelegating] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [userVotes, setUserVotes] = useState({});

  // Contract reads
  const { data: userBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.GOVERNANCE_TOKEN,
    abi: GOVERNANCE_TOKEN_ABI,
    functionName: 'balanceOf',
    args: [address],
    enabled: !!address,
  });

  const { data: userVotingPower } = useReadContract({
    address: CONTRACT_ADDRESSES.GOVERNANCE_TOKEN,
    abi: GOVERNANCE_TOKEN_ABI,
    functionName: 'getVotes',
    args: [address],
    enabled: !!address,
  });

  const { data: currentDelegate } = useReadContract({
    address: CONTRACT_ADDRESSES.GOVERNANCE_TOKEN,
    abi: GOVERNANCE_TOKEN_ABI,
    functionName: 'delegates',
    args: [address],
    enabled: !!address,
  });

  const { data: totalSupply } = useReadContract({
    address: CONTRACT_ADDRESSES.GOVERNANCE_TOKEN,
    abi: GOVERNANCE_TOKEN_ABI,
    functionName: 'totalSupply',
  });

  // Contract writes
  const { writeContract: delegate, data: delegateHash, isPending: isDelegatePending } = useWriteContract();
  const { isLoading: isDelegateConfirming } = useWaitForTransactionReceipt({ hash: delegateHash });

  const governanceParams = [
    {
      name: 'Voting Period',
      value: '3 days',
      description: 'How long voting remains open for each proposal',
      icon: Clock,
      color: 'bg-blue-500'
    },
    {
      name: 'Voting Delay',
      value: '1 hour',
      description: 'Delay between proposal creation and voting start',
      icon: Clock,
      color: 'bg-purple-500'
    },
    {
      name: 'Quorum',
      value: '10%',
      description: 'Minimum voting power required for proposal validity',
      icon: Target,
      color: 'bg-green-500'
    },
    {
      name: 'Proposal Threshold',
      value: '1,000 DVT',
      description: 'Minimum tokens needed to create a proposal',
      icon: Shield,
      color: 'bg-orange-500'
    },
  ];

  const categories = ['All', 'Treasury', 'Governance', 'Partnership', 'Community', 'Technical'];
  const proposals = mockProposals;

  const votingPowerPercentage = totalSupply && userVotingPower 
    ? (Number(formatEther(userVotingPower)) / Number(formatEther(totalSupply))) * 100 
    : 0;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'proposals', label: 'Proposals', icon: Vote },
    { id: 'delegation', label: 'Delegation', icon: Users },
    { id: 'parameters', label: 'Parameters', icon: Settings },
  ];

  // Filter proposals
  const filteredProposals = proposals.filter(proposal => {
    const matchesSearch = proposal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         proposal.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         proposal.id.toString().includes(searchQuery);
    const matchesStatus = statusFilter === 'All' || proposal.status === statusFilter;
    const matchesCategory = categoryFilter === 'All' || proposal.category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const handleDelegate = async (e) => {
    e.preventDefault();
    
    if (!delegateAddress.trim()) {
      toast.error('Please enter a valid address');
      return;
    }

    setIsDelegating(true);

    try {
      await delegate({
        address: CONTRACT_ADDRESSES.GOVERNANCE_TOKEN,
        abi: GOVERNANCE_TOKEN_ABI,
        functionName: 'delegate',
        args: [delegateAddress],
      });

      toast.success('Delegation successful!');
      setDelegateAddress('');
    } catch (error) {
      console.error('Delegation error:', error);
      toast.error('Failed to delegate voting power');
    } finally {
      setIsDelegating(false);
    }
  };

  const handleSelfDelegate = async () => {
    if (!address) return;

    setIsDelegating(true);

    try {
      await delegate({
        address: CONTRACT_ADDRESSES.GOVERNANCE_TOKEN,
        abi: GOVERNANCE_TOKEN_ABI,
        functionName: 'delegate',
        args: [address],
      });

      toast.success('Self-delegation successful!');
    } catch (error) {
      console.error('Self-delegation error:', error);
      toast.error('Failed to self-delegate');
    } finally {
      setIsDelegating(false);
    }
  };

  const handleVote = async (proposalId, voteType) => {
    // Mock voting functionality
    toast.success(`Vote cast: ${voteType} for proposal #${proposalId}`);
    setUserVotes(prev => ({ ...prev, [proposalId]: voteType }));
  };

  const handleExecute = async (proposalId) => {
    // Mock execution functionality
    toast.success(`Proposal #${proposalId} executed successfully!`);
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
        <motion.div 
          className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Wallet className="w-8 h-8 text-indigo-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Connect Your Wallet</h2>
          <p className="text-gray-600 mb-6">
            Please connect your wallet to view governance information and manage your voting power.
          </p>
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <div className="flex items-center justify-center gap-2 text-indigo-700">
              <Vote className="w-5 h-5" />
              <span className="font-medium">Ready to participate in DAO governance</span>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          className="text-center mb-8"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <h1 className="text-4xl font-bold text-gray-900 mb-2">DAO Governance</h1>
          <p className="text-lg text-gray-600">
            Participate in privacy-preserving identity verification and shape the future of digital identity
          </p>
        </motion.div>

        {/* Quick Stats Cards */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Your Balance</p>
                <p className="text-2xl font-bold text-blue-600">
                  {userBalance ? Number(formatEther(userBalance)).toFixed(2) : '0.00'}
                </p>
                <p className="text-xs text-gray-500">DVT Tokens</p>
              </div>
              <Vote className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Voting Power</p>
                <p className="text-2xl font-bold text-green-600">
                  {userVotingPower ? Number(formatEther(userVotingPower)).toFixed(2) : '0.00'}
                </p>
                <p className="text-xs text-gray-500">Active Votes</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Delegation</p>
                <p className="text-lg font-semibold text-purple-600">
                  {currentDelegate === address ? 'Self' : currentDelegate ? 'Delegated' : 'None'}
                </p>
                <p className="text-xs text-gray-500">
                  {currentDelegate === address ? 'Active' : currentDelegate ? 'Delegated' : 'Inactive'}
                </p>
              </div>
              <UserCheck className="w-8 h-8 text-purple-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-indigo-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Influence</p>
                <p className="text-2xl font-bold text-indigo-600">
                  {votingPowerPercentage.toFixed(4)}%
                </p>
                <p className="text-xs text-gray-500">Of Total Supply</p>
              </div>
              <Award className="w-8 h-8 text-indigo-500" />
            </div>
          </div>
        </motion.div>

        {/* Navigation Tabs */}
        <motion.div 
          className="bg-white rounded-xl shadow-lg mb-8"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                      activeTab === tab.id
                        ? 'border-indigo-500 text-indigo-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Voting Power Overview */}
                  <div className="lg:col-span-2">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                      <BarChart3 className="w-5 h-5 mr-2" />
                      Your Governance Overview
                    </h3>
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="text-lg font-semibold text-gray-800">Current Voting Power</h4>
                          <p className="text-3xl font-bold text-indigo-600">
                            {userVotingPower ? Number(formatEther(userVotingPower)).toFixed(2) : '0.00'} DVT
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Percentage of Total</p>
                          <p className="text-xl font-bold text-indigo-600">{votingPowerPercentage.toFixed(4)}%</p>
                        </div>
                      </div>
                      
                      <div className="bg-white rounded-lg p-4">
                        <div className="flex justify-between text-sm text-gray-600 mb-2">
                          <span>Your influence in governance decisions</span>
                          <span>{votingPowerPercentage.toFixed(6)}%</span>
                        </div>
                        <div className="bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-indigo-600 h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${Math.min(votingPowerPercentage * 10, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                      <Target className="w-5 h-5 mr-2" />
                      Quick Actions
                    </h3>
                    <div className="space-y-4">
                      <button
                        onClick={handleSelfDelegate}
                        disabled={currentDelegate === address}
                        className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all"
                      >
                        {currentDelegate === address ? 'Already Self-Delegated' : 'Self-Delegate'}
                      </button>
                      
                      <button
                        onClick={() => setActiveTab('proposals')}
                        className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-all"
                      >
                        View All Proposals
                      </button>
                      
                      <button
                        onClick={() => setActiveTab('delegation')}
                        className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 transition-all"
                      >
                        Manage Delegation
                      </button>
                    </div>
                  </div>
                </div>

                {/* Recent Proposals Preview */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                      <Vote className="w-5 h-5 mr-2" />
                      Recent Proposals
                    </h3>
                    <button
                      onClick={() => setActiveTab('proposals')}
                      className="text-blue-600 hover:text-blue-800 font-medium"
                    >
                      View All →
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {proposals.slice(0, 2).map(proposal => (
                      <ProposalCard
                        key={proposal.id}
                        proposal={proposal}
                        onViewDetails={setSelectedProposal}
                        userVote={userVotes[proposal.id]}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Proposals Tab */}
            {activeTab === 'proposals' && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                {/* Proposal Statistics */}
                <ProposalStats proposals={proposals} />

                {/* Filters and Search */}
                <div className="bg-white rounded-xl shadow-md p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="text"
                        placeholder="Search by title or ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div className="relative">
                      <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                      >
                        <option>All</option>
                        <option>Active</option>
                        <option>Pending</option>
                        <option>Executed</option>
                        <option>Rejected</option>
                      </select>
                    </div>
                    <div className="relative">
                      <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                      >
                        {categories.map(cat => (
                          <option key={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Proposals Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {filteredProposals.map(proposal => (
                    <ProposalCard
                      key={proposal.id}
                      proposal={proposal}
                      onViewDetails={setSelectedProposal}
                      userVote={userVotes[proposal.id]}
                    />
                  ))}
                </div>

                {filteredProposals.length === 0 && (
                  <div className="bg-white rounded-xl shadow-md p-12 text-center">
                    <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-800 mb-2">No Proposals Found</h3>
                    <p className="text-gray-600">Try adjusting your filters or search query</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* Delegation Tab */}
            {activeTab === 'delegation' && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                    <Users className="w-5 h-5 mr-2" />
                    Voting Power Delegation
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Delegate your voting power to another address or delegate to yourself to participate in governance.
                  </p>
                </div>

                {/* Self Delegate Option */}
                <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <UserCheck className="w-5 h-5 mr-2" />
                    Self-Delegation
                  </h4>
                  <p className="text-gray-600 mb-4">
                    Delegate to yourself to activate your voting power and participate directly in governance decisions.
                  </p>
                  <button
                    onClick={handleSelfDelegate}
                    disabled={currentDelegate === address || isDelegating || isDelegatePending || isDelegateConfirming}
                    className="bg-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all transform hover:scale-105"
                  >
                    {currentDelegate === address ? 'Already Self-Delegated' : 
                     isDelegating || isDelegatePending || isDelegateConfirming ? 'Processing...' : 
                     'Delegate to Myself'}
                  </button>
                </div>

                {/* Custom Delegation */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Delegate to Another Address</h4>
                  <p className="text-gray-600 mb-4">
                    Delegate your voting power to another address that you trust to make governance decisions on your behalf.
                  </p>
                  
                  <div className="bg-gray-50 rounded-lg p-4">
                    <form onSubmit={handleDelegate} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Delegate Address
                        </label>
                        <input
                          type="text"
                          value={delegateAddress}
                          onChange={(e) => setDelegateAddress(e.target.value)}
                          placeholder="0x..."
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                          disabled={isDelegating || isDelegatePending || isDelegateConfirming}
                        />
                      </div>
                      
                      <button
                        type="submit"
                        disabled={isDelegating || isDelegatePending || isDelegateConfirming || !delegateAddress.trim()}
                        className="w-full bg-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all transform hover:scale-105"
                      >
                        {isDelegating || isDelegatePending || isDelegateConfirming ? 'Processing...' : 'Delegate Voting Power'}
                      </button>
                    </form>
                  </div>
                </div>

                {/* Current Delegation Info */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Current Delegation Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Delegated To</h5>
                      <div className="bg-gray-50 rounded p-3">
                        <p className="font-mono text-sm">
                          {currentDelegate || 'Not delegated'}
                        </p>
                        {currentDelegate === address && (
                          <div className="mt-2 flex items-center text-green-600">
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            <span className="text-sm">Self-delegated</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <h5 className="text-sm font-medium text-gray-700 mb-2">Voting Power Status</h5>
                      <div className="bg-gray-50 rounded p-3">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-gray-600">Available to vote:</span>
                          <span className="font-semibold">
                            {userVotingPower ? Number(formatEther(userVotingPower)).toFixed(2) : '0.00'} DVT
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Token balance:</span>
                          <span className="font-semibold">
                            {userBalance ? Number(formatEther(userBalance)).toFixed(2) : '0.00'} DVT
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Parameters Tab */}
            {activeTab === 'parameters' && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                    <Settings className="w-5 h-5 mr-2" />
                    Governance Parameters
                  </h3>
                  <p className="text-gray-600 mb-6">
                    These parameters define how the DAO governance system operates and can only be changed through governance proposals.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {governanceParams.map((param, index) => {
                    const Icon = param.icon;
                    return (
                      <motion.div
                        key={param.name}
                        className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 * index }}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`w-12 h-12 ${param.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                            <Icon className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 mb-1">{param.name}</h4>
                            <div className="text-2xl font-bold text-gray-800 mb-2">{param.value}</div>
                            <p className="text-sm text-gray-600">{param.description}</p>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Additional Info */}
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">System Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-800">
                        {totalSupply ? Number(formatEther(totalSupply)).toLocaleString() : '0'}
                      </div>
                      <div className="text-sm text-gray-600">Total Token Supply</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-2xl font-bold text-indigo-600">
                        {CONTRACT_ADDRESSES.GOVERNANCE_TOKEN ? 'Active' : 'Inactive'}
                      </div>
                      <div className="text-sm text-gray-600">Governance Status</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        ERC20 + ERC20Votes
                      </div>
                      <div className="text-sm text-gray-600">Token Standard</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Proposal Modal */}
        {selectedProposal && (
          <ProposalModal
            proposal={selectedProposal}
            onClose={() => setSelectedProposal(null)}
            isConnected={isConnected}
            walletAddress={address}
            onVote={handleVote}
            onExecute={handleExecute}
            userVote={userVotes[selectedProposal.id]}
          />
        )}
      </div>
    </div>
  );
};

export default Governance;
