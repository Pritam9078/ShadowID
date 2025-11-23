import { useState, useEffect } from 'react';
import { useAccount, useBalance, useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { 
  Wallet, 
  Network, 
  DollarSign, 
  Clock, 
  TrendingUp, 
  Plus, 
  Users, 
  Target,
  Calendar,
  Send,
  AlertTriangle,
  CheckCircle,
  Loader2,
  ArrowRight,
  ExternalLink,
  Copy,
  RefreshCw
} from 'lucide-react';

const Crowdfunding = () => {
  const { address, isConnected, chain } = useAccount();
  const [campaigns, setCampaigns] = useState([]);
  const [filteredCampaigns, setFilteredCampaigns] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'active', 'ending-soon'
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [contributeAmount, setContributeAmount] = useState('');
  const [isContributeModalOpen, setIsContributeModalOpen] = useState(false);
  
  // New Campaign Form State
  const [newCampaign, setNewCampaign] = useState({
    title: '',
    description: '',
    goalAmount: '',
    duration: ''
  });
  const [isCreating, setIsCreating] = useState(false);
  const [userStats, setUserStats] = useState({
    totalContributed: '0.0',
    campaignsSupported: 0,
    campaignsCreated: 0
  });

  // Get user's ETH balance
  const { data: balance } = useBalance({
    address: address,
    watch: true,
  });

  // Contract write hook for contributions
  const { 
    data: contributeHash,
    writeContract: contribute,
    isPending: isContributePending 
  } = useWriteContract();

  // Wait for contribution transaction
  const { isLoading: isContributeConfirming, isSuccess: isContributeSuccess } = 
    useWaitForTransactionReceipt({
      hash: contributeHash,
    });

  // Check if on correct network (Arbitrum Sepolia)
  const isCorrectNetwork = chain?.id === 421614;

  // Load campaigns from backend
  useEffect(() => {
    if (isConnected && isCorrectNetwork) {
      loadCampaigns();
    }
  }, [isConnected, isCorrectNetwork]);

  // Auto-refresh campaigns every 30 seconds
  useEffect(() => {
    if (isConnected && isCorrectNetwork) {
      const interval = setInterval(() => {
        loadCampaigns();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [isConnected, isCorrectNetwork]);

  // Filter campaigns based on search term and filter type
  useEffect(() => {
    let filtered = campaigns;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(campaign => 
        campaign.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        campaign.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply type filter
    if (filterType === 'active') {
      filtered = filtered.filter(campaign => 
        new Date() < new Date(campaign.endDate) && 
        parseFloat(campaign.raisedAmount) < parseFloat(campaign.goalAmount)
      );
    } else if (filterType === 'ending-soon') {
      const twoDaysFromNow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(campaign => 
        new Date(campaign.endDate) <= twoDaysFromNow &&
        new Date() < new Date(campaign.endDate)
      );
    }

    setFilteredCampaigns(filtered);
  }, [campaigns, searchTerm, filterType]);

  // Handle successful contribution
  useEffect(() => {
    if (isContributeSuccess) {
      toast.success('Contribution successful!');
      setIsContributeModalOpen(false);
      setContributeAmount('');
      loadCampaigns(); // Refresh campaigns
    }
  }, [isContributeSuccess]);

  const loadCampaigns = async () => {
    try {
      setRefreshing(true);
      const response = await fetch('/api/crowdfunding/list');
      if (response.ok) {
        const data = await response.json();
        setCampaigns(data.campaigns || []);
        if (address) {
          loadUserStats();
        }
      } else {
        console.error('Failed to load campaigns');
      }
    } catch (error) {
      console.error('Error loading campaigns:', error);
      toast.error('Failed to load campaigns');
    } finally {
      setRefreshing(false);
    }
  };

  const loadUserStats = async () => {
    if (!address) return;
    
    try {
      // Load user's contributions
      const contributionsResponse = await fetch(`/api/crowdfunding/contributions/${address}`);
      // Load user's created campaigns
      const campaignsResponse = await fetch(`/api/crowdfunding/user/${address}`);
      
      if (contributionsResponse.ok && campaignsResponse.ok) {
        const contributionsData = await contributionsResponse.json();
        const campaignsData = await campaignsResponse.json();
        
        setUserStats({
          totalContributed: contributionsData.totalAmount || '0.0',
          campaignsSupported: contributionsData.total || 0,
          campaignsCreated: campaignsData.total || 0
        });
      }
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  };

  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    
    if (!newCampaign.title || !newCampaign.description || !newCampaign.goalAmount || !newCampaign.duration) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      setIsCreating(true);
      const response = await fetch('/api/crowdfunding/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newCampaign,
          creator: address,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('Campaign created successfully!');
        setNewCampaign({
          title: '',
          description: '',
          goalAmount: '',
          duration: ''
        });
        loadCampaigns(); // Refresh campaigns list
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to create campaign');
      }
    } catch (error) {
      console.error('Error creating campaign:', error);
      toast.error('Failed to create campaign');
    } finally {
      setIsCreating(false);
    }
  };

  const handleContribute = async () => {
    if (!contributeAmount || isNaN(contributeAmount) || parseFloat(contributeAmount) <= 0) {
      toast.error('Please enter a valid contribution amount');
      return;
    }

    if (!selectedCampaign) return;

    // Check if user has sufficient balance
    const contributionAmountWei = parseEther(contributeAmount);
    if (balance && contributionAmountWei > balance.value) {
      toast.error('Insufficient ETH balance');
      return;
    }

    try {
      // Show loading toast
      const loadingToast = toast.loading('Processing contribution...');
      
      // First, send contribution to backend
      const response = await fetch('/api/crowdfunding/contribute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          campaignId: selectedCampaign.id,
          contributor: address,
          amount: contributeAmount,
        }),
      });

      if (response.ok) {
        // If backend accepts, proceed with blockchain transaction
        // This would integrate with your smart contract
        // For now, we'll simulate the transaction
        toast.dismiss(loadingToast);
        toast.success(`Successfully contributed ${contributeAmount} ETH to "${selectedCampaign.title}"!`);
        setIsContributeModalOpen(false);
        setContributeAmount('');
        loadCampaigns();
      } else {
        const errorData = await response.json();
        toast.dismiss(loadingToast);
        toast.error(errorData.message || 'Failed to contribute');
      }
    } catch (error) {
      console.error('Error contributing:', error);
      toast.error('Failed to contribute');
    }
  };

  const openContributeModal = (campaign) => {
    setSelectedCampaign(campaign);
    setIsContributeModalOpen(true);
  };

  const formatTimeRemaining = (endDate) => {
    const now = new Date();
    const end = new Date(endDate);
    const diff = end - now;
    
    if (diff <= 0) return 'Ended';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h`;
  };

  const calculateProgress = (raised, goal) => {
    return Math.min((raised / goal) * 100, 100);
  };

  const switchToArbitrumSepolia = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x66eee' }],
      });
    } catch (error) {
      console.error('Failed to switch network:', error);
      toast.error('Failed to switch to Arbitrum Sepolia');
    }
  };

  const copyAddress = (address) => {
    navigator.clipboard.writeText(address);
    toast.success('Address copied to clipboard');
  };

  // Wallet Status Card
  const WalletStatusCard = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-lg p-6 border border-gray-200"
    >
      <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Wallet className="w-5 h-5 text-blue-600" />
        Wallet Status
      </h2>
      
      {!isConnected ? (
        <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <span className="text-yellow-800 font-medium">Wallet not connected</span>
          </div>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
            Connect Wallet
          </button>
        </div>
      ) : !isCorrectNetwork ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-center gap-3">
              <Network className="w-5 h-5 text-red-600" />
              <span className="text-red-800 font-medium">Wrong Network</span>
            </div>
            <button
              onClick={switchToArbitrumSepolia}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Switch to Arbitrum Sepolia
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-green-800 font-medium">Connected to Arbitrum Sepolia</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Wallet Address</p>
              <div className="flex items-center gap-2">
                <p className="font-mono text-sm truncate">{address}</p>
                <button
                  onClick={() => copyAddress(address)}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                >
                  <Copy className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">ETH Balance</p>
              <p className="font-semibold text-lg">
                {balance ? parseFloat(formatEther(balance.value)).toFixed(4) : '0.0000'} ETH
              </p>
            </div>
          </div>
          
          {/* User Activity Stats */}
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="text-sm font-medium text-blue-900 mb-3">Your Activity</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-lg font-semibold text-blue-900">{userStats.totalContributed}</p>
                <p className="text-xs text-blue-700">ETH Contributed</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-blue-900">{userStats.campaignsSupported}</p>
                <p className="text-xs text-blue-700">Campaigns Supported</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-blue-900">{userStats.campaignsCreated}</p>
                <p className="text-xs text-blue-700">Campaigns Created</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );

  // Campaign Card Component
  const CampaignCard = ({ campaign }) => {
    const progress = calculateProgress(campaign.raisedAmount, campaign.goalAmount);
    const timeRemaining = formatTimeRemaining(campaign.endDate);
    const isEnded = timeRemaining === 'Ended';
    
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow"
      >
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
              {campaign.title}
            </h3>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
              isEnded ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
            }`}>
              {isEnded ? 'Ended' : 'Active'}
            </span>
          </div>
          
          <p className="text-gray-600 text-sm mb-4 line-clamp-3">
            {campaign.description}
          </p>
          
          <div className="space-y-3 mb-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Progress</span>
              <span className="font-medium">{progress.toFixed(1)}%</span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Raised</p>
                <p className="font-semibold">{campaign.raisedAmount} ETH</p>
              </div>
              <div>
                <p className="text-gray-600">Goal</p>
                <p className="font-semibold">{campaign.goalAmount} ETH</p>
              </div>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">{campaign.contributorsCount || 0} contributors</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">{timeRemaining}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => openContributeModal(campaign)}
              disabled={isEnded || !isConnected || !isCorrectNetwork}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              Contribute
            </button>
            <button className="p-2 border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors">
              <ExternalLink className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>
      </motion.div>
    );
  };

  // Contribute Modal
  const ContributeModal = () => (
    isContributeModalOpen && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
        >
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            Contribute to "{selectedCampaign?.title}"
          </h3>
          
          <div className="mb-4 p-4 bg-blue-50 rounded-lg">
            <div className="flex justify-between text-sm">
              <span>Goal:</span>
              <span className="font-medium">{selectedCampaign?.goalAmount} ETH</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Raised:</span>
              <span className="font-medium">{selectedCampaign?.raisedAmount} ETH</span>
            </div>
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contribution Amount (ETH)
            </label>
            <input
              type="number"
              step="0.001"
              min="0.001"
              value={contributeAmount}
              onChange={(e) => setContributeAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0.1"
            />
            
            {/* Quick amount buttons */}
            <div className="flex gap-2 mt-2 mb-2">
              {['0.01', '0.1', '0.5', '1.0'].map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => setContributeAmount(amount)}
                  className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                >
                  {amount} ETH
                </button>
              ))}
            </div>
            
            <p className="text-xs text-gray-500">
              Available: {balance ? parseFloat(formatEther(balance.value)).toFixed(4) : '0.0000'} ETH
            </p>
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => setIsContributeModalOpen(false)}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleContribute}
              disabled={!contributeAmount || isContributePending}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              {isContributePending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              Send Contribution
            </button>
          </div>
        </motion.div>
      </div>
    )
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <DollarSign className="w-8 h-8 text-blue-600" />
                Crowdfunding
              </h1>
              <p className="text-gray-600 mt-2">
                Create and support innovative projects with decentralized crowdfunding
              </p>
            </div>
            <button
              onClick={loadCampaigns}
              disabled={refreshing}
              className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Wallet Status & Create Campaign */}
          <div className="space-y-6">
            <WalletStatusCard />
            
            {/* Create New Campaign Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-xl shadow-lg p-6 border border-gray-200"
            >
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" />
                Create New Campaign
              </h2>
              
              <form onSubmit={handleCreateCampaign} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Campaign Title
                  </label>
                  <input
                    type="text"
                    value={newCampaign.title}
                    onChange={(e) => setNewCampaign({...newCampaign, title: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter campaign title"
                    disabled={!isConnected || !isCorrectNetwork}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    value={newCampaign.description}
                    onChange={(e) => setNewCampaign({...newCampaign, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Describe your project"
                    disabled={!isConnected || !isCorrectNetwork}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Goal (ETH)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={newCampaign.goalAmount}
                      onChange={(e) => setNewCampaign({...newCampaign, goalAmount: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="10"
                      disabled={!isConnected || !isCorrectNetwork}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Duration (days)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={newCampaign.duration}
                      onChange={(e) => setNewCampaign({...newCampaign, duration: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="30"
                      disabled={!isConnected || !isCorrectNetwork}
                    />
                  </div>
                </div>
                
                <button
                  type="submit"
                  disabled={isCreating || !isConnected || !isCorrectNetwork}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {isCreating ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  Create Campaign
                </button>
              </form>
            </motion.div>
          </div>

          {/* Right Column - Active Campaigns */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                  Crowdfunding Campaigns
                </h2>
                <span className="text-sm text-gray-600">
                  {filteredCampaigns.length} of {campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''}
                </span>
              </div>
              
              {/* Search and Filter Controls */}
              <div className="mb-6 space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Search campaigns..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Campaigns</option>
                    <option value="active">Active Only</option>
                    <option value="ending-soon">Ending Soon</option>
                  </select>
                </div>
              </div>
              
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : filteredCampaigns.length === 0 ? (
                <div className="text-center py-12">
                  <Target className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {campaigns.length === 0 ? 'No campaigns yet' : 'No campaigns match your search'}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {campaigns.length === 0 
                      ? 'Be the first to create a crowdfunding campaign!' 
                      : 'Try adjusting your search or filter criteria.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredCampaigns.map((campaign) => (
                    <CampaignCard key={campaign.id} campaign={campaign} />
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>

      <ContributeModal />
    </div>
  );
};

export default Crowdfunding;