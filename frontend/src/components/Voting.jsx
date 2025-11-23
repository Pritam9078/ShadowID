import React, { useState, useEffect, useCallback } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { motion, AnimatePresence } from 'framer-motion';
import { formatEther } from 'viem';
import toast from 'react-hot-toast';
import { 
  Vote, 
  Check, 
  X, 
  Minus,
  Users,
  Clock,
  Shield,
  History,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader
} from 'lucide-react';

import { CONTRACT_ADDRESSES } from '../config/contracts';
import { DAO_ABI, GOVERNANCE_TOKEN_ABI } from '../config/abis';

const VotingSystem = ({ proposalId, proposalData, onVoteSuccess, compact = false }) => {
  const { address, isConnected } = useAccount();
  const [selectedVote, setSelectedVote] = useState(null); // 0: Against, 1: For, 2: Abstain
  const [votingPower, setVotingPower] = useState(0);
  const [hasVoted, setHasVoted] = useState(false);
  const [userVoteChoice, setUserVoteChoice] = useState(null);
  const [isVoting, setIsVoting] = useState(false);
  const [voteHistory, setVoteHistory] = useState([]);
  const [realTimeVotes, setRealTimeVotes] = useState({
    forVotes: 0,
    againstVotes: 0,
    abstainVotes: 0
  });

  // Contract read hooks
  const { data: userVotingPower } = useReadContract({
    address: CONTRACT_ADDRESSES.GOVERNANCE_TOKEN,
    abi: GOVERNANCE_TOKEN_ABI,
    functionName: 'getVotes',
    args: [address],
    enabled: !!address && !!proposalId,
  });

  const { data: hasUserVoted } = useReadContract({
    address: CONTRACT_ADDRESSES.DAO,
    abi: DAO_ABI,
    functionName: 'hasVoted',
    args: [proposalId, address],
    enabled: !!address && !!proposalId,
  });

  const { data: userVote } = useReadContract({
    address: CONTRACT_ADDRESSES.DAO,
    abi: DAO_ABI,
    functionName: 'getVote',
    args: [proposalId, address],
    enabled: !!address && !!proposalId && hasUserVoted,
  });

  const { data: proposalState } = useReadContract({
    address: CONTRACT_ADDRESSES.DAO,
    abi: DAO_ABI,
    functionName: 'getProposalState',
    args: [proposalId],
    enabled: !!proposalId,
  });

  // Contract write hook for voting
  const { writeContract: castVote, data: voteHash, isPending: isVotePending } = useWriteContract();
  const { isLoading: isVoteConfirming, isSuccess: isVoteSuccess } = useWaitForTransactionReceipt({ 
    hash: voteHash 
  });

  // Update local state when contract data changes
  useEffect(() => {
    if (userVotingPower) {
      setVotingPower(Number(formatEther(userVotingPower)));
    }
  }, [userVotingPower]);

  useEffect(() => {
    setHasVoted(!!hasUserVoted);
    if (hasUserVoted && userVote !== undefined) {
      setUserVoteChoice(Number(userVote));
    }
  }, [hasUserVoted, userVote]);

  useEffect(() => {
    if (proposalData) {
      setRealTimeVotes({
        forVotes: proposalData.forVotes || 0,
        againstVotes: proposalData.againstVotes || 0,
        abstainVotes: proposalData.abstainVotes || 0
      });
    }
  }, [proposalData]);

  // Handle vote success
  useEffect(() => {
    if (isVoteSuccess) {
      toast.success('Vote successfully cast!');
      setIsVoting(false);
      setSelectedVote(null);
      // Trigger parent component to refresh data
      if (onVoteSuccess) {
        onVoteSuccess();
      }
    }
  }, [isVoteSuccess, onVoteSuccess]);

  // Vote submission handler
  const handleVote = useCallback(async (voteType) => {
    if (!isConnected || !address) {
      toast.error('Please connect your wallet to vote');
      return;
    }

    if (hasVoted) {
      toast.error('You have already voted on this proposal');
      return;
    }

    if (votingPower <= 0) {
      toast.error('You need voting power to participate');
      return;
    }

    if (proposalState !== 1) { // 1 = Active
      toast.error('Voting is not currently active for this proposal');
      return;
    }

    setIsVoting(true);
    setSelectedVote(voteType);

    try {
      await castVote({
        address: CONTRACT_ADDRESSES.DAO,
        abi: DAO_ABI,
        functionName: 'castVote',
        args: [proposalId, voteType],
      });

      // Add to vote history
      const newVoteRecord = {
        proposalId,
        voteType,
        timestamp: Date.now(),
        votingPower: votingPower,
        txHash: voteHash
      };
      
      setVoteHistory(prev => [newVoteRecord, ...prev]);
      
    } catch (error) {
      console.error('Voting error:', error);
      toast.error('Failed to cast vote. Please try again.');
      setIsVoting(false);
      setSelectedVote(null);
    }
  }, [isConnected, address, hasVoted, votingPower, proposalState, proposalId, castVote, voteHash]);

  // Vote option configurations
  const voteOptions = [
    {
      type: 1,
      label: 'For',
      icon: Check,
      color: 'green',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      hoverColor: 'hover:bg-green-100',
      selectedColor: 'bg-green-100 border-green-400',
      textColor: 'text-green-700',
      description: 'Support this proposal'
    },
    {
      type: 0,
      label: 'Against',
      icon: X,
      color: 'red',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      hoverColor: 'hover:bg-red-100',
      selectedColor: 'bg-red-100 border-red-400',
      textColor: 'text-red-700',
      description: 'Oppose this proposal'
    },
    {
      type: 2,
      label: 'Abstain',
      icon: Minus,
      color: 'gray',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      hoverColor: 'hover:bg-gray-100',
      selectedColor: 'bg-gray-100 border-gray-400',
      textColor: 'text-gray-700',
      description: 'Neither support nor oppose'
    }
  ];

  // Get vote choice display
  const getVoteChoiceDisplay = (voteChoice) => {
    const option = voteOptions.find(opt => opt.type === voteChoice);
    return option ? option.label : 'Unknown';
  };

  // Calculate vote percentages
  const totalVotes = realTimeVotes.forVotes + realTimeVotes.againstVotes + realTimeVotes.abstainVotes;
  const forPercentage = totalVotes > 0 ? (realTimeVotes.forVotes / totalVotes) * 100 : 0;
  const againstPercentage = totalVotes > 0 ? (realTimeVotes.againstVotes / totalVotes) * 100 : 0;
  const abstainPercentage = totalVotes > 0 ? (realTimeVotes.abstainVotes / totalVotes) * 100 : 0;

  if (!isConnected) {
    return (
      <motion.div 
        className="bg-white rounded-xl shadow-lg p-6 border border-gray-200"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="text-center">
          <Vote className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Connect Wallet to Vote</h3>
          <p className="text-gray-600">Please connect your wallet to participate in governance voting.</p>
        </div>
      </motion.div>
    );
  }

  // Compact mode - just the three voting buttons
  if (compact) {
    return (
      <div className="grid grid-cols-3 gap-2">
        {/* Vote For Button */}
        <motion.button
          onClick={() => handleVote(1)}
          disabled={!isConnected || hasVoted || isVoting || votingPower === 0}
          className={`
            flex flex-col items-center justify-center p-3 rounded-lg font-medium text-sm transition-all duration-200
            ${hasVoted && userVoteChoice === 1 
              ? 'bg-green-600 text-white ring-2 ring-green-400' 
              : hasVoted 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 hover:border-green-300'
            }
          `}
          whileHover={!hasVoted && isConnected && votingPower > 0 ? { scale: 1.02 } : {}}
          whileTap={!hasVoted && isConnected && votingPower > 0 ? { scale: 0.98 } : {}}
        >
          <Check className="w-4 h-4 mb-1" />
          <span>For</span>
          {hasVoted && userVoteChoice === 1 && (
            <div className="text-xs opacity-75">Voted</div>
          )}
        </motion.button>

        {/* Vote Against Button */}
        <motion.button
          onClick={() => handleVote(0)}
          disabled={!isConnected || hasVoted || isVoting || votingPower === 0}
          className={`
            flex flex-col items-center justify-center p-3 rounded-lg font-medium text-sm transition-all duration-200
            ${hasVoted && userVoteChoice === 0 
              ? 'bg-red-600 text-white ring-2 ring-red-400' 
              : hasVoted 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 hover:border-red-300'
            }
          `}
          whileHover={!hasVoted && isConnected && votingPower > 0 ? { scale: 1.02 } : {}}
          whileTap={!hasVoted && isConnected && votingPower > 0 ? { scale: 0.98 } : {}}
        >
          <X className="w-4 h-4 mb-1" />
          <span>Against</span>
          {hasVoted && userVoteChoice === 0 && (
            <div className="text-xs opacity-75">Voted</div>
          )}
        </motion.button>

        {/* Vote Abstain Button */}
        <motion.button
          onClick={() => handleVote(2)}
          disabled={!isConnected || hasVoted || isVoting || votingPower === 0}
          className={`
            flex flex-col items-center justify-center p-3 rounded-lg font-medium text-sm transition-all duration-200
            ${hasVoted && userVoteChoice === 2 
              ? 'bg-gray-600 text-white ring-2 ring-gray-400' 
              : hasVoted 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 hover:border-gray-300'
            }
          `}
          whileHover={!hasVoted && isConnected && votingPower > 0 ? { scale: 1.02 } : {}}
          whileTap={!hasVoted && isConnected && votingPower > 0 ? { scale: 0.98 } : {}}
        >
          <Minus className="w-4 h-4 mb-1" />
          <span>Abstain</span>
          {hasVoted && userVoteChoice === 2 && (
            <div className="text-xs opacity-75">Voted</div>
          )}
        </motion.button>

        {/* Loading overlay for compact mode */}
        {isVoting && (
          <div className="col-span-3 flex items-center justify-center py-2">
            <Loader className="w-4 h-4 animate-spin text-blue-600 mr-2" />
            <span className="text-sm text-blue-600">Processing vote...</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Voting Power & Status */}
      <motion.div 
        className="bg-white rounded-xl shadow-lg p-6 border border-gray-200"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Users className="w-5 h-5 mr-2" />
          Your Voting Status
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-2xl font-bold text-blue-600">
              {votingPower.toFixed(2)}
            </div>
            <div className="text-sm text-blue-700">Voting Power</div>
          </div>
          
          <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
            <div className="text-2xl font-bold text-purple-600">
              {hasVoted ? (
                <CheckCircle2 className="w-8 h-8 mx-auto" />
              ) : (
                <Clock className="w-8 h-8 mx-auto" />
              )}
            </div>
            <div className="text-sm text-purple-700">
              {hasVoted ? 'Voted' : 'Not Voted'}
            </div>
          </div>
          
          {hasVoted && (
            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-green-600">
                {getVoteChoiceDisplay(userVoteChoice)}
              </div>
              <div className="text-sm text-green-700">Your Vote</div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Real-time Vote Counts */}
      <motion.div 
        className="bg-white rounded-xl shadow-lg p-6 border border-gray-200"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <TrendingUp className="w-5 h-5 mr-2" />
          Live Vote Results
        </h3>
        
        <div className="space-y-4">
          {/* For Votes */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-green-700 flex items-center">
                <Check className="w-4 h-4 mr-1" />
                For
              </span>
              <span className="text-sm text-gray-600">
                {realTimeVotes.forVotes.toLocaleString()} ({forPercentage.toFixed(1)}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-green-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${forPercentage}%` }}
              />
            </div>
          </div>

          {/* Against Votes */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-red-700 flex items-center">
                <X className="w-4 h-4 mr-1" />
                Against
              </span>
              <span className="text-sm text-gray-600">
                {realTimeVotes.againstVotes.toLocaleString()} ({againstPercentage.toFixed(1)}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-red-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${againstPercentage}%` }}
              />
            </div>
          </div>

          {/* Abstain Votes */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700 flex items-center">
                <Minus className="w-4 h-4 mr-1" />
                Abstain
              </span>
              <span className="text-sm text-gray-600">
                {realTimeVotes.abstainVotes.toLocaleString()} ({abstainPercentage.toFixed(1)}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-gray-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${abstainPercentage}%` }}
              />
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Total Votes</span>
              <span className="text-lg font-bold text-gray-900">
                {totalVotes.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Voting Interface */}
      {!hasVoted && proposalState === 1 && (
        <motion.div 
          className="bg-white rounded-xl shadow-lg p-6 border border-gray-200"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Vote className="w-5 h-5 mr-2" />
            Cast Your Vote
          </h3>
          
          {votingPower > 0 ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {voteOptions.map((option) => (
                  <motion.button
                    key={option.type}
                    onClick={() => handleVote(option.type)}
                    disabled={isVoting || isVotePending || isVoteConfirming}
                    className={`
                      p-4 rounded-lg border-2 transition-all duration-200
                      ${option.bgColor} ${option.borderColor} ${option.hoverColor}
                      ${selectedVote === option.type ? option.selectedColor : ''}
                      disabled:opacity-50 disabled:cursor-not-allowed
                      hover:scale-105 active:scale-95
                    `}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="text-center">
                      <option.icon className={`w-8 h-8 mx-auto mb-2 ${option.textColor}`} />
                      <div className={`font-semibold ${option.textColor}`}>
                        {option.label}
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {option.description}
                      </div>
                      {(isVoting && selectedVote === option.type) && (
                        <div className="mt-2">
                          <Loader className="w-4 h-4 animate-spin mx-auto" />
                        </div>
                      )}
                    </div>
                  </motion.button>
                ))}
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-start">
                  <Shield className="w-5 h-5 text-blue-600 mr-2 mt-0.5" />
                  <div>
                    <div className="text-sm font-medium text-blue-800">
                      Secure MetaMask Signing
                    </div>
                    <div className="text-xs text-blue-600 mt-1">
                      Your vote will be securely signed through MetaMask. Your private keys never leave your wallet.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center p-6 bg-yellow-50 rounded-lg border border-yellow-200">
              <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
              <h4 className="font-semibold text-yellow-800 mb-2">No Voting Power</h4>
              <p className="text-sm text-yellow-700">
                You need governance tokens to participate in voting. 
                Get tokens or delegate voting power to participate.
              </p>
            </div>
          )}
        </motion.div>
      )}

      {/* Vote Status Messages */}
      <AnimatePresence>
        {hasVoted && (
          <motion.div 
            className="bg-white rounded-xl shadow-lg p-6 border border-gray-200"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="text-center">
              <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
              <h4 className="font-semibold text-green-800 mb-2">Vote Successfully Cast</h4>
              <p className="text-sm text-green-700">
                You voted <strong>{getVoteChoiceDisplay(userVoteChoice)}</strong> on this proposal.
                Your vote is recorded on-chain and cannot be changed.
              </p>
            </div>
          </motion.div>
        )}

        {proposalState !== 1 && proposalState !== undefined && (
          <motion.div 
            className="bg-white rounded-xl shadow-lg p-6 border border-gray-200"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="text-center">
              <XCircle className="w-12 h-12 text-red-600 mx-auto mb-3" />
              <h4 className="font-semibold text-red-800 mb-2">Voting Not Available</h4>
              <p className="text-sm text-red-700">
                Voting is currently not active for this proposal. 
                The proposal may be pending, expired, or already executed.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transaction Status */}
      <AnimatePresence>
        {(isVotePending || isVoteConfirming) && (
          <motion.div 
            className="bg-white rounded-xl shadow-lg p-6 border border-gray-200"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="text-center">
              <Loader className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
              <h4 className="font-semibold text-blue-800 mb-2">
                {isVotePending ? 'Confirm in MetaMask' : 'Processing Vote...'}
              </h4>
              <p className="text-sm text-blue-700">
                {isVotePending 
                  ? 'Please confirm the transaction in your MetaMask wallet'
                  : 'Your vote is being processed on the blockchain'
                }
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Vote History */}
      {voteHistory.length > 0 && (
        <motion.div 
          className="bg-white rounded-xl shadow-lg p-6 border border-gray-200"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <History className="w-5 h-5 mr-2" />
            Your Vote History
          </h3>
          
          <div className="space-y-3">
            {voteHistory.slice(0, 5).map((vote, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium">Proposal #{vote.proposalId}</div>
                  <div className="text-sm text-gray-600">
                    {new Date(vote.timestamp).toLocaleDateString()}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-semibold ${
                    vote.voteType === 1 ? 'text-green-600' :
                    vote.voteType === 0 ? 'text-red-600' :
                    'text-gray-600'
                  }`}>
                    {getVoteChoiceDisplay(vote.voteType)}
                  </div>
                  <div className="text-sm text-gray-600">
                    {vote.votingPower.toFixed(2)} votes
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default VotingSystem;
