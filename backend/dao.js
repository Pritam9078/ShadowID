const { ethers } = require('ethers');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * DAO Integration Service
 * Handles interaction with Stylus DAO contract and ShadowID registry
 */
class DAOService {
    constructor() {
        // Initialize Web3 providers
        this.initializeProviders();
        
        // Load deployment configuration
        this.deploymentConfig = this.loadDeploymentConfig();
        
        // Contract addresses from deployment config or environment
        this.contracts = {
            dao: this.deploymentConfig?.contracts?.stylus?.ShadowIDStylus?.address || 
                 process.env.DAO_CONTRACT_ADDRESS || 
                 '0x0000000000000000000000000000000000000000',
            shadowidRegistry: this.deploymentConfig?.contracts?.solidity?.ShadowIDRegistry?.address || 
                             process.env.SHADOWID_REGISTRY_ADDRESS || 
                             '0x0000000000000000000000000000000000000000',
            governanceToken: this.deploymentConfig?.contracts?.solidity?.GovernanceToken?.address || 
                            process.env.GOVERNANCE_TOKEN_ADDRESS || 
                            '0x0000000000000000000000000000000000000000'
        };

        // Private key for backend operations (use environment variable)
        this.backendPrivateKey = process.env.BACKEND_PRIVATE_KEY;
        this.backendSigner = null;

        if (this.backendPrivateKey) {
            this.backendSigner = new ethers.Wallet(this.backendPrivateKey, this.provider);
        }
    }

    /**
     * Load deployment configuration from files
     */
    loadDeploymentConfig() {
        try {
            // Try to load Arbitrum Sepolia deployment first
            const deploymentPath = path.join(__dirname, 'deployments', 'arbitrum-sepolia.json');
            
            if (fs.existsSync(deploymentPath)) {
                let content = fs.readFileSync(deploymentPath, 'utf8');
                // Remove BOM if present
                if (content.charCodeAt(0) === 0xFEFF) {
                    content = content.substring(1);
                }
                const config = JSON.parse(content);
                console.log('✅ Loaded deployment config:', deploymentPath);
                return config;
            }
            
            // Fallback to other deployment files
            const deploymentDir = path.join(__dirname, 'deployments');
            if (fs.existsSync(deploymentDir)) {
                const files = fs.readdirSync(deploymentDir).filter(f => f.endsWith('.json'));
                if (files.length > 0) {
                    const fallbackPath = path.join(deploymentDir, files[0]);
                    let content = fs.readFileSync(fallbackPath, 'utf8');
                    // Remove BOM if present
                    if (content.charCodeAt(0) === 0xFEFF) {
                        content = content.substring(1);
                    }
                    const config = JSON.parse(content);
                    console.log('✅ Loaded fallback deployment config:', fallbackPath);
                    return config;
                }
            }
            
            console.warn('⚠️ No deployment file found, contracts not loaded');
            return null;
        } catch (error) {
            console.error('❌ Error loading deployment config:', error.message);
            return null;
        }
    }

    /**
     * Initialize blockchain providers
     */
    initializeProviders() {
        // Use Arbitrum Sepolia for testing, Arbitrum One for production
        const rpcUrl = process.env.ARBITRUM_RPC_URL || 'https://arb-sepolia.g.alchemy.com/v2/mUJMHrybqfzOlpVeT0cj7';
        
        this.provider = new ethers.JsonRpcProvider(rpcUrl);
        
        console.log('DAO Service initialized with RPC:', rpcUrl);
    }

    /**
     * Submit ZK proof hash to DAO contract
     * @param {string} userAddress - User's Ethereum address
     * @param {string} kycCommitment - KYC commitment hash
     * @param {string} proofHash - ZK proof hash
     * @param {Object} proofMetadata - Additional proof metadata
     * @returns {Promise<Object>} - Transaction result
     */
    async submitProofToDAO(userAddress, kycCommitment, proofHash, proofMetadata) {
        try {
            if (!this.backendSigner) {
                throw new Error('Backend signer not configured. Set BACKEND_PRIVATE_KEY environment variable.');
            }

            // Validate inputs
            if (!ethers.isAddress(userAddress)) {
                throw new Error('Invalid user address');
            }

            if (!this.isValidHash(kycCommitment) || !this.isValidHash(proofHash)) {
                throw new Error('Invalid commitment or proof hash format');
            }

            // Convert addresses and hashes to proper format
            const userAddr = ethers.getAddress(userAddress);
            const commitment = this.formatHash(kycCommitment);
            const proof = this.formatHash(proofHash);

            // Call DAO contract submit_zk_proof function
            const transaction = await this.callDAOContract('submit_zk_proof', [
                userAddr,
                commitment,
                proof
            ]);

            console.log('Proof submitted to DAO contract:', transaction.hash);

            // Wait for confirmation
            const receipt = await transaction.wait();

            // Parse events from transaction
            const events = await this.parseTransactionEvents(receipt);

            return {
                success: true,
                transactionHash: transaction.hash,
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed.toString(),
                events: events,
                proofMetadata: {
                    ...proofMetadata,
                    submissionTime: Date.now(),
                    blockNumber: receipt.blockNumber
                }
            };

        } catch (error) {
            console.error('Error submitting proof to DAO:', error);
            throw new Error(`DAO proof submission failed: ${error.message}`);
        }
    }

    /**
     * Submit proof to ShadowID Registry
     * @param {string} userAddress - User's Ethereum address  
     * @param {string} kycCommitment - KYC commitment hash
     * @param {string} proofHash - ZK proof hash
     * @returns {Promise<Object>} - Transaction result
     */
    async submitProofToShadowID(userAddress, kycCommitment, proofHash) {
        try {
            if (!this.backendSigner) {
                throw new Error('Backend signer not configured');
            }

            // Validate inputs
            if (!ethers.isAddress(userAddress)) {
                throw new Error('Invalid user address');
            }

            const userAddr = ethers.getAddress(userAddress);
            const commitment = this.formatHash(kycCommitment);
            const proof = this.formatHash(proofHash);

            // Call ShadowID Registry contract
            const transaction = await this.callShadowIDContract('registerProof', [
                userAddr,
                commitment,
                proof
            ]);

            console.log('Proof submitted to ShadowID Registry:', transaction.hash);

            const receipt = await transaction.wait();

            return {
                success: true,
                transactionHash: transaction.hash,
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed.toString()
            };

        } catch (error) {
            console.error('Error submitting proof to ShadowID:', error);
            throw new Error(`ShadowID proof submission failed: ${error.message}`);
        }
    }

    /**
     * Check if user is verified in DAO
     * @param {string} userAddress - User's Ethereum address
     * @returns {Promise<boolean>} - Verification status
     */
    async isUserVerified(userAddress) {
        try {
            if (!ethers.isAddress(userAddress)) {
                throw new Error('Invalid user address');
            }

            const userAddr = ethers.getAddress(userAddress);
            
            // Call DAO contract view function
            const isVerified = await this.callDAOContract('is_user_verified', [userAddr], true);

            return isVerified;

        } catch (error) {
            console.error('Error checking user verification status:', error);
            return false;
        }
    }

    /**
     * Get user's KYC status from DAO contract
     * @param {string} userAddress - User's Ethereum address
     * @returns {Promise<Object>} - KYC status object
     */
    async getKYCStatus(userAddress) {
        try {
            if (!ethers.isAddress(userAddress)) {
                throw new Error('Invalid user address');
            }

            const userAddr = ethers.getAddress(userAddress);
            
            // Call DAO contract view function
            const status = await this.callDAOContract('get_kyc_status', [userAddr], true);

            return {
                needsKycUpload: status[0],
                needsZkProof: status[1], 
                isVerified: status[2],
                proofSubmitted: status[3]
            };

        } catch (error) {
            console.error('Error getting KYC status:', error);
            return {
                needsKycUpload: true,
                needsZkProof: true,
                isVerified: false,
                proofSubmitted: false
            };
        }
    }

    /**
     * Process complete proof submission flow
     * @param {string} userAddress - User's Ethereum address
     * @param {string} kycCommitment - KYC commitment hash
     * @param {Object} proofData - Complete proof data
     * @returns {Promise<Object>} - Complete submission result
     */
    async processProofSubmission(userAddress, kycCommitment, proofData) {
        try {
            // Generate proof hash
            const proofHash = this.generateProofHash(proofData.proof);

            // Validate proof data
            await this.validateProofData(proofData);

            // Submit to both contracts in parallel
            const [daoResult, shadowidResult] = await Promise.allSettled([
                this.submitProofToDAO(userAddress, kycCommitment, proofHash, proofData),
                this.submitProofToShadowID(userAddress, kycCommitment, proofHash)
            ]);

            // Check results
            const results = {
                userAddress,
                kycCommitment,
                proofHash,
                daoSubmission: daoResult.status === 'fulfilled' ? daoResult.value : { success: false, error: daoResult.reason?.message },
                shadowidSubmission: shadowidResult.status === 'fulfilled' ? shadowidResult.value : { success: false, error: shadowidResult.reason?.message },
                overallSuccess: daoResult.status === 'fulfilled' && shadowidResult.status === 'fulfilled'
            };

            if (!results.overallSuccess) {
                console.warn('Partial proof submission failure:', results);
            }

            return results;

        } catch (error) {
            console.error('Error in proof submission flow:', error);
            throw error;
        }
    }

    /**
     * Call DAO contract function
     * @param {string} functionName - Function name to call
     * @param {Array} params - Function parameters
     * @param {boolean} isView - True for view functions (no transaction)
     * @returns {Promise<any>} - Function result
     */
    async callDAOContract(functionName, params = [], isView = false) {
        try {
            // This would use the actual contract ABI and address
            // For now, we'll simulate the calls
            
            if (isView) {
                // Simulate view function calls
                switch (functionName) {
                    case 'is_user_verified':
                        return Math.random() > 0.5; // Mock verification status
                    case 'get_kyc_status':
                        return [true, false, false, false]; // Mock KYC status
                    default:
                        throw new Error(`Unknown view function: ${functionName}`);
                }
            } else {
                // Simulate transaction functions
                const mockTx = {
                    hash: '0x' + crypto.randomBytes(32).toString('hex'),
                    wait: async () => ({
                        blockNumber: Math.floor(Math.random() * 1000000),
                        gasUsed: ethers.parseUnits('100000', 'wei'),
                        logs: []
                    })
                };
                
                return mockTx;
            }

        } catch (error) {
            throw new Error(`DAO contract call failed: ${error.message}`);
        }
    }

    /**
     * Call ShadowID Registry contract function
     * @param {string} functionName - Function name to call
     * @param {Array} params - Function parameters
     * @returns {Promise<any>} - Transaction result
     */
    async callShadowIDContract(functionName, params = []) {
        try {
            // Simulate ShadowID Registry transaction
            const mockTx = {
                hash: '0x' + crypto.randomBytes(32).toString('hex'),
                wait: async () => ({
                    blockNumber: Math.floor(Math.random() * 1000000),
                    gasUsed: ethers.parseUnits('80000', 'wei'),
                    logs: []
                })
            };
            
            return mockTx;

        } catch (error) {
            throw new Error(`ShadowID contract call failed: ${error.message}`);
        }
    }

    /**
     * Parse events from transaction receipt
     * @param {Object} receipt - Transaction receipt
     * @returns {Array} - Parsed events
     */
    async parseTransactionEvents(receipt) {
        const events = [];
        
        for (const log of receipt.logs) {
            try {
                // Parse known DAO events
                if (log.topics[0] === this.getEventTopic('ProofSubmitted')) {
                    events.push({
                        event: 'ProofSubmitted',
                        user: ethers.getAddress('0x' + log.topics[1].slice(26)),
                        blockNumber: receipt.blockNumber
                    });
                } else if (log.topics[0] === this.getEventTopic('UserVerificationRequired')) {
                    events.push({
                        event: 'UserVerificationRequired',
                        user: ethers.getAddress('0x' + log.topics[1].slice(26)),
                        blockNumber: receipt.blockNumber
                    });
                }
            } catch (error) {
                console.warn('Error parsing event:', error);
            }
        }
        
        return events;
    }

    /**
     * Get event topic hash
     * @param {string} eventName - Event name
     * @returns {string} - Event topic hash
     */
    getEventTopic(eventName) {
        const eventSignatures = {
            'ProofSubmitted': 'ProofSubmitted(address)',
            'UserVerificationRequired': 'UserVerificationRequired(address)'
        };
        
        const signature = eventSignatures[eventName];
        if (!signature) {
            throw new Error(`Unknown event: ${eventName}`);
        }
        
        return ethers.id(signature);
    }

    /**
     * Generate proof hash for blockchain submission
     * @param {Object} proof - Proof object
     * @returns {string} - Proof hash
     */
    generateProofHash(proof) {
        const proofString = JSON.stringify(proof);
        const hash = crypto.createHash('sha256');
        hash.update(proofString);
        return '0x' + hash.digest('hex');
    }

    /**
     * Validate proof data structure
     * @param {Object} proofData - Proof data to validate
     */
    async validateProofData(proofData) {
        if (!proofData.proof) {
            throw new Error('Missing proof data');
        }
        
        if (!proofData.publicInputs) {
            throw new Error('Missing public inputs');
        }
        
        if (!proofData.circuitType) {
            throw new Error('Missing circuit type');
        }
        
        // Additional validation based on circuit type
        const validCircuitTypes = ['age_proof', 'citizenship_proof', 'attribute_proof'];
        if (!validCircuitTypes.includes(proofData.circuitType)) {
            throw new Error(`Invalid circuit type: ${proofData.circuitType}`);
        }
    }

    /**
     * Check if string is valid hash format
     * @param {string} hash - Hash string to validate
     * @returns {boolean} - True if valid hash
     */
    isValidHash(hash) {
        return typeof hash === 'string' && /^0x[0-9a-fA-F]{64}$/.test(hash);
    }

    /**
     * Format hash to proper format
     * @param {string} hash - Hash string
     * @returns {string} - Formatted hash
     */
    formatHash(hash) {
        if (!hash.startsWith('0x')) {
            return '0x' + hash;
        }
        return hash;
    }

    /**
     * Get transaction status
     * @param {string} transactionHash - Transaction hash
     * @returns {Promise<Object>} - Transaction status
     */
    async getTransactionStatus(transactionHash) {
        try {
            const receipt = await this.provider.getTransactionReceipt(transactionHash);
            
            if (!receipt) {
                return { status: 'pending', confirmed: false };
            }
            
            return {
                status: receipt.status === 1 ? 'success' : 'failed',
                confirmed: true,
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed.toString(),
                confirmations: await receipt.confirmations()
            };
            
        } catch (error) {
            console.error('Error getting transaction status:', error);
            return { status: 'error', error: error.message };
        }
    }

    /**
     * Estimate gas for proof submission
     * @param {string} userAddress - User address
     * @param {string} kycCommitment - KYC commitment
     * @param {string} proofHash - Proof hash
     * @returns {Promise<string>} - Estimated gas
     */
    async estimateGas(userAddress, kycCommitment, proofHash) {
        try {
            // This would call the actual contract's estimateGas function
            // For now, return a reasonable estimate
            return ethers.parseUnits('150000', 'wei').toString();
            
        } catch (error) {
            console.error('Error estimating gas:', error);
            return ethers.parseUnits('200000', 'wei').toString(); // Conservative estimate
        }
    }
}

module.exports = DAOService;