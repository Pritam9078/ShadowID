/**
 * Example integration of wallet system with DVote project
 * 
 * This example shows how to integrate the wallet components
 * into your existing React application structure
 */

import React from 'react';
import { 
  WalletProvider, 
  ConnectWalletButton, 
  SendTransactionForm,
  WalletStatus,
  NetworkIndicator,
  useWallet,
  useWalletIntegration 
} from './index.js';

/**
 * Main App Component with Wallet Integration
 */
function App() {
  return (
    <WalletProvider>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <WalletDashboard />
        </main>
      </div>
    </WalletProvider>
  );
}

/**
 * Header component with wallet connection
 */
function Header() {
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900">ShadowID</h1>
            <NetworkIndicator />
          </div>
          
          <div className="flex items-center space-x-4">
            <WalletStatus />
            <ConnectWalletButton size="medium" />
          </div>
        </div>
      </div>
    </header>
  );
}

/**
 * Main wallet dashboard
 */
function WalletDashboard() {
  const { isReady, canTransact } = useWalletIntegration();
  
  if (!isReady) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Connect Your Wallet
        </h2>
        <p className="text-gray-600 mb-6">
          Connect to Arbitrum Sepolia to use ShadowID platform
        </p>
        <ConnectWalletButton size="large" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Wallet Info Panel */}
      <WalletInfoPanel />
      
      {/* Transaction Panel */}
      <TransactionPanel />
    </div>
  );
}

/**
 * Wallet information panel
 */
function WalletInfoPanel() {
  const wallet = useWallet();
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Wallet Information
      </h3>
      
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-600">Address</label>
          <div className="mt-1 font-mono text-sm text-gray-900 break-all">
            {wallet.account}
          </div>
        </div>
        
        <div>
          <label className="text-sm font-medium text-gray-600">Balance</label>
          <div className="mt-1 text-lg font-semibold text-gray-900">
            {parseFloat(wallet.balance || '0').toFixed(6)} ETH
          </div>
        </div>
        
        <div>
          <label className="text-sm font-medium text-gray-600">Network</label>
          <div className="mt-1 flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${wallet.isCorrectNetwork ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-900">
              {wallet.network?.name || 'Unknown'}
            </span>
          </div>
        </div>

        {/* DAO Participation Status */}
        <DAOStatus />
      </div>
    </div>
  );
}

/**
 * Transaction panel with send form
 */
function TransactionPanel() {
  const handleTransactionComplete = (result) => {
    console.log('Transaction completed:', result);
    // Handle transaction completion
    // e.g., refresh balance, show notification, etc.
  };

  return (
    <div>
      <SendTransactionForm 
        onTransactionComplete={handleTransactionComplete}
        className="mb-6"
      />
      
      {/* Future: ZK Proof Submission */}
      <ZKProofSection />
    </div>
  );
}

/**
 * DAO participation status component
 */
function DAOStatus() {
  const { account, isConnected } = useWallet();
  // This would integrate with your existing DAO contract checking logic
  
  return (
    <div className="border-t border-gray-200 pt-4">
      <label className="text-sm font-medium text-gray-600">DAO Status</label>
      <div className="mt-1 flex items-center space-x-2">
        <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
        <span className="text-sm text-gray-900">
          Not Verified
        </span>
      </div>
      <p className="text-xs text-gray-500 mt-1">
        Submit KYB proof to join the DAO
      </p>
    </div>
  );
}

/**
 * ZK Proof submission section (Future Integration)
 */
function ZKProofSection() {
  const { canTransact } = useWalletIntegration();
  
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-blue-900 mb-2">
        Business Verification (KYB)
      </h3>
      <p className="text-sm text-blue-700 mb-4">
        Submit zero-knowledge proofs to verify your business eligibility
        for DAO participation while maintaining privacy.
      </p>
      
      {canTransact ? (
        <button 
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          onClick={() => {
            // Future: Navigate to ZK proof submission
            console.log('Navigate to ZK proof submission');
          }}
        >
          Start Business Verification
        </button>
      ) : (
        <p className="text-sm text-blue-600">
          Connect wallet to start verification process
        </p>
      )}
    </div>
  );
}

/**
 * Integration with existing DAO components
 */
export function DAOIntegrationExample() {
  return (
    <WalletProvider>
      {/* Your existing DAO components can now use wallet context */}
      <YourExistingDAO />
    </WalletProvider>
  );
}

function YourExistingDAO() {
  const wallet = useWallet();
  
  // Now your existing DAO components have access to:
  // - wallet.account (user address)
  // - wallet.signer (for transactions)
  // - wallet.provider (for reading blockchain)
  // - wallet.isConnected (connection status)
  // - wallet.isCorrectNetwork (network validation)
  
  return (
    <div>
      {/* Your existing DAO UI */}
      <h2>DAO Governance</h2>
      
      {wallet.isConnected ? (
        <div>
          <p>Connected as: {wallet.formatAddress(wallet.account)}</p>
          {/* Your DAO voting, proposals, etc. */}
        </div>
      ) : (
        <ConnectWalletButton />
      )}
    </div>
  );
}

export default App;