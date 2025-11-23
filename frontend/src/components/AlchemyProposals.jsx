import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ethers } from 'ethers';
import { useNavigate } from 'react-router-dom';
import { useAccount, useChainId } from 'wagmi';
import toast from 'react-hot-toast';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Users, 
  Calendar,
  Vote,
  RefreshCw,
  Wifi,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  MessageSquare
} from 'lucide-react';

// Import configuration and ABI
import { CONTRACT_ADDRESSES } from '../config/contracts';
import { DAO_ABI } from '../config/abis';
import { ALCHEMY_RPC_URL } from '../config.js';
import VotingSystem from './Voting';
import AdvancedSearch from './AdvancedSearch';
import ProposalComments from './ProposalComments';
import { useRealTimeProposals } from '../services/websocket.jsx';

/**
 * Proposals Component - Fetches and displays DAO proposals using Alchemy RPC
 * 
 * THEORY: This component demonstrates several key Web3 frontend concepts:
 * 
 * 1. RPC Provider Setup:
 *    - We use Alchemy's RPC endpoint instead of MetaMask's provider
 *    - This allows read-only access without requiring wallet connection
 *    - Alchemy provides better reliability, caching, and rate limiting
 * 
 * 2. Contract Interaction:
 *    - ethers.Contract combines ABI + address to create a JS representation
 *    - ABI tells Ethers what functions exist and how to encode/decode data
 *    - getAllProposals() returns structured data that Ethers auto-decodes
 * 
 * 3. Event Listening:
 *    - contract.on() sets up real-time listeners for blockchain events
 *    - When ProposalCreated is emitted, our UI updates automatically
 *    - This creates responsive UX without manual refreshing
 * 
 * 4. Async State Management:
 *    - Blockchain calls are asynchronous and can fail
 *    - We handle loading states, errors, and cleanup properly
 *    - useCallback prevents unnecessary re-renders during data fetching
 */

const AlchemyProposals = () => {
  // Navigation hook
  const navigate = useNavigate();
  
  // Wallet connection status and chain info
  const { isConnected } = useAccount();
  const chainId = useChainId();
  
  // State management
  const [proposals, setProposals] = useState([]);
  const [filteredProposals, setFilteredProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [provider, setProvider] = useState(null);
  const [contract, setContract] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const [expandedVoting, setExpandedVoting] = useState(new Set());
  const [expandedComments, setExpandedComments] = useState(new Set());
  const [searchFilters, setSearchFilters] = useState(null);

  // Use real-time proposals hook
  const realTimeProposals = useRealTimeProposals(proposals);

  // Helper function to determine proposal status from contract state
  const getProposalStatusFromState = (state) => {
    const states = {
      0: 'Pending',
      1: 'Active', 
      2: 'Cancelled',
      3: 'Defeated',
      4: 'Succeeded',
      5: 'Queued',
      6: 'Expired',
      7: 'Executed'
    };
    return states[state] || 'Unknown';
  };

  // Helper function to determine proposal status (legacy)
  const getProposalStatus = (proposal) => {
    if (proposal.executed) return 'Executed';
    if (proposal.cancelled) return 'Cancelled';
    if (Date.now() > proposal.deadline) return 'Expired';
    if (Date.now() < proposal.startTime) return 'Pending';
    return 'Active';
  };

  // Helper function to toggle voting section
  const toggleVotingSection = (proposalId) => {
    setExpandedVoting(prev => {
      const newSet = new Set(prev);
      if (newSet.has(proposalId)) {
        newSet.delete(proposalId);
      } else {
        newSet.add(proposalId);
      }
      return newSet;
    });
  };

  // Helper function to toggle comments section
  const toggleCommentsSection = (proposalId) => {
    setExpandedComments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(proposalId)) {
        newSet.delete(proposalId);
      } else {
        newSet.add(proposalId);
      }
      return newSet;
    });
  };

  // Helper function to handle vote success and refresh data
  const handleVoteSuccess = useCallback(() => {
    if (contract) {
      fetchProposals(contract);
      setLastRefresh(Date.now());
    }
  }, [contract]);

  // Helper function to fetch IPFS metadata
  const fetchIPFSMetadata = useCallback(async (ipfsHash) => {
    if (!ipfsHash || ipfsHash === '') return null;
    
    // Skip test/dummy hashes
    if (ipfsHash.includes('Test') || ipfsHash.includes('test') || ipfsHash.length < 20) {
      console.log(`⚠️ Skipping test/dummy IPFS hash: ${ipfsHash}`);
      return null;
    }
    
    try {
      console.log(`🌐 Fetching IPFS metadata: ${ipfsHash}`);
      
      // Try multiple IPFS gateways for better reliability
      const gateways = [
        `https://gateway.pinata.cloud/ipfs/${ipfsHash}`,
        `https://ipfs.io/ipfs/${ipfsHash}`,
        `https://cloudflare-ipfs.com/ipfs/${ipfsHash}`,
        `https://dweb.link/ipfs/${ipfsHash}`
      ];
      
      for (const gateway of gateways) {
        try {
          console.log(`Trying gateway: ${gateway}`);
          
          // Create AbortController for timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
          
          const response = await fetch(gateway, {
            headers: {
              'Accept': 'application/json',
            },
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (response.ok) {
            const metadata = await response.json();
            console.log(`✅ Successfully fetched metadata from IPFS:`, metadata);
            return metadata;
          } else {
            console.warn(`❌ Gateway ${gateway} returned status: ${response.status}`);
          }
        } catch (gatewayError) {
          if (gatewayError.name === 'AbortError') {
            console.warn(`⏰ Timeout fetching from ${gateway}`);
          } else {
            console.warn(`❌ Failed to fetch from ${gateway}:`, gatewayError.message);
          }
          continue;
        }
      }
      
      console.warn(`❌ Failed to fetch IPFS metadata from all gateways for hash: ${ipfsHash}`);
      return null;
    } catch (error) {
      console.error(`❌ Error fetching IPFS metadata:`, error);
      return null;
    }
  }, []);

  // Helper function to add a single new proposal to state (for real-time updates)
  const addNewProposal = useCallback(async (proposalId, daoContract) => {
    try {
      console.log(`🔄 Fetching new proposal ${proposalId} for real-time update...`);
      
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
      
      const state = await daoContract.getProposalState(proposalId);
      
      let newProposal = {
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
        deadline: Number(endTime) * 1000,
        status: getProposalStatusFromState(Number(state))
      };

      // Fetch IPFS metadata if available
      if (ipfsHash && ipfsHash !== '') {
        const metadata = await fetchIPFSMetadata(ipfsHash);
        if (metadata) {
          newProposal = {
            ...newProposal,
            title: metadata.title || newProposal.title,
            description: metadata.description || newProposal.description,
            metadata: metadata
          };
        }
      }

      // Add to proposals state (at the beginning since it's newest)
      setProposals(prevProposals => {
        // Check if proposal already exists to avoid duplicates
        const exists = prevProposals.find(p => p.id === newProposal.id);
        if (exists) {
          console.log(`Proposal ${proposalId} already exists in state`);
          return prevProposals;
        }
        
        console.log(`✅ Added new proposal ${proposalId} to state`);
        return [newProposal, ...prevProposals];
      });
      
      setLastRefresh(Date.now());
      
    } catch (error) {
      console.error(`❌ Failed to fetch new proposal ${proposalId}:`, error);
    }
  }, [fetchIPFSMetadata, getProposalStatusFromState]);

  // Refs to maintain provider and contract instances across renders
  const providerRef = useRef(null);
  const contractRef = useRef(null);
  const eventListenerRef = useRef(null);

  /**
   * Initialize Alchemy Provider and Contract Instance
   * 
   * THEORY: We create a read-only provider using Alchemy's RPC endpoint.
   * This provider can read blockchain state but cannot send transactions.
   * The provider is stateless and doesn't require user authentication.
   */
    const initializeProvider = async () => {
    try {
      setLoading(true);
      
      // Get current chain and determine RPC URL
      const currentChainId = chainId || 421614; // Default to Arbitrum Sepolia
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
      
      // Test connection
      const network = await provider.getNetwork();
      console.log(`Connected to network: ${network.name} (${network.chainId})`);
      
      // Create contract instance with appropriate DAO address
      const daoContract = new ethers.Contract(
        CONTRACT_ADDRESSES.DAO,
        DAO_ABI, 
        provider
      );
      
      setProvider(provider);
      setContract(daoContract);
      
      // Fetch proposals using compatible method
      await fetchProposals(daoContract);
      
      // Set up event listener for new proposals
      setupEventListener(daoContract);
      
      // Update last refresh time
      setLastRefresh(Date.now());
      
    } catch (error) {
      console.error('Failed to initialize provider:', error);
      const currentChainId = chainId || 421614;
      if (currentChainId === 31337) {
        setError('Failed to connect to local blockchain. Make sure your local node is running on port 8545.');
      } else {
        setError('Failed to connect to Arbitrum network. Please check your internet connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch all proposals from the smart contract
   * 
   * THEORY: We call the getProposal() view function on our contract.
   * View functions don't modify state and don't cost gas.
   * Ethers automatically formats the returned struct array into JavaScript objects.
   */
  const fetchProposals = useCallback(async (daoContract) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 Fetching proposals from DAO contract...');
      
      // Get the total number of proposals
      const proposalCount = await daoContract.proposalCount();
      const count = Number(proposalCount);
      console.log(`📊 Found ${count} proposals in contract`);
      
      if (count === 0) {
        setProposals([]);
        console.log('📋 No proposals found');
        return;
      }
      
      // Fetch each proposal individually
      const proposalsData = [];
      for (let i = 1; i <= count; i++) { // Changed from 0-indexed to 1-indexed
        try {
          console.log(`🔄 Fetching proposal ${i}...`);
          const proposalData = await daoContract.getProposal(i);
          
          // Destructure based on your ABI return structure
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
          const state = await daoContract.getProposalState(i);
          
          // Base proposal object
          let proposal = {
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
            timestamp: Number(startTime) * 1000, // Convert to milliseconds
            deadline: Number(endTime) * 1000,
            status: getProposalStatusFromState(Number(state))
          };

          // Fetch IPFS metadata if available
          if (ipfsHash && ipfsHash !== '') {
            console.log(`🔄 Fetching IPFS metadata for proposal ${i} with hash: ${ipfsHash}`);
            const metadata = await fetchIPFSMetadata(ipfsHash);
            
            if (metadata) {
              // Merge IPFS metadata with on-chain data
              proposal = {
                ...proposal,
                title: metadata.title || proposal.title,
                description: metadata.description || proposal.description,
                metadata: metadata // Store full metadata for potential future use
              };
              console.log(`✅ Enhanced proposal ${i} with IPFS metadata`);
            } else {
              console.warn(`⚠️ Could not fetch IPFS metadata for proposal ${i}`);
            }
          }
          
          proposalsData.push(proposal);
          console.log(`✅ Loaded proposal ${i}:`, proposal.title);
          
        } catch (propError) {
          console.error(`❌ Failed to fetch proposal ${i}:`, propError);
        }
      }
      
      // Sort by creation time (newest first)
      proposalsData.sort((a, b) => b.timestamp - a.timestamp);
      
      setProposals(proposalsData);
      console.log(`🎉 Successfully loaded ${proposalsData.length} proposals`);
      setLastRefresh(Date.now());
      
    } catch (error) {
      console.error('❌ Failed to fetch proposals:', error);
      setError(`Failed to fetch proposals: ${error.message}`);
      
      // Fallback to sample data for development
      setProposals([
        {
          id: 0,
          title: "Sample Proposal",
          description: "This is a sample proposal for testing the UI",
          proposer: "0x1234567890123456789012345678901234567890",
          forVotes: 150,
          againstVotes: 50,
          abstainVotes: 10,
          deadline: Date.now() + 86400000,
          executed: false,
          cancelled: false,
          state: 1, // Active
          timestamp: Date.now() - 3600000,
          status: "Active"
        }
      ]);
      setLastRefresh(Date.now());
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Set up event listener for real-time updates
   * 
   * THEORY: Event listeners monitor the blockchain for specific events.
   * When someone creates a new proposal, the smart contract emits ProposalCreated.
   * Our listener catches this and automatically refreshes the UI.
   * This creates a real-time experience across all users.
   */
  const setupEventListener = useCallback((daoContract) => {
    if (!daoContract || eventListenerRef.current) return;

    try {
      // Set up listener for ProposalCreated events
      const handleProposalCreated = async (proposalId, title, description, proposer, deadline, event) => {
        console.log('🎉 New proposal created event detected:', { 
          proposalId: Number(proposalId), 
          title, 
          description, 
          proposer 
        });
        
        // Show success notification immediately
        toast.success(`New proposal #${Number(proposalId)} created: ${title}`, {
          duration: 5000,
          icon: '🗳️'
        });
        
        // Wait a bit for blockchain state to settle, then add the single proposal
        setTimeout(async () => {
          console.log('🔄 Adding new proposal to state via real-time update...');
          await addNewProposal(Number(proposalId), daoContract);
        }, 2000); // Reduced delay since we're only adding one proposal
      };

      // Attach the event listener to our contract  
      daoContract.on('ProposalCreated', handleProposalCreated);
      eventListenerRef.current = handleProposalCreated;
      contractRef.current = daoContract;

      console.log('✅ Event listener setup complete - listening for ProposalCreated events');
    } catch (err) {
      console.error('❌ Failed to setup event listener:', err);
    }
  }, [addNewProposal]);

  /**
   * Manual refresh function for user-triggered updates
   */
  const handleRefresh = useCallback(() => {
    if (contract) {
      fetchProposals(contract);
      setLastRefresh(Date.now());
    }
  }, [contract, fetchProposals]);

  /**
   * Effect hook to initialize component and fetch data
   */
  useEffect(() => {
    initializeProvider();

    // Cleanup function to remove event listeners when component unmounts
    return () => {
      if (contractRef.current && eventListenerRef.current) {
        contractRef.current.off('ProposalCreated', eventListenerRef.current);
        eventListenerRef.current = null;
      }
    };
  }, []);

  /**
   * Helper function to format vote counts
   */
  const formatVotes = (votes) => {
    const num = Number(ethers.formatEther(votes));
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toFixed(2);
  };

  /**
   * Helper function to format addresses
   */
  const formatAddress = (address) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  /**
   * Helper function to format dates
   */
  const formatDate = (date) => {
    // Handle timestamp numbers or Date objects
    const dateObj = typeof date === 'number' ? new Date(date) : date;
    
    // Check if it's a valid date
    if (!dateObj || isNaN(dateObj.getTime())) {
      return 'Invalid Date';
    }
    
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Loading state
  if (loading && proposals.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Loading Proposals</h3>
          <p className="text-gray-500">Fetching data from Ethereum Sepolia...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="mb-4 md:mb-0">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">DAO Proposals</h1>
              <p className="text-gray-600">
                Proposals fetched directly from Ethereum Sepolia via Alchemy RPC
              </p>
              <div className="flex items-center mt-2 text-sm text-gray-500">
                <Wifi className="w-4 h-4 mr-1" />
                <span>Real-time updates via event listeners</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-500">
                Last updated: {formatDate(lastRefresh)}
              </div>
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-8">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-3" />
              <div>
                <h3 className="text-red-800 font-medium">Error</h3>
                <p className="text-red-600 text-sm">{error}</p>
                <button 
                  onClick={handleRefresh}
                  className="text-red-600 text-sm underline mt-1 hover:text-red-800"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Advanced Search */}
        <AdvancedSearch 
          onResults={setFilteredProposals}
          onFiltersChange={setSearchFilters}
        />

        {/* Proposals Grid */}
        {(filteredProposals.length > 0 || (!searchFilters && proposals.length > 0)) ? (
          <div className="grid gap-6">
            {(filteredProposals.length > 0 ? filteredProposals : proposals).map((proposal) => (
              <div
                key={proposal.id}
                className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow duration-200"
              >
                {/* Proposal Header */}
                <div className="p-6 border-b border-gray-100">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                          <Vote className="w-4 h-4 mr-1" />
                          Proposal #{proposal.id}
                        </span>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                          proposal.executed 
                            ? 'bg-green-100 text-green-800' 
                            : (proposal.status === 'Expired' || proposal.status === 'Defeated') 
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {proposal.executed ? (
                            <>
                              <CheckCircle className="w-4 h-4 mr-1" />
                              ✅ Executed
                            </>
                          ) : (proposal.status === 'Expired' || proposal.status === 'Defeated') ? (
                            <>
                              <XCircle className="w-4 h-4 mr-1" />
                              ❌ {proposal.status}
                            </>
                          ) : (
                            <>
                              <Clock className="w-4 h-4 mr-1" />
                              🟡 {proposal.status}
                            </>
                          )}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {proposal.description}
                      </h3>
                      
                      {/* Quick Vote Summary */}
                      <div className="flex items-center space-x-4 mb-4 p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center text-sm">
                          <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                          <span className="text-gray-600">For:</span>
                          <span className="font-semibold text-gray-900 ml-1">{formatVotes(proposal.forVotes)}</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                          <span className="text-gray-600">Against:</span>
                          <span className="font-semibold text-gray-900 ml-1">{formatVotes(proposal.againstVotes)}</span>
                        </div>
                        <div className="flex items-center text-sm">
                          <div className="w-3 h-3 bg-gray-500 rounded-full mr-2"></div>
                          <span className="text-gray-600">Abstain:</span>
                          <span className="font-semibold text-gray-900 ml-1">{formatVotes(proposal.abstainVotes || 0)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Proposal Details */}
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center text-gray-500">
                      <Users className="w-4 h-4 mr-2" />
                      <span>Proposer: {formatAddress(proposal.proposer)}</span>
                    </div>
                    <div className="flex items-center text-gray-500">
                      <Calendar className="w-4 h-4 mr-2" />
                      <span>Deadline: {formatDate(proposal.deadline)}</span>
                    </div>
                  </div>
                </div>

                {/* Voting Results */}
                <div className="p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Voting Results</h4>
                  
                  <div className="space-y-4">
                    {/* Votes For */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">Votes For</span>
                        <span className="text-sm text-gray-600">{formatVotes(proposal.forVotes)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-green-500 h-3 rounded-full transition-all duration-300"
                          style={{ 
                            width: (proposal.forVotes + proposal.againstVotes + (proposal.abstainVotes || 0)) > 0 
                              ? `${(Number(proposal.forVotes) / (Number(proposal.forVotes) + Number(proposal.againstVotes) + Number(proposal.abstainVotes || 0))) * 100}%` 
                              : '0%' 
                          }}
                        />
                      </div>
                    </div>

                    {/* Votes Against */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">Votes Against</span>
                        <span className="text-sm text-gray-600">{formatVotes(proposal.againstVotes)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-red-500 h-3 rounded-full transition-all duration-300"
                          style={{ 
                            width: (proposal.forVotes + proposal.againstVotes + (proposal.abstainVotes || 0)) > 0 
                              ? `${(Number(proposal.againstVotes) / (Number(proposal.forVotes) + Number(proposal.againstVotes) + Number(proposal.abstainVotes || 0))) * 100}%` 
                              : '0%' 
                          }}
                        />
                      </div>
                    </div>

                    {/* Total Votes */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium text-gray-700">Total Votes</span>
                      <span className="text-lg font-bold text-gray-900">
                        {formatVotes(proposal.forVotes + proposal.againstVotes + (proposal.abstainVotes || 0))}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Direct Voting Buttons */}
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-gray-900">Cast Your Vote</h4>
                      <div className="text-xs text-gray-500">
                        {!isConnected ? 'Connect wallet to vote' : 'Choose your position'}
                      </div>
                    </div>
                    
                    {/* Three Voting Options - Compact Mode */}
                    <VotingSystem 
                      proposalId={proposal.id}
                      proposalData={proposal}
                      onVoteSuccess={handleVoteSuccess}
                      compact={true}
                    />
                    
                    {/* Additional Actions */}
                    <div className="flex gap-2 pt-2 border-t border-gray-200">
                      <button
                        onClick={() => navigate(`/vote/${proposal.id}`)}
                        className="flex-1 flex items-center justify-center px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg border border-gray-200 transition-colors duration-200"
                      >
                        <ExternalLink className="w-3 h-3 mr-2" />
                        View Full Details
                      </button>
                      
                      <button
                        onClick={() => toggleVotingSection(proposal.id)}
                        className="flex-1 flex items-center justify-center px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg border border-gray-200 transition-colors duration-200"
                      >
                        <Vote className="w-3 h-3 mr-2" />
                        {expandedVoting.has(proposal.id) ? 'Hide Voting' : 'Vote'}
                      </button>

                      <button
                        onClick={() => toggleCommentsSection(proposal.id)}
                        className="flex-1 flex items-center justify-center px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg border border-gray-200 transition-colors duration-200"
                      >
                        <MessageSquare className="w-3 h-3 mr-2" />
                        {expandedComments.has(proposal.id) ? 'Hide Comments' : 'Comments'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Voting System */}
                {expandedVoting.has(proposal.id) && (
                  <div className="px-6 pb-6">
                    <VotingSystem 
                      proposalId={proposal.id}
                      proposalData={proposal}
                      onVoteSuccess={handleVoteSuccess}
                    />
                  </div>
                )}

                {/* Expanded Comments Section */}
                {expandedComments.has(proposal.id) && (
                  <div className="px-6 pb-6">
                    <ProposalComments proposalId={proposal.id} />
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : !loading && (
          <div className="text-center py-12 bg-white rounded-xl shadow-lg">
            <Vote className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-500 mb-2">No Proposals Found</h3>
            <p className="text-gray-400">
              No proposals have been created yet, or there was an error fetching them.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AlchemyProposals;
