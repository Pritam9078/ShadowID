import { apiRequest, API_BASE, API_ENDPOINTS } from '../config/api.js';

/**
 * Backend API Service - Centralized API communication
 */
class BackendApiService {
  constructor() {
    this.baseURL = API_BASE;
  }

  // Helper method for making API requests
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    // Add auth token if available
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    try {
      const response = await apiRequest(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // USER AUTHENTICATION & PROFILE METHODS
  async registerUser(userData) {
    return this.request('/api/users/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  async loginUser(credentials) {
    const response = await this.request('/api/users/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
    
    if (response.token) {
      localStorage.setItem('auth_token', response.token);
    }
    
    return response;
  }

  async logoutUser() {
    localStorage.removeItem('auth_token');
    return this.request('/api/users/logout', { method: 'POST' });
  }

  async getUserProfile(address) {
    if (address) {
      return this.request(`/api/users/profile/${address}`);
    } else {
      // Get current user's profile using token authentication
      return this.request('/api/users/profile');
    }
  }

  async updateUserProfile(address, profileData) {
    return this.request(`/api/users/profile/${address}`, {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
  }

  async getUserVotingHistory(address, page = 1, limit = 20) {
    return this.request(`/api/users/${address}/voting-history?page=${page}&limit=${limit}`);
  }

  async getUserStatistics(address) {
    return this.request(`/api/users/${address}/statistics`);
  }

  // PROPOSAL COMMENTS METHODS
  async getProposalComments(proposalId) {
    return this.request(`/api/proposals/${proposalId}/comments`);
  }

  async addProposalComment(proposalId, commentData) {
    return this.request(`/api/proposals/${proposalId}/comments`, {
      method: 'POST',
      body: JSON.stringify(commentData)
    });
  }

  async updateComment(commentId, updateData) {
    return this.request(`/api/comments/${commentId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    });
  }

  async deleteComment(commentId) {
    return this.request(`/api/comments/${commentId}`, {
      method: 'DELETE'
    });
  }

  // ANALYTICS METHODS
  async getAnalytics(timeframe = '30d') {
    return this.request(`/api/analytics?timeframe=${timeframe}`);
  }

  async getDashboardMetrics() {
    return this.request('/api/analytics/dashboard');
  }

  async getProposalAnalytics(proposalId) {
    return this.request(`/api/analytics/proposals/${proposalId}`);
  }

  async getTreasuryAnalytics() {
    return this.request('/api/analytics/treasury');
  }

  // SEARCH & FILTERING METHODS
  async searchProposals(searchParams) {
    const params = new URLSearchParams();
    
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          value.forEach(v => params.append(key, v));
        } else if (typeof value === 'object') {
          Object.entries(value).forEach(([subKey, subValue]) => {
            if (subValue) params.append(`${key}.${subKey}`, subValue);
          });
        } else {
          params.append(key, value);
        }
      }
    });

    return this.request(`/api/proposals/search?${params}`);
  }

  async getProposalCategories() {
    return this.request('/api/proposals/categories');
  }

  async getAdvancedFilters() {
    return this.request('/api/proposals/filters');
  }

  // IPFS METHODS
  async uploadToIPFS(formData, options = {}) {
    const config = {
      method: 'POST',
      body: formData,
      ...options
    };

    // Remove Content-Type header for FormData
    delete config.headers;

    return this.request('/api/ipfs/upload', config);
  }

  async getIPFSFile(hash) {
    return this.request(`/api/ipfs/${hash}`);
  }

  async pinIPFSFile(hash) {
    return this.request(`/api/ipfs/pin/${hash}`, {
      method: 'POST'
    });
  }

  // TREASURY API METHODS (Additional legacy methods)
  async getTreasuryBalance() {
    return this.request('/api/treasury/balance');
  }

  async getTreasuryTransactions(page = 1, limit = 20, type = null) {
    const params = new URLSearchParams({ page, limit });
    if (type) params.append('type', type);
    return this.request(`/api/treasury/transactions?${params}`);
  }

  async getTreasurySummary() {
    return this.request('/api/treasury/summary');
  }

  // PROPOSAL API METHODS (Additional legacy methods)
  async getProposals(page = 1, limit = 20, status = null) {
    const params = new URLSearchParams({ page, limit });
    if (status) params.append('status', status);
    return this.request(`/api/proposals?${params}`);
  }

  async getProposal(id) {
    return this.request(`/api/proposals/${id}`);
  }

  async createProposal(proposalData) {
    return this.request('/api/proposals', {
      method: 'POST',
      body: JSON.stringify(proposalData)
    });
  }

  async voteOnProposal(proposalId, voteData) {
    return this.request(`/api/proposals/${proposalId}/vote`, {
      method: 'POST',
      body: JSON.stringify(voteData)
    });
  }

  // HEALTH CHECK
  async healthCheck() {
    return this.request('/health');
  }
}

// Export singleton instance
export const backendAPI = new BackendApiService();
export default backendAPI;