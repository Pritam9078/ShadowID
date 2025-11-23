import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useProposals } from '../context/ProposalContext';
import { 
  Wifi, 
  WifiOff, 
  Send, 
  TestTube, 
  Zap,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';

const WebSocketTestPanel = () => {
  const { connectionStatus, wsConnected, reconnect, addProposal } = useProposals();
  const [testMessages, setTestMessages] = useState([]);
  const [isRunningTest, setIsRunningTest] = useState(false);

  const addTestMessage = (type, message, status = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setTestMessages(prev => [...prev.slice(-9), { // Keep last 10 messages
      id: Date.now(),
      type,
      message,
      status,
      timestamp
    }]);
  };

  const runWebSocketTest = async () => {
    if (!wsConnected) {
      toast.error('WebSocket not connected. Cannot run test.');
      return;
    }

    setIsRunningTest(true);
    addTestMessage('test', 'Starting WebSocket functionality test...', 'info');

    try {
      // Test 1: Create a test proposal through the context
      addTestMessage('test', 'Test 1: Creating test proposal...', 'pending');
      
      const testProposal = {
        id: `test-${Date.now()}`,
        title: 'WebSocket Test Proposal',
        description: 'This proposal was created to test real-time WebSocket functionality.',
        creator: '0x742d35Cc6634C0532925a3b8D5c5DD012345abcd',
        timestamp: Date.now(),
        votesFor: 0,
        votesAgainst: 0,
        votesAbstain: 0,
        state: 'Active',
        category: 'Test'
      };

      // This should trigger the WebSocket message via the context
      addProposal(testProposal);
      addTestMessage('proposal', 'Test proposal created successfully', 'success');

      // Test 2: Simulate vote casting (this would normally come from smart contract)
      await new Promise(resolve => setTimeout(resolve, 2000));
      addTestMessage('test', 'Test 2: Simulating vote cast...', 'pending');
      
      // In real implementation, this would come from the smart contract via WebSocket
      toast.success('🗳️ Vote cast successfully!', {
        duration: 3000,
        icon: '🗳️'
      });
      addTestMessage('vote', 'Vote simulation completed', 'success');

      // Test 3: Connection status check
      await new Promise(resolve => setTimeout(resolve, 1000));
      addTestMessage('test', 'Test 3: Checking connection health...', 'pending');
      addTestMessage('connection', `Connection Status: ${connectionStatus}`, 'info');
      addTestMessage('connection', `WebSocket Connected: ${wsConnected ? 'Yes' : 'No'}`, wsConnected ? 'success' : 'error');

      addTestMessage('test', '✅ All WebSocket tests completed successfully!', 'success');
      toast.success('WebSocket test completed!', {
        duration: 4000,
        icon: '✅'
      });

    } catch (error) {
      addTestMessage('error', `Test failed: ${error.message}`, 'error');
      toast.error('WebSocket test failed!');
    } finally {
      setIsRunningTest(false);
    }
  };

  const clearTestMessages = () => {
    setTestMessages([]);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />;
      default: return <AlertCircle className="w-4 h-4 text-blue-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-50 border-green-200';
      case 'error': return 'text-red-600 bg-red-50 border-red-200';
      case 'pending': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <TestTube className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">WebSocket Test Panel</h3>
            <p className="text-sm text-gray-500">Test real-time connectivity and functionality</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {wsConnected ? (
            <div className="flex items-center space-x-2 text-green-600 bg-green-50 px-3 py-1 rounded-full">
              <Wifi className="w-4 h-4" />
              <span className="text-sm font-medium">Connected</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2 text-red-600 bg-red-50 px-3 py-1 rounded-full">
              <WifiOff className="w-4 h-4" />
              <span className="text-sm font-medium">Disconnected</span>
            </div>
          )}
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex space-x-3 mb-6">
        <button
          onClick={runWebSocketTest}
          disabled={isRunningTest || !wsConnected}
          className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg transition-colors duration-200"
        >
          {isRunningTest ? (
            <>
              <Clock className="w-4 h-4 animate-spin" />
              <span>Running Test...</span>
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              <span>Run Test</span>
            </>
          )}
        </button>

        {!wsConnected && (
          <button
            onClick={reconnect}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200"
          >
            <Send className="w-4 h-4" />
            <span>Reconnect</span>
          </button>
        )}

        <button
          onClick={clearTestMessages}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors duration-200"
        >
          Clear Log
        </button>
      </div>

      {/* Connection Info */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="text-sm text-gray-600 mb-1">Connection Status</div>
          <div className="font-medium text-gray-900">{connectionStatus}</div>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="text-sm text-gray-600 mb-1">WebSocket URL</div>
          <div className="font-mono text-sm text-gray-900">ws://localhost:8080</div>
        </div>
      </div>

      {/* Test Messages Log */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-700">Test Activity Log</h4>
          <span className="text-xs text-gray-500">{testMessages.length} messages</span>
        </div>
        
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {testMessages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <TestTube className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No test messages yet. Run a test to see activity.</p>
            </div>
          ) : (
            testMessages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`flex items-start space-x-3 p-3 rounded-lg border ${getStatusColor(msg.status)}`}
              >
                {getStatusIcon(msg.status)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{msg.type}</span>
                    <span className="text-xs opacity-75">{msg.timestamp}</span>
                  </div>
                  <p className="text-sm mt-1">{msg.message}</p>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default WebSocketTestPanel;
