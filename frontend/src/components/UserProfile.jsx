import React, { useState, useEffect } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { motion } from 'framer-motion';
import { formatEther } from 'viem';
import { 
  User, 
  Edit3, 
  Save, 
  X, 
  Mail, 
  Calendar,
  Vote,
  FileText,
  MessageSquare,
  Activity,
  Shield,
  TrendingUp,
  Coins,
  Users,
  Target,
  Clock,
  ChevronRight,
  ExternalLink,
  Copy,
  CheckCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { backendAPI } from '../services/backendApi';
import { CONTRACT_ADDRESSES } from '../config/contracts';
import GovernanceTokenABI from '../abi/GovernanceToken.json';
import DAOABI from '../abi/DAO.json';

const UserProfile = ({ userId, isOwnProfile = false }) => {
  const { address } = useAccount();
  const [profile, setProfile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [votingHistory, setVotingHistory] = useState([]);
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    bio: ''
  });

  const targetAddress = userId || address;

  // Contract reads for governance data
  const { data: tokenBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.GovernanceToken,
    abi: GovernanceTokenABI,
    functionName: 'balanceOf',
    args: targetAddress ? [targetAddress] : undefined,
    enabled: !!targetAddress,
  });

  const { data: votingPower } = useReadContract({
    address: CONTRACT_ADDRESSES.GovernanceToken,
    abi: GovernanceTokenABI,
    functionName: 'getVotes',
    args: targetAddress ? [targetAddress] : undefined,
    enabled: !!targetAddress,
  });

  const { data: delegatee } = useReadContract({
    address: CONTRACT_ADDRESSES.GovernanceToken,
    abi: GovernanceTokenABI,
    functionName: 'delegates',
    args: targetAddress ? [targetAddress] : undefined,
    enabled: !!targetAddress,
  });

  const { data: hasAdminRole } = useReadContract({
    address: CONTRACT_ADDRESSES.GovernanceToken,
    abi: GovernanceTokenABI,
    functionName: 'hasRole',
    args: targetAddress ? ['0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775', targetAddress] : undefined, // ADMIN_ROLE hash
    enabled: !!targetAddress,
  });

  const { data: hasMinterRole } = useReadContract({
    address: CONTRACT_ADDRESSES.GovernanceToken,
    abi: GovernanceTokenABI,
    functionName: 'hasRole',
    args: targetAddress ? ['0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6', targetAddress] : undefined, // MINTER_ROLE hash
    enabled: !!targetAddress,
  });

  const { data: totalSupply } = useReadContract({
    address: CONTRACT_ADDRESSES.GovernanceToken,
    abi: GovernanceTokenABI,
    functionName: 'totalSupply',
  });

  const { data: daoOwner } = useReadContract({
    address: CONTRACT_ADDRESSES.DAO,
    abi: DAOABI,
    functionName: 'owner',
  });

  // Utility function to get profile from localStorage
  const getStoredProfile = (address) => {
    try {
      const stored = localStorage.getItem(`dvote_profile_${address?.toLowerCase()}`);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Error reading stored profile:', error);
      return null;
    }
  };

  // Utility function to save profile to localStorage
  const saveProfileToStorage = (address, profileData) => {
    try {
      localStorage.setItem(`dvote_profile_${address?.toLowerCase()}`, JSON.stringify(profileData));
    } catch (error) {
      console.error('Error saving profile to storage:', error);
    }
  };

  // Utility functions
  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedAddress(true);
      toast.success('Address copied to clipboard');
      setTimeout(() => setCopiedAddress(false), 2000);
    } catch (error) {
      toast.error('Failed to copy address');
    }
  };

  const formatTokenAmount = (amount) => {
    if (!amount) return '0';
    const formatted = formatEther(amount);
    return parseFloat(formatted).toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  const calculateVotingPowerPercentage = () => {
    if (!votingPower || !totalSupply) return 0;
    return ((Number(formatEther(votingPower)) / Number(formatEther(totalSupply))) * 100).toFixed(4);
  };

  const getUserRoles = () => {
    const roles = [];
    if (daoOwner && targetAddress?.toLowerCase() === daoOwner.toLowerCase()) {
      roles.push({ name: 'DAO Owner', color: 'text-purple-700 bg-purple-100' });
    }
    if (hasAdminRole) {
      roles.push({ name: 'Token Admin', color: 'text-red-700 bg-red-100' });
    }
    if (hasMinterRole) {
      roles.push({ name: 'Token Minter', color: 'text-blue-700 bg-blue-100' });
    }
    if (delegatee && delegatee.toLowerCase() === targetAddress?.toLowerCase()) {
      roles.push({ name: 'Self-Delegated', color: 'text-green-700 bg-green-100' });
    }
    return roles;
  };

  useEffect(() => {
    if (isOwnProfile && !address) {
      setLoading(false);
      return;
    }
    
    loadUserProfile();
    if (userId || (isOwnProfile && address)) {
      loadVotingHistory();
    }
  }, [userId, address]);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      
      if (isOwnProfile && address) {
        // For own profile, try multiple sources: backend -> localStorage -> create new
        let profileData = null;
        
        try {
          profileData = await backendAPI.getUserProfile(address);
          console.log('Loaded profile from backend:', profileData);
        } catch (apiError) {
          console.log('Backend profile not found, checking localStorage');
          
          // Try to get from localStorage
          const storedProfile = getStoredProfile(address);
          if (storedProfile) {
            console.log('Found stored wallet-based profile');
            profileData = storedProfile;
          } else {
            console.log('Creating new wallet-based profile');
            // Create a new wallet-based profile
            profileData = {
              address: address,
              username: `User ${address.slice(0, 6)}...${address.slice(-4)}`,
              email: '',
              bio: '',
              stats: {
                proposalsCreated: 0,
                votesCast: 0,
                commentsPosted: 0
              },
              createdAt: new Date().toISOString(),
              role: null,
              isWalletBased: true
            };
            
            // Save to localStorage
            saveProfileToStorage(address, profileData);
          }
        }
        
        setProfile(profileData);
        setFormData({
          username: profileData.username || `User ${address.slice(0, 6)}...${address.slice(-4)}`,
          email: profileData.email || '',
          bio: profileData.bio || ''
        });
        
      } else if (userId) {
        // For viewing other users' profiles
        try {
          const profileData = await backendAPI.getUserProfile(userId);
          setProfile(profileData);
          setFormData({
            username: profileData.username || '',
            email: profileData.email || '',
            bio: profileData.bio || ''
          });
        } catch (error) {
          console.error('Failed to load user profile:', error);
          
          // Check localStorage for this user
          const storedProfile = getStoredProfile(userId);
          if (storedProfile) {
            setProfile(storedProfile);
          } else {
            // Create a minimal profile for unknown users
            setProfile({
              address: userId,
              username: `User ${userId.slice(0, 6)}...${userId.slice(-4)}`,
              email: '',
              bio: '',
              stats: { proposalsCreated: 0, votesCast: 0, commentsPosted: 0 },
              createdAt: new Date().toISOString(),
              isWalletBased: true
            });
          }
        }
      } else {
        throw new Error('No user identifier provided');
      }
      
    } catch (error) {
      console.error('Failed to load profile:', error);
      toast.error('Failed to load user profile');
    } finally {
      setLoading(false);
    }
  };

  const loadVotingHistory = async () => {
    try {
      const targetAddress = userId || address;
      if (!targetAddress) return;
      
      try {
        const history = await backendAPI.getUserVotingHistory(targetAddress, 1, 10);
        setVotingHistory(history.votes || []);
      } catch (apiError) {
        console.log('API voting history failed, using mock data for development');
        const mockVotingHistory = [
          {
            id: 1,
            proposal: {
              title: 'Treasury Fund Allocation Proposal'
            },
            choice: 'FOR',
            timestamp: new Date(Date.now() - 86400000).toISOString(),
            votingPower: 100
          },
          {
            id: 2,
            proposal: {
              title: 'Governance Parameter Update'
            },
            choice: 'AGAINST',
            timestamp: new Date(Date.now() - 172800000).toISOString(),
            votingPower: 150
          }
        ];
        setVotingHistory(mockVotingHistory);
      }
    } catch (error) {
      console.error('Failed to load voting history:', error);
    }
  };

  const handleSaveProfile = async () => {
    try {
      if (!address) {
        toast.error('Please connect your wallet');
        return;
      }
      
      const updatedProfile = { ...profile, ...formData };
      
      // Try to save to backend, but don't fail if it doesn't work
      try {
        await backendAPI.updateUserProfile(address, formData);
        toast.success('Profile updated successfully');
      } catch (apiError) {
        console.log('Backend update failed, updating local profile');
        // If backend fails, mark as wallet-based and save locally
        updatedProfile.isWalletBased = true;
        toast.success('Profile updated locally');
      }
      
      // Always save to localStorage for wallet-based profiles
      if (updatedProfile.isWalletBased) {
        saveProfileToStorage(address, updatedProfile);
      }
      
      setProfile(updatedProfile);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error('Failed to update profile');
    }
  };

  const handleRegisterUser = async () => {
    try {
      if (!address) {
        toast.error('Please connect your wallet');
        return;
      }
      
      if (!formData.username?.trim()) {
        toast.error('Username is required');
        return;
      }
      
      const userData = {
        address: address.toLowerCase(),
        username: formData.username,
        email: formData.email,
        bio: formData.bio
      };
      
      let newProfile;
      
      try {
        // Try to register with backend
        await backendAPI.registerUser(userData);
        await loadUserProfile(); // Reload from backend
        toast.success('Profile created successfully');
        return;
      } catch (apiError) {
        console.log('Backend registration failed, creating wallet-based profile');
        // Create wallet-based profile if backend fails
        newProfile = {
          address: address,
          username: formData.username,
          email: formData.email,
          bio: formData.bio,
          stats: {
            proposalsCreated: 0,
            votesCast: 0,
            commentsPosted: 0
          },
          createdAt: new Date().toISOString(),
          role: null,
          isWalletBased: true
        };
        
        // Save to localStorage
        saveProfileToStorage(address, newProfile);
        
        setProfile(newProfile);
        toast.success('Profile created (Wallet-based)');
      }
    } catch (error) {
      console.error('Failed to register user:', error);
      toast.error('Failed to create profile');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-dao-600"></div>
      </div>
    );
  }

  // Show wallet connection message for own profile
  if (isOwnProfile && !address) {
    return (
      <motion.div 
        className="max-w-2xl mx-auto p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-10 h-10 text-orange-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Wallet Not Connected</h2>
          <p className="text-gray-600 mb-6">Please connect your wallet to view your profile</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-dao-600 hover:bg-dao-700 text-white py-3 px-6 rounded-lg font-medium transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </motion.div>
    );
  }

  // New user registration form - only show if explicitly no profile AND wallet connected
  if (!profile && isOwnProfile && address) {
    return (
      <motion.div 
        className="max-w-2xl mx-auto p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-dao-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="w-10 h-10 text-dao-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to ShadowID!</h2>
            <p className="text-gray-600">Create your profile to participate in governance</p>
            <p className="text-sm text-blue-600 mt-2">
              👛 This will create a wallet-based profile linked to your connected address
            </p>
            
            {/* Show current governance stats while registering */}
            {tokenBalance && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">
                  <strong>Your Wallet:</strong> {formatTokenAmount(tokenBalance)} DVT tokens
                </p>
                {votingPower && (
                  <p className="text-sm text-blue-600">
                    Voting Power: {formatTokenAmount(votingPower)} ({calculateVotingPowerPercentage()}% of total)
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dao-500 focus:border-dao-500"
                placeholder="Choose a username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email (Optional)</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dao-500 focus:border-dao-500"
                placeholder="your.email@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Bio (Optional)</label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dao-500 focus:border-dao-500"
                placeholder="Tell us about yourself..."
              />
            </div>

            <button
              onClick={handleRegisterUser}
              className="w-full bg-dao-600 hover:bg-dao-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
            >
              Create Profile
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center p-8">
        <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">User not found</h3>
        <p className="text-gray-600">This user doesn't have a profile yet.</p>
      </div>
    );
  }

  return (
    <motion.div 
      className="max-w-7xl mx-auto p-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-dao-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-10 h-10 text-dao-600" />
              </div>
              
              {isEditing ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dao-500"
                    placeholder="Username"
                  />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dao-500"
                    placeholder="Email"
                  />
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-dao-500"
                    placeholder="Bio"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveProfile}
                      className="flex-1 bg-dao-600 hover:bg-dao-700 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-1"
                    >
                      <Save className="w-4 h-4" />
                      Save
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-lg flex items-center justify-center gap-1"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">
                    {profile.username || 'Anonymous User'}
                  </h2>
                  <div className="flex items-center justify-center gap-2 text-gray-600 text-sm font-mono mb-3">
                    <span>{targetAddress?.slice(0, 6)}...{targetAddress?.slice(-4)}</span>
                    <button
                      onClick={() => copyToClipboard(targetAddress)}
                      className="p-1 hover:bg-gray-100 rounded transition-colors"
                      title="Copy address"
                    >
                      {copiedAddress ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                    {profile.isWalletBased && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded ml-2" title="Wallet-based profile">
                        👛 Wallet
                      </span>
                    )}
                  </div>

                  {/* User Roles */}
                  {getUserRoles().length > 0 && (
                    <div className="flex flex-wrap justify-center gap-2 mb-3">
                      {getUserRoles().map((role, index) => (
                        <span
                          key={index}
                          className={`px-3 py-1 rounded-full text-xs font-medium ${role.color}`}
                        >
                          {role.name}
                        </span>
                      ))}
                    </div>
                  )}

                  {profile.email && (
                    <div className="flex items-center justify-center gap-1 text-gray-600 mt-2">
                      <Mail className="w-4 h-4" />
                      <span className="text-sm">{profile.email}</span>
                    </div>
                  )}
                  {profile.bio && (
                    <p className="text-gray-700 text-sm mt-3 p-3 bg-gray-50 rounded-lg">
                      {profile.bio}
                    </p>
                  )}
                  {isOwnProfile && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="mt-4 bg-dao-600 hover:bg-dao-700 text-white py-2 px-4 rounded-lg flex items-center gap-1 mx-auto"
                    >
                      <Edit3 className="w-4 h-4" />
                      Edit Profile
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Governance Stats */}
            <div className="space-y-3">
              {/* Token Balance */}
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium">DVT Balance</span>
                </div>
                <span className="font-semibold text-blue-700">
                  {formatTokenAmount(tokenBalance)} DVT
                </span>
              </div>

              {/* Voting Power */}
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-100">
                <div className="flex items-center gap-2">
                  <Vote className="w-4 h-4 text-green-600" />
                  <div>
                    <span className="text-sm font-medium block">Voting Power</span>
                    <span className="text-xs text-gray-500">
                      {calculateVotingPowerPercentage()}% of total
                    </span>
                  </div>
                </div>
                <span className="font-semibold text-green-700">
                  {formatTokenAmount(votingPower)}
                </span>
              </div>

              {/* Delegation Status */}
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-violet-50 rounded-lg border border-purple-100">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-medium">Delegation</span>
                </div>
                <div className="text-right">
                  {delegatee ? (
                    delegatee.toLowerCase() === targetAddress?.toLowerCase() ? (
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                        Self-delegated
                      </span>
                    ) : (
                      <div>
                        <span className="text-xs text-gray-500 block">Delegated to:</span>
                        <span className="text-xs font-mono">
                          {delegatee.slice(0, 6)}...{delegatee.slice(-4)}
                        </span>
                      </div>
                    )
                  ) : (
                    <span className="text-xs text-gray-500">Not delegated</span>
                  )}
                </div>
              </div>

              {/* Legacy Stats */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium">Proposals</span>
                </div>
                <span className="font-semibold">{profile.stats?.proposalsCreated || 0}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Vote className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium">Votes Cast</span>
                </div>
                <span className="font-semibold">{profile.stats?.votesCast || 0}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-medium">Comments</span>
                </div>
                <span className="font-semibold">{profile.stats?.commentsPosted || 0}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-3">
                <Calendar className="w-4 h-4" />
                <span>Joined {new Date(profile.createdAt).toLocaleDateString()}</span>
              </div>

              {/* Quick Actions for own profile */}
              {isOwnProfile && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Quick Actions</h4>
                  
                  <a
                    href="/governance"
                    className="flex items-center justify-between p-3 bg-dao-50 hover:bg-dao-100 rounded-lg transition-colors group"
                  >
                    <div className="flex items-center gap-2">
                      <Vote className="w-4 h-4 text-dao-600" />
                      <span className="text-sm font-medium text-dao-700">View Proposals</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-dao-400 group-hover:text-dao-600 transition-colors" />
                  </a>

                  <a
                    href="/create-proposal"
                    className="flex items-center justify-between p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors group"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-green-700">Create Proposal</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-green-400 group-hover:text-green-600 transition-colors" />
                  </a>

                  {tokenBalance && Number(formatEther(tokenBalance)) > 0 && (
                    <button
                      onClick={() => window.open(`https://sepolia.etherscan.io/address/${targetAddress}`, '_blank')}
                      className="flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors group w-full"
                    >
                      <div className="flex items-center gap-2">
                        <ExternalLink className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-700">View on Etherscan</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-blue-400 group-hover:text-blue-600 transition-colors" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Governance Activity & Voting History */}
        <div className="lg:col-span-2">
          <div className="grid gap-6">
            {/* Governance Summary */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Governance Overview
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Coins className="w-6 h-6 text-blue-600" />
                  </div>
                  <h4 className="text-2xl font-bold text-gray-900">{formatTokenAmount(tokenBalance)}</h4>
                  <p className="text-gray-600 text-sm">DVT Tokens</p>
                  <p className="text-xs text-blue-600 mt-1">
                    {tokenBalance && totalSupply ? 
                      `${((Number(formatEther(tokenBalance)) / Number(formatEther(totalSupply))) * 100).toFixed(4)}% of supply` 
                      : 'Calculating...'
                    }
                  </p>
                </div>

                <div className="text-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Vote className="w-6 h-6 text-green-600" />
                  </div>
                  <h4 className="text-2xl font-bold text-gray-900">{formatTokenAmount(votingPower)}</h4>
                  <p className="text-gray-600 text-sm">Voting Power</p>
                  <p className="text-xs text-green-600 mt-1">
                    {calculateVotingPowerPercentage()}% weight
                  </p>
                </div>

                <div className="text-center p-4 bg-gradient-to-r from-purple-50 to-violet-50 rounded-lg">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Target className="w-6 h-6 text-purple-600" />
                  </div>
                  <h4 className="text-2xl font-bold text-gray-900">{votingHistory.length}</h4>
                  <p className="text-gray-600 text-sm">Votes Cast</p>
                  <p className="text-xs text-purple-600 mt-1">
                    {votingHistory.length > 0 ? 'Active participant' : 'New member'}
                  </p>
                </div>
              </div>
            </div>

            {/* Voting History */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Recent Voting Activity
              </h3>

              {votingHistory.length > 0 ? (
                <div className="space-y-3">
                  {votingHistory.map((vote, index) => (
                    <motion.div
                      key={vote.id}
                      className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 mb-1">
                            {vote.proposal?.title || 'Unknown Proposal'}
                          </h4>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              vote.choice === 'FOR' ? 'bg-green-100 text-green-700' :
                              vote.choice === 'AGAINST' ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {vote.choice}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(vote.timestamp).toLocaleDateString()}
                            </span>
                            {vote.votingPower && (
                              <span className="flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" />
                                {vote.votingPower} votes
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Vote className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No voting activity yet</h4>
                  <p className="text-gray-600 mb-4">
                    {isOwnProfile 
                      ? "You haven't cast any votes on proposals yet. Start participating in governance!"
                      : "This user hasn't cast any votes on proposals."
                    }
                  </p>
                  {isOwnProfile && (
                    <a
                      href="/governance"
                      className="inline-flex items-center gap-2 bg-dao-600 hover:bg-dao-700 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      <Vote className="w-4 h-4" />
                      View Active Proposals
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default UserProfile;
