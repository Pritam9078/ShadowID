/**
 * ConnectWalletButton.jsx
 * 
 * UI Component for wallet connection and management
 * Shows connection status, account info, and provides connect/disconnect functionality
 */

import React, { useState } from 'react';
import { useWallet } from './WalletContext.jsx';
import { METAMASK_CONFIG } from './walletConfig.js';

/**
 * ConnectWalletButton Component
 */
export function ConnectWalletButton({ className = '', size = 'medium', showBalance = true, showNetwork = true }) {
  const {
    isConnected,
    isConnecting,
    account,
    balance,
    network,
    isCorrectNetwork,
    error,
    isMetaMaskInstalled,
    connect,
    disconnect,
    switchToArbitrumSepolia,
    formatAddress,
    clearError
  } = useWallet();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Size classes for different button sizes
  const sizeClasses = {
    small: 'px-3 py-1.5 text-sm',
    medium: 'px-4 py-2 text-base',
    large: 'px-6 py-3 text-lg'
  };

  // Handle connect button click
  const handleConnect = async () => {
    if (!isMetaMaskInstalled) {
      window.open(METAMASK_CONFIG.installUrl, '_blank');
      return;
    }

    if (error) {
      clearError();
    }

    await connect();
  };

  // Handle network switch
  const handleNetworkSwitch = async () => {
    try {
      await switchToArbitrumSepolia();
    } catch (error) {
      console.error('Failed to switch network:', error);
    }
  };

  // Toggle dropdown menu
  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (isDropdownOpen && !event.target.closest('.wallet-dropdown')) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

  // If MetaMask is not installed
  if (!isMetaMaskInstalled) {
    return (
      <div className={`wallet-connect-button ${className}`}>
        <button
          onClick={handleConnect}
          className={`
            ${sizeClasses[size]}
            bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg
            border border-orange-500 hover:border-orange-600
            transition-all duration-200
            flex items-center gap-2
          `}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3.5 13.5L7 10l4.5 4.5L16 10l3.5 3.5V16a2 2 0 01-2 2H5a2 2 0 01-2-2v-2.5z"/>
          </svg>
          Install MetaMask
        </button>
      </div>
    );
  }

  // If not connected
  if (!isConnected) {
    return (
      <div className={`wallet-connect-button ${className}`}>
        <button
          onClick={handleConnect}
          disabled={isConnecting}
          className={`
            ${sizeClasses[size]}
            ${isConnecting 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-500 hover:bg-blue-600 active:bg-blue-700'
            }
            text-white font-medium rounded-lg
            border border-transparent
            transition-all duration-200
            flex items-center gap-2
          `}
        >
          {isConnecting ? (
            <>
              <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
              Connecting...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
              </svg>
              Connect Wallet
            </>
          )}
        </button>
        
        {error && (
          <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded text-red-700 text-sm">
            {error}
          </div>
        )}
      </div>
    );
  }

  // If connected - show wallet info with dropdown
  return (
    <div className={`wallet-connect-button relative ${className}`}>
      {/* Network warning banner */}
      {!isCorrectNetwork && (
        <div className="mb-2 p-2 bg-yellow-100 border border-yellow-300 rounded text-yellow-800 text-sm">
          <div className="flex items-center justify-between">
            <span>🔄 Network Setup Needed</span>
            <button
              onClick={handleNetworkSwitch}
              className="text-yellow-900 hover:text-yellow-700 underline text-xs"
            >
              Connect to Arbitrum
            </button>
          </div>
        </div>
      )}

      {/* Main wallet button */}
      <div className="wallet-dropdown">
        <button
          onClick={toggleDropdown}
          className={`
            ${sizeClasses[size]}
            w-full
            ${isCorrectNetwork 
              ? 'bg-green-500 hover:bg-green-600 border-green-500' 
              : 'bg-yellow-500 hover:bg-yellow-600 border-yellow-500'
            }
            text-white font-medium rounded-lg
            border transition-all duration-200
            flex items-center justify-between gap-2
          `}
        >
          <div className="flex items-center gap-2">
            {/* Connection status indicator */}
            <div className={`w-2 h-2 rounded-full ${isCorrectNetwork ? 'bg-green-300' : 'bg-yellow-300'}`}></div>
            
            {/* Account info */}
            <div className="flex flex-col items-start">
              <span className="text-sm font-medium">
                {formatAddress(account)}
              </span>
              {showBalance && balance && (
                <span className="text-xs opacity-90">
                  {parseFloat(balance).toFixed(4)} ETH
                </span>
              )}
            </div>
          </div>

          {/* Dropdown arrow */}
          <svg 
            className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} 
            viewBox="0 0 24 24" 
            fill="currentColor"
          >
            <path d="M7 10l5 5 5-5z"/>
          </svg>
        </button>

        {/* Dropdown menu */}
        {isDropdownOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
            {/* Account section */}
            <div className="p-3 border-b border-gray-100">
              <div className="text-sm text-gray-600 mb-1">Account</div>
              <div className="font-mono text-sm break-all">{account}</div>
              {showBalance && (
                <div className="text-sm text-gray-600 mt-1">
                  Balance: {parseFloat(balance).toFixed(6)} ETH
                </div>
              )}
            </div>

            {/* Network section */}
            {showNetwork && (
              <div className="p-3 border-b border-gray-100">
                <div className="text-sm text-gray-600 mb-1">Network</div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isCorrectNetwork ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                  <span className="text-sm">
                    {network ? network.name : 'Unknown Network'}
                  </span>
                </div>
                {!isCorrectNetwork && (
                  <button
                    onClick={handleNetworkSwitch}
                    className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline"
                  >
                    Switch to Arbitrum Sepolia
                  </button>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="p-3">
              <button
                onClick={() => {
                  disconnect();
                  setIsDropdownOpen(false);
                }}
                className="w-full px-3 py-2 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
              >
                Disconnect Wallet
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded text-red-700 text-sm">
          <div className="flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={clearError}
              className="text-red-900 hover:text-red-700 text-xs underline"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * WalletStatus Component
 * Simple status indicator for wallet connection
 */
export function WalletStatus({ className = '' }) {
  const { isConnected, isCorrectNetwork, account, balance, network } = useWallet();

  if (!isConnected) {
    return (
      <div className={`wallet-status ${className}`}>
        <div className="flex items-center gap-2 text-gray-600">
          <div className="w-2 h-2 rounded-full bg-red-500"></div>
          <span className="text-sm">Not Connected</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`wallet-status ${className}`}>
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${isCorrectNetwork ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
        <div className="text-sm">
          <div className="font-medium">
            {account?.slice(0, 6)}...{account?.slice(-4)}
          </div>
          <div className="text-gray-600 text-xs">
            {network?.name} • {parseFloat(balance || '0').toFixed(4)} ETH
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * NetworkIndicator Component  
 * Shows current network status
 */
export function NetworkIndicator({ className = '' }) {
  const { network, isCorrectNetwork, switchToArbitrumSepolia } = useWallet();

  return (
    <div className={`network-indicator ${className}`}>
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${isCorrectNetwork ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
        <span className="text-sm font-medium">
          {network ? network.name : 'Unknown'}
        </span>
        {!isCorrectNetwork && (
          <button
            onClick={switchToArbitrumSepolia}
            className="text-xs text-blue-600 hover:text-blue-800 underline ml-2"
          >
            Switch
          </button>
        )}
      </div>
    </div>
  );
}

export default ConnectWalletButton;