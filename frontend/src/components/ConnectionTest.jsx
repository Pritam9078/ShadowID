import React, { useState, useEffect } from 'react';
import { backendAPI } from '../services/backendApi';

const ConnectionTest = () => {
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const runTests = async () => {
      const testResults = {};
      
      try {
        // Test treasury balance
        console.log('Testing treasury balance...');
        const balanceResult = await backendAPI.getTreasuryBalance();
        testResults.balance = { success: true, data: balanceResult };
        console.log('Balance test passed:', balanceResult);
      } catch (error) {
        testResults.balance = { success: false, error: error.message };
        console.error('Balance test failed:', error);
      }

      try {
        // Test treasury summary
        console.log('Testing treasury summary...');
        const summaryResult = await backendAPI.getTreasurySummary();
        testResults.summary = { success: true, data: summaryResult };
        console.log('Summary test passed:', summaryResult);
      } catch (error) {
        testResults.summary = { success: false, error: error.message };
        console.error('Summary test failed:', error);
      }

      try {
        // Test treasury transactions
        console.log('Testing treasury transactions...');
        const transactionsResult = await backendAPI.getTreasuryTransactions();
        testResults.transactions = { success: true, data: transactionsResult };
        console.log('Transactions test passed:', transactionsResult);
      } catch (error) {
        testResults.transactions = { success: false, error: error.message };
        console.error('Transactions test failed:', error);
      }

      setResults(testResults);
      setLoading(false);
    };

    runTests();
  }, []);

  if (loading) {
    return <div className="p-4">Running connection tests...</div>;
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Backend Connection Test Results</h1>
      
      {Object.entries(results).map(([test, result]) => (
        <div key={test} className="mb-4 p-4 border rounded">
          <h2 className="text-lg font-semibold mb-2">
            {test.charAt(0).toUpperCase() + test.slice(1)} Test
          </h2>
          
          {result.success ? (
            <div>
              <div className="text-green-600 font-medium">✅ SUCCESS</div>
              <pre className="mt-2 p-2 bg-gray-100 rounded text-sm overflow-auto">
                {JSON.stringify(result.data, null, 2)}
              </pre>
            </div>
          ) : (
            <div>
              <div className="text-red-600 font-medium">❌ FAILED</div>
              <div className="mt-2 p-2 bg-red-100 rounded text-sm">
                Error: {result.error}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default ConnectionTest;
