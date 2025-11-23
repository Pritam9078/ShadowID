import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAccount } from 'wagmi';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';

import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import LandingDashboard from './pages/LandingDashboard';
import Dashboard from './pages/Dashboard';
import CreateProposal from './pages/CreateProposal';
import Treasury from './pages/Treasury';
import Crowdfunding from './components/Crowdfunding';
import AlchemyProposals from './components/AlchemyProposals';
import VotingPage from './pages/VotingPage';
import ConnectionTest from './components/ConnectionTest';
import AdminPanel from './components/AdminPanel';
import UserProfile from './components/UserProfile';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import NetworkSwitcher from './components/NetworkSwitcher';
import Verifier from './components/Verifier';
import { RealTimeNotifications } from './services/websocket.jsx';

function App() {
  const { isConnected } = useAccount();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect to landing page when wallet is disconnected
  useEffect(() => {
    if (!isConnected && location.pathname !== '/') {
      console.log('[DVote] Wallet disconnected, cleaning up and redirecting to landing page');
      
      // Clear user-specific data from localStorage
      const keysToKeep = ['rainbow-kit-recent-wallet', 'wagmi.cache']; // Keep essential wallet connection data
      const allKeys = Object.keys(localStorage);
      
      allKeys.forEach(key => {
        if (!keysToKeep.some(keepKey => key.includes(keepKey))) {
          // Clear DVote-specific or user-specific data
          if (key.includes('DVote') || key.includes('user') || key.includes('profile')) {
            localStorage.removeItem(key);
          }
        }
      });
      
      // Redirect to landing page
      navigate('/', { replace: true });
    }
  }, [isConnected, navigate, location.pathname]);

  return (
    <div className="min-h-screen">
      {/* Network switcher - shows warning if wrong network */}
      <NetworkSwitcher />
      
      {/* Real-time notifications */}
      <RealTimeNotifications />
      
      {/* Toast notifications */}
      <Toaster position="top-right" />
      
      <Routes>
        {/* Landing page route - no navbar for clean landing experience */}
        <Route 
          path="/" 
          element={
            isConnected ? (
              <div>
                <Navbar />
                <LandingDashboard />
              </div>
            ) : (
              <LandingDashboard />
            )
          } 
        />
        
        {/* User Profile Route */}
        <Route 
          path="/profile" 
          element={
            <ProtectedRoute>
              <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
                <Navbar />
                <motion.main 
                  className="container mx-auto px-4 py-8"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <UserProfile isOwnProfile={true} />
                </motion.main>
              </div>
            </ProtectedRoute>
          } 
        />

        {/* Analytics Dashboard Route */}
        <Route 
          path="/analytics" 
          element={
            <ProtectedRoute>
              <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
                <Navbar />
                <AnalyticsDashboard />
              </div>
            </ProtectedRoute>
          } 
        />
        
        {/* All other routes with navbar */}
        <Route 
          path="/proposals" 
          element={
            <ProtectedRoute>
              <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
                <Navbar />
                <motion.main 
                  className="container mx-auto px-4 py-8"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <AlchemyProposals />
                </motion.main>
              </div>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/vote/:proposalId" 
          element={
            <ProtectedRoute>
              <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
                <Navbar />
                <motion.main 
                  className="container mx-auto px-4 py-8"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <VotingPage />
                </motion.main>
              </div>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/create-proposal" 
          element={
            <ProtectedRoute>
              <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
                <Navbar />
                <motion.main 
                  className="container mx-auto px-4 py-8"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <CreateProposal />
                </motion.main>
              </div>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/treasury" 
          element={
            <ProtectedRoute>
              <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
                <Navbar />
                <motion.main 
                  className="container mx-auto px-4 py-8"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <Treasury />
                </motion.main>
              </div>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/verifier" 
          element={
            <ProtectedRoute>
              <div>
                <Navbar />
                <Verifier />
              </div>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/crowdfunding" 
          element={
            <ProtectedRoute>
              <div>
                <Navbar />
                <Crowdfunding />
              </div>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/test-connection" 
          element={
            <ProtectedRoute>
              <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
                <Navbar />
                <motion.main 
                  className="container mx-auto px-4 py-8"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <ConnectionTest />
                </motion.main>
              </div>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute>
              <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
                <Navbar />
                <motion.main 
                  className="container mx-auto px-4 py-8"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <AdminPanel />
                </motion.main>
              </div>
            </ProtectedRoute>
          } 
        />
      </Routes>
    </div>
  );
}

export default App;
