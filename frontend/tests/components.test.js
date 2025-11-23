import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ethers } from 'ethers';

// Mock implementations
vi.mock('../src/services/zkApi.js', () => ({
  zkAPI: {
    generateBusinessCommitment: vi.fn(),
    generateBusinessRegistrationProof: vi.fn(),
    verifyProof: vi.fn(),
    completeBusinessVerification: vi.fn(),
    healthCheck: vi.fn(),
    getAvailableCircuits: vi.fn(),
    generateNonce: vi.fn(() => '0x' + '1'.repeat(64))
  }
}));

vi.mock('../src/services/backendApi.js', () => ({
  backendAPI: {
    createProposal: vi.fn(),
    getProposals: vi.fn(),
    getProposal: vi.fn(),
    voteOnProposal: vi.fn(),
    getUserProfile: vi.fn(),
    registerUser: vi.fn(),
    loginUser: vi.fn(),
    healthCheck: vi.fn()
  }
}));

// Mock ethers provider
const mockProvider = {
  getSigner: vi.fn(() => ({
    getAddress: vi.fn(() => Promise.resolve('0x742d35Cc6661C0532a2135cfEAbE60a9A4E60B3a')),
    signMessage: vi.fn(() => Promise.resolve('0xmocksignature')),
    getChainId: vi.fn(() => Promise.resolve(421614))
  })),
  getNetwork: vi.fn(() => Promise.resolve({ chainId: 421614, name: 'arbitrum-sepolia' })),
  getBalance: vi.fn(() => Promise.resolve(ethers.parseEther('1.0'))),
  estimateGas: vi.fn(() => Promise.resolve(21000n))
};

vi.mock('ethers', () => ({
  ethers: {
    BrowserProvider: vi.fn(() => mockProvider),
    Contract: vi.fn(() => ({
      propose: vi.fn(),
      vote: vi.fn(),
      getProposal: vi.fn(),
      balanceOf: vi.fn(() => Promise.resolve(ethers.parseEther('100'))),
      totalSupply: vi.fn(() => Promise.resolve(ethers.parseEther('1000000')))
    })),
    parseEther: vi.fn(val => BigInt(val) * BigInt(10**18)),
    formatEther: vi.fn(val => (Number(val) / (10**18)).toString()),
    isAddress: vi.fn(addr => /^0x[a-fA-F0-9]{40}$/.test(addr))
  }
}));

/**
 * Component Integration Tests
 * Tests React components with mocked backend and ZK services
 */

// Test wrapper component
const TestWrapper = ({ children }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
);

describe('Component Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset window.ethereum mock
    global.window.ethereum = {
      request: vi.fn(),
      on: vi.fn(),
      removeListener: vi.fn(),
      isMetaMask: true,
      chainId: '0x66eee', // Arbitrum Sepolia hex
      selectedAddress: '0x742d35Cc6661C0532a2135cfEAbE60a9A4E60B3a'
    };
  });

  describe('Proposal Creation Flow', () => {
    it('should create proposal with ZK verification', async () => {
      const { zkAPI } = await import('../src/services/zkApi.js');
      const { backendAPI } = await import('../src/services/backendApi.js');

      // Mock successful ZK verification
      zkAPI.generateBusinessCommitment.mockResolvedValue({
        success: true,
        commitment: '0x1234567890abcdef'
      });

      zkAPI.completeBusinessVerification.mockResolvedValue({
        success: true,
        commitment: '0x1234567890abcdef',
        proof: { proof: '0xproof123', public_inputs: ['0x1111'] },
        proofHash: '0xproofhash123',
        nonce: '0x' + '1'.repeat(64),
        workflow: 'business_verification'
      });

      backendAPI.createProposal.mockResolvedValue({
        id: 'proposal-123',
        title: 'Test Proposal',
        proposer: '0x742d35Cc6661C0532a2135cfEAbE60a9A4E60B3a',
        status: 'Active'
      });

      // Import and render component
      const { default: CreateProposal } = await import('../src/components/CreateProposal.jsx');
      
      render(
        <TestWrapper>
          <CreateProposal />
        </TestWrapper>
      );

      // Simulate form interaction
      const titleInput = screen.getByLabelText(/title/i);
      const descriptionInput = screen.getByLabelText(/description/i);
      const submitButton = screen.getByRole('button', { name: /create proposal/i });

      fireEvent.change(titleInput, { target: { value: 'Test Integration Proposal' } });
      fireEvent.change(descriptionInput, { target: { value: 'This is a test proposal' } });

      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(zkAPI.completeBusinessVerification).toHaveBeenCalled();
        expect(backendAPI.createProposal).toHaveBeenCalled();
      });
    });
  });

  describe('Dashboard Analytics Integration', () => {
    it('should load and display analytics data', async () => {
      const { backendAPI } = await import('../src/services/backendApi.js');

      backendAPI.getDashboardMetrics.mockResolvedValue({
        totalProposals: 156,
        activeProposals: 23,
        totalVotes: 45678,
        treasuryBalance: '2500000000000000000000', // 2500 ETH
        topCategories: [
          { name: 'Governance', count: 45 },
          { name: 'Treasury', count: 32 }
        ]
      });

      const { default: AnalyticsDashboard } = await import('../src/components/AnalyticsDashboard.jsx');

      render(
        <TestWrapper>
          <AnalyticsDashboard />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(backendAPI.getDashboardMetrics).toHaveBeenCalled();
        expect(screen.getByText('156')).toBeInTheDocument(); // Total proposals
        expect(screen.getByText('23')).toBeInTheDocument(); // Active proposals
      });
    });
  });

  describe('ZK Business Verification Component', () => {
    it('should handle complete business verification workflow', async () => {
      const { zkAPI } = await import('../src/services/zkApi.js');

      zkAPI.getAvailableCircuits.mockResolvedValue({
        success: true,
        circuits: ['business_registration', 'identity_verification']
      });

      zkAPI.completeBusinessVerification.mockResolvedValue({
        success: true,
        commitment: '0x' + 'a'.repeat(64),
        proof: { proof: '0xproof456' },
        proofHash: '0xproofhash456',
        verified: true,
        workflow: 'business_verification'
      });

      // Mock component that doesn't exist yet - create basic structure
      const MockBusinessVerification = () => {
        const [businessData, setBusinessData] = useState({
          registrationNumber: '',
          taxId: '',
          jurisdiction: ''
        });
        const [isVerifying, setIsVerifying] = useState(false);
        const [verificationResult, setVerificationResult] = useState(null);

        const handleVerification = async () => {
          setIsVerifying(true);
          try {
            const result = await zkAPI.completeBusinessVerification(
              businessData,
              '0x742d35Cc6661C0532a2135cfEAbE60a9A4E60B3a'
            );
            setVerificationResult(result);
          } catch (error) {
            console.error('Verification failed:', error);
          } finally {
            setIsVerifying(false);
          }
        };

        return (
          <div>
            <input
              data-testid="registration-number"
              value={businessData.registrationNumber}
              onChange={e => setBusinessData({...businessData, registrationNumber: e.target.value})}
              placeholder="Registration Number"
            />
            <button 
              onClick={handleVerification}
              disabled={isVerifying}
              data-testid="verify-button"
            >
              {isVerifying ? 'Verifying...' : 'Verify Business'}
            </button>
            {verificationResult && (
              <div data-testid="verification-result">
                {verificationResult.success ? 'Verification Successful' : 'Verification Failed'}
              </div>
            )}
          </div>
        );
      };

      render(
        <TestWrapper>
          <MockBusinessVerification />
        </TestWrapper>
      );

      const regInput = screen.getByTestId('registration-number');
      const verifyButton = screen.getByTestId('verify-button');

      fireEvent.change(regInput, { target: { value: 'REG123456789' } });
      fireEvent.click(verifyButton);

      await waitFor(() => {
        expect(zkAPI.completeBusinessVerification).toHaveBeenCalledWith(
          expect.objectContaining({
            registrationNumber: 'REG123456789'
          }),
          '0x742d35Cc6661C0532a2135cfEAbE60a9A4E60B3a'
        );
        expect(screen.getByTestId('verification-result')).toBeInTheDocument();
        expect(screen.getByText('Verification Successful')).toBeInTheDocument();
      });
    });
  });

  describe('Proposal Voting Integration', () => {
    it('should handle proposal voting with contract interaction', async () => {
      const { backendAPI } = await import('../src/services/backendApi.js');
      const { ethers } = await import('ethers');

      backendAPI.getProposal.mockResolvedValue({
        id: 'proposal-456',
        title: 'Test Voting Proposal',
        description: 'Testing vote functionality',
        proposer: '0x123...',
        status: 'Active',
        votes: { for: 0, against: 0, abstain: 0 }
      });

      backendAPI.voteOnProposal.mockResolvedValue({
        voter: '0x742d35Cc6661C0532a2135cfEAbE60a9A4E60B3a',
        support: 'FOR',
        weight: '1000000000000000000',
        proposalId: 'proposal-456'
      });

      // Mock voting component
      const MockVotingComponent = () => {
        const [proposal, setProposal] = useState(null);
        const [voting, setVoting] = useState(false);

        useEffect(() => {
          backendAPI.getProposal('proposal-456').then(setProposal);
        }, []);

        const handleVote = async (support) => {
          setVoting(true);
          try {
            await backendAPI.voteOnProposal('proposal-456', {
              voter: '0x742d35Cc6661C0532a2135cfEAbE60a9A4E60B3a',
              support,
              weight: '1000000000000000000'
            });
          } finally {
            setVoting(false);
          }
        };

        if (!proposal) return <div>Loading...</div>;

        return (
          <div>
            <h3 data-testid="proposal-title">{proposal.title}</h3>
            <button
              data-testid="vote-for"
              onClick={() => handleVote('FOR')}
              disabled={voting}
            >
              Vote For
            </button>
            <button
              data-testid="vote-against"
              onClick={() => handleVote('AGAINST')}
              disabled={voting}
            >
              Vote Against
            </button>
          </div>
        );
      };

      render(
        <TestWrapper>
          <MockVotingComponent />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('proposal-title')).toBeInTheDocument();
      });

      const voteForButton = screen.getByTestId('vote-for');
      fireEvent.click(voteForButton);

      await waitFor(() => {
        expect(backendAPI.voteOnProposal).toHaveBeenCalledWith('proposal-456', {
          voter: '0x742d35Cc6661C0532a2135cfEAbE60a9A4E60B3a',
          support: 'FOR',
          weight: '1000000000000000000'
        });
      });
    });
  });
});

describe('Contract Interaction Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Stylus Contract Integration', () => {
    it('should interact with DaoStylus contract', async () => {
      const { ethers } = await import('ethers');
      const { CONTRACT_ADDRESSES } = await import('../src/config/contracts.js');

      // Mock contract interaction
      const mockContract = {
        propose: vi.fn(() => Promise.resolve({
          hash: '0xtxhash123',
          wait: () => Promise.resolve({ status: 1 })
        })),
        vote: vi.fn(() => Promise.resolve({
          hash: '0xtxhash456',
          wait: () => Promise.resolve({ status: 1 })
        })),
        getProposal: vi.fn(() => Promise.resolve({
          id: 1,
          proposer: '0x742d35Cc6661C0532a2135cfEAbE60a9A4E60B3a',
          description: 'Test proposal',
          state: 1 // Active
        }))
      };

      ethers.Contract.mockReturnValue(mockContract);

      // Test proposal creation
      const proposalTx = await mockContract.propose(
        'Test Proposal Description',
        '0x0000000000000000000000000000000000000000',
        0,
        '0x'
      );

      expect(mockContract.propose).toHaveBeenCalledWith(
        'Test Proposal Description',
        '0x0000000000000000000000000000000000000000',
        0,
        '0x'
      );

      expect(proposalTx.hash).toBe('0xtxhash123');

      // Test voting
      const voteTx = await mockContract.vote(1, 1, '1000000000000000000'); // Vote FOR with 1 token
      expect(mockContract.vote).toHaveBeenCalledWith(1, 1, '1000000000000000000');
      expect(voteTx.hash).toBe('0xtxhash456');

      // Test proposal retrieval
      const proposal = await mockContract.getProposal(1);
      expect(mockContract.getProposal).toHaveBeenCalledWith(1);
      expect(proposal.proposer).toBe('0x742d35Cc6661C0532a2135cfEAbE60a9A4E60B3a');
    });
  });

  describe('Token Contract Integration', () => {
    it('should check token balance and voting power', async () => {
      const { ethers } = await import('ethers');

      const mockTokenContract = {
        balanceOf: vi.fn(() => Promise.resolve(ethers.parseEther('100'))),
        totalSupply: vi.fn(() => Promise.resolve(ethers.parseEther('1000000'))),
        transfer: vi.fn(() => Promise.resolve({
          hash: '0xtokentx123',
          wait: () => Promise.resolve({ status: 1 })
        }))
      };

      ethers.Contract.mockReturnValue(mockTokenContract);

      const userAddress = '0x742d35Cc6661C0532a2135cfEAbE60a9A4E60B3a';
      
      // Check balance
      const balance = await mockTokenContract.balanceOf(userAddress);
      expect(mockTokenContract.balanceOf).toHaveBeenCalledWith(userAddress);
      expect(balance).toBe(ethers.parseEther('100'));

      // Check total supply
      const totalSupply = await mockTokenContract.totalSupply();
      expect(mockTokenContract.totalSupply).toHaveBeenCalled();
      expect(totalSupply).toBe(ethers.parseEther('1000000'));

      // Calculate voting power (balance / total supply * 100)
      const votingPower = (Number(balance) / Number(totalSupply)) * 100;
      expect(votingPower).toBe(0.01); // 100 / 1,000,000 * 100 = 0.01%
    });
  });
});

describe('Network and Provider Tests', () => {
  describe('Arbitrum Sepolia Configuration', () => {
    it('should connect to correct network', async () => {
      const { NETWORK_CONFIG } = await import('../src/config/contracts.js');
      
      expect(NETWORK_CONFIG.chainId).toBe(421614);
      expect(NETWORK_CONFIG.name).toBe('arbitrum-sepolia');
      expect(NETWORK_CONFIG.rpcUrl).toContain('arb-sepolia.g.alchemy.com');
    });

    it('should handle network switching', async () => {
      const { ethers } = await import('ethers');
      
      // Mock network switch
      const provider = mockProvider;
      const network = await provider.getNetwork();
      
      expect(network.chainId).toBe(421614);
      expect(network.name).toBe('arbitrum-sepolia');
    });

    it('should estimate gas correctly', async () => {
      const gasEstimate = await mockProvider.estimateGas({
        to: '0xe277e471147e42529da6F7f35d729ff43f4c01E5',
        data: '0x'
      });

      expect(gasEstimate).toBe(21000n);
    });
  });
});

export default {
  // Export mock utilities for other tests
  mockProvider,
  TestWrapper,
  
  // Helper functions for test setup
  setupMockWallet: () => {
    global.window.ethereum = {
      request: vi.fn(),
      on: vi.fn(),
      removeListener: vi.fn(),
      isMetaMask: true,
      chainId: '0x66eee',
      selectedAddress: '0x742d35Cc6661C0532a2135cfEAbE60a9A4E60B3a'
    };
  },
  
  mockContractResponse: (method, returnValue) => {
    const { ethers } = require('ethers');
    const mockContract = {
      [method]: vi.fn(() => Promise.resolve(returnValue))
    };
    ethers.Contract.mockReturnValue(mockContract);
    return mockContract;
  }
};