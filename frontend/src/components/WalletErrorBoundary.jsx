import React from 'react';

class WalletErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Check if this is a wallet-related error that should be suppressed
    const isWalletError = this.isWalletRelatedError(error);
    
    if (isWalletError) {
      console.log('[DVote] Wallet error suppressed:', error.message);
      this.setState({ hasError: false }); // Don't show error UI for wallet errors
      return;
    }

    // Log other errors normally
    console.error('Error caught by WalletErrorBoundary:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  isWalletRelatedError(error) {
    const walletErrorPatterns = [
      'walletconnect',
      'phantom',
      'metamask',
      'ethereum',
      'web3',
      'evmask',
      'crypto.randomuuid',
      'failed to fetch',
      'network error',
      'user rejected',
      'connection failed'
    ];

    const errorMessage = error.message?.toLowerCase() || '';
    const errorStack = error.stack?.toLowerCase() || '';
    
    return walletErrorPatterns.some(pattern => 
      errorMessage.includes(pattern) || errorStack.includes(pattern)
    );
  }

  render() {
    if (this.state.hasError && !this.isWalletRelatedError(this.state.error)) {
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
          <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                  <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="mt-4 text-lg font-medium text-gray-900">
                  Something went wrong
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  An unexpected error occurred. Please refresh the page to try again.
                </p>
                <div className="mt-6">
                  <button
                    type="button"
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    onClick={() => window.location.reload()}
                  >
                    Refresh Page
                  </button>
                </div>
                {process.env.NODE_ENV === 'development' && (
                  <details className="mt-4 text-left">
                    <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-900">
                      Error Details (Development)
                    </summary>
                    <pre className="mt-2 text-xs text-red-600 overflow-auto">
                      {this.state.error && this.state.error.toString()}
                      <br />
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default WalletErrorBoundary;
