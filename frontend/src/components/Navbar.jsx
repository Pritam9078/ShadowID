import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useReadContract } from 'wagmi';
import { motion } from 'framer-motion';
import { 
  Home, 
  FileText, 
  Plus, 
  Vault, 
  Vote,
  Menu,
  X,
  Settings,
  User,
  BarChart3,
  Shield,
  DollarSign
} from 'lucide-react';

import { CONTRACT_ADDRESSES } from '../config/contracts';
import { DAO_ABI } from '../config/abis';
import { isAdmin } from '../config/adminConfig';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { address, isConnected, chain } = useAccount();

  // Check if user is owner/admin
  const { data: daoOwner, isError, isLoading } = useReadContract({
    address: CONTRACT_ADDRESSES.DAO,
    abi: DAO_ABI,
    functionName: 'owner',
    enabled: !!isConnected && !!address
  });

  const isContractAdmin = address && daoOwner && address.toLowerCase() === daoOwner.toLowerCase();
  
  // Debug admin detection
  console.log('Navbar Admin Check:', {
    address,
    daoOwner,
    isContractAdmin,
    isConnected,
    contractAddress: CONTRACT_ADDRESSES.DAO,
    chainId: chain?.id,
    isError,
    isLoading
  });

  // TO ADD YOUR WALLET AS ADMIN:
  // 1. Connect your wallet to the app
  // 2. Check the browser console for your wallet address
  // 3. Copy your address and add it to the adminAddresses array below
  
  // Log current wallet for easy copying
  if (address) {
    console.log('🔍 CURRENT WALLET ADDRESS (copy this):', address);
    console.log('📝 To enable admin panel: Add this address to adminConfig.js');
  }

  // Check if current address is admin using centralized config
  const isAdminByAddress = isAdmin(address);

  // Final admin status (contract-based OR address-based)
  const isAdminFinal = isContractAdmin || isAdminByAddress;
  
  // TEMPORARY: Make admin panel visible for all connected users for testing
  // Remove this line after adding your wallet address to adminAddresses
  const isTestingMode = true;
  const isAdminWithTesting = isAdminFinal || (isConnected && isTestingMode);
  
  // Enhanced debug logging
  console.log('🔐 Admin Status:', {
    contractAdmin: isContractAdmin,
    addressAdmin: isAdminByAddress,
    finalAdmin: isAdminFinal,
    testingMode: isTestingMode,
    adminWithTesting: isAdminWithTesting,
    currentAddress: address,
    note: 'Admin addresses managed in config/adminConfig.js'
  });

  // Custom wallet display to prevent duplicate addresses
  const CustomConnectButton = () => {
    return (
      <ConnectButton.Custom>
        {({
          account,
          chain,
          openAccountModal,
          openChainModal,
          openConnectModal,
          mounted,
        }) => {
          const ready = mounted;
          const connected = ready && account && chain;

          return (
            <div
              {...(!ready && {
                'aria-hidden': true,
                style: {
                  opacity: 0,
                  pointerEvents: 'none',
                  userSelect: 'none',
                },
              })}
            >
              {(() => {
                if (!connected) {
                  return (
                    <button 
                      onClick={openConnectModal} 
                      className="bg-dao-600 hover:bg-dao-700 text-white px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors duration-200 text-sm whitespace-nowrap"
                    >
                      <span className="hidden sm:inline">Connect Wallet</span>
                      <span className="sm:hidden">Connect</span>
                    </button>
                  );
                }

                if (chain.unsupported) {
                  return (
                    <button 
                      onClick={openChainModal} 
                      className="bg-red-600 hover:bg-red-700 text-white px-3 sm:px-4 py-2 rounded-lg font-medium transition-colors duration-200 text-sm whitespace-nowrap"
                    >
                      <span className="hidden sm:inline">Wrong network</span>
                      <span className="sm:hidden">Wrong net</span>
                    </button>
                  );
                }

                return (
                  <div className="flex items-center gap-1 sm:gap-2">
                    <button
                      onClick={openChainModal}
                      className="bg-gray-100 hover:bg-gray-200 p-2 rounded-lg transition-colors duration-200 flex-shrink-0"
                    >
                      {chain.hasIcon && (
                        <div
                          style={{
                            background: chain.iconBackground,
                            width: 20,
                            height: 20,
                            borderRadius: 999,
                            overflow: 'hidden',
                          }}
                        >
                          {chain.iconUrl && (
                            <img
                              alt={chain.name ?? 'Chain icon'}
                              src={chain.iconUrl}
                              style={{ width: 20, height: 20 }}
                            />
                          )}
                        </div>
                      )}
                    </button>

                    <button 
                      onClick={openAccountModal} 
                      className="bg-dao-100 hover:bg-dao-200 text-dao-700 px-2 sm:px-4 py-2 rounded-lg font-medium transition-colors duration-200 text-sm whitespace-nowrap max-w-[120px] truncate"
                    >
                      <span className="hidden sm:inline">{account.displayName}</span>
                      <span className="sm:hidden">{account.displayName?.slice(0, 6)}...</span>
                    </button>
                  </div>
                );
              })()}
            </div>
          );
        }}
      </ConnectButton.Custom>
    );
  };

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Proposals', href: '/proposals', icon: FileText },
    { name: 'Create Proposal', href: '/create-proposal', icon: Plus },
    { name: 'Treasury', href: '/treasury', icon: Vault },
    { name: 'Crowdfunding', href: '/crowdfunding', icon: DollarSign },
    { name: 'Verifier', href: '/verifier', icon: Shield },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    ...(isAdminWithTesting ? [{ name: 'Admin Panel', href: '/admin', icon: Settings }] : [])
  ];

  return (
    <nav className="sticky top-0 z-50 w-full bg-white shadow-md border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left side - Logo and Navigation */}
          <div className="flex items-center min-w-0 flex-1">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2 flex-shrink-0">
              <motion.div 
                className="w-8 h-8 flex items-center justify-center"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <img 
                  src="/shadowid-logo.png" 
                  alt="ShadowID Logo" 
                  className="w-8 h-8 object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'inline-block';
                  }}
                />
                <div 
                  className="w-8 h-8 bg-blue-600 rounded-lg items-center justify-center text-white font-bold text-sm hidden"
                >
                  S
                </div>
              </motion.div>
              <h1 className="text-xl font-bold text-blue-600 hidden sm:block">ShadowID</h1>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center ml-6 flex-1 min-w-0">
              <ul className="flex items-center gap-2 text-gray-700 font-medium overflow-x-auto">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.href;
                  
                  return (
                    <li key={item.name} className="flex-shrink-0">
                      <Link
                        to={item.href}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 whitespace-nowrap ${
                          isActive
                            ? 'text-blue-600 font-semibold bg-blue-50 border-b-2 border-blue-600'
                            : 'hover:text-blue-600 hover:bg-blue-50 cursor-pointer'
                        }`}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span className="hidden xl:block">{item.name}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          {/* Right side - Profile and Wallet */}
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            {/* Profile Link (when connected) */}
            {isConnected && (
              <Link
                to="/profile"
                className={`hidden md:flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 font-medium whitespace-nowrap ${
                  location.pathname === '/profile'
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
                }`}
              >
                <User className="w-4 h-4 flex-shrink-0" />
                <span className="hidden lg:block">Profile</span>
              </Link>
            )}

            {/* Wallet Connect Button */}
            <div className="hidden md:block flex-shrink-0">
              <CustomConnectButton />
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="lg:hidden p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors flex-shrink-0"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Overlay */}
      {isOpen && (
        <motion.div 
          className="absolute top-full left-0 right-0 bg-white shadow-lg border-t border-gray-200 lg:hidden z-50"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="space-y-2">
              {/* Mobile Navigation Links */}
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                      location.pathname === item.href
                        ? 'text-blue-600 font-semibold bg-blue-50 border-l-4 border-blue-600'
                        : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
                    }`}
                    onClick={() => setIsOpen(false)}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="font-medium">{item.name}</span>
                  </Link>
                );
              })}
              
              {/* Mobile Profile Link */}
              {isConnected && (
                <Link
                  to="/profile"
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    location.pathname === '/profile'
                      ? 'text-blue-600 font-semibold bg-blue-50 border-l-4 border-blue-600'
                      : 'text-gray-700 hover:text-blue-600 hover:bg-blue-50'
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  <User className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium">Profile</span>
                </Link>
              )}
              
              {/* Mobile Wallet Connect */}
              <div className="px-4 py-3 border-t border-gray-200 mt-4">
                <CustomConnectButton />
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </nav>
  );
};

export default Navbar;