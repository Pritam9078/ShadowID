import { useEffect, useState } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useProposals } from '../context/ProposalContext';
import ConnectionStatus from '../components/ConnectionStatus.jsx';
import WebSocketTestPanel from '../components/WebSocketTestPanel.jsx';
import { 
  Vote, 
  Coins, 
  FileText, 
  TrendingUp,
  Users,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  Eye,
  X,
  Search,
  Wallet,
  LogOut,
  ArrowRight,
  Settings
} from 'lucide-react';

import { CONTRACTS, CONTRACT_ADDRESSES } from '../config/contracts';
import { DAO_ABI, GOVERNANCE_TOKEN_ABI, TREASURY_ABI } from '../config/abis';
import { formatEther } from 'viem';

const Dashboard = () => {
  const { address, isConnected, disconnect } = useAccount();
  const navigate = useNavigate();
  const { getRecentProposals, getActiveProposals, addProposal, updateProposal, connectionStatus, wsConnected, reconnect } = useProposals();
  
  // Check if user is owner/admin
  const { data: daoOwner } = useReadContract({
    address: CONTRACT_ADDRESSES.DAO,
    abi: DAO_ABI,
    functionName: 'owner',
  });
  
  const isAdmin = address && daoOwner && address.toLowerCase() === daoOwner.toLowerCase();
  
  // Define specific admin wallet addresses (same as Navbar)
  const adminAddresses = [
    '0xa62463a56ee9d742f810920f56cebc4b696ebd0a', // Deployer address
    // ADD YOUR WALLET ADDRESS HERE (copy from browser console)
    // Example: '0x1234567890123456789012345678901234567890',
  ];

  // Check if current address is in admin list
  const isAdminByAddress = address && adminAddresses.some(adminAddr => 
    address.toLowerCase() === adminAddr.toLowerCase()
  );

  // Final admin status (contract-based OR address-based)
  const isAdminFinal = isAdmin || isAdminByAddress;
  
  // TEMPORARY: Make admin panel visible for all connected users for testing
  const isTestingMode = true;
  const isAdminWithTesting = isAdminFinal || (isConnected && isTestingMode);
  
  // Debug logging
  console.log('Dashboard Admin Check:', {
    address,
    daoOwner,
    contractAdmin: isAdmin,
    addressAdmin: isAdminByAddress,
    finalAdmin: isAdminFinal,
    testingMode: isTestingMode,
    adminWithTesting: isAdminWithTesting,
    adminAddresses: adminAddresses
  });
  
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [proposalForm, setProposalForm] = useState({ title: '', description: '', duration: '7', category: 'General', fundingAmount: '' });
  const [voteChoice, setVoteChoice] = useState('');
  const [fundAmount, setFundAmount] = useState('');
  const [fundAction, setFundAction] = useState('deposit');
  const [userRole, setUserRole] = useState('Member');

  const [stats, setStats] = useState({
    totalProposals: 0,
    activeProposals: 0,
    treasuryBalance: '0',
    userVotingPower: '0',
    userTokenBalance: '0',
    totalSupply: '0',
    totalMembers: 1247,
    totalVotes: 5629
  });

  // Get recent proposals from context
  const recentProposals = getRecentProposals();
  const activeProposals = getActiveProposals();

  const [treasuryActivity, setTreasuryActivity] = useState([
    { type: 'Deposit', amount: '50 ETH', from: '0x742d...8c9a', time: '2 hours ago' },
    { type: 'Withdraw', amount: '15 ETH', to: '0x1a3f...4b2c', time: '1 day ago' }
  ]);

  const [memberActivity, setMemberActivity] = useState([
    { address: '0x742d...8c9a', action: 'Created proposal', time: '1 hour ago' },
    { address: '0x1a3f...4b2c', action: 'Voted on Proposal', time: '3 hours ago' }
  ]);

  const voteDistribution = [
    { name: 'For', value: 1350, color: '#10B981' },
    { name: 'Against', value: 445, color: '#EF4444' },
    { name: 'Abstain', value: 95, color: '#6B7280' }
  ];

  // Contract reads
  const { data: proposalCount } = useReadContract({
    address: CONTRACTS.DAO.address,
    abi: DAO_ABI,
    functionName: 'proposalCount',
  });

  const { data: treasuryBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.TREASURY,
    abi: TREASURY_ABI,
    functionName: 'getBalance',
  });

  const { data: userVotingPower } = useReadContract({
    address: CONTRACT_ADDRESSES.GOVERNANCE_TOKEN,
    abi: GOVERNANCE_TOKEN_ABI,
    functionName: 'getVotes',
    args: [address],
    enabled: !!address,
  });

  const { data: userTokenBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.GOVERNANCE_TOKEN,
    abi: GOVERNANCE_TOKEN_ABI,
    functionName: 'balanceOf',
    args: [address],
    enabled: !!address,
  });

  const { data: totalSupply } = useReadContract({
    address: CONTRACT_ADDRESSES.GOVERNANCE_TOKEN,
    abi: GOVERNANCE_TOKEN_ABI,
    functionName: 'totalSupply',
  });

  useEffect(() => {
    setStats({
      totalProposals: proposalCount ? Number(proposalCount) : recentProposals.length,
      activeProposals: activeProposals.length,
      treasuryBalance: treasuryBalance ? formatEther(treasuryBalance) : '342.5',
      userVotingPower: userVotingPower ? formatEther(userVotingPower) : '0',
      userTokenBalance: userTokenBalance ? formatEther(userTokenBalance) : '0',
      totalSupply: totalSupply ? formatEther(totalSupply) : '0',
      totalMembers: 1247,
      totalVotes: 5629
    });
    setTimeout(() => setLoading(false), 1500);

    // Set user role based on token balance or other criteria
    if (isConnected && userTokenBalance) {
      const balance = Number(formatEther(userTokenBalance));
      if (balance >= 1000) {
        setUserRole('Admin');
      } else if (balance >= 100) {
        setUserRole('Delegate');
      } else {
        setUserRole('Member');
      }
    } else if (isConnected) {
      setUserRole('Member');
    } else {
      setUserRole('Guest');
    }
  }, [proposalCount, treasuryBalance, userVotingPower, userTokenBalance, totalSupply, recentProposals, activeProposals, isConnected]);

  const showNotification = (message, type) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 3000);
  };

  const connectWallet = async () => {
    try {
      if (typeof window.ethereum !== 'undefined') {
        showNotification('Please connect your wallet using the connect button', 'error');
      } else {
        showNotification('Install MetaMask to connect your wallet!', 'error');
      }
    } catch (error) {
      showNotification('Connection failed', 'error');
    }
  };

  const openModal = (type, proposal = null) => {
    setModalType(type);
    setSelectedProposal(proposal);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setModalType('');
    setSelectedProposal(null);
    setProposalForm({ title: '', description: '', duration: '7', category: 'General', fundingAmount: '' });
    setVoteChoice('');
    setFundAmount('');
  };

  const handleCreateProposal = () => {
    if (!isConnected) return showNotification('Connect wallet first', 'error');
    if (!proposalForm.title || !proposalForm.description) return showNotification('Fill all required fields', 'error');
    
    // Add the proposal using the context
    const newProposal = addProposal(proposalForm);
    
    showNotification('Proposal created successfully!', 'success');
    closeModal();
  };

  const handleVote = () => {
    if (!isConnected) return showNotification('Connect wallet', 'error');
    if (!voteChoice) return showNotification('Select vote option', 'error');
    
    // Update the proposal using the context
    const updates = {
      votesFor: voteChoice === 'for' ? selectedProposal.votesFor + 1 : selectedProposal.votesFor,
      votesAgainst: voteChoice === 'against' ? selectedProposal.votesAgainst + 1 : selectedProposal.votesAgainst,
      votesAbstain: voteChoice === 'abstain' ? selectedProposal.votesAbstain + 1 : selectedProposal.votesAbstain
    };
    
    updateProposal(selectedProposal.id, updates);
    
    showNotification('Vote recorded successfully!', 'success');
    closeModal();
  };

  const handleFundAction = () => {
    if (!isConnected) return showNotification('Connect wallet', 'error');
    if (!fundAmount || parseFloat(fundAmount) <= 0) return showNotification('Invalid amount', 'error');
    
    const amount = parseFloat(fundAmount);
    const balance = parseFloat(stats.treasuryBalance);
    
    if (fundAction === 'withdraw' && amount > balance) return showNotification('Insufficient balance', 'error');
    
    const newBalance = fundAction === 'deposit' ? balance + amount : balance - amount;
    setStats(prev => ({ ...prev, treasuryBalance: newBalance.toFixed(2) }));
    showNotification('Transaction complete!', 'success');
    closeModal();
  };

  const calculateProgress = (p) => {
    const total = p.votesFor + p.votesAgainst + p.votesAbstain;
    return total > 0 ? (p.votesFor / total) * 100 : 0;
  };

  const filteredProposals = recentProposals.filter(p => 
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const StatCard = ({ icon: Icon, label, value, trend }) => (
    <div className="bg-gradient-to-br from-[#1E1E2F] to-[#2A2A3E] rounded-2xl p-6 shadow-lg hover:shadow-xl hover:scale-105 transition-all border border-gray-800">
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 bg-[#38BDF8] bg-opacity-10 rounded-xl">
          <Icon className="text-[#38BDF8]" size={24} />
        </div>
        {trend && <span className="text-[#10B981] text-sm">{trend}</span>}
      </div>
      <p className="text-gray-400 text-sm mb-1">{label}</p>
      <p className="text-white text-3xl font-bold">{value}</p>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0F0F1E] to-[#1E1E2F] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-[#38BDF8] mx-auto mb-4"></div>
          <p className="text-gray-400">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0F0F1E] to-[#1E1E2F] flex items-center justify-center text-white">
        <motion.div 
          className="flex flex-col items-center justify-center text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-center mb-6">
            <img 
              src="/shadowid-logo.png" 
              alt="ShadowID Logo" 
              className="w-12 h-12 object-contain"
            />
            <div className="text-left">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-[#38BDF8] to-[#10B981] bg-clip-text text-transparent">DVote</h1>
              <p className="text-lg text-gray-400">Identity Verification</p>
            </div>
          </div>
          <p className="text-lg text-gray-400 mb-8 max-w-md">
            A fully on-chain governance platform for DAOs. Connect your wallet to get started.
          </p>
          <div className="bg-[#1E1E2F] p-6 rounded-xl shadow-lg border border-gray-800">
            <h3 className="text-lg font-semibold mb-2 text-[#38BDF8]">🚀 Getting Started</h3>
            <ul className="text-left text-gray-400 space-y-2">
              <li>• Connect your wallet to participate</li>
              <li>• Hold DVT tokens to gain voting power</li>
              <li>• Create and vote on proposals</li>
              <li>• Help govern the DAO treasury</li>
            </ul>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F0F1E] to-[#1E1E2F] text-white p-6">
      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div className="bg-[#1E1E2F] rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-800" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">
                {modalType === 'create' && 'Create New Proposal'}
                {modalType === 'vote' && 'Vote on Proposal'}
                {modalType === 'view' && 'Proposal Details'}
                {modalType === 'funds' && 'Manage Treasury Funds'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>

            {modalType === 'create' && (
              <div className="space-y-4">
                <input
                  type="text"
                  value={proposalForm.title}
                  onChange={e => setProposalForm({...proposalForm, title: e.target.value})}
                  className="w-full bg-[#2A2A3E] border border-gray-700 rounded-lg px-4 py-3 text-white"
                  placeholder="Proposal title *"
                  required
                />
                <textarea
                  value={proposalForm.description}
                  onChange={e => setProposalForm({...proposalForm, description: e.target.value})}
                  className="w-full bg-[#2A2A3E] border border-gray-700 rounded-lg px-4 py-3 text-white h-32"
                  placeholder="Description *"
                  required
                />
                <div className="grid grid-cols-2 gap-4">
                  <select
                    value={proposalForm.category}
                    onChange={e => setProposalForm({...proposalForm, category: e.target.value})}
                    className="w-full bg-[#2A2A3E] border border-gray-700 rounded-lg px-4 py-3 text-white"
                  >
                    <option value="General">General</option>
                    <option value="Treasury">Treasury</option>
                    <option value="Governance">Governance</option>
                    <option value="Partnership">Partnership</option>
                    <option value="Community">Community</option>
                  </select>
                  <input
                    type="number"
                    value={proposalForm.duration}
                    onChange={e => setProposalForm({...proposalForm, duration: e.target.value})}
                    className="w-full bg-[#2A2A3E] border border-gray-700 rounded-lg px-4 py-3 text-white"
                    min="1"
                    placeholder="Duration (days)"
                  />
                </div>
                <input
                  type="text"
                  value={proposalForm.fundingAmount}
                  onChange={e => setProposalForm({...proposalForm, fundingAmount: e.target.value})}
                  className="w-full bg-[#2A2A3E] border border-gray-700 rounded-lg px-4 py-3 text-white"
                  placeholder="Funding amount (e.g., 50 ETH) - Optional"
                />
                <button onClick={handleCreateProposal} className="w-full bg-gradient-to-r from-[#38BDF8] to-[#10B981] px-6 py-3 rounded-xl font-semibold">
                  Create Proposal
                </button>
              </div>
            )}

            {modalType === 'vote' && selectedProposal && (
              <div className="space-y-4">
                <div className="bg-[#2A2A3E] rounded-xl p-4 mb-4">
                  <h3 className="font-semibold mb-2 text-white">{selectedProposal.title}</h3>
                  <p className="text-gray-400 text-sm">{selectedProposal.description}</p>
                </div>
                <button onClick={() => setVoteChoice('for')} className={'w-full p-4 rounded-xl border-2 ' + (voteChoice === 'for' ? 'border-[#10B981] bg-[#10B981] bg-opacity-20' : 'border-gray-700')}>
                  <div className="flex justify-between items-center">
                    <span className="text-white">Vote For</span>
                    <CheckCircle className="text-[#10B981]" size={24} />
                  </div>
                </button>
                <button onClick={() => setVoteChoice('against')} className={'w-full p-4 rounded-xl border-2 ' + (voteChoice === 'against' ? 'border-red-500 bg-red-500 bg-opacity-20' : 'border-gray-700')}>
                  <div className="flex justify-between items-center">
                    <span className="text-white">Vote Against</span>
                    <XCircle className="text-red-500" size={24} />
                  </div>
                </button>
                <button onClick={() => setVoteChoice('abstain')} className={'w-full p-4 rounded-xl border-2 ' + (voteChoice === 'abstain' ? 'border-gray-500 bg-gray-500 bg-opacity-20' : 'border-gray-700')}>
                  <div className="flex justify-between items-center">
                    <span className="text-white">Abstain</span>
                    <AlertCircle className="text-gray-500" size={24} />
                  </div>
                </button>
                <button onClick={handleVote} disabled={!voteChoice} className="w-full bg-gradient-to-r from-[#38BDF8] to-[#10B981] px-6 py-3 rounded-xl font-semibold disabled:opacity-50">
                  Submit Vote
                </button>
              </div>
            )}

            {modalType === 'view' && selectedProposal && (
              <div className="space-y-4">
                <div className="bg-[#2A2A3E] rounded-xl p-4 mb-4">
                  <h3 className="font-semibold mb-2 text-white">{selectedProposal.title}</h3>
                  <p className="text-gray-400 text-sm mb-4">{selectedProposal.description}</p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-400">Status</p>
                      <p className="font-semibold text-white">{selectedProposal.status}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Time Left</p>
                      <p className="font-semibold text-white">{selectedProposal.endTime}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Creator</p>
                      <p className="font-semibold text-[#38BDF8]">{selectedProposal.creator}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Total Votes</p>
                      <p className="font-semibold text-white">{selectedProposal.votesFor + selectedProposal.votesAgainst + selectedProposal.votesAbstain}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-[#2A2A3E] rounded-xl p-4">
                  <h4 className="font-semibold mb-3 text-white">Vote Distribution</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-[#10B981]">For</span>
                      <span className="text-white">{selectedProposal.votesFor}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-red-400">Against</span>
                      <span className="text-white">{selectedProposal.votesAgainst}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Abstain</span>
                      <span className="text-white">{selectedProposal.votesAbstain}</span>
                    </div>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2 mt-4">
                    <div className="bg-gradient-to-r from-[#10B981] to-[#38BDF8] h-2 rounded-full" style={{width: calculateProgress(selectedProposal) + '%'}}></div>
                  </div>
                </div>
                {selectedProposal.status === 'Active' && (
                  <button onClick={() => {closeModal(); openModal('vote', selectedProposal);}} className="w-full bg-gradient-to-r from-[#38BDF8] to-[#10B981] px-6 py-3 rounded-xl font-semibold">
                    Vote on this Proposal
                  </button>
                )}
              </div>
            )}

            {modalType === 'funds' && (
              <div className="space-y-4">
                <div className="flex gap-4">
                  <button onClick={() => setFundAction('deposit')} className={'flex-1 py-3 rounded-xl font-semibold ' + (fundAction === 'deposit' ? 'bg-[#10B981]' : 'bg-[#2A2A3E]')}>
                    Deposit
                  </button>
                  <button onClick={() => setFundAction('withdraw')} className={'flex-1 py-3 rounded-xl font-semibold ' + (fundAction === 'withdraw' ? 'bg-red-500' : 'bg-[#2A2A3E]')}>
                    Withdraw
                  </button>
                </div>
                <input
                  type="number"
                  value={fundAmount}
                  onChange={e => setFundAmount(e.target.value)}
                  className="w-full bg-[#2A2A3E] border border-gray-700 rounded-lg px-4 py-3 text-white"
                  placeholder="Amount in ETH"
                  step="0.01"
                />
                <div className="bg-[#2A2A3E] rounded-xl p-4">
                  <p className="text-gray-400 text-sm">Current Balance</p>
                  <p className="text-2xl font-bold text-white">{stats.treasuryBalance} ETH</p>
                </div>
                <button onClick={handleFundAction} className={'w-full px-6 py-3 rounded-xl font-semibold ' + (fundAction === 'deposit' ? 'bg-gradient-to-r from-[#10B981] to-[#38BDF8]' : 'bg-gradient-to-r from-red-500 to-red-600')}>
                  {fundAction === 'deposit' ? 'Deposit' : 'Withdraw'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notifications */}
      <div className="fixed top-4 right-4 z-40 space-y-2">
        {notifications.map(n => (
          <div key={n.id} className={'px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 text-white ' + (n.type === 'success' ? 'bg-[#10B981]' : 'bg-red-500')}>
            {n.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
            {n.message}
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-[#38BDF8] to-[#10B981] bg-clip-text text-transparent">
            ShadowID Dashboard
          </h1>
          <p className="text-gray-400">Identity Verification</p>
          {/* WebSocket Connection Status */}
          <div className="mt-2">
            <ConnectionStatus 
              connectionStatus={connectionStatus}
              onReconnect={reconnect}
              showDetails={false}
            />
          </div>
        </div>
        {isConnected ? (
          <div className="flex items-center gap-3">
            <div className="bg-[#1E1E2F] border border-[#38BDF8] rounded-xl px-4 py-3">
              <p className="text-xs text-gray-400">Connected as {userRole}</p>
              <p className="text-[#38BDF8] font-mono text-sm">{address?.slice(0, 6)}...{address?.slice(-4)}</p>
              {/* Debug admin status */}
              <p className="text-xs text-yellow-400">Admin: {isAdmin ? 'Yes' : 'No'}</p>
            </div>
            <button onClick={() => disconnect()} className="p-3 bg-red-500 bg-opacity-10 text-red-500 rounded-xl">
              <LogOut size={20} />
            </button>
          </div>
        ) : (
          <button onClick={connectWallet} className="bg-gradient-to-r from-[#38BDF8] to-[#10B981] px-6 py-3 rounded-xl font-semibold">
            Connect Wallet
          </button>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard icon={Users} label="Total Members" value={stats.totalMembers} trend="+12%" />
        <StatCard icon={FileText} label="Active Proposals" value={stats.activeProposals} trend="+3" />
        <StatCard icon={Wallet} label="Treasury" value={stats.treasuryBalance + ' ETH'} trend="+8%" />
        <StatCard icon={Vote} label="Total Votes" value={stats.totalVotes} trend="+15%" />
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-[#1E1E2F] border border-gray-800 rounded-xl pl-12 pr-4 py-3 text-white"
            placeholder="Search proposals..."
          />
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Recent Proposals */}
        <div className="lg:col-span-2 bg-[#1E1E2F] rounded-2xl p-6 border border-gray-800">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold flex items-center">
              <FileText className="mr-3 text-[#38BDF8]" size={28} />
              Recent Proposals
            </h2>
          </div>
          <div className="space-y-4">
            {filteredProposals.slice(0, 3).map(p => (
              <div key={p.id} className="bg-[#2A2A3E] rounded-xl p-5 hover:bg-[#353550] transition-all">
                <div className="flex justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">{p.title}</h3>
                    <p className="text-gray-400 text-sm">{p.description}</p>
                  </div>
                  <span className={'px-3 py-1 rounded-full text-xs font-semibold ml-4 ' + (p.status === 'Active' ? 'bg-blue-500' : 'bg-green-500')}>
                    {p.status}
                  </span>
                </div>
                <div className="mb-3">
                  <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                    <div className="bg-gradient-to-r from-[#10B981] to-[#38BDF8] h-2 rounded-full" style={{width: calculateProgress(p) + '%'}}></div>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#10B981]">For: {p.votesFor}</span>
                    <span className="text-red-400">Against: {p.votesAgainst}</span>
                    <span className="text-gray-400">Abstain: {p.votesAbstain}</span>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => openModal('view', p)} className="flex-1 bg-[#38BDF8] bg-opacity-10 text-[#38BDF8] px-4 py-2 rounded-lg">
                    <Eye size={16} className="inline mr-2" />
                    View
                  </button>
                  {p.status === 'Active' && (
                    <button onClick={() => openModal('vote', p)} className="flex-1 bg-gradient-to-r from-[#38BDF8] to-[#10B981] px-4 py-2 rounded-lg">
                      <Vote size={16} className="inline mr-2" />
                      Vote
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          </div>

        {/* Treasury Card */}
        <div className="bg-[#1E1E2F] rounded-2xl p-6 border border-gray-800">
          <h2 className="text-2xl font-bold mb-6 flex items-center">
            <Wallet className="mr-3 text-[#10B981]" size={28} />
            Treasury
          </h2>
          <div className="bg-gradient-to-br from-[#10B981] to-[#38BDF8] rounded-xl p-6 mb-6">
            <p className="text-sm mb-2">Total Balance</p>
            <p className="text-4xl font-bold">{stats.treasuryBalance} ETH</p>
          </div>
          <h3 className="font-semibold mb-4">Recent Activity</h3>
          <div className="space-y-3 mb-6">
            {treasuryActivity.map((a, i) => (
              <div key={i} className="bg-[#2A2A3E] rounded-lg p-4">
                <div className="flex justify-between mb-2">
                  <span className={'text-sm font-semibold ' + (a.type === 'Deposit' ? 'text-[#10B981]' : 'text-red-400')}>{a.type}</span>
                  <span className="text-gray-400 text-xs">{a.time}</span>
                </div>
                <p className="font-semibold">{a.amount}</p>
              </div>
            ))}
          </div>
          <button onClick={() => openModal('funds')} className="w-full bg-[#10B981] bg-opacity-10 text-[#10B981] border border-[#10B981] px-4 py-3 rounded-xl font-semibold">
            Manage Funds
          </button>
        </div>
        </div>

      {/* WebSocket Test Panel */}
      <div className="mb-8">
        <WebSocketTestPanel />
      </div>

      {/* Analytics and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Governance Analytics */}
        <div className="bg-[#1E1E2F] rounded-2xl p-6 border border-gray-800">
          <h2 className="text-2xl font-bold mb-6 flex items-center">
            <TrendingUp className="mr-3 text-[#38BDF8]" size={28} />
            Governance Analytics
          </h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={voteDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                {voteDistribution.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-6 mt-4">
            {voteDistribution.map((item, i) => (
              <div key={i} className="flex items-center">
                <div className="w-3 h-3 rounded-full mr-2" style={{backgroundColor: item.color}}></div>
                <span className="text-sm text-gray-400">{item.name}: {item.value}</span>
              </div>
            ))}
          </div>
          </div>

        {/* Member Activity */}
        <div className="bg-[#1E1E2F] rounded-2xl p-6 border border-gray-800">
          <h2 className="text-2xl font-bold mb-6 flex items-center">
            <Clock className="mr-3 text-[#10B981]" size={28} />
            Member Activity
          </h2>
          <div className="space-y-3">
            {memberActivity.map((a, i) => (
              <div key={i} className="bg-[#2A2A3E] rounded-lg p-4">
                <div className="flex justify-between mb-2">
                  <span className="text-[#38BDF8] font-mono text-sm">{a.address}</span>
                  <span className="text-gray-400 text-xs">{a.time}</span>
                </div>
                <p className="text-sm">{a.action}</p>
              </div>
            ))}
          </div>
        </div>
        </div>

      {/* Quick Actions */}
      <div className="bg-[#1E1E2F] rounded-2xl p-6 border border-gray-800">
        <h2 className="text-2xl font-bold mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button onClick={() => openModal('create')} className="bg-gradient-to-r from-[#38BDF8] to-[#10B981] p-6 rounded-xl text-left hover:shadow-lg transition-all">
            <Plus size={32} className="mb-3" />
            <p className="font-semibold">Create Proposal</p>
          </button>
          <button className="bg-[#2A2A3E] p-6 rounded-xl text-left hover:bg-[#353550] transition-all">
            <Vote size={32} className="mb-3 text-[#38BDF8]" />
            <p className="font-semibold">Vote on Proposals</p>
          </button>
          <button onClick={() => openModal('funds')} className="bg-[#2A2A3E] p-6 rounded-xl text-left hover:bg-[#353550] transition-all">
            <Wallet size={32} className="mb-3 text-[#10B981]" />
            <p className="font-semibold">Manage Funds</p>
          </button>
          {(isAdminWithTesting) ? (
            <button 
              onClick={() => navigate('/admin')} 
              className="bg-gradient-to-r from-orange-500 to-red-500 p-6 rounded-xl text-left hover:shadow-lg transition-all"
            >
              <Settings size={32} className="mb-3" />
              <p className="font-semibold">Admin Panel</p>
            </button>
          ) : (
            <button className="bg-[#2A2A3E] p-6 rounded-xl text-left hover:bg-[#353550] transition-all">
              <Eye size={32} className="mb-3 text-[#38BDF8]" />
              <p className="font-semibold">Governance Board</p>
            </button>
          )}
        </div>
        {/* Debug row - always show admin button for testing */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
          <button 
            onClick={() => navigate('/admin')} 
            className="bg-gradient-to-r from-purple-500 to-pink-500 p-6 rounded-xl text-left hover:shadow-lg transition-all"
          >
            <Settings size={32} className="mb-3" />
            <p className="font-semibold">Debug Admin Panel</p>
          </button>
          <div className="bg-[#2A2A3E] p-4 rounded-xl text-gray-400">
            <p className="text-sm font-semibold text-yellow-400">Debug Info:</p>
            <p className="text-xs">Admin Status: {isAdminWithTesting ? 'TRUE' : 'FALSE'}</p>
            <p className="text-xs">Contract Admin: {isAdmin ? 'TRUE' : 'FALSE'}</p>
            <p className="text-xs">Address Admin: {isAdminByAddress ? 'TRUE' : 'FALSE'}</p>
            <p className="text-xs">Testing Mode: {isTestingMode ? 'TRUE' : 'FALSE'}</p>
            <p className="text-xs">Connected: {isConnected ? 'YES' : 'NO'}</p>
            <p className="text-xs">Your Address: {address ? `${address.slice(0,8)}...${address.slice(-4)}` : 'None'}</p>
            <p className="text-xs">DAO Owner: {daoOwner ? `${daoOwner.slice(0,8)}...${daoOwner.slice(-4)}` : 'Loading...'}</p>
            <p className="text-xs text-green-400">Check Console for Full Address</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
