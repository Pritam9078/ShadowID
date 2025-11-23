import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { arbitrumSepolia } from 'wagmi/chains';
import { http } from 'viem';

// Define localhost chain for development
const localhost = {
  id: 31337,
  name: 'Localhost',
  network: 'localhost',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { 
      http: ['http://127.0.0.1:8545'],
    },
    public: {
      http: ['http://127.0.0.1:8545'],
    }
  },
  contracts: {
    multicall3: {
      address: '0xca11bde05977b3631167028862be2a173976ca11',
      blockCreated: 0,
    },
  },
};

// Get WalletConnect project ID with fallback
const getWalletConnectProjectId = () => {
  const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;
  
  if (!projectId || projectId === 'YOUR_PROJECT_ID' || projectId.trim() === '') {
    console.log('[DVote] WalletConnect disabled - using default project ID');
    // Use a default WalletConnect project ID for development
    return '2f05ae7f284f4f56b1132e0c9a2a3e4d';
  }
  
  return projectId;
};

// Configure wagmi with proper error handling
const createConfig = () => {
  try {
    const projectId = getWalletConnectProjectId();
    
    // Define chains with Arbitrum Sepolia using public RPC
    const chains = [arbitrumSepolia, localhost];
    
    return getDefaultConfig({
      appName: 'ShadowID Platform',
      projectId: projectId || '2f05ae7f284f4f56b1132e0c9a2a3e4d',
      chains,
      transports: {
        [arbitrumSepolia.id]: http('https://arb-sepolia.g.alchemy.com/v2/mUJMHrybqfzOlpVeT0cj7'),
        [localhost.id]: http('http://127.0.0.1:8545'),
      },
      ssr: false,
    });

  } catch (error) {
    console.warn('[DVote] Failed to initialize wallet configuration:', error.message);
    return getDefaultConfig({
      appName: 'ShadowID Platform',
      projectId: '2f05ae7f284f4f56b1132e0c9a2a3e4d',
      chains: [arbitrumSepolia, localhost],
      transports: {
        [arbitrumSepolia.id]: http('https://arb-sepolia.g.alchemy.com/v2/mUJMHrybqfzOlpVeT0cj7'),
        [localhost.id]: http('http://127.0.0.1:8545'),
      },
      ssr: false,
    });
  }
};

export const config = createConfig();
