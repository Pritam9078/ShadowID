import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { TextEncoder, TextDecoder } from 'util';

// Polyfills for Node.js environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock fetch API
global.fetch = vi.fn();

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
global.localStorage = localStorageMock;

// Mock sessionStorage
global.sessionStorage = localStorageMock;

// Mock window.ethereum (MetaMask)
global.window = global.window || {};
global.window.ethereum = {
  request: vi.fn(),
  on: vi.fn(),
  removeListener: vi.fn(),
  isMetaMask: true,
  chainId: '0x66eee', // Arbitrum Sepolia
  selectedAddress: '0x742d35Cc6661C0532a2135cfEAbE60a9A4E60B3a'
};

// Mock environment variables
process.env.VITE_API_URL = 'http://localhost:5000';
process.env.VITE_ZK_API_URL = 'https://zk-api.shadowid.com';
process.env.VITE_ZK_API_KEY = 'shadowid-client-key-2025';

// Reset all mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
  fetch.mockClear();
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  localStorageMock.clear.mockClear();
});