import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Clock, 
  Vote, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Calendar, 
  TrendingUp,
  Filter,
  Search,
  ChevronDown,
  ExternalLink
} from 'lucide-react';
import { backendAPI } from '../services/backendApi';

const UserVotingHistory = ({ userAddress, className = '' }) => {
  const [votingHistory, setVotingHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // all, for, against, abstain
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (userAddress) {
      fetchVotingHistory();
    }
  }, [userAddress, currentPage, filter]);

  const fetchVotingHistory = async () => {
    try {
      setLoading(true);
      const response = await backendAPI.getUserVotingHistory(userAddress, currentPage, 10);
      setVotingHistory(response.votes || []);
      setTotalPages(Math.ceil((response.total || 0) / 10));
      setError(null);
    } catch (err) {
      console.error('Failed to fetch voting history:', err);
      setError('Failed to load voting history');
      setVotingHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const getVoteTypeIcon = (voteType) => {
    switch (voteType?.toLowerCase()) {
      case 'for':
      case 'yes':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'against':
      case 'no':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'abstain':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      default:
        return <Vote className="w-5 h-5 text-gray-500" />;
    }
  };

  const getVoteTypeColor = (voteType) => {
    switch (voteType?.toLowerCase()) {
      case 'for':
      case 'yes':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'against':
      case 'no':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'abstain':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filteredHistory = votingHistory.filter(vote => {
    const matchesFilter = filter === 'all' || vote.voteType?.toLowerCase() === filter;
    const matchesSearch = searchTerm === '' || 
      vote.proposalTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vote.proposalId?.toString().includes(searchTerm);
    return matchesFilter && matchesSearch;
  });

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-xl shadow-lg p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-xl shadow-lg p-6 ${className}`}>
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 font-medium">{error}</p>
          <button 
            onClick={fetchVotingHistory}
            className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl shadow-lg ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900 flex items-center">
            <Vote className="w-6 h-6 mr-2 text-blue-600" />
            Voting History
          </h3>
          <span className="text-sm text-gray-500">
            {filteredHistory.length} votes
          </span>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search proposals..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="relative">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Votes</option>
              <option value="for">For</option>
              <option value="against">Against</option>
              <option value="abstain">Abstain</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Voting History List */}
      <div className="p-6">
        {filteredHistory.length === 0 ? (
          <div className="text-center py-8">
            <Vote className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No voting history found</p>
            <p className="text-gray-400 text-sm mt-1">
              {searchTerm || filter !== 'all' 
                ? 'Try adjusting your search or filter criteria'
                : 'Start participating in governance to see your voting history here'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredHistory.map((vote, index) => (
              <motion.div
                key={vote.id || index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getVoteTypeIcon(vote.voteType)}
                      <h4 className="font-semibold text-gray-900">
                        {vote.proposalTitle || `Proposal #${vote.proposalId}`}
                      </h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getVoteTypeColor(vote.voteType)}`}>
                        {vote.voteType?.toUpperCase() || 'UNKNOWN'}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(vote.timestamp || vote.createdAt)}
                      </div>
                      {vote.votingPower && (
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-4 h-4" />
                          {vote.votingPower} DVT
                        </div>
                      )}
                      {vote.proposalId && (
                        <div className="flex items-center gap-1">
                          <ExternalLink className="w-4 h-4" />
                          Proposal #{vote.proposalId}
                        </div>
                      )}
                    </div>

                    {vote.reason && (
                      <p className="mt-2 text-sm text-gray-700 italic">
                        "{vote.reason}"
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserVotingHistory;
