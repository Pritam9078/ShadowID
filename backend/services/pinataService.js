/**
 * Enhanced IPFS Service using Pinata
 * 
 * Handles file uploads, metadata management, and IPFS operations
 * for the DVote DAO platform using Pinata's IPFS service
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

class PinataIPFSService {
  constructor() {
    this.apiKey = process.env.PINATA_API_KEY;
    this.apiSecret = process.env.PINATA_API_SECRET;
    this.jwt = process.env.PINATA_JWT;
    this.baseURL = 'https://api.pinata.cloud';
    
    // Initialize with JWT if available (recommended)
    this.headers = this.jwt ? {
      'Authorization': `Bearer ${this.jwt}`
    } : {
      'pinata_api_key': this.apiKey,
      'pinata_secret_api_key': this.apiSecret
    };

    console.log('🔧 Pinata IPFS Service initialized');
  }

  /**
   * Pin a file to IPFS via Pinata
   * 
   * @param {Buffer|ReadStream} file - File data or stream
   * @param {Object} options - Upload options
   * @returns {Promise<Object>} IPFS hash and metadata
   */
  async pinFile(file, options = {}) {
    try {
      const formData = new FormData();
      
      // Add file to form data
      if (Buffer.isBuffer(file)) {
        formData.append('file', file, options.filename || 'file');
      } else if (typeof file === 'string') {
        // Assume it's a file path
        formData.append('file', fs.createReadStream(file));
      } else {
        formData.append('file', file);
      }

      // Add metadata if provided
      if (options.metadata) {
        formData.append('pinataMetadata', JSON.stringify({
          name: options.metadata.name || options.filename || 'ShadowID File',
          keyvalues: {
            type: options.metadata.type || 'document',
            uploadedBy: options.metadata.uploadedBy || 'shadowid-system',
            timestamp: new Date().toISOString(),
            ...options.metadata.keyvalues
          }
        }));
      }

      // Add pin options
      if (options.pinOptions) {
        formData.append('pinataOptions', JSON.stringify(options.pinOptions));
      }

      const response = await axios.post(
        `${this.baseURL}/pinning/pinFileToIPFS`,
        formData,
        {
          headers: {
            ...this.headers,
            ...formData.getHeaders()
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity
        }
      );

      console.log(`📌 File pinned to IPFS: ${response.data.IpfsHash}`);

      return {
        success: true,
        ipfsHash: response.data.IpfsHash,
        pinSize: response.data.PinSize,
        timestamp: response.data.Timestamp,
        gatewayUrl: `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`,
        metadata: options.metadata
      };

    } catch (error) {
      console.error('❌ Failed to pin file to IPFS:', error.response?.data || error.message);
      
      return {
        success: false,
        error: error.response?.data?.error || error.message,
        code: error.response?.status || 500
      };
    }
  }

  /**
   * Pin JSON data to IPFS
   * 
   * @param {Object} jsonData - JSON object to pin
   * @param {Object} options - Upload options
   * @returns {Promise<Object>} IPFS hash and metadata
   */
  async pinJSON(jsonData, options = {}) {
    try {
      const pinataContent = {
        pinataContent: jsonData,
        pinataMetadata: {
          name: options.name || 'ShadowID JSON Data',
          keyvalues: {
            type: options.type || 'json',
            contentType: 'application/json',
            uploadedBy: options.uploadedBy || 'shadowid-system',
            timestamp: new Date().toISOString(),
            ...options.keyvalues
          }
        }
      };

      if (options.pinOptions) {
        pinataContent.pinataOptions = options.pinOptions;
      }

      const response = await axios.post(
        `${this.baseURL}/pinning/pinJSONToIPFS`,
        pinataContent,
        { headers: this.headers }
      );

      console.log(`📌 JSON data pinned to IPFS: ${response.data.IpfsHash}`);

      return {
        success: true,
        ipfsHash: response.data.IpfsHash,
        pinSize: response.data.PinSize,
        timestamp: response.data.Timestamp,
        gatewayUrl: `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`,
        content: jsonData
      };

    } catch (error) {
      console.error('❌ Failed to pin JSON to IPFS:', error.response?.data || error.message);
      
      return {
        success: false,
        error: error.response?.data?.error || error.message,
        code: error.response?.status || 500
      };
    }
  }

  /**
   * Get file from IPFS
   * 
   * @param {string} ipfsHash - IPFS hash to retrieve
   * @returns {Promise<Object>} File content and metadata
   */
  async getFile(ipfsHash) {
    try {
      const response = await axios.get(`https://gateway.pinata.cloud/ipfs/${ipfsHash}`);

      return {
        success: true,
        content: response.data,
        contentType: response.headers['content-type'],
        size: response.headers['content-length']
      };

    } catch (error) {
      console.error('❌ Failed to get file from IPFS:', error.message);
      
      return {
        success: false,
        error: error.message,
        code: error.response?.status || 500
      };
    }
  }

  /**
   * List pinned files
   * 
   * @param {Object} options - Query options
   * @returns {Promise<Object>} List of pinned files
   */
  async listPins(options = {}) {
    try {
      const params = new URLSearchParams();
      
      if (options.status) params.append('status', options.status);
      if (options.pageLimit) params.append('pageLimit', options.pageLimit);
      if (options.pageOffset) params.append('pageOffset', options.pageOffset);
      if (options.metadata) {
        Object.entries(options.metadata).forEach(([key, value]) => {
          params.append(`metadata[keyvalues][${key}]`, value);
        });
      }

      const response = await axios.get(
        `${this.baseURL}/data/pinList?${params.toString()}`,
        { headers: this.headers }
      );

      return {
        success: true,
        pins: response.data.rows,
        count: response.data.count
      };

    } catch (error) {
      console.error('❌ Failed to list pins:', error.response?.data || error.message);
      
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Unpin a file from IPFS
   * 
   * @param {string} ipfsHash - IPFS hash to unpin
   * @returns {Promise<Object>} Operation result
   */
  async unpinFile(ipfsHash) {
    try {
      await axios.delete(
        `${this.baseURL}/pinning/unpin/${ipfsHash}`,
        { headers: this.headers }
      );

      console.log(`🗑️ File unpinned from IPFS: ${ipfsHash}`);

      return {
        success: true,
        message: 'File unpinned successfully',
        ipfsHash
      };

    } catch (error) {
      console.error('❌ Failed to unpin file:', error.response?.data || error.message);
      
      return {
        success: false,
        error: error.response?.data?.error || error.message
      };
    }
  }

  /**
   * Test Pinata connection and authentication
   * 
   * @returns {Promise<Object>} Connection test result
   */
  async testAuth() {
    try {
      const response = await axios.get(
        `${this.baseURL}/data/testAuthentication`,
        { headers: this.headers }
      );

      console.log('✅ Pinata authentication successful');

      return {
        success: true,
        message: response.data.message,
        authenticated: true
      };

    } catch (error) {
      console.error('❌ Pinata authentication failed:', error.response?.data || error.message);
      
      return {
        success: false,
        error: error.response?.data?.error || error.message,
        authenticated: false
      };
    }
  }

  /**
   * Pin proposal metadata to IPFS
   * 
   * @param {Object} proposalData - Proposal data
   * @returns {Promise<Object>} IPFS hash for proposal
   */
  async pinProposal(proposalData) {
    const metadata = {
      name: `ShadowID Proposal: ${proposalData.title}`,
      type: 'dao-proposal',
      keyvalues: {
        proposalId: proposalData.id || 'pending',
        category: proposalData.category || 'general',
        creator: proposalData.creator || 'unknown'
      }
    };

    return await this.pinJSON(proposalData, metadata);
  }

  /**
   * Pin treasury transaction to IPFS
   * 
   * @param {Object} transactionData - Transaction data
   * @returns {Promise<Object>} IPFS hash for transaction
   */
  async pinTreasuryTransaction(transactionData) {
    const metadata = {
      name: `ShadowID Treasury Transaction: ${transactionData.txHash}`,
      type: 'treasury-transaction',
      keyvalues: {
        txHash: transactionData.txHash,
        amount: transactionData.amount?.toString() || '0',
        type: transactionData.type || 'unknown'
      }
    };

    return await this.pinJSON(transactionData, metadata);
  }

  /**
   * Pin ZK proof data to IPFS
   * 
   * @param {Object} proofData - ZK proof data
   * @returns {Promise<Object>} IPFS hash for proof
   */
  async pinZKProof(proofData) {
    const metadata = {
      name: `ShadowID ZK Proof: ${proofData.proofHash}`,
      type: 'zk-proof',
      keyvalues: {
        proofHash: proofData.proofHash,
        circuit: proofData.circuit || 'unknown',
        verifier: proofData.verifier || 'unknown'
      }
    };

    return await this.pinJSON(proofData, metadata);
  }

  /**
   * Get gateway URL for IPFS hash
   * 
   * @param {string} ipfsHash - IPFS hash
   * @returns {string} Gateway URL
   */
  getGatewayUrl(ipfsHash) {
    return `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
  }

  /**
   * Get service status and stats
   * 
   * @returns {Promise<Object>} Service status
   */
  async getStatus() {
    try {
      const authTest = await this.testAuth();
      
      if (!authTest.success) {
        return {
          status: 'error',
          authenticated: false,
          error: authTest.error
        };
      }

      // Get pin count
      const pinList = await this.listPins({ pageLimit: 1 });
      
      return {
        status: 'operational',
        authenticated: true,
        totalPins: pinList.success ? pinList.count : 0,
        service: 'Pinata IPFS',
        apiKey: this.apiKey ? `${this.apiKey.slice(0, 8)}...` : 'Not configured'
      };

    } catch (error) {
      return {
        status: 'error',
        authenticated: false,
        error: error.message
      };
    }
  }
}

// Create singleton instance
const pinataService = new PinataIPFSService();

module.exports = {
  PinataIPFSService,
  pinataService,
  
  // Export convenience functions
  pinFile: (file, options) => pinataService.pinFile(file, options),
  pinJSON: (data, options) => pinataService.pinJSON(data, options),
  getFile: (hash) => pinataService.getFile(hash),
  unpinFile: (hash) => pinataService.unpinFile(hash),
  testAuth: () => pinataService.testAuth(),
  getStatus: () => pinataService.getStatus()
};