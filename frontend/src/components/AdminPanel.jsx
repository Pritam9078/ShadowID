import React, { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { formatEther, parseEther } from 'viem';
import { 
  Settings, 
  Pause, 
  Play, 
  Shield, 
  Users, 
  Clock,
  AlertTriangle,
  Lock,
  Unlock,
  Target,
  CheckCircle,
  XCircle,
  RefreshCw
} from 'lucide-react';

import { CONTRACTS, CONTRACT_ADDRESSES } from '../config/contracts';
import { DAO_ABI, GOVERNANCE_TOKEN_ABI, TREASURY_ABI } from '../config/abis';

const AdminPanel = () => {
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState('dao');
  const [formData, setFormData] = useState({
    votingPeriod: '',
    quorumPercent: '',
    executionDelay: '',
    proposalThreshold: '',
    withdrawalDelay: '',
    targetAddress: '',
    targetAllowed: true,
    treasuryAddress: '',
    mintTo: '',
    mintAmount: '',
    burnAmount: '',
    roleAccount: '',
    selectedRole: 'MINTER_ROLE'
  });

  // Check if user is owner/admin
  const { data: daoOwner } = useReadContract({
    address: CONTRACT_ADDRESSES.DAO,
    abi: DAO_ABI,
    functionName: 'owner'
  });

  const { data: treasuryOwner } = useReadContract({
    address: CONTRACT_ADDRESSES.TREASURY,
    abi: TREASURY_ABI,
    functionName: 'owner'
  });

  const { data: hasAdminRole } = useReadContract({
    address: CONTRACT_ADDRESSES.GOVERNANCE_TOKEN,
    abi: GOVERNANCE_TOKEN_ABI,
    functionName: 'hasRole',
    args: [
      '0x0000000000000000000000000000000000000000000000000000000000000000', // DEFAULT_ADMIN_ROLE
      address
    ]
  });

  // Contract states
  const { data: daoPaused } = useReadContract({
    address: CONTRACT_ADDRESSES.DAO,
    abi: DAO_ABI,
    functionName: 'paused'
  });

  const { data: treasuryPaused } = useReadContract({
    address: CONTRACT_ADDRESSES.TREASURY,
    abi: TREASURY_ABI,
    functionName: 'paused'
  });

  const { data: votingPeriod } = useReadContract({
    address: CONTRACT_ADDRESSES.DAO,
    abi: DAO_ABI,
    functionName: 'votingPeriod'
  });

  const { data: quorumPercent } = useReadContract({
    address: CONTRACT_ADDRESSES.DAO,
    abi: DAO_ABI,
    functionName: 'quorumPercent'
  });

  const { data: executionDelay } = useReadContract({
    address: CONTRACT_ADDRESSES.DAO,
    abi: DAO_ABI,
    functionName: 'executionDelay'
  });

  const { data: proposalThreshold } = useReadContract({
    address: CONTRACT_ADDRESSES.DAO,
    abi: DAO_ABI,
    functionName: 'proposalThreshold'
  });

  const { data: withdrawalDelay } = useReadContract({
    address: CONTRACT_ADDRESSES.TREASURY,
    abi: TREASURY_ABI,
    functionName: 'withdrawalDelay'
  });

  const { data: canMint } = useReadContract({
    address: CONTRACT_ADDRESSES.GOVERNANCE_TOKEN,
    abi: GOVERNANCE_TOKEN_ABI,
    functionName: 'canMint'
  });

  // Write contracts
  const { 
    writeContract: writeDAO, 
    isPending: isDAOPending, 
    data: daoTxHash 
  } = useWriteContract();

  const { 
    writeContract: writeTreasury, 
    isPending: isTreasuryPending, 
    data: treasuryTxHash 
  } = useWriteContract();

  const { 
    writeContract: writeToken, 
    isPending: isTokenPending, 
    data: tokenTxHash 
  } = useWriteContract();

  // Transaction receipts
  const { isLoading: isDAOLoading } = useWaitForTransactionReceipt({
    hash: daoTxHash,
  });

  const { isLoading: isTreasuryLoading } = useWaitForTransactionReceipt({
    hash: treasuryTxHash,
  });

  const { isLoading: isTokenLoading } = useWaitForTransactionReceipt({
    hash: tokenTxHash,
  });

  // Define admin addresses (same as in Navbar)
  const adminAddresses = [
    '0xa62463a56ee9d742f810920f56cebc4b696ebd0a', // Deployer address (original)
    '0xa62463A56EE9D742F810920F56cEbc4B696eBd0a', // Your wallet address (added)
    // ADD MORE WALLET ADDRESSES HERE if needed
  ];

  // Check if current address is in admin list
  const isAdminByAddress = address && adminAddresses.some(adminAddr => 
    address.toLowerCase() === adminAddr.toLowerCase()
  );

  const isOwner = address && (
    address.toLowerCase() === daoOwner?.toLowerCase() ||
    address.toLowerCase() === treasuryOwner?.toLowerCase() ||
    hasAdminRole ||
    isAdminByAddress // Added admin address check
  );

  // Debug admin access
  console.log('AdminPanel Access Check:', {
    currentAddress: address,
    daoOwner,
    treasuryOwner,
    hasAdminRole,
    isAdminByAddress,
    isOwner,
    adminAddresses
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // DAO Functions
  const handlePauseDAO = async () => {
    try {
      await writeDAO({
        address: CONTRACT_ADDRESSES.DAO,
        abi: DAO_ABI,
        functionName: daoPaused ? 'unpause' : 'pause'
      });
      toast.success(`DAO ${daoPaused ? 'unpaused' : 'paused'} successfully`);
    } catch (error) {
      toast.error(`Failed to ${daoPaused ? 'unpause' : 'pause'} DAO`);
    }
  };

  const handleSetVotingPeriod = async () => {
    try {
      const days = parseInt(formData.votingPeriod);
      const seconds = days * 24 * 60 * 60;
      await writeDAO({
        address: CONTRACT_ADDRESSES.DAO,
        abi: DAO_ABI,
        functionName: 'setVotingPeriod',
        args: [BigInt(seconds)]
      });
      toast.success('Voting period updated');
    } catch (error) {
      toast.error('Failed to update voting period');
    }
  };

  const handleSetQuorum = async () => {
    try {
      await writeDAO({
        address: CONTRACT_ADDRESSES.DAO,
        abi: DAO_ABI,
        functionName: 'setQuorumPercent',
        args: [BigInt(formData.quorumPercent)]
      });
      toast.success('Quorum updated');
    } catch (error) {
      toast.error('Failed to update quorum');
    }
  };

  const handleSetExecutionDelay = async () => {
    try {
      const days = parseInt(formData.executionDelay);
      const seconds = days * 24 * 60 * 60;
      await writeDAO({
        address: CONTRACT_ADDRESSES.DAO,
        abi: DAO_ABI,
        functionName: 'setExecutionDelay',
        args: [BigInt(seconds)]
      });
      toast.success('Execution delay updated');
    } catch (error) {
      toast.error('Failed to update execution delay');
    }
  };

  const handleSetProposalThreshold = async () => {
    try {
      await writeDAO({
        address: CONTRACT_ADDRESSES.DAO,
        abi: DAO_ABI,
        functionName: 'setProposalThreshold',
        args: [parseEther(formData.proposalThreshold)]
      });
      toast.success('Proposal threshold updated');
    } catch (error) {
      toast.error('Failed to update proposal threshold');
    }
  };

  const handleSetAllowedTarget = async () => {
    try {
      await writeDAO({
        address: CONTRACT_ADDRESSES.DAO,
        abi: DAO_ABI,
        functionName: 'setAllowedTarget',
        args: [formData.targetAddress, formData.targetAllowed]
      });
      toast.success(`Target ${formData.targetAllowed ? 'allowed' : 'disallowed'}`);
    } catch (error) {
      toast.error('Failed to update target');
    }
  };

  // Treasury Functions
  const handlePauseTreasury = async () => {
    try {
      await writeTreasury({
        address: CONTRACT_ADDRESSES.TREASURY,
        abi: TREASURY_ABI,
        functionName: treasuryPaused ? 'unpause' : 'pause'
      });
      toast.success(`Treasury ${treasuryPaused ? 'unpaused' : 'paused'} successfully`);
    } catch (error) {
      toast.error(`Failed to ${treasuryPaused ? 'unpause' : 'pause'} treasury`);
    }
  };

  const handleSetWithdrawalDelay = async () => {
    try {
      const days = parseInt(formData.withdrawalDelay);
      const seconds = days * 24 * 60 * 60;
      await writeTreasury({
        address: CONTRACT_ADDRESSES.TREASURY,
        abi: TREASURY_ABI,
        functionName: 'setWithdrawalDelay',
        args: [BigInt(seconds)]
      });
      toast.success('Withdrawal delay updated');
    } catch (error) {
      toast.error('Failed to update withdrawal delay');
    }
  };

  // Token Functions
  const handleMintTokens = async () => {
    try {
      await writeToken({
        address: CONTRACT_ADDRESSES.GOVERNANCE_TOKEN,
        abi: GOVERNANCE_TOKEN_ABI,
        functionName: 'mint',
        args: [formData.mintTo, parseEther(formData.mintAmount)]
      });
      toast.success('Tokens minted successfully');
    } catch (error) {
      toast.error('Failed to mint tokens');
    }
  };

  const handleBurnTokens = async () => {
    try {
      await writeToken({
        address: CONTRACT_ADDRESSES.GOVERNANCE_TOKEN,
        abi: GOVERNANCE_TOKEN_ABI,
        functionName: 'burn',
        args: [parseEther(formData.burnAmount)]
      });
      toast.success('Tokens burned successfully');
    } catch (error) {
      toast.error('Failed to burn tokens');
    }
  };

  const handleGrantRole = async () => {
    try {
      const roleHash = formData.selectedRole === 'ADMIN_ROLE' 
        ? '0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775'
        : '0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6'; // MINTER_ROLE
      
      await writeToken({
        address: CONTRACT_ADDRESSES.GOVERNANCE_TOKEN,
        abi: GOVERNANCE_TOKEN_ABI,
        functionName: 'grantRole',
        args: [roleHash, formData.roleAccount]
      });
      toast.success('Role granted successfully');
    } catch (error) {
      toast.error('Failed to grant role');
    }
  };

  if (!isConnected) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Wallet Not Connected</h2>
          <p className="text-gray-600">Please connect your wallet to access admin functions.</p>
        </div>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center">
          <Shield className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have admin privileges for this DAO.</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'dao', label: 'DAO Settings', icon: Settings },
    { id: 'treasury', label: 'Treasury', icon: Lock },
    { id: 'token', label: 'Token Management', icon: Users }
  ];

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Admin Panel</h1>
        <p className="text-gray-600">Manage DAO parameters and system settings</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-8">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Icon className="w-4 h-4 mr-2" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* DAO Settings Tab */}
      {activeTab === 'dao' && (
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-lg p-6"
          >
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              DAO Configuration
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Emergency Controls */}
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900">Emergency Controls</h3>
                <button
                  onClick={handlePauseDAO}
                  disabled={isDAOPending || isDAOLoading}
                  className={`w-full flex items-center justify-center px-4 py-2 rounded-lg font-medium transition-colors ${
                    daoPaused
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-red-600 hover:bg-red-700 text-white'
                  } disabled:opacity-50`}
                >
                  {daoPaused ? <Play className="w-4 h-4 mr-2" /> : <Pause className="w-4 h-4 mr-2" />}
                  {daoPaused ? 'Unpause DAO' : 'Pause DAO'}
                </button>
                <div className="text-sm text-gray-600">
                  Status: <span className={`font-medium ${daoPaused ? 'text-red-600' : 'text-green-600'}`}>
                    {daoPaused ? 'Paused' : 'Active'}
                  </span>
                </div>
              </div>

              {/* Current Settings Display */}
              <div className="space-y-3">
                <h3 className="font-medium text-gray-900">Current Settings</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Voting Period:</span>
                    <span className="font-medium">{votingPeriod ? `${Number(votingPeriod) / (24 * 60 * 60)} days` : 'Loading...'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Quorum:</span>
                    <span className="font-medium">{quorumPercent ? `${Number(quorumPercent)}%` : 'Loading...'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Execution Delay:</span>
                    <span className="font-medium">{executionDelay ? `${Number(executionDelay) / (24 * 60 * 60)} days` : 'Loading...'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Proposal Threshold:</span>
                    <span className="font-medium">{proposalThreshold ? `${formatEther(proposalThreshold)} tokens` : 'Loading...'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Parameter Updates */}
            <div className="mt-6 grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Voting Period (days)
                  </label>
                  <div className="flex">
                    <input
                      type="number"
                      value={formData.votingPeriod}
                      onChange={(e) => handleInputChange('votingPeriod', e.target.value)}
                      className="flex-1 px-3 py-2 border rounded-l-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="3"
                      min="1"
                      max="30"
                    />
                    <button
                      onClick={handleSetVotingPeriod}
                      disabled={!formData.votingPeriod || isDAOPending}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-r-lg hover:bg-indigo-700 disabled:opacity-50"
                    >
                      Update
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quorum Percentage
                  </label>
                  <div className="flex">
                    <input
                      type="number"
                      value={formData.quorumPercent}
                      onChange={(e) => handleInputChange('quorumPercent', e.target.value)}
                      className="flex-1 px-3 py-2 border rounded-l-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="10"
                      min="1"
                      max="50"
                    />
                    <button
                      onClick={handleSetQuorum}
                      disabled={!formData.quorumPercent || isDAOPending}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-r-lg hover:bg-indigo-700 disabled:opacity-50"
                    >
                      Update
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Execution Delay (days)
                  </label>
                  <div className="flex">
                    <input
                      type="number"
                      value={formData.executionDelay}
                      onChange={(e) => handleInputChange('executionDelay', e.target.value)}
                      className="flex-1 px-3 py-2 border rounded-l-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="1"
                      min="1"
                      max="30"
                    />
                    <button
                      onClick={handleSetExecutionDelay}
                      disabled={!formData.executionDelay || isDAOPending}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-r-lg hover:bg-indigo-700 disabled:opacity-50"
                    >
                      Update
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Proposal Threshold (tokens)
                  </label>
                  <div className="flex">
                    <input
                      type="number"
                      value={formData.proposalThreshold}
                      onChange={(e) => handleInputChange('proposalThreshold', e.target.value)}
                      className="flex-1 px-3 py-2 border rounded-l-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="1"
                      min="0.1"
                      step="0.1"
                    />
                    <button
                      onClick={handleSetProposalThreshold}
                      disabled={!formData.proposalThreshold || isDAOPending}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-r-lg hover:bg-indigo-700 disabled:opacity-50"
                    >
                      Update
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Target Management */}
            <div className="mt-6 pt-6 border-t">
              <h3 className="font-medium text-gray-900 mb-4 flex items-center">
                <Target className="w-4 h-4 mr-2" />
                Allowed Targets Management
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <input
                  type="text"
                  value={formData.targetAddress}
                  onChange={(e) => handleInputChange('targetAddress', e.target.value)}
                  className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="0x..."
                />
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="targetAllowed"
                      checked={formData.targetAllowed}
                      onChange={() => handleInputChange('targetAllowed', true)}
                      className="mr-2"
                    />
                    Allow
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="targetAllowed"
                      checked={!formData.targetAllowed}
                      onChange={() => handleInputChange('targetAllowed', false)}
                      className="mr-2"
                    />
                    Disallow
                  </label>
                  <button
                    onClick={handleSetAllowedTarget}
                    disabled={!formData.targetAddress || isDAOPending}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                  >
                    Update Target
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Treasury Tab */}
      {activeTab === 'treasury' && (
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-lg p-6"
          >
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Lock className="w-5 h-5 mr-2" />
              Treasury Management
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Emergency Controls */}
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900">Emergency Controls</h3>
                <button
                  onClick={handlePauseTreasury}
                  disabled={isTreasuryPending || isTreasuryLoading}
                  className={`w-full flex items-center justify-center px-4 py-2 rounded-lg font-medium transition-colors ${
                    treasuryPaused
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-red-600 hover:bg-red-700 text-white'
                  } disabled:opacity-50`}
                >
                  {treasuryPaused ? <Unlock className="w-4 h-4 mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
                  {treasuryPaused ? 'Unpause Treasury' : 'Pause Treasury'}
                </button>
                <div className="text-sm text-gray-600">
                  Status: <span className={`font-medium ${treasuryPaused ? 'text-red-600' : 'text-green-600'}`}>
                    {treasuryPaused ? 'Paused' : 'Active'}
                  </span>
                </div>
              </div>

              {/* Current Settings */}
              <div className="space-y-3">
                <h3 className="font-medium text-gray-900">Current Settings</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Withdrawal Delay:</span>
                    <span className="font-medium">{withdrawalDelay ? `${Number(withdrawalDelay) / (24 * 60 * 60)} days` : 'Loading...'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Withdrawal Delay Update */}
            <div className="mt-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Withdrawal Delay (days)
                </label>
                <div className="flex max-w-md">
                  <input
                    type="number"
                    value={formData.withdrawalDelay}
                    onChange={(e) => handleInputChange('withdrawalDelay', e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-l-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="1"
                    min="1"
                    max="30"
                  />
                  <button
                    onClick={handleSetWithdrawalDelay}
                    disabled={!formData.withdrawalDelay || isTreasuryPending}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-r-lg hover:bg-indigo-700 disabled:opacity-50"
                  >
                    Update
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Token Management Tab */}
      {activeTab === 'token' && (
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-lg p-6"
          >
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Token Management
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Minting */}
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900">Mint Tokens</h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={formData.mintTo}
                    onChange={(e) => handleInputChange('mintTo', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Recipient address (0x...)"
                  />
                  <input
                    type="number"
                    value={formData.mintAmount}
                    onChange={(e) => handleInputChange('mintAmount', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Amount to mint"
                    step="0.1"
                  />
                  <button
                    onClick={handleMintTokens}
                    disabled={!formData.mintTo || !formData.mintAmount || !canMint || isTokenPending}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    Mint Tokens
                  </button>
                  <div className="text-sm text-gray-600">
                    Can mint: <span className={`font-medium ${canMint ? 'text-green-600' : 'text-red-600'}`}>
                      {canMint ? 'Yes' : 'No (cooldown active)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Burning */}
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900">Burn Tokens</h3>
                <div className="space-y-3">
                  <input
                    type="number"
                    value={formData.burnAmount}
                    onChange={(e) => handleInputChange('burnAmount', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Amount to burn"
                    step="0.1"
                  />
                  <button
                    onClick={handleBurnTokens}
                    disabled={!formData.burnAmount || isTokenPending}
                    className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    Burn Tokens
                  </button>
                </div>
              </div>
            </div>

            {/* Role Management */}
            <div className="mt-6 pt-6 border-t">
              <h3 className="font-medium text-gray-900 mb-4">Role Management</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <input
                  type="text"
                  value={formData.roleAccount}
                  onChange={(e) => handleInputChange('roleAccount', e.target.value)}
                  className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Account address (0x...)"
                />
                <select
                  value={formData.selectedRole}
                  onChange={(e) => handleInputChange('selectedRole', e.target.value)}
                  className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="MINTER_ROLE">Minter Role</option>
                  <option value="ADMIN_ROLE">Admin Role</option>
                </select>
                <button
                  onClick={handleGrantRole}
                  disabled={!formData.roleAccount || isTokenPending}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  Grant Role
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Loading States */}
      {(isDAOLoading || isTreasuryLoading || isTokenLoading) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center">
            <RefreshCw className="w-5 h-5 animate-spin mr-3" />
            <span>Transaction in progress...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
