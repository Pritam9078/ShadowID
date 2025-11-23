import { apiRequest, API_BASE } from '../config/api.js';

/**
 * ZK (Zero-Knowledge) Proof API Service
 * Handles all ZK proof generation, verification, and commitment operations
 */
class ZKApiService {
  constructor() {
    this.baseURL = API_BASE;
    this.apiKey = import.meta.env.VITE_ZK_API_KEY || 'shadowid-client-key-2025'; // Default client key
  }

  /**
   * Get request headers including ZK API key
   */
  getHeaders() {
    return {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey
    };
  }

  /**
   * Make authenticated ZK API request
   */
  async zkRequest(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: this.getHeaders(),
      ...options
    };

    try {
      const response = await apiRequest(url, config);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`ZK API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // =============================================================================
  // COMMITMENT GENERATION
  // =============================================================================

  /**
   * Generate cryptographic commitment for business data
   * @param {string} type - Type of commitment ('registration', 'revenue', 'ubo', 'document', 'composite')
   * @param {Object} payload - Data to commit
   * @returns {Promise<Object>} { success, commitment, nonce, hash, timestamp }
   */
  async generateCommitment(type, payload) {
    return this.zkRequest('/zk/commitment', {
      method: 'POST',
      body: JSON.stringify({ type, payload })
    });
  }

  /**
   * Generate business registration commitment
   */
  async generateBusinessCommitment(businessData) {
    return this.generateCommitment('registration', businessData);
  }

  /**
   * Generate revenue proof commitment
   */
  async generateRevenueCommitment(revenueData) {
    return this.generateCommitment('revenue', revenueData);
  }

  /**
   * Generate UBO (Ultimate Beneficial Owner) commitment
   */
  async generateUBOCommitment(uboData) {
    return this.generateCommitment('ubo', uboData);
  }

  // =============================================================================
  // PROOF GENERATION
  // =============================================================================

  /**
   * Generate ZK proof for specified circuit
   * @param {string} circuit - Circuit name ('business_registration', 'ubo_proof', etc.)
   * @param {Object} privateInputs - Private circuit inputs
   * @param {Object} publicInputs - Public circuit inputs (optional)
   * @param {string} walletAddress - User's wallet address
   * @param {string} nonce - Unique nonce for replay protection
   * @returns {Promise<Object>} { success, proof, public_inputs, proof_hash, metadata }
   */
  async generateProof(circuit, privateInputs, publicInputs = null, walletAddress, nonce) {
    return this.zkRequest(`/zk/prove/${circuit}`, {
      method: 'POST',
      body: JSON.stringify({
        private_inputs: privateInputs,
        public_inputs: publicInputs,
        wallet_address: walletAddress,
        nonce: nonce
      })
    });
  }

  /**
   * Generate business registration proof
   */
  async generateBusinessRegistrationProof(businessData, walletAddress, nonce) {
    return this.generateProof('business_registration', businessData, null, walletAddress, nonce);
  }

  /**
   * Generate UBO verification proof
   */
  async generateUBOProof(uboData, walletAddress, nonce) {
    return this.generateProof('ubo_proof', uboData, null, walletAddress, nonce);
  }

  /**
   * Generate revenue threshold proof
   */
  async generateRevenueProof(revenueData, walletAddress, nonce) {
    return this.generateProof('revenue_threshold', revenueData, null, walletAddress, nonce);
  }

  // =============================================================================
  // PROOF SUBMISSION & VERIFICATION
  // =============================================================================

  /**
   * Submit proof to Stylus blockchain
   * @param {Object} proofJson - The generated proof data
   * @param {Array} publicInputs - Public inputs for verification
   * @param {string} wallet - User's wallet address
   * @param {Object} options - Submission options (gas limit, etc.)
   * @returns {Promise<Object>} { success, tx_hash, receipt, proof_hash, explorer_url }
   */
  async submitProofToBlockchain(proofJson, publicInputs, wallet, options = {}) {
    return this.zkRequest('/zk/submit-proof', {
      method: 'POST',
      body: JSON.stringify({
        proof_json: proofJson,
        public_inputs: publicInputs,
        wallet: wallet,
        options: options
      })
    });
  }

  /**
   * Verify proof locally (without blockchain submission)
   * @param {Object} proofJson - The proof to verify
   * @param {Array} publicInputs - Public inputs for verification
   * @param {string} circuit - Circuit name for verification
   * @returns {Promise<Object>} { success, valid, verification_time_ms }
   */
  async verifyProof(proofJson, publicInputs, circuit) {
    return this.zkRequest('/zk/verify', {
      method: 'POST',
      body: JSON.stringify({
        proof_json: proofJson,
        public_inputs: publicInputs,
        circuit: circuit
      })
    });
  }

  /**
   * Check proof status on blockchain
   * @param {string} proofHash - Hash of the proof to check
   * @returns {Promise<Object>} { success, status, verification_result, block_number }
   */
  async checkProofStatus(proofHash) {
    return this.zkRequest(`/zk/status/${proofHash}`);
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  /**
   * Get list of available circuits and their metadata
   * @returns {Promise<Object>} { success, circuits, total_circuits }
   */
  async getAvailableCircuits() {
    return this.zkRequest('/zk/circuits');
  }

  /**
   * Generate a cryptographically secure nonce for proof generation
   * @returns {string} Hex-encoded nonce
   */
  generateNonce() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return '0x' + Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Health check for ZK service
   * @returns {Promise<boolean>} True if ZK service is available
   */
  async healthCheck() {
    try {
      const response = await this.getAvailableCircuits();
      return response.success && response.circuits && response.circuits.length > 0;
    } catch (error) {
      console.warn('ZK service health check failed:', error.message);
      return false;
    }
  }

  // =============================================================================
  // COMPLETE WORKFLOW METHODS
  // =============================================================================

  /**
   * Complete business verification workflow
   * @param {Object} businessData - Complete business information
   * @param {string} walletAddress - User's wallet address
   * @param {Object} options - Workflow options
   * @returns {Promise<Object>} Complete verification result
   */
  async completeBusinessVerification(businessData, walletAddress, options = {}) {
    try {
      console.log('Starting business verification workflow...');

      // Step 1: Generate commitment
      const commitment = await this.generateBusinessCommitment(businessData);
      console.log('✅ Business commitment generated:', commitment.commitment);

      // Step 2: Generate nonce
      const nonce = this.generateNonce();

      // Step 3: Generate proof
      const proof = await this.generateBusinessRegistrationProof(
        businessData, 
        walletAddress, 
        nonce
      );
      console.log('✅ Business proof generated');

      // Step 4: Verify proof locally (optional)
      if (options.verifyLocally) {
        const verification = await this.verifyProof(
          proof.proof, 
          proof.public_inputs, 
          'business_registration'
        );
        console.log('✅ Local proof verification:', verification.valid);
        
        if (!verification.valid) {
          throw new Error('Proof verification failed locally');
        }
      }

      // Step 5: Submit to blockchain (optional)
      let blockchainResult = null;
      if (options.submitToBlockchain) {
        blockchainResult = await this.submitProofToBlockchain(
          proof.proof,
          proof.public_inputs,
          walletAddress,
          options.gasOptions || {}
        );
        console.log('✅ Proof submitted to blockchain:', blockchainResult.tx_hash);
      }

      return {
        success: true,
        commitment: commitment.commitment,
        proof: proof.proof,
        proofHash: proof.proof_hash,
        publicInputs: proof.public_inputs,
        nonce: nonce,
        blockchain: blockchainResult,
        workflow: 'business_verification',
        timestamp: Date.now()
      };

    } catch (error) {
      console.error('Business verification workflow failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const zkAPI = new ZKApiService();
export default zkAPI;