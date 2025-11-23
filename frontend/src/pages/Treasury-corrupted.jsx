import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt, useReadContracts } from 'wagmi';
import { motion } from 'framer-motion';
import { formatEther, parseEther } from 'viem';
import { toast } from 'react-hot-toast';
import QRCode from 'qrcode';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown,
  ArrowUpRight, 
  ArrowDownRight,
  DollarSign,
  Coins,
  Activity,
  Eye,
  RefreshCw,
  Send,
  Download,
  CheckCircle,
  XCircle,
  AlertCircle,
  ExternalLink,
  Search,
  QrCode,
  Copy,
  BarChart,
  Clock
} from 'lucide-react';

import { CONTRACTS, CONTRACT_ADDRESSES } from '../config/contracts';
import { TREASURY_ABI, DAO_ABI } from '../config/abis';
import { backendAPI } from '../services/backendApi';

const Treasury = () => {
  // Backend integration state
  const [backendBalance, setBackendBalance] = useState(null);
  const [backendTransactions, setBackendTransactions] = useState([]);
  const [treasuryAnalytics, setTreasuryAnalytics] = useState(null);
  const [treasurySummary, setTreasurySummary] = useState(null);
  const [backendLoading, setBackendLoading] = useState(true);
  const [backendError, setBackendError] = useState(null);
  
  // ERC20 Token Support State
  const [showERC20Modal, setShowERC20Modal] = useState(false);
  const [erc20Form, setErc20Form] = useState({
    tokenAddress: '',
    amount: '',
    recipient: ''
  });
  const [supportedTokens] = useState([
    { address: '0xA0b86a33E6441e7195Ed0e1b4d7dC6e36c0f83c6', symbol: 'USDC', decimals: 6 },
    { address: '0x3D8E58e7c54CD6F9fF3D1C5C8b0E7D4e5F6A7B8C', symbol: 'USDT', decimals: 6 },
    { address: '0x4E9F51e2B6c7D8A9F0E1D3C5B7A9E2F4D6C8B0A1', symbol: 'DAI', decimals: 18 }
  ]);

  const { address, isConnected } = useAccount();

  // Smart contract reads
  const { data: treasuryBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.TREASURY,
    abi: TREASURY_ABI,
    functionName: 'balance'
  });

  const { data: withdrawalDelay } = useReadContract({
    address: CONTRACT_ADDRESSES.TREASURY,
    abi: TREASURY_ABI,
    functionName: 'withdrawalDelay'
  });

  const { data: isPaused } = useReadContract({
    address: CONTRACT_ADDRESSES.TREASURY,
    abi: TREASURY_ABI,
    functionName: 'paused'
  });

  // ERC20 balances for supported tokens
  const tokenBalances = {};
  supportedTokens.forEach(token => {
    const { data: balance } = useReadContract({
      address: CONTRACT_ADDRESSES.TREASURY,
      abi: TREASURY_ABI,
      functionName: 'tokenBalance',
      args: [token.address]
    });
    tokenBalances[token.symbol] = balance;
  });

  // Load treasury data from backend
  const loadTreasuryData = async () => {
    try {
      setBackendLoading(true);
      setBackendError(null);

      // Load all treasury data in parallel
      const [balanceRes, transactionsRes, analyticsRes, summaryRes] = await Promise.allSettled([
        backendAPI.getTreasuryBalance(),
        backendAPI.getTreasuryTransactions(1, 50),
        backendAPI.getTreasuryAnalytics('30d'),
        backendAPI.getTreasurySummary()
      ]);

      // Handle balance
      if (balanceRes.status === 'fulfilled') {
        setBackendBalance(balanceRes.value.balance);
      } else {
        console.error('Failed to load balance:', balanceRes.reason);
      }

      // Handle transactions
      if (transactionsRes.status === 'fulfilled') {
        setBackendTransactions(transactionsRes.value.transactions || []);
      } else {
        console.error('Failed to load transactions:', transactionsRes.reason);
      }

      // Handle analytics
      if (analyticsRes.status === 'fulfilled') {
        setTreasuryAnalytics(analyticsRes.value);
      } else {
        console.error('Failed to load analytics:', analyticsRes.reason);
      }

      // Handle summary
      if (summaryRes.status === 'fulfilled') {
        setTreasurySummary(summaryRes.value);
      } else {
        console.error('Failed to load summary:', summaryRes.reason);
      }

    } catch (error) {
      console.error('Failed to load treasury data:', error);
      setBackendError(error.message);
      toast.error('Failed to load treasury data from backend');
    } finally {
      setBackendLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    loadTreasuryData();
  }, []);

  // Original state variables
  const [loading, setLoading] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [showDepositForm, setShowDepositForm] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [notification, setNotification] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const [sortBy, setSortBy] = useState("date");
  const [searchQuery, setSearchQuery] = useState("");
  const [showQRCode, setShowQRCode] = useState(false);
  const [selectedTab, setSelectedTab] = useState("overview");
  const [qrCodeUrl, setQrCodeUrl] = useState("");

  // Smart contract write hooks
  const { writeContract: writeContract, data: hash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const [requestForm, setRequestForm] = useState({
    title: "",
    description: "",
    amount: "",
    recipient: "",
    duration: "7"
  });

  const [transactions, setTransactions] = useState([]);
  const [pendingWithdrawals, setPendingWithdrawals] = useState([]);

  const [proposals, setProposals] = useState([
    {
      id: 1,
      title: "Marketing Campaign Q4",
      description: "Budget for social media and content marketing campaign",
      amount: "15.5",
      recipient: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
      votesFor: 45,
      votesAgainst: 12,
      executed: false,
      approved: true,
      deadline: Date.now() + 604800000
    },
    {
      id: 2,
      title: "Development Team Salary",
      description: "Monthly payment for core development team",
      amount: "25.0",
      recipient: "0x8ba1f109551bD432803012645Ac136ddd64DBA72",
      votesFor: 52,
      votesAgainst: 8,
      executed: true,
      approved: true,
      deadline: Date.now() - 86400000
    }
  ]);

  // ERC20 Token Transfer Handler
  const handleERC20Transfer = async () => {
    if (!isConnected) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!erc20Form.tokenAddress || !erc20Form.amount || !erc20Form.recipient) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      setLoading(true);
      toast.loading("Submitting ERC20 transfer...", { id: "erc20-transfer" });

      // Find token info for decimals
      const tokenInfo = supportedTokens.find(token => 
        token.address.toLowerCase() === erc20Form.tokenAddress.toLowerCase()
      );
      
      const decimals = tokenInfo ? tokenInfo.decimals : 18;
      const amount = parseEther(erc20Form.amount) / (10n ** (18n - BigInt(decimals)));

      await writeContract({
        address: CONTRACT_ADDRESSES.TREASURY,
        abi: TREASURY_ABI,
        functionName: 'transferToken',
        args: [erc20Form.tokenAddress, erc20Form.recipient, amount],
      });

    } catch (error) {
      console.error("ERC20 transfer error:", error);
      toast.error(error.message || "Failed to transfer tokens", { id: "erc20-transfer" });
      setLoading(false);
    }
  };

  const handleDeposit = async () => {
    if (!isConnected) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    try {
      setLoading(true);
      toast.loading("Submitting deposit transaction...", { id: "deposit" });

      await writeContract({
        address: CONTRACT_ADDRESSES.TREASURY,
        abi: TREASURY_ABI,
        functionName: 'deposit',
        value: parseEther(depositAmount),
      });

    } catch (error) {
      console.error("Deposit error:", error);
      toast.error(error.message || "Failed to deposit", { id: "deposit" });
      setLoading(false);
    }
  };

  // Initialize pending withdrawals (would be fetched from events in production)
  useEffect(() => {
    setPendingWithdrawals([]);
  }, []);

  // Handle transaction confirmation
  useEffect(() => {
    if (isConfirmed) {
      toast.success("Transaction confirmed!", { id: "deposit" });
      setDepositAmount("");
      setShowDepositForm(false);
      setErc20Form({ tokenAddress: '', amount: '', recipient: '' });
      setShowERC20Modal(false);
      setLoading(false);
      // Refresh data after successful transaction
      // The useReadContract hooks will automatically refetch
    }
  }, [isConfirmed]);

  useEffect(() => {
    if (isConfirming) {
      toast.loading("Waiting for confirmation...", { id: "deposit" });
    }
  }, [isConfirming]);

  const handleCreateProposal = async () => {
    if (!isConnected) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!requestForm.title || !requestForm.amount || !requestForm.recipient) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      setLoading(true);
      toast.loading("Creating treasury proposal...", { id: "proposal" });

      // This would typically create a proposal in the DAO contract
      // that, when executed, would call the Treasury's queueWithdrawal function
      await writeContract({
        address: CONTRACT_ADDRESSES.DAO,
        abi: DAO_ABI,
        functionName: 'createProposal',
        args: [
          requestForm.title,
          requestForm.description,
          CONTRACT_ADDRESSES.TREASURY, // target contract
          parseEther(requestForm.amount) // value to withdraw
        ],
      });

    } catch (error) {
      console.error("Proposal creation error:", error);
      toast.error(error.message || "Failed to create proposal", { id: "proposal" });
      setLoading(false);
    }
  };

  const handleExecuteProposal = async (proposalId) => {
    setLoading(true);
    showNotification("Executing proposal...", "info");

    setTimeout(() => {
      const updatedProposals = proposals.map(p => 
        p.id === proposalId ? { ...p, executed: true } : p
      );
      setProposals(updatedProposals);

      const proposal = proposals.find(p => p.id === proposalId);
      const newTx = {
        hash: "0x" + Math.random().toString(16).substr(2, 64),
        type: "Withdrawal",
        amount: proposal.amount,
        timestamp: Date.now(),
        status: "Confirmed",
        to: proposal.recipient
      };

      setTransactions([newTx, ...transactions]);
      setLoading(false);
      showNotification("Proposal executed successfully!", "success");
    }, 2000);
  };

  const showNotification = (message, type) => {
    switch (type) {
      case 'success':
        toast.success(message);
        break;
      case 'error':
        toast.error(message);
        break;
      case 'info':
        toast(message);
        break;
      default:
        toast(message);
    }
  };

  const formatAddress = (address) => {
    if (!address) return "";
    return address.slice(0, 6) + "..." + address.slice(-4);
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    showNotification("Copied to clipboard!", "success");
  };

  const getFilteredTransactions = () => {
    let filtered = transactions;

    if (filterType !== "all") {
      filtered = filtered.filter(tx => tx.type.toLowerCase() === filterType);
    }

    if (searchQuery) {
      filtered = filtered.filter(tx => 
        tx.hash.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (tx.from && tx.from.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (tx.to && tx.to.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    if (sortBy === "amount") {
      filtered = [...filtered].sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount));
    } else {
      filtered = [...filtered].sort((a, b) => b.timestamp - a.timestamp);
    }

    return filtered;
  };

  const exportTransactions = () => {
    const data = JSON.stringify(transactions, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = "treasury-audit.json";
    a.click();
    URL.revokeObjectURL(url);
    showNotification("Audit log exported!", "success");
  };

  const refreshData = () => {
    setLoading(true);
    showNotification("Refreshing data...", "info");
    loadTreasuryData(); // Refresh backend data
    setTimeout(() => {
      setLoading(false);
      showNotification("Data refreshed", "success");
    }, 1000);
  };

  const generateQRCode = async () => {
    try {
      const treasuryAddress = CONTRACT_ADDRESSES.TREASURY;
      const qrUrl = await QRCode.toDataURL(treasuryAddress, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setQrCodeUrl(qrUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
      showNotification("Failed to generate QR code", "error");
    }
  };

  useEffect(() => {
    if (showQRCode && !qrCodeUrl) {
      generateQRCode();
    }
  }, [showQRCode]);

  const totalDeposits = transactions
    .filter(tx => tx.type === "Deposit")
    .reduce((sum, tx) => sum + parseFloat(tx.amount || 0), 0);

  const totalWithdrawals = transactions
    .filter(tx => tx.type === "Withdrawal")
    .reduce((sum, tx) => sum + parseFloat(tx.amount || 0), 0);

  const stats = [
    {
      title: 'Total Balance',
      value: treasuryBalance ? `${parseFloat(formatEther(treasuryBalance)).toFixed(4)} ETH` : '0 ETH',
      icon: DollarSign,
      color: 'bg-dao-500',
      change: '+5.2%',
      changeType: 'positive'
    },
    {
      title: 'Total Inflow',
      value: `${totalDeposits.toFixed(2)} ETH`,
      icon: TrendingUp,
      color: 'bg-green-500',
      change: `+${transactions.filter(tx => tx.type === "Deposit").length} deposits`,
      changeType: 'positive'
    },
    {
      title: 'Total Outflow',
      value: `${totalWithdrawals.toFixed(2)} ETH`,
      icon: TrendingDown,
      color: 'bg-red-500',
      change: `-${transactions.filter(tx => tx.type === "Withdrawal").length} withdrawals`,
      changeType: 'negative'
    },
    {
      title: 'Active Proposals',
      value: proposals.filter(p => !p.executed).length,
      icon: Activity,
      color: 'bg-blue-500',
      change: `${proposals.filter(p => p.approved && !p.executed).length} ready to execute`,
      changeType: 'neutral'
    },
  ];

  if (!isConnected) {
    return (
      <motion.div 
        className="text-center py-12"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Connect Your Wallet</h2>
        <p className="text-gray-600">Please connect your wallet to view treasury information.</p>
      </motion.div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dao-50 to-dao-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">DAO Treasury</h1>
            <p className="text-gray-600">Decentralized fund management with multi-token support</p>
          </div>
        </div>

        {notification && (
          <motion.div 
            className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${
              notification.type === 'success' ? 'bg-green-500' :
              notification.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
            } text-white`}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {notification.type === 'success' && <CheckCircle size={20} />}
            {notification.type === 'error' && <XCircle size={20} />}
            {notification.type === 'info' && <AlertCircle size={20} />}
            {notification.message}
          </motion.div>
        )}

        <div className="flex gap-2 mb-6">
          {['overview', 'transactions', 'proposals', 'tokens'].map(tab => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                selectedTab === tab
                  ? 'bg-dao-600 text-white'
                  : 'bg-white bg-opacity-70 text-gray-700 hover:bg-opacity-90'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {selectedTab === 'overview' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <motion.div
                    key={stat.title}
                    className="card p-6"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * index }}
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <RefreshCw
                        size={18}
                        className={`text-dao-400 cursor-pointer hover:rotate-180 transition-transform duration-500 ${loading ? 'animate-spin' : ''}`}
                        onClick={refreshData}
                      />
                    </div>
                    <div className="text-3xl font-bold text-gray-900">{stat.value}</div>
                    <div className={`text-sm mt-1 ${
                      stat.changeType === 'positive' ? 'text-green-600' : 
                      stat.changeType === 'negative' ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {stat.change}
                    </div>
                    <p className="text-gray-600 mt-1">{stat.title}</p>
                  </motion.div>
                );
              })}
            </div>

            {/* Treasury Status Card */}
            <div className="card p-6 mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-dao-500" />
                Treasury Status
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Withdrawal Delay</div>
                  <div className="font-semibold text-gray-900">
                    {withdrawalDelay ? `${Number(withdrawalDelay) / 86400} days` : 'Loading...'}
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Contract Status</div>
                  <div className={`font-semibold ${isPaused ? 'text-red-600' : 'text-green-600'}`}>
                    {isPaused === undefined ? 'Loading...' : isPaused ? 'Paused' : 'Active'}
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600 mb-1">Treasury Address</div>
                  <div className="font-mono text-sm text-gray-900">
                    {formatAddress(CONTRACT_ADDRESSES.TREASURY)}
                    <button
                      onClick={() => copyToClipboard(CONTRACT_ADDRESSES.TREASURY)}
                      className="ml-2 text-dao-500 hover:text-dao-600"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {address && (
              <div className="flex flex-wrap gap-4 mb-8">
                <button
                  onClick={() => setShowDepositForm(!showDepositForm)}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 transition"
                >
                  <TrendingUp size={20} />
                  Deposit ETH
                </button>
                <button
                  onClick={() => setShowERC20Modal(!showERC20Modal)}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2 transition"
                >
                  <Coins size={20} />
                  Manage Tokens
                </button>
                <button
                  onClick={() => setShowRequestForm(!showRequestForm)}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition"
                >
                  <Send size={20} />
                  Request Funds
                </button>
                <button
                  onClick={() => setShowQRCode(!showQRCode)}
                  className="px-6 py-3 bg-dao-600 hover:bg-dao-700 text-white rounded-lg flex items-center gap-2 transition"
                >
                  <QrCode size={20} />
                  Show QR Code
                </button>
                <button
                  onClick={exportTransactions}
                  className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg flex items-center gap-2 transition"
                >
                  <Download size={20} />
                  Export Audit
                </button>
              </div>
            )}

            {/* ERC20 Token Management Modal */}
            {showERC20Modal && (
              <motion.div 
                className="card p-6 mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Coins className="w-5 h-5 text-purple-500" />
                  ERC20 Token Management
                </h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Token Balances */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-3">Token Balances</h4>
                    <div className="space-y-3">
                      {supportedTokens.map((token) => (
                        <div key={token.symbol} className="bg-gray-50 p-4 rounded-lg">
                          <div className="flex justify-between items-center">
                            <div>
                              <div className="font-semibold text-gray-900">{token.symbol}</div>
                              <div className="text-sm text-gray-600 font-mono">
                                {formatAddress(token.address)}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-gray-900">
                                {tokenBalances[token.symbol] 
                                  ? (Number(tokenBalances[token.symbol]) / (10 ** token.decimals)).toFixed(4)
                                  : '0.0000'
                                }
                              </div>
                              <div className="text-sm text-gray-600">{token.symbol}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Transfer Form */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-3">Transfer Tokens</h4>
                    <div className="space-y-4">
                      <select
                        value={erc20Form.tokenAddress}
                        onChange={(e) => setErc20Form({...erc20Form, tokenAddress: e.target.value})}
                        className="w-full px-4 py-3 bg-white text-gray-900 rounded-lg border border-gray-300 focus:border-dao-500 outline-none"
                      >
                        <option value="">Select Token</option>
                        {supportedTokens.map((token) => (
                          <option key={token.address} value={token.address}>
                            {token.symbol} - {formatAddress(token.address)}
                          </option>
                        ))}
                      </select>
                      
                      <input
                        type="number"
                        step="0.000001"
                        value={erc20Form.amount}
                        onChange={(e) => setErc20Form({...erc20Form, amount: e.target.value})}
                        placeholder="Amount"
                        className="w-full px-4 py-3 bg-white text-gray-900 rounded-lg border border-gray-300 focus:border-dao-500 outline-none"
                      />
                      
                      <input
                        type="text"
                        value={erc20Form.recipient}
                        onChange={(e) => setErc20Form({...erc20Form, recipient: e.target.value})}
                        placeholder="Recipient Address"
                        className="w-full px-4 py-3 bg-white text-gray-900 rounded-lg border border-gray-300 focus:border-dao-500 outline-none"
                      />
                      
                      <button
                        onClick={handleERC20Transfer}
                        disabled={loading || !erc20Form.tokenAddress || !erc20Form.amount || !erc20Form.recipient}
                        className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg transition"
                      >
                        {loading ? "Processing..." : "Transfer Tokens"}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Other existing modals continue... */}
            {showQRCode && (
              <motion.div 
                className="card p-6 mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <h3 className="text-xl font-bold text-gray-900 mb-4">Deposit Address QR Code</h3>
                <div className="flex items-center gap-6">
                  <div className="bg-white p-6 rounded-lg border shadow-sm">
                    {qrCodeUrl ? (
                      <img 
                        src={qrCodeUrl} 
                        alt="Treasury Address QR Code"
                        className="w-48 h-48 rounded-lg"
                      />
                    ) : (
                      <div className="w-48 h-48 flex items-center justify-center text-gray-600 border-2 border-dashed border-gray-400 text-sm">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-dao-600 mx-auto mb-2"></div>
                          Generating QR Code...
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-600 mb-4">Scan to deposit funds to the treasury</p>
                    <div className="bg-gray-100 p-3 rounded-lg text-gray-900 font-mono text-sm break-all border">
                      {CONTRACT_ADDRESSES.TREASURY}
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => copyToClipboard(CONTRACT_ADDRESSES.TREASURY)}
                        className="px-4 py-2 bg-dao-600 hover:bg-dao-700 text-white rounded-lg flex items-center gap-2 transition"
                      >
                        <Copy size={16} />
                        Copy Address
                      </button>
                      {qrCodeUrl && (
                        <button
                          onClick={() => {
                            const link = document.createElement('a');
                            link.download = 'treasury-qr-code.png';
                            link.href = qrCodeUrl;
                            link.click();
                            showNotification("QR Code downloaded!", "success");
                          }}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2 transition"
                        >
                          <Download size={16} />
                          Download QR
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {showDepositForm && address && (
              <motion.div 
                className="card p-6 mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <h3 className="text-xl font-bold text-gray-900 mb-4">Deposit ETH Funds</h3>
                <div className="flex gap-4">
                  <input
                    type="number"
                    step="0.001"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder="Amount in ETH"
                    className="flex-1 px-4 py-3 bg-white text-gray-900 rounded-lg border border-gray-300 focus:border-dao-500 outline-none"
                  />
                  <button
                    onClick={handleDeposit}
                    disabled={loading}
                    className="px-8 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition"
                  >
                    {loading ? "Processing..." : "Deposit"}
                  </button>
                </div>
              </motion.div>
            )}

            {showRequestForm && address && (
              <motion.div 
                className="card p-6 mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <h3 className="text-xl font-bold text-gray-900 mb-4">Create Funding Proposal</h3>
                <div className="space-y-4">
                  <input
                    type="text"
                    value={requestForm.title}
                    onChange={(e) => setRequestForm({...requestForm, title: e.target.value})}
                    placeholder="Proposal Title"
                    className="w-full px-4 py-3 bg-white text-gray-900 rounded-lg border border-gray-300 focus:border-dao-500 outline-none"
                  />
                  <textarea
                    value={requestForm.description}
                    onChange={(e) => setRequestForm({...requestForm, description: e.target.value})}
                    placeholder="Description"
                    rows="4"
                    className="w-full px-4 py-3 bg-white text-gray-900 rounded-lg border border-gray-300 focus:border-dao-500 outline-none"
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="number"
                      step="0.001"
                      value={requestForm.amount}
                      onChange={(e) => setRequestForm({...requestForm, amount: e.target.value})}
                      placeholder="Amount in ETH"
                      className="px-4 py-3 bg-white text-gray-900 rounded-lg border border-gray-300 focus:border-dao-500 outline-none"
                    />
                    <input
                      type="text"
                      value={requestForm.recipient}
                      onChange={(e) => setRequestForm({...requestForm, recipient: e.target.value})}
                      placeholder="Recipient Address"
                      className="px-4 py-3 bg-white text-gray-900 rounded-lg border border-gray-300 focus:border-dao-500 outline-none"
                    />
                  </div>
                  <select
                    value={requestForm.duration}
                    onChange={(e) => setRequestForm({...requestForm, duration: e.target.value})}
                    className="w-full px-4 py-3 bg-white text-gray-900 rounded-lg border border-gray-300 outline-none"
                  >
                    <option value="3">3 Days</option>
                    <option value="7">7 Days</option>
                    <option value="14">14 Days</option>
                    <option value="30">30 Days</option>
                  </select>
                  <button
                    onClick={handleCreateProposal}
                    disabled={loading}
                    className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition"
                  >
                    {loading ? "Creating..." : "Submit Proposal"}
                  </button>
                </div>
              </motion.div>
            )}
          </>
        )}

        {selectedTab === 'tokens' && (
          <motion.div 
            className="card p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Coins className="w-6 h-6 text-purple-500" />
              Token Holdings Overview
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {supportedTokens.map((token) => (
                <div key={token.symbol} className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-lg border">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                      <Coins className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">
                        {tokenBalances[token.symbol] 
                          ? (Number(tokenBalances[token.symbol]) / (10 ** token.decimals)).toFixed(4)
                          : '0.0000'
                        }
                      </div>
                      <div className="text-sm text-gray-600">{token.symbol}</div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-sm text-gray-600">Token Contract</div>
                    <div className="bg-white p-2 rounded text-xs font-mono text-gray-800 border">
                      {formatAddress(token.address)}
                      <button
                        onClick={() => copyToClipboard(token.address)}
                        className="ml-2 text-purple-500 hover:text-purple-600"
                      >
                        <Copy size={12} />
                      </button>
                    </div>
                    <div className="text-sm text-gray-500">Decimals: {token.decimals}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="text-lg font-semibold text-blue-900 mb-2">How to Add New Tokens</h4>
              <p className="text-blue-800 text-sm">
                To add support for new ERC20 tokens, the token address must be added to the treasury's 
                supported tokens list through a governance proposal. Only supported tokens can be managed 
                through this interface.
              </p>
            </div>
          </motion.div>
        )}

        {selectedTab === 'proposals' && (
          <motion.div 
            className="card p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h3 className="text-xl font-bold text-gray-900 mb-4">Funding Proposals</h3>
            <div className="space-y-4">
              {proposals.map((proposal) => (
                <div key={proposal.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900">{proposal.title}</h4>
                      <p className="text-sm text-gray-600">{proposal.description}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-dao-600">{proposal.amount} ETH</div>
                      <div className="text-xs text-gray-500">#{proposal.id}</div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-3">
                    <div className="flex gap-4 text-sm">
                      <span className="text-green-600">For: {proposal.votesFor}</span>
                      <span className="text-red-600">Against: {proposal.votesAgainst}</span>
                      <span className="text-gray-600">To: {formatAddress(proposal.recipient)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {proposal.approved && !proposal.executed && address && (
                        <button
                          onClick={() => handleExecuteProposal(proposal.id)}
                          className="px-4 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition"
                        >
                          Execute
                        </button>
                      )}
                      <span className={`px-3 py-1 rounded text-xs ${
                        proposal.executed ? 'bg-gray-600' :
                        proposal.approved ? 'bg-green-600' : 'bg-yellow-600'
                      } text-white`}>
                        {proposal.executed ? 'Executed' : proposal.approved ? 'Approved' : 'Pending'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pending Withdrawals Section */}
            {pendingWithdrawals.length > 0 && (
              <motion.div 
                className="card p-6 mt-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-dao-500" />
                  Pending Withdrawals
                </h3>
                <div className="space-y-3">
                  {pendingWithdrawals.map((withdrawal) => (
                    <div key={withdrawal.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-semibold text-gray-900">
                            {withdrawal.amount} ETH
                          </div>
                          <div className="text-sm text-gray-600">
                            To: {formatAddress(withdrawal.recipient)}
                          </div>
                          <div className="text-sm text-gray-500">
                            Queued: {withdrawal.queuedAt.toLocaleString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="inline-block px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
                            ID: {withdrawal.id}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {selectedTab === 'transactions' && (
          <motion.div 
            className="card p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">Transaction History</h3>
              <div className="flex gap-2">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-2 bg-white text-gray-900 rounded border border-gray-300 text-sm"
                >
                  <option value="all">All</option>
                  <option value="deposit">Deposits</option>
                  <option value="withdrawal">Withdrawals</option>
                </select>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-3 py-2 bg-white text-gray-900 rounded border border-gray-300 text-sm"
                >
                  <option value="date">By Date</option>
                  <option value="amount">By Amount</option>
                </select>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-gray-700 font-semibold">Type</th>
                    <th className="text-left py-3 px-4 text-gray-700 font-semibold">Amount</th>
                    <th className="text-left py-3 px-4 text-gray-700 font-semibold">Date</th>
                    <th className="text-left py-3 px-4 text-gray-700 font-semibold">Transaction</th>
                    <th className="text-left py-3 px-4 text-gray-700 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredTransactions().map((tx, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition">
                      <td className="py-3 px-4">
                        <span className={`px-3 py-1 rounded text-xs font-semibold ${
                          tx.type === 'Deposit' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {tx.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-900 font-semibold">{parseFloat(tx.amount).toFixed(4)} ETH</td>
                      <td className="py-3 px-4 text-gray-600 text-sm">{formatDate(tx.timestamp)}</td>
                      <td className="py-3 px-4">
                        <a
                          href={"https://sepolia.etherscan.io/tx/" + tx.hash}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-dao-600 hover:text-dao-700 text-sm flex items-center gap-1"
                        >
                          {formatAddress(tx.hash)}
                          <ExternalLink size={12} />
                        </a>
                      </td>
                      <td className="py-3 px-4">
                        <span className="flex items-center gap-1 text-green-600 text-sm">
                          <CheckCircle size={16} />
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Treasury;
