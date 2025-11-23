import React from 'react';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { AlertTriangle, Wifi, WifiOff } from 'lucide-react';

const NetworkSwitcher = () => {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  // Don't show if wallet not connected
  if (!isConnected) return null;

  const isOnArbitrumSepolia = chainId === 421614;
  const isOnLocalhost = chainId === 31337;
  const isOnCorrectNetwork = isOnArbitrumSepolia || isOnLocalhost; // Accept both networks

  const handleSwitchToArbitrumSepolia = async () => {
    try {
      await switchChain({ chainId: 421614 });
    } catch (error) {
      console.error('Failed to connect to Arbitrum network:', error);
    }
  };

  const handleSwitchToLocalhost = async () => {
    try {
      await switchChain({ chainId: 31337 });
    } catch (error) {
      console.error('Failed to switch to localhost:', error);
      
      // If switching fails, try adding the network manually
      if (window.ethereum) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x7a69', // 31337 in hex
              chainName: 'Hardhat Local',
              nativeCurrency: {
                name: 'Ether',
                symbol: 'ETH',
                decimals: 18
              },
              rpcUrls: ['http://127.0.0.1:8545'],
              blockExplorerUrls: null
            }]
          });
        } catch (addError) {
          console.error('Failed to add localhost network:', addError);
        }
      }
    }
  };

  // Show network selection if not on a supported network
  if (!isOnCorrectNetwork) {
    return (
      <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full mx-4">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg shadow-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-yellow-800">
                Network Setup Required
              </h3>
              <p className="mt-1 text-sm text-yellow-700">
                ShadowID works on the Arbitrum network for secure identity verification. Let's connect you to the right network.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={handleSwitchToArbitrumSepolia}
                  className="bg-blue-100 hover:bg-blue-200 text-blue-800 text-sm font-medium px-3 py-2 rounded-md transition-colors duration-200 flex items-center gap-2"
                >
                  <Wifi className="h-4 w-4" />
                  Connect to Arbitrum
                </button>
                <button
                  onClick={handleSwitchToLocalhost}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-medium px-3 py-2 rounded-md transition-colors duration-200 flex items-center gap-2"
                >
                  <Wifi className="h-4 w-4" />
                  Local Development
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show success indicator when on correct network
  return (
    <div className="fixed top-20 right-4 z-50">
      <div className="bg-green-50 border border-green-200 rounded-lg p-3 shadow-sm">
        <div className="flex items-center gap-2">
          <Wifi className="h-4 w-4 text-green-600" />
          <span className="text-sm font-medium text-green-800">
            {isOnArbitrumSepolia ? '🟢 Connected to Arbitrum' : '🟡 Local Development Mode'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default NetworkSwitcher;
