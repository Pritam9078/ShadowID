import React, { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { motion } from 'framer-motion';
import axios from 'axios';
import { 
  Wallet, 
  Network, 
  AlertCircle, 
  Upload, 
  FileText, 
  Shield, 
  Users, 
  Building,
  CheckCircle,
  Loader2,
  Copy,
  ExternalLink,
  Key,
  Lock,
  UserCheck
} from 'lucide-react';

// Import existing services
import { backendApi } from '../services/verifierApi';
import { CONTRACT_ADDRESSES } from '../config/contracts';
import { DAO_ABI } from '../config/abis';

const Verifier = () => {
  // Wallet connection state
  const { address, isConnected, chain } = useAccount();
  
  // Contract interaction
  const { writeContract, data: hash, error: contractError, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // Component state
  const [kycStatus, setKycStatus] = useState({ loading: false, success: false, error: null, data: null });
  const [kybStatus, setKybStatus] = useState({ loading: false, success: false, error: null, data: null });
  const [zkProofs, setZkProofs] = useState({
    age: { loading: false, proof: null, error: null },
    citizenship: { loading: false, proof: null, error: null },
    business: { loading: false, proof: null, error: null }
  });
  const [proofSubmission, setProofSubmission] = useState('');
  const [submissionStatus, setSubmissionStatus] = useState({ loading: false, success: false, error: null });
  const [identityStatus, setIdentityStatus] = useState({ loading: false, data: null, error: null });
  const [aggregationStatus, setAggregationStatus] = useState({ loading: false, success: false, error: null });

  // File upload states
  const [kycFiles, setKycFiles] = useState({ idDocument: null, selfie: null });
  const [kybFiles, setKybFiles] = useState({ businessDocs: null });

  // Check network status
  const isCorrectNetwork = chain?.id === 421614; // Arbitrum Sepolia
  
  useEffect(() => {
    // Load any existing proofs from localStorage
    const savedProofs = localStorage.getItem('verifier_zk_proofs');
    if (savedProofs) {
      try {
        const parsed = JSON.parse(savedProofs);
        setZkProofs(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error('Failed to load saved proofs:', e);
      }
    }

    // Load identity status if wallet is connected
    if (isConnected && address) {
      loadIdentityStatus();
    }
  }, [isConnected, address]);

  // Save proofs to localStorage
  const saveProofsToStorage = (newProofs) => {
    localStorage.setItem('verifier_zk_proofs', JSON.stringify(newProofs));
  };

  // KYC Verification Handler
  const handleKycVerification = async () => {
    if (!kycFiles.idDocument || !kycFiles.selfie) {
      setKycStatus({ ...kycStatus, error: 'Please upload both ID document and selfie' });
      return;
    }

    setKycStatus({ loading: true, success: false, error: null, data: null });

    try {
      const formData = new FormData();
      formData.append('idDocument', kycFiles.idDocument);
      formData.append('selfie', kycFiles.selfie);
      formData.append('walletAddress', address);

      const response = await backendApi.post('/api/kyc/start', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setKycStatus({
        loading: false,
        success: true,
        error: null,
        data: response.data
      });
    } catch (error) {
      setKycStatus({
        loading: false,
        success: false,
        error: error.response?.data?.message || 'KYC verification failed',
        data: null
      });
    }
  };

  // KYB Verification Handler
  const handleKybVerification = async () => {
    if (!kybFiles.businessDocs) {
      setKybStatus({ ...kybStatus, error: 'Please upload business registration documents' });
      return;
    }

    setKybStatus({ loading: true, success: false, error: null, data: null });

    try {
      const formData = new FormData();
      formData.append('businessDocs', kybFiles.businessDocs);
      formData.append('walletAddress', address);

      const response = await backendApi.post('/api/kyb/start', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setKybStatus({
        loading: false,
        success: true,
        error: null,
        data: response.data
      });
    } catch (error) {
      setKybStatus({
        loading: false,
        success: false,
        error: error.response?.data?.message || 'KYB verification failed',
        data: null
      });
    }
  };

  // ZK Proof Generators
  const generateZkProof = async (proofType) => {
    const endpoints = {
      age: '/api/zk/age-proof',
      citizenship: '/api/zk/citizenship-proof',
      business: '/api/zk/business-proof'
    };

    setZkProofs(prev => ({
      ...prev,
      [proofType]: { ...prev[proofType], loading: true, error: null }
    }));

    try {
      const response = await backendApi.post(endpoints[proofType], {
        walletAddress: address
      });

      const newProofs = {
        ...zkProofs,
        [proofType]: {
          loading: false,
          proof: response.data,
          error: null
        }
      };

      setZkProofs(newProofs);
      saveProofsToStorage(newProofs);
    } catch (error) {
      setZkProofs(prev => ({
        ...prev,
        [proofType]: {
          ...prev[proofType],
          loading: false,
          error: error.response?.data?.message || 'Proof generation failed'
        }
      }));
    }
  };

  // Submit Proof to Smart Contract
  const handleSubmitProof = async () => {
    if (!proofSubmission.trim()) {
      setSubmissionStatus({ ...submissionStatus, error: 'Please paste a proof JSON' });
      return;
    }

    let parsedProof;
    try {
      parsedProof = JSON.parse(proofSubmission);
    } catch (error) {
      setSubmissionStatus({ ...submissionStatus, error: 'Invalid JSON format' });
      return;
    }

    setSubmissionStatus({ loading: true, success: false, error: null });

    try {
      // For now, submit to backend API since contract function doesn't exist yet
      // In production, this would be a contract call
      const response = await backendApi.post('/api/zk/submit-proof', {
        walletAddress: address,
        proof: parsedProof
      });

      setSubmissionStatus({
        loading: false,
        success: true,
        error: null
      });

      // Store submission hash for reference
      if (response.data.submissionId) {
        localStorage.setItem('verifier_last_submission', response.data.submissionId);
      }

    } catch (error) {
      setSubmissionStatus({
        loading: false,
        success: false,
        error: error.response?.data?.message || error.message || 'Proof submission failed'
      });
    }
  };

  // Copy proof to clipboard
  const copyProofToClipboard = (proof) => {
    navigator.clipboard.writeText(JSON.stringify(proof, null, 2));
  };

  // Load identity status from backend
  const loadIdentityStatus = async () => {
    if (!address) return;

    setIdentityStatus({ loading: true, data: null, error: null });

    try {
      const response = await backendApi.get(`/api/zk/identity/${address}`);
      setIdentityStatus({
        loading: false,
        data: response.data.identity,
        error: null
      });
    } catch (error) {
      setIdentityStatus({
        loading: false,
        data: null,
        error: error.response?.data?.message || 'Failed to load identity status'
      });
    }
  };

  // Aggregate identity proofs
  const aggregateIdentityProofs = async () => {
    if (!address) return;

    const availableProofIds = Object.values(zkProofs)
      .filter(proof => proof.proof && proof.proof.proofId)
      .map(proof => proof.proof.proofId);

    if (availableProofIds.length === 0) {
      setAggregationStatus({ loading: false, success: false, error: 'No proofs available for aggregation' });
      return;
    }

    setAggregationStatus({ loading: true, success: false, error: null });

    try {
      const response = await backendApi.post('/api/zk/aggregate-identity', {
        walletAddress: address,
        proofIds: availableProofIds
      });

      setAggregationStatus({
        loading: false,
        success: true,
        error: null
      });

      // Store aggregated proof
      const aggregatedProof = {
        aggregated: {
          loading: false,
          proof: response.data.proof,
          error: null
        }
      };

      setZkProofs(prev => ({ ...prev, ...aggregatedProof }));
      saveProofsToStorage({ ...zkProofs, ...aggregatedProof });

      // Reload identity status
      await loadIdentityStatus();

    } catch (error) {
      setAggregationStatus({
        loading: false,
        success: false,
        error: error.response?.data?.message || 'Aggregation failed'
      });
    }
  };

  // Wallet Status Component
  const WalletStatusCard = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-md border border-gray-200 p-6"
    >
      <div className="flex items-center gap-3 mb-4">
        <Wallet className="w-6 h-6 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Wallet Status</h3>
      </div>

      <div className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Connection</span>
          <div className="flex items-center gap-2">
            {isConnected ? (
              <>
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-600">Connected</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span className="text-sm text-red-600">Not Connected</span>
              </>
            )}
          </div>
        </div>

        {/* Wallet Address */}
        {isConnected && (
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Address</span>
            <span className="text-sm text-gray-600 font-mono">
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </span>
          </div>
        )}

        {/* Network Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Network</span>
          <div className="flex items-center gap-2">
            {isConnected && isCorrectNetwork ? (
              <>
                <Network className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-600">Connected</span>
              </>
            ) : isConnected ? (
              <>
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span className="text-sm text-red-600">Setup Required</span>
              </>
            ) : (
              <>
                <Network className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-500">Not Connected</span>
              </>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        {!isConnected && (
          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
            Connect Wallet
          </button>
        )}

        {isConnected && !isCorrectNetwork && (
          <button className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
            Connect to Arbitrum Network
          </button>
        )}
      </div>
    </motion.div>
  );

  // File Upload Component
  const FileUpload = ({ accept, onChange, file, placeholder }) => (
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
      <input
        type="file"
        accept={accept}
        onChange={onChange}
        className="hidden"
        id={placeholder}
      />
      <label htmlFor={placeholder} className="cursor-pointer">
        <div className="text-center">
          <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600">
            {file ? file.name : `Click to upload ${placeholder}`}
          </p>
        </div>
      </label>
    </div>
  );

  // Status Badge Component
  const StatusBadge = ({ loading, success, error }) => {
    if (loading) return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
    if (success) return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (error) return <AlertCircle className="w-4 h-4 text-red-500" />;
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <Shield className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Verifier</h1>
          </div>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Secure identity verification and zero-knowledge proof generation for the DAO ecosystem.
            Verify your identity while maintaining privacy through advanced cryptographic proofs.
          </p>
        </motion.div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Wallet Status & Identity */}
          <div className="space-y-6">
            <WalletStatusCard />
            
            {/* Identity Status Card */}
            {isConnected && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-xl shadow-md border border-gray-200 p-6"
              >
                <div className="flex items-center gap-3 mb-4">
                  <UserCheck className="w-6 h-6 text-purple-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Identity Status</h3>
                  {identityStatus.loading && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
                </div>

                {identityStatus.loading ? (
                  <div className="text-center py-4">
                    <Loader2 className="w-6 h-6 text-gray-400 animate-spin mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Loading identity status...</p>
                  </div>
                ) : identityStatus.error ? (
                  <div className="text-center py-4">
                    <AlertCircle className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">No identity found</p>
                  </div>
                ) : identityStatus.data ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Verification Level</span>
                      <span className={`text-sm font-semibold px-2 py-1 rounded ${
                        identityStatus.data.verificationLevel === 'maximum' ? 'bg-green-100 text-green-800' :
                        identityStatus.data.verificationLevel === 'premium' ? 'bg-blue-100 text-blue-800' :
                        identityStatus.data.verificationLevel === 'standard' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {identityStatus.data.verificationLevel}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Proofs</span>
                      <span className="text-sm text-gray-600">{identityStatus.data.proofCount}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Completeness</span>
                      <span className="text-sm text-gray-600">{identityStatus.data.completeness}%</span>
                    </div>

                    {identityStatus.data.proofTypes && identityStatus.data.proofTypes.length > 0 && (
                      <div>
                        <span className="text-sm font-medium text-gray-700 block mb-1">Proof Types</span>
                        <div className="flex flex-wrap gap-1">
                          {identityStatus.data.proofTypes.map((type, index) => (
                            <span key={index} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                              {type.replace('_', ' ')}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <button
                      onClick={loadIdentityStatus}
                      className="w-full mt-3 bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      Refresh Status
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Shield className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Connect wallet to view identity status</p>
                  </div>
                )}
              </motion.div>
            )}
          </div>

          {/* Middle & Right Columns - Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Identity Verification Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <UserCheck className="w-6 h-6 text-blue-600" />
                Identity Verification (KYC/KYB)
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* KYC Card */}
                <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Users className="w-6 h-6 text-green-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Verify Identity (KYC)</h3>
                    <StatusBadge {...kycStatus} />
                  </div>

                  <div className="space-y-4">
                    <FileUpload
                      accept="image/*,.pdf"
                      onChange={(e) => setKycFiles({ ...kycFiles, idDocument: e.target.files[0] })}
                      file={kycFiles.idDocument}
                      placeholder="ID Document"
                    />

                    <FileUpload
                      accept="image/*"
                      onChange={(e) => setKycFiles({ ...kycFiles, selfie: e.target.files[0] })}
                      file={kycFiles.selfie}
                      placeholder="Selfie"
                    />

                    <button
                      onClick={handleKycVerification}
                      disabled={kycStatus.loading || !isConnected}
                      className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      {kycStatus.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                      {kycStatus.loading ? 'Verifying...' : 'Start KYC Verification'}
                    </button>

                    {kycStatus.error && (
                      <p className="text-sm text-red-600">{kycStatus.error}</p>
                    )}

                    {kycStatus.success && kycStatus.data && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <p className="text-sm text-green-800">✅ KYC verification initiated successfully!</p>
                        <p className="text-xs text-green-600 mt-1">Reference: {kycStatus.data.referenceId}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* KYB Card */}
                <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Building className="w-6 h-6 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Verify Business (KYB)</h3>
                    <StatusBadge {...kybStatus} />
                  </div>

                  <div className="space-y-4">
                    <FileUpload
                      accept=".pdf,image/*"
                      onChange={(e) => setKybFiles({ businessDocs: e.target.files[0] })}
                      file={kybFiles.businessDocs}
                      placeholder="Business Registration Documents"
                    />

                    <button
                      onClick={handleKybVerification}
                      disabled={kybStatus.loading || !isConnected}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      {kybStatus.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Building className="w-4 h-4" />}
                      {kybStatus.loading ? 'Verifying...' : 'Start KYB Verification'}
                    </button>

                    {kybStatus.error && (
                      <p className="text-sm text-red-600">{kybStatus.error}</p>
                    )}

                    {kybStatus.success && kybStatus.data && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm text-blue-800">✅ KYB verification initiated successfully!</p>
                        <p className="text-xs text-blue-600 mt-1">Reference: {kybStatus.data.referenceId}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* ZK Proofs Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <Key className="w-6 h-6 text-purple-600" />
                Generate Zero-Knowledge Proofs
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Age Proof */}
                <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-blue-600">18+</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Age Proof</h3>
                  </div>

                  <p className="text-sm text-gray-600 mb-4">
                    Generate a zero-knowledge proof that you are over 18 years old without revealing your exact age.
                  </p>

                  <button
                    onClick={() => generateZkProof('age')}
                    disabled={zkProofs.age.loading || !isConnected}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 mb-4"
                  >
                    {zkProofs.age.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                    {zkProofs.age.loading ? 'Generating...' : 'Generate Age Proof'}
                  </button>

                  {zkProofs.age.error && (
                    <p className="text-sm text-red-600 mb-2">{zkProofs.age.error}</p>
                  )}

                  {zkProofs.age.proof && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-700">Proof Generated</span>
                        <button
                          onClick={() => copyProofToClipboard(zkProofs.age.proof)}
                          className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" />
                          Copy
                        </button>
                      </div>
                      <pre className="text-xs text-gray-600 overflow-auto max-h-32">
                        {JSON.stringify(zkProofs.age.proof, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>

                {/* Citizenship Proof */}
                <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-green-600">🏛️</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Citizenship Proof</h3>
                  </div>

                  <p className="text-sm text-gray-600 mb-4">
                    Prove your citizenship status without revealing personal identification details.
                  </p>

                  <button
                    onClick={() => generateZkProof('citizenship')}
                    disabled={zkProofs.citizenship.loading || !isConnected}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 mb-4"
                  >
                    {zkProofs.citizenship.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                    {zkProofs.citizenship.loading ? 'Generating...' : 'Generate Citizenship Proof'}
                  </button>

                  {zkProofs.citizenship.error && (
                    <p className="text-sm text-red-600 mb-2">{zkProofs.citizenship.error}</p>
                  )}

                  {zkProofs.citizenship.proof && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-700">Proof Generated</span>
                        <button
                          onClick={() => copyProofToClipboard(zkProofs.citizenship.proof)}
                          className="text-xs text-green-600 hover:text-green-700 flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" />
                          Copy
                        </button>
                      </div>
                      <pre className="text-xs text-gray-600 overflow-auto max-h-32">
                        {JSON.stringify(zkProofs.citizenship.proof, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>

                {/* Business Proof */}
                <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                      <Building className="w-4 h-4 text-orange-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Business Proof</h3>
                  </div>

                  <p className="text-sm text-gray-600 mb-4">
                    Prove business registration status without exposing sensitive business information.
                  </p>

                  <button
                    onClick={() => generateZkProof('business')}
                    disabled={zkProofs.business.loading || !isConnected}
                    className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 mb-4"
                  >
                    {zkProofs.business.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                    {zkProofs.business.loading ? 'Generating...' : 'Generate Business Proof'}
                  </button>

                  {zkProofs.business.error && (
                    <p className="text-sm text-red-600 mb-2">{zkProofs.business.error}</p>
                  )}

                  {zkProofs.business.proof && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-700">Proof Generated</span>
                        <button
                          onClick={() => copyProofToClipboard(zkProofs.business.proof)}
                          className="text-xs text-orange-600 hover:text-orange-700 flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" />
                          Copy
                        </button>
                      </div>
                      <pre className="text-xs text-gray-600 overflow-auto max-h-32">
                        {JSON.stringify(zkProofs.business.proof, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Proof Aggregation Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="bg-white rounded-xl shadow-md border border-gray-200 p-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full flex items-center justify-center">
                  <Key className="w-4 h-4 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Aggregate Identity Proofs</h2>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Combine all your individual ZK proofs into a single, comprehensive identity proof for maximum verification efficiency.
                </p>

                {/* Available Proofs Summary */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Available Proofs for Aggregation</h4>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className={`w-3 h-3 rounded-full mx-auto mb-1 ${zkProofs.age.proof ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                      <span className="text-xs text-gray-600">Age</span>
                    </div>
                    <div>
                      <div className={`w-3 h-3 rounded-full mx-auto mb-1 ${zkProofs.citizenship.proof ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                      <span className="text-xs text-gray-600">Citizenship</span>
                    </div>
                    <div>
                      <div className={`w-3 h-3 rounded-full mx-auto mb-1 ${zkProofs.business.proof ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                      <span className="text-xs text-gray-600">Business</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={aggregateIdentityProofs}
                  disabled={aggregationStatus.loading || !isConnected || 
                    (!zkProofs.age.proof && !zkProofs.citizenship.proof && !zkProofs.business.proof)}
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-400 text-white px-4 py-3 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2"
                >
                  {aggregationStatus.loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Shield className="w-5 h-5" />
                  )}
                  {aggregationStatus.loading ? 'Aggregating Proofs...' : 'Aggregate Identity Proofs'}
                </button>

                {aggregationStatus.error && (
                  <p className="text-sm text-red-600 text-center">{aggregationStatus.error}</p>
                )}

                {aggregationStatus.success && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-800 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Identity proofs aggregated successfully! Your comprehensive identity proof is ready.
                    </p>
                  </div>
                )}

                {zkProofs.aggregated && zkProofs.aggregated.proof && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Aggregated Proof</span>
                      <button
                        onClick={() => copyProofToClipboard(zkProofs.aggregated.proof)}
                        className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" />
                        Copy
                      </button>
                    </div>
                    <pre className="text-xs text-gray-600 overflow-auto max-h-32 bg-white rounded p-2">
                      {JSON.stringify(zkProofs.aggregated.proof, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Submit Proof Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-xl shadow-md border border-gray-200 p-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <Lock className="w-6 h-6 text-indigo-600" />
                <h2 className="text-2xl font-bold text-gray-900">Submit Identity Proof to DAO</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Proof JSON
                  </label>
                  <textarea
                    value={proofSubmission}
                    onChange={(e) => setProofSubmission(e.target.value)}
                    placeholder="Paste your generated proof JSON here..."
                    className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
                  />
                </div>

                <button
                  onClick={handleSubmitProof}
                  disabled={submissionStatus.loading || !isConnected || !isCorrectNetwork || isPending}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {(submissionStatus.loading || isPending) ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ExternalLink className="w-4 h-4" />
                  )}
                  {isPending ? 'Confirming...' : submissionStatus.loading ? 'Submitting...' : 'Submit Proof to DAO'}
                </button>

                {submissionStatus.error && (
                  <p className="text-sm text-red-600">{submissionStatus.error}</p>
                )}

                {isConfirmed && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-800 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Proof submitted successfully to the DAO smart contract!
                    </p>
                    {hash && (
                      <p className="text-xs text-green-600 mt-1 font-mono">
                        Transaction: {hash}
                      </p>
                    )}
                  </div>
                )}

                {contractError && (
                  <p className="text-sm text-red-600">{contractError.message}</p>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Verifier;