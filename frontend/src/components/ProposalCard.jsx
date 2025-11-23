import { useState } from 'react';
import { motion } from 'framer-motion';
import { formatEther } from 'viem';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Users, 
  ArrowRight,
  Vote,
  Calendar,
  Target,
  Play,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Ban
} from 'lucide-react';

const ProposalCard = ({ proposal, onVote, onExecute, onCancel, refreshProposals, isAdmin }) => {
  const [isVoting, setIsVoting] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

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

  // Get proposal state info
  const getProposalState = (state) => {
    const states = {
      0: { name: 'Pending', color: 'text-yellow-600 bg-yellow-100', icon: Clock },
      1: { name: 'Active', color: 'text-green-600 bg-green-100', icon: Vote },
      2: { name: 'Canceled', color: 'text-gray-600 bg-gray-100', icon: XCircle },
      3: { name: 'Defeated', color: 'text-red-600 bg-red-100', icon: XCircle },
      4: { name: 'Succeeded', color: 'text-blue-600 bg-blue-100', icon: CheckCircle },
      5: { name: 'Queued', color: 'text-purple-600 bg-purple-100', icon: Clock },
      6: { name: 'Expired', color: 'text-gray-600 bg-gray-100', icon: XCircle },
      7: { name: 'Executed', color: 'text-green-600 bg-green-100', icon: CheckCircle },
    };
    return states[state] || states[0];
  };

  const stateInfo = getProposalState(proposal.state);
  const StateIcon = stateInfo.icon;

  // Calculate vote percentages
  const totalVotes = Number(proposal.forVotes) + Number(proposal.againstVotes) + Number(proposal.abstainVotes);
  const forPercentage = totalVotes > 0 ? (Number(proposal.forVotes) / totalVotes) * 100 : 0;
  const againstPercentage = totalVotes > 0 ? (Number(proposal.againstVotes) / totalVotes) * 100 : 0;
  const abstainPercentage = totalVotes > 0 ? (Number(proposal.abstainVotes) / totalVotes) * 100 : 0;

  // Handle voting
  const handleVote = async (support) => {
    setIsVoting(true);
    try {
      await onVote(proposal.id, support);
    } finally {
      setIsVoting(false);
    }
  };

  // Handle execution
  const handleExecute = async () => {
    setIsExecuting(true);
    try {
      await onExecute(proposal.id);
    } finally {
      setIsExecuting(false);
    }
  };

  // Handle cancellation
  const handleCancel = async () => {
    if (window.confirm('Are you sure you want to cancel this proposal? This action cannot be undone.')) {
      try {
        await onCancel(proposal.id);
      } catch (error) {
        console.error('Error cancelling proposal:', error);
      }
    }
  };

  // Check if proposal can be voted on
  const canVote = proposal.state === 1; // Active state
  const canExecute = proposal.state === 4; // Succeeded state
  const canCancel = isAdmin && (proposal.state === 0 || proposal.state === 1); // Pending or Active state

  return (
    <motion.div
      layout
      className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow duration-200"
    >
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${stateInfo.color}`}>
                <StateIcon className="w-4 h-4 mr-1" />
                {stateInfo.name}
              </span>
              <span className="text-sm text-gray-500">
                Proposal #{proposal.id}
              </span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {proposal.title}
            </h3>
            <p className="text-gray-600 leading-relaxed">
              {proposal.description}
            </p>
          </div>
        </div>

        {/* Proposal Details */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex items-center text-gray-500">
            <Users className="w-4 h-4 mr-2" />
            <span>Proposer: {`${proposal.proposer.slice(0, 6)}...${proposal.proposer.slice(-4)}`}</span>
          </div>
          <div className="flex items-center text-gray-500">
            <Calendar className="w-4 h-4 mr-2" />
            <span>Block: {proposal.startBlock.toString()}</span>
          </div>
        </div>
      </div>

      {/* Voting Results */}
      <div className="p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Voting Results</h4>
        
        {/* Vote Bars */}
        <div className="space-y-3 mb-6">
          {/* For Votes */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <div className="flex items-center">
                <ThumbsUp className="w-4 h-4 text-green-600 mr-2" />
                <span className="text-sm font-medium text-gray-700">For</span>
              </div>
              <span className="text-sm text-gray-600">
                {formatVotes(proposal.forVotes)} ({forPercentage.toFixed(1)}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-green-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${forPercentage}%` }}
              />
            </div>
          </div>

          {/* Against Votes */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <div className="flex items-center">
                <ThumbsDown className="w-4 h-4 text-red-600 mr-2" />
                <span className="text-sm font-medium text-gray-700">Against</span>
              </div>
              <span className="text-sm text-gray-600">
                {formatVotes(proposal.againstVotes)} ({againstPercentage.toFixed(1)}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-red-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${againstPercentage}%` }}
              />
            </div>
          </div>

          {/* Abstain Votes */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <div className="flex items-center">
                <Minus className="w-4 h-4 text-gray-600 mr-2" />
                <span className="text-sm font-medium text-gray-700">Abstain</span>
              </div>
              <span className="text-sm text-gray-600">
                {formatVotes(proposal.abstainVotes)} ({abstainPercentage.toFixed(1)}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-gray-500 h-3 rounded-full transition-all duration-300"
                style={{ width: `${abstainPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Total Votes */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-6">
          <span className="text-sm font-medium text-gray-700">Total Votes</span>
          <span className="text-lg font-bold text-gray-900">
            {formatVotes(BigInt(totalVotes))}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          {canVote && (
            <>
              <button
                onClick={() => handleVote(1)}
                disabled={isVoting}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                <ThumbsUp className="w-4 h-4 mr-2" />
                {isVoting ? 'Voting...' : 'Vote For'}
              </button>
              <button
                onClick={() => handleVote(0)}
                disabled={isVoting}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                <ThumbsDown className="w-4 h-4 mr-2" />
                {isVoting ? 'Voting...' : 'Vote Against'}
              </button>
              <button
                onClick={() => handleVote(2)}
                disabled={isVoting}
                className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                <Minus className="w-4 h-4 mr-2" />
                {isVoting ? 'Voting...' : 'Abstain'}
              </button>
            </>
          )}

          {canExecute && (
            <button
              onClick={handleExecute}
              disabled={isExecuting}
              className="flex-1 bg-dao-600 text-white px-4 py-2 rounded-lg hover:bg-dao-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              <Play className="w-4 h-4 mr-2" />
              {isExecuting ? 'Executing...' : 'Execute Proposal'}
            </button>
          )}

          {canCancel && (
            <button
              onClick={handleCancel}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center"
            >
              <Ban className="w-4 h-4 mr-2" />
              Cancel
            </button>
          )}

          {!canVote && !canExecute && !canCancel && (
            <div className="flex-1 text-center text-gray-500 py-2">
              {proposal.state === 7 ? 'Proposal Executed' : 
               proposal.state === 3 ? 'Proposal Defeated' :
               proposal.state === 0 ? 'Voting Not Started' :
               'Voting Ended'}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ProposalCard;
