// Stylus Chain Service for ZK proof submission and verification
// Handles interaction with Arbitrum Stylus contracts for DVote DAO

const { ethers } = require('ethers');
const crypto = require('crypto');

// Contract configuration
const CONFIG = {
    // Arbitrum Sepolia (for testing)
    rpcUrl: process.env.ARBITRUM_RPC_URL || 'https://sepolia-rollup.arbitrum.io/rpc',
    chainId: 421614, // Arbitrum Sepolia
    
    // Contract addresses (will be set after deployment)
    contracts: {
        dvoteDAO: process.env.DVOTE_DAO_ADDRESS || '0x0000000000000000000000000000000000000000',
        zkVerifier: process.env.ZK_VERIFIER_ADDRESS || '0x0000000000000000000000000000000000000000'
    },
    
    // Private key for contract interaction (use with caution in production)
    privateKey: process.env.STYLUS_PRIVATE_KEY,
    
    // Gas settings
    gasLimit: {
        submitProof: 500000,
        joinDAO: 300000,
        verify: 100000
    },
    
    // Block explorer
    explorerUrl: 'https://sepolia.arbiscan.io'
};

// Contract ABIs (simplified for proof submission)
const DVOTE_DAO_ABI = [
    {
        "inputs": [
            {"name": "proof_bytes", "type": "bytes"},
            {"name": "public_inputs", "type": "bytes"},
            {"name": "business_commitment", "type": "uint256"}
        ],
        "name": "join_dao_with_proof",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"name": "member", "type": "address"}],
        "name": "is_verified_member",
        "outputs": [{"name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"name": "proof_hash", "type": "bytes32"}],
        "name": "proof_registry",
        "outputs": [{"name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function"
    }
];

const ZK_VERIFIER_ABI = [
    {
        "inputs": [
            {"name": "proof_bytes", "type": "bytes"},
            {"name": "public_inputs", "type": "bytes"}
        ],
        "name": "verify_noir_proof_raw",
        "outputs": [{"name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function"
    }
];

/**
 * Stylus service class for blockchain operations
 */
class StylusService {
    constructor() {
        this.provider = null;
        this.signer = null;
        this.daoContract = null;
        this.verifierContract = null;
        this.initialized = false;
    }

    /**
     * Initialize the service with provider and contracts
     */
    async initialize() {
        try {
            // Create provider
            this.provider = new ethers.JsonRpcProvider(CONFIG.rpcUrl);
            
            // Test connection
            const network = await this.provider.getNetwork();
            console.log(`Connected to Arbitrum network: ${network.name} (Chain ID: ${network.chainId})`);

            // Initialize signer if private key available
            if (CONFIG.privateKey) {
                this.signer = new ethers.Wallet(CONFIG.privateKey, this.provider);
                console.log(`Signer initialized: ${this.signer.address}`);
            } else {
                console.warn('No private key provided - read-only mode');
            }

            // Initialize contracts if addresses are available
            if (CONFIG.contracts.dvoteDAO && CONFIG.contracts.dvoteDAO !== '0x0000000000000000000000000000000000000000') {
                this.daoContract = new ethers.Contract(
                    CONFIG.contracts.dvoteDAO, 
                    DVOTE_DAO_ABI, 
                    this.signer || this.provider
                );
                console.log(`DAO contract initialized: ${CONFIG.contracts.dvoteDAO}`);
            }

            if (CONFIG.contracts.zkVerifier && CONFIG.contracts.zkVerifier !== '0x0000000000000000000000000000000000000000') {
                this.verifierContract = new ethers.Contract(
                    CONFIG.contracts.zkVerifier,
                    ZK_VERIFIER_ABI,
                    this.signer || this.provider
                );
                console.log(`Verifier contract initialized: ${CONFIG.contracts.zkVerifier}`);
            }

            this.initialized = true;
            return true;

        } catch (error) {
            console.error('Failed to initialize Stylus service:', error);
            return false;
        }
    }

    /**
     * Submit ZK proof to DAO contract
     * 
     * @param {Object} submissionData - Proof submission data
     * @returns {Promise<Object>} Transaction result
     */
    async submitProofToStylus(submissionData) {
        if (!this.initialized) {
            await this.initialize();
        }

        if (!this.signer) {
            throw new Error('No signer available - cannot submit transactions');
        }

        if (!this.daoContract) {
            throw new Error('DAO contract not initialized');
        }

        try {
            const {
                proof_json,
                public_inputs,
                proof_hash,
                wallet_address,
                gas_limit = CONFIG.gasLimit.submitProof,
                gas_price = 'auto'
            } = submissionData;

            console.log(`Submitting proof to DAO contract for wallet: ${wallet_address}`);

            // Convert proof JSON to bytes
            const proofBytes = this.formatProofBytes(proof_json);
            
            // Convert public inputs to bytes
            const publicInputsBytes = this.formatPublicInputsBytes(public_inputs);
            
            // Convert proof hash to uint256
            const businessCommitment = ethers.getBigInt(proof_hash);

            // Estimate gas
            let estimatedGas;
            try {
                estimatedGas = await this.daoContract.join_dao_with_proof.estimateGas(
                    proofBytes,
                    publicInputsBytes,
                    businessCommitment
                );
                console.log(`Estimated gas: ${estimatedGas.toString()}`);
            } catch (gasError) {
                console.warn('Gas estimation failed, using default:', gasError.message);
                estimatedGas = BigInt(gas_limit);
            }

            // Prepare transaction options
            const txOptions = {
                gasLimit: estimatedGas + (estimatedGas / BigInt(10)), // Add 10% buffer
            };

            if (gas_price !== 'auto') {
                txOptions.gasPrice = ethers.parseUnits(gas_price, 'gwei');
            }

            // Submit transaction
            const tx = await this.daoContract.join_dao_with_proof(
                proofBytes,
                publicInputsBytes,
                businessCommitment,
                txOptions
            );

            console.log(`Transaction submitted: ${tx.hash}`);

            // Wait for confirmation
            const receipt = await tx.wait(1); // Wait for 1 confirmation
            
            console.log(`Transaction confirmed in block: ${receipt.blockNumber}`);

            return {
                success: true,
                tx_hash: tx.hash,
                receipt: {
                    blockNumber: receipt.blockNumber,
                    gasUsed: receipt.gasUsed.toString(),
                    effectiveGasPrice: receipt.effectiveGasPrice?.toString(),
                    status: receipt.status
                },
                explorer_url: `${CONFIG.explorerUrl}/tx/${tx.hash}`,
                gas_used: receipt.gasUsed.toString()
            };

        } catch (error) {
            console.error('Proof submission failed:', error);
            
            // Parse error message for user-friendly response
            let userMessage = error.message;
            if (error.code === 'CALL_EXCEPTION') {
                userMessage = 'Smart contract call failed - possibly invalid proof or already verified';
            } else if (error.code === 'INSUFFICIENT_FUNDS') {
                userMessage = 'Insufficient funds for gas fees';
            } else if (error.code === 'NONCE_EXPIRED') {
                userMessage = 'Transaction nonce expired - please retry';
            }

            return {
                success: false,
                error: userMessage,
                details: error.message,
                code: error.code
            };
        }
    }

    /**
     * Verify proof on-chain without submitting
     * 
     * @param {Object} proofData - Proof data to verify
     * @returns {Promise<Object>} Verification result
     */
    async verifyProofOnChain(proofData) {
        if (!this.initialized) {
            await this.initialize();
        }

        if (!this.verifierContract) {
            throw new Error('Verifier contract not initialized');
        }

        try {
            const { proof_json, public_inputs } = proofData;

            // Format data for contract call
            const proofBytes = this.formatProofBytes(proof_json);
            const publicInputsBytes = this.formatPublicInputsBytes(public_inputs);

            console.log('Verifying proof on-chain...');
            const startTime = Date.now();

            // Call verification function
            const isValid = await this.verifierContract.verify_noir_proof_raw(
                proofBytes,
                publicInputsBytes
            );

            const verificationTime = Date.now() - startTime;
            console.log(`On-chain verification completed in ${verificationTime}ms: ${isValid}`);

            return {
                success: true,
                valid: isValid,
                verification_time_ms: verificationTime
            };

        } catch (error) {
            console.error('On-chain verification failed:', error);
            return {
                success: false,
                error: error.message,
                valid: false
            };
        }
    }

    /**
     * Check if wallet is verified DAO member
     * 
     * @param {string} walletAddress - Wallet address to check
     * @returns {Promise<Object>} Membership status
     */
    async checkMembershipStatus(walletAddress) {
        if (!this.initialized) {
            await this.initialize();
        }

        if (!this.daoContract) {
            throw new Error('DAO contract not initialized');
        }

        try {
            console.log(`Checking membership status for: ${walletAddress}`);
            
            const isVerified = await this.daoContract.is_verified_member(walletAddress);
            
            return {
                success: true,
                wallet_address: walletAddress,
                is_verified_member: isVerified,
                timestamp: Date.now()
            };

        } catch (error) {
            console.error('Membership check failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Check if proof hash has been used
     * 
     * @param {string} proofHash - Proof hash to check
     * @returns {Promise<Object>} Usage status
     */
    async checkProofUsage(proofHash) {
        if (!this.initialized) {
            await this.initialize();
        }

        if (!this.daoContract) {
            throw new Error('DAO contract not initialized');
        }

        try {
            const isUsed = await this.daoContract.proof_registry(proofHash);
            
            return {
                success: true,
                proof_hash: proofHash,
                is_used: isUsed,
                timestamp: Date.now()
            };

        } catch (error) {
            console.error('Proof usage check failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get current gas prices
     */
    async getGasPrices() {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            const feeData = await this.provider.getFeeData();
            
            return {
                success: true,
                gasPrice: feeData.gasPrice?.toString(),
                maxFeePerGas: feeData.maxFeePerGas?.toString(),
                maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.toString(),
                timestamp: Date.now()
            };

        } catch (error) {
            console.error('Failed to get gas prices:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Format proof JSON to bytes for contract call
     */
    formatProofBytes(proofJson) {
        if (typeof proofJson === 'string') {
            // Assume hex string
            return proofJson.startsWith('0x') ? proofJson : '0x' + proofJson;
        } else if (typeof proofJson === 'object' && proofJson.proof) {
            // Extract proof from JSON object
            const proof = proofJson.proof;
            return proof.startsWith('0x') ? proof : '0x' + proof;
        }
        
        throw new Error('Invalid proof format');
    }

    /**
     * Format public inputs to bytes for contract call
     */
    formatPublicInputsBytes(publicInputs) {
        if (!Array.isArray(publicInputs)) {
            throw new Error('Public inputs must be an array');
        }

        // Convert each input to 32-byte hex string and concatenate
        const hexInputs = publicInputs.map(input => {
            if (typeof input === 'string') {
                // Remove 0x prefix if present and pad to 64 characters (32 bytes)
                const hex = input.replace('0x', '').padStart(64, '0');
                return hex;
            } else if (typeof input === 'number' || typeof input === 'bigint') {
                // Convert number to hex and pad
                return BigInt(input).toString(16).padStart(64, '0');
            }
            throw new Error(`Invalid public input type: ${typeof input}`);
        });

        return '0x' + hexInputs.join('');
    }

    /**
     * Get service status and configuration
     */
    getStatus() {
        return {
            initialized: this.initialized,
            network: CONFIG.rpcUrl,
            chainId: CONFIG.chainId,
            signerAvailable: !!this.signer,
            signerAddress: this.signer?.address,
            contracts: {
                daoAddress: CONFIG.contracts.dvoteDAO,
                verifierAddress: CONFIG.contracts.zkVerifier,
                daoInitialized: !!this.daoContract,
                verifierInitialized: !!this.verifierContract
            },
            explorerUrl: CONFIG.explorerUrl
        };
    }
}

// Create singleton instance
const stylusService = new StylusService();

/**
 * Main function for proof submission (used by routes)
 */
async function submitProofToStylus(submissionData) {
    return await stylusService.submitProofToStylus(submissionData);
}

/**
 * Check status function for routes
 */
submitProofToStylus.checkStatus = async function(proofHash) {
    try {
        const [usageResult, membershipResult] = await Promise.all([
            stylusService.checkProofUsage(proofHash),
            stylusService.checkMembershipStatus(submissionData?.wallet_address)
        ]);

        return {
            status: usageResult.is_used ? 'used' : 'available',
            verified: membershipResult?.is_verified_member || false,
            timestamp: Date.now()
        };
    } catch (error) {
        throw new Error(`Status check failed: ${error.message}`);
    }
};

module.exports = {
    submitProofToStylus,
    stylusService,
    CONFIG
};