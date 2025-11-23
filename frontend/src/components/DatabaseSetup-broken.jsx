import React, { useState } from 'react';
import { supabase } from '../config/supabase';

function DatabaseSetup() {
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const createTable = async (tableName, sql) => {
    try {
      const { error } = await supabase.rpc('exec_sql', { sql });
      if (error) {
        console.error(`Error creating ${tableName}:`, error);
        setStatus(prev => prev + `❌ ${tableName}: ${error.message}\n`);
        return false;
      } else {
        console.log(`✅ ${tableName} created successfully`);
        setStatus(prev => prev + `✅ ${tableName} created successfully\n`);
        return true;
      }
    } catch (error) {
      console.error(`Error with ${tableName}:`, error);
      setStatus(prev => prev + `❌ ${tableName}: ${error.message}\n`);
      return false;
    }
  };

  const setupDatabase = async () => {
    setIsLoading(true);
    setStatus('Starting database setup...\n');

    // Test basic connection first
    try {
      const { data, error } = await supabase.auth.getSession();
      setStatus(prev => prev + `🔌 Connection test: ${error ? 'Failed' : 'Success'}\n`);
    } catch (error) {
      setStatus(prev => prev + `🔌 Connection test failed: ${error.message}\n`);
    }

    // Try to create profiles table using direct SQL
    try {
      // Use the SQL editor approach - create tables manually
      const { data, error } = await supabase
        .from('profiles')
        .select('count(*)')
        .limit(1);

      if (error && error.code === '42P01') {
        // Table doesn't exist, this is expected
        setStatus(prev => prev + '📝 Tables need to be created manually in Supabase dashboard\n');
        setStatus(prev => prev + '🔗 Go to: https://supabase.com/dashboard/project/vbbfwgyqpmhdydjxziww/sql\n');
        setStatus(prev => prev + '📋 Copy the SQL from supabase-schema.sql and run it\n');
      } else if (!error) {
        setStatus(prev => prev + '✅ Profiles table already exists!\n');
      } else {
        setStatus(prev => prev + `❌ Error checking tables: ${error.message}\n`);
      }
    } catch (error) {
      setStatus(prev => prev + `❌ Database error: ${error.message}\n`);
    }

    setIsLoading(false);
  };

  const createDemoProfile = async () => {
    setIsLoading(true);
    setStatus(prev => prev + '\n🎭 Creating demo profile...\n');

    try {
      const demoProfile = {
        wallet_address: '0x742d35Cc6634C0532925a3b8D5c5a9B4cAB4aa2D',
        username: 'Demo User',
        bio: 'This is a demo profile for testing the ShadowID platform',
        email: 'demo@dvote.io',
        location: 'DeFi Space',
        website: 'https://dvote.demo',
        twitter: '@dvotedemo',
        github: 'dvote-demo',
        public_email: true
      };

      const { data, error } = await supabase
        .from('profiles')
        .upsert(demoProfile)
        .select();

      if (error) {
        setStatus(prev => prev + `❌ Demo profile creation failed: ${error.message}\n`);
      } else {
        setStatus(prev => prev + '✅ Demo profile created successfully!\n');
        setStatus(prev => prev + `📄 Demo profile: ${JSON.stringify(data, null, 2)}\n`);
        setStatus(prev => prev + '🔗 Go to /profile to see the demo profile in action!\n');
      }
    } catch (error) {
      setStatus(prev => prev + `❌ Demo profile error: ${error.message}\n`);
    }

    setIsLoading(false);
  };
    setIsLoading(true);
    setStatus(prev => prev + '\n🧪 Testing profile operations...\n');

    try {
      // Test inserting a profile
      const testProfile = {
        wallet_address: '0x1234567890123456789012345678901234567890',
        username: 'TestUser',
        bio: 'Test bio for DAO member',
        email: 'test@example.com',
        location: 'Blockchain City',
        website: 'https://example.com',
        twitter: '@testuser'
      };

      const { data, error } = await supabase
        .from('profiles')
        .upsert(testProfile)
        .select();

      if (error) {
        setStatus(prev => prev + `❌ Profile test failed: ${error.message}\n`);
      } else {
        setStatus(prev => prev + '✅ Profile operations working!\n');
        setStatus(prev => prev + `📄 Test data: ${JSON.stringify(data, null, 2)}\n`);
        
        // Test fetching the profile back
        const { data: fetchData, error: fetchError } = await supabase
          .from('profiles')
          .select('*')
          .eq('wallet_address', testProfile.wallet_address)
          .single();

        if (fetchError) {
          setStatus(prev => prev + `❌ Profile fetch failed: ${fetchError.message}\n`);
        } else {
          setStatus(prev => prev + '✅ Profile fetch working!\n');
          setStatus(prev => prev + `📄 Fetched data: ${JSON.stringify(fetchData, null, 2)}\n`);
        }
      }
    } catch (error) {
      setStatus(prev => prev + `❌ Profile test error: ${error.message}\n`);
    }

    setIsLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Supabase Database Setup</h1>
      
      <div className="space-y-4">
        <button
          onClick={setupDatabase}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? 'Checking...' : 'Check Database Connection'}
        </button>

        <button
          onClick={testProfileOperations}
          disabled={isLoading}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 ml-2"
        >
          {isLoading ? 'Testing...' : 'Test Profile Operations'}
        </button>

        <button
          onClick={createDemoProfile}
          disabled={isLoading}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 ml-2"
        >
          {isLoading ? 'Creating...' : 'Create Demo Profile'}
        </button>
      </div>

      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-2">Setup Status:</h3>
        <pre className="bg-gray-100 p-4 rounded text-sm whitespace-pre-wrap h-96 overflow-y-auto">
          {status || 'Click "Check Database Connection" to start...'}
        </pre>
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded">
        <h3 className="font-semibold mb-2">Manual Setup Instructions:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Go to <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Supabase Dashboard</a></li>
          <li>Sign in and select your project: <code>vbbfwgyqpmhdydjxziww</code></li>
          <li>Go to SQL Editor</li>
          <li>Copy the contents of <code>supabase-schema.sql</code></li>
          <li>Paste and run the SQL to create all tables</li>
          <li>Come back here and test the connection</li>
        </ol>
      </div>
    </div>
  );
}

export default DatabaseSetup;
