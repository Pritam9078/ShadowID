/**
 * useWallet Hook
 * 
 * Standalone hook file for wallet functionality
 * Re-exports the hook from WalletContext for convenience
 */

export { useWallet } from './WalletContext.jsx';

/**
 * Extended wallet hook with additional utilities
 */
import { useWallet as useWalletBase } from './WalletContext.jsx';
import { TransactionService } from './TransactionService.js';
import { useMemo } from 'react';

export function useWalletWithTransactions() {
  const wallet = useWalletBase();
  
  // Create transaction service instance
  const txService = useMemo(() => {
    if (wallet.provider && wallet.signer) {
      return new TransactionService(wallet.provider, wallet.signer);
    }
    return null;
  }, [wallet.provider, wallet.signer]);
  
  return {
    ...wallet,
    txService,
    isReady: wallet.isConnected && wallet.isCorrectNetwork,
    canTransact: wallet.isConnected && wallet.isCorrectNetwork && wallet.signer
  };
}

export default useWallet;