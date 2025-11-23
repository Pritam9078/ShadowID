// ABSOLUTE PRIORITY: Extension conflict prevention MUST load before React imports
import './utils/extensionConflictPrevention-simple.js'; // Critical: Load before everything

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import WalletErrorBoundary from './components/WalletErrorBoundary.jsx';
import { ProposalProvider } from './context/ProposalContext.jsx';
import { config } from './config/wagmi.js';
import './index.css';
import '@rainbow-me/rainbowkit/styles.css';

// Secondary priority: Load utility systems after crypto polyfills
import './utils/networkFilter.js'; // Block problematic network requests
import './utils/crypto.js'; // Additional crypto polyfills

// Import error handling and console filtering systems
import './utils/devConsoleHelper.js'; // Development debugging tools (load first)
import './utils/consoleFilters.js'; // Enhanced console noise filtering
import './utils/web3Manager.js'; // Web3 provider conflict handling
import './utils/browserCompatibility.js'; // Browser API polyfills and compatibility
import './utils/walletConnectHandler.js'; // WalletConnect error handling

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <WalletErrorBoundary>
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true
          }}
        >
          <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>
              <RainbowKitProvider>
              <ProposalProvider>
                <App />
                <Toaster 
                  position="top-right"
                  toastOptions={{
                    duration: 4000,
                    style: {
                      background: '#363636',
                      color: '#fff',
                    },
                  }}
                />
              </ProposalProvider>
            </RainbowKitProvider>
          </QueryClientProvider>
        </WagmiProvider>
      </BrowserRouter>
    </WalletErrorBoundary>
    </ErrorBoundary>
  </React.StrictMode>,
);
