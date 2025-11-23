// ZK Operations Routes for DVote Backend
// Handles commitments, proof generation, and submission to Stylus chain

const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');
const router = express.Router();

// Import utilities
const { 
    computeCommitment, 
    validateInputs, 
    formatProofData,
    hashProof 
} = require('./utils/zkUtils');
const { authenticateAPIKey } = require('./middleware/auth');
const { submitProofToStylus } = require('./services/stylusService');

// Apply authentication middleware to all ZK routes
router.use(authenticateAPIKey);

/**
 * POST /zk/commitment
 * Compute cryptographic commitments for business data
 * 
 * @body {Object} payload - The data to commit
 * @body {string} type - Type of commitment ('registration', 'revenue', 'ubo')
 * 
 * @returns {Object} { commitment, nonce, hash }
 */
router.post('/commitment', async (req, res) => {
    try {
        const { type, payload } = req.body;
        
        // Validate input
        if (!type || !payload) {
            return res.status(400).json({
                error: 'Missing required fields: type, payload',
                code: 'INVALID_INPUT'
            });
        }

        // Validate commitment type
        const validTypes = ['registration', 'revenue', 'ubo', 'document', 'composite'];
        if (!validTypes.includes(type)) {
            return res.status(400).json({
                error: `Invalid commitment type. Must be one of: ${validTypes.join(', ')}`,
                code: 'INVALID_TYPE'
            });
        }

        console.log(`Computing ${type} commitment for payload:`, JSON.stringify(payload, null, 2));

        // Compute commitment using Poseidon hash
        const result = await computeCommitment(type, payload);
        
        console.log(`Generated commitment: ${result.commitment}`);

        res.json({
            success: true,
            type,
            commitment: result.commitment,
            nonce: result.nonce,
            hash: result.hash,
            timestamp: Date.now()
        });

    } catch (error) {
        console.error('Commitment generation error:', error);
        res.status(500).json({
            error: 'Failed to compute commitment',
            message: error.message,
            code: 'COMMITMENT_ERROR'
        });
    }
});

/**
 * POST /zk/prove/:circuit
 * Generate ZK proof for specified circuit
 * 
 * @param {string} circuit - Circuit name (business_registration, ubo_proof, etc.)
 * @body {Object} private_inputs - Private circuit inputs
 * @body {Object} public_inputs - Public circuit inputs (optional)
 * @body {string} wallet_address - User's wallet address
 * @body {string} nonce - Unique nonce for replay protection
 * 
 * @returns {Object} { proof, public_inputs, proof_hash, metadata }
 */
router.post('/prove/:circuit', async (req, res) => {
    const { circuit } = req.params;
    const { private_inputs, public_inputs, wallet_address, nonce } = req.body;

    try {
        // Validate circuit name
        const validCircuits = [
            'business_registration',
            'ubo_proof',
            'revenue_threshold', 
            'document_hash_proof',
            'composite_business_proof'
        ];

        if (!validCircuits.includes(circuit)) {
            return res.status(400).json({
                error: `Invalid circuit. Must be one of: ${validCircuits.join(', ')}`,
                code: 'INVALID_CIRCUIT'
            });
        }

        // Validate required inputs
        if (!private_inputs || !wallet_address || !nonce) {
            return res.status(400).json({
                error: 'Missing required fields: private_inputs, wallet_address, nonce',
                code: 'INVALID_INPUT'
            });
        }

        console.log(`Generating proof for circuit: ${circuit}`);
        console.log(`Wallet: ${wallet_address}, Nonce: ${nonce}`);

        // Validate circuit inputs
        const validationResult = validateInputs(circuit, private_inputs, public_inputs);
        if (!validationResult.valid) {
            return res.status(400).json({
                error: 'Input validation failed',
                details: validationResult.errors,
                code: 'VALIDATION_ERROR'
            });
        }

        // Prepare input data for circuit
        const inputData = {
            ...private_inputs,
            wallet_address,
            nonce,
            ...(public_inputs || {})
        };

        // Generate unique filename for this proof generation
        const proofId = crypto.randomUUID();
        const tempDir = path.resolve(__dirname, '../../zk/proofs/temp');
        const inputFile = path.join(tempDir, `${proofId}_input.json`);
        const circuitDir = path.resolve(__dirname, `../../zk/noir-circuits/${circuit}`);

        // Ensure temp directory exists
        await fs.mkdir(tempDir, { recursive: true });

        // Write input file
        await fs.writeFile(inputFile, JSON.stringify(inputData, null, 2));
        console.log(`Written input file: ${inputFile}`);

        // Copy input to circuit directory for nargo
        const circuitInputFile = path.join(circuitDir, 'Prover.toml');
        await fs.copyFile(inputFile, circuitInputFile);

        // Generate proof using nargo
        console.log(`Running nargo prove for ${circuit}...`);
        
        const proveCommand = `nargo prove --manifest-path "${path.join(circuitDir, 'Nargo.toml')}"`;
        const startTime = Date.now();
        
        try {
            const output = execSync(proveCommand, {
                cwd: circuitDir,
                encoding: 'utf8',
                timeout: 60000, // 1 minute timeout
                stdio: 'pipe'
            });
            
            const proveTime = Date.now() - startTime;
            console.log(`Proof generated successfully in ${proveTime}ms`);
            console.log('Nargo output:', output);

        } catch (execError) {
            console.error('Nargo prove failed:', execError.message);
            throw new Error(`Proof generation failed: ${execError.message}`);
        }

        // Read generated proof and public inputs
        const proofFile = path.join(circuitDir, 'proofs', `${circuit}.proof`);
        const publicFile = path.join(circuitDir, 'target', 'public_inputs.json');

        let proofData, publicData;

        try {
            // Read proof file (binary)
            const proofBuffer = await fs.readFile(proofFile);
            proofData = proofBuffer.toString('hex');

            // Read public inputs if they exist
            try {
                const publicBuffer = await fs.readFile(publicFile);
                publicData = JSON.parse(publicBuffer.toString());
            } catch (publicError) {
                console.log('No public inputs file found, using provided public_inputs');
                publicData = public_inputs || [];
            }

        } catch (readError) {
            console.error('Failed to read proof files:', readError);
            throw new Error('Failed to read generated proof files');
        }

        // Format proof data for frontend
        const formattedProof = formatProofData(proofData, publicData, circuit);
        
        // Compute proof hash for verification
        const proofHash = hashProof(formattedProof);

        // Store proof metadata
        const metadata = {
            circuit,
            wallet_address,
            nonce,
            timestamp: Date.now(),
            proof_id: proofId,
            generation_time_ms: Date.now() - startTime,
            proof_size_bytes: proofData.length / 2, // hex string to bytes
            input_file: inputFile
        };

        // Save proof and metadata
        const proofOutputFile = path.join(tempDir, `${proofId}_proof.json`);
        const metadataFile = path.join(tempDir, `${proofId}_metadata.json`);
        
        await fs.writeFile(proofOutputFile, JSON.stringify(formattedProof, null, 2));
        await fs.writeFile(metadataFile, JSON.stringify(metadata, null, 2));

        console.log(`Proof saved: ${proofOutputFile}`);
        console.log(`Proof hash: ${proofHash}`);

        // Cleanup temporary files
        try {
            await fs.unlink(inputFile);
            await fs.unlink(circuitInputFile);
        } catch (cleanupError) {
            console.warn('Failed to cleanup temporary files:', cleanupError.message);
        }

        res.json({
            success: true,
            circuit,
            proof: formattedProof,
            public_inputs: publicData,
            proof_hash: proofHash,
            metadata: {
                proof_id: proofId,
                wallet_address,
                nonce,
                timestamp: metadata.timestamp,
                generation_time_ms: metadata.generation_time_ms,
                proof_size_bytes: metadata.proof_size_bytes
            }
        });

    } catch (error) {
        console.error(`Proof generation error for ${circuit}:`, error);
        res.status(500).json({
            error: 'Failed to generate proof',
            circuit,
            message: error.message,
            code: 'PROOF_GENERATION_ERROR'
        });
    }
});

/**
 * POST /zk/submit-proof
 * Submit proof to Stylus blockchain
 * 
 * @body {Object} proof_json - The generated proof data
 * @body {Array} public_inputs - Public inputs for verification
 * @body {string} wallet - User's wallet address
 * @body {Object} options - Submission options (gas limit, etc.)
 * 
 * @returns {Object} { tx_hash, receipt, status }
 */
router.post('/submit-proof', async (req, res) => {
    try {
        const { proof_json, public_inputs, wallet, options = {} } = req.body;

        // Validate required fields
        if (!proof_json || !public_inputs || !wallet) {
            return res.status(400).json({
                error: 'Missing required fields: proof_json, public_inputs, wallet',
                code: 'INVALID_INPUT'
            });
        }

        // Validate wallet address format
        if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
            return res.status(400).json({
                error: 'Invalid wallet address format',
                code: 'INVALID_WALLET'
            });
        }

        console.log(`Submitting proof for wallet: ${wallet}`);

        // Compute proof hash for on-chain tracking
        const proofHash = hashProof(proof_json);
        console.log(`Proof hash: ${proofHash}`);

        // Prepare submission data
        const submissionData = {
            proof_json,
            public_inputs,
            proof_hash: proofHash,
            wallet_address: wallet,
            timestamp: Date.now(),
            gas_limit: options.gas_limit || 500000,
            gas_price: options.gas_price || 'auto'
        };

        // Submit to Stylus contract
        const submissionResult = await submitProofToStylus(submissionData);

        if (submissionResult.success) {
            console.log(`Proof submitted successfully. TX: ${submissionResult.tx_hash}`);
            
            res.json({
                success: true,
                tx_hash: submissionResult.tx_hash,
                receipt: submissionResult.receipt,
                proof_hash: proofHash,
                status: 'submitted',
                explorer_url: submissionResult.explorer_url,
                gas_used: submissionResult.gas_used,
                timestamp: Date.now()
            });
        } else {
            throw new Error(submissionResult.error || 'Unknown submission error');
        }

    } catch (error) {
        console.error('Proof submission error:', error);
        res.status(500).json({
            error: 'Failed to submit proof to blockchain',
            message: error.message,
            code: 'SUBMISSION_ERROR'
        });
    }
});

/**
 * GET /zk/circuits
 * List available circuits and their metadata
 * 
 * @returns {Object} { circuits: Array }
 */
router.get('/circuits', async (req, res) => {
    try {
        const circuits = [
            {
                name: 'business_registration',
                description: 'Verify business registration without revealing sensitive data',
                inputs: ['registration_number', 'registration_date', 'jurisdiction', 'is_active', 'nonce'],
                outputs: ['commitment'],
                estimated_gas: 75000
            },
            {
                name: 'ubo_proof',
                description: 'Prove Ultimate Beneficial Ownership compliance',
                inputs: ['total_individuals', 'ownership_percentages', 'individual_hashes', 'verification_mode', 'nonce'],
                outputs: ['compliance_proof'],
                estimated_gas: 85000
            },
            {
                name: 'revenue_threshold',
                description: 'Verify minimum revenue requirements privately',
                inputs: ['revenue_commitment', 'threshold', 'currency_code', 'reporting_period', 'audit_hash', 'nonce'],
                outputs: ['threshold_proof'],
                estimated_gas: 65000
            },
            {
                name: 'document_hash_proof',
                description: 'Validate document authenticity using cryptographic hashes',
                inputs: ['document_hashes', 'document_types', 'issuer_signatures', 'expiry_dates', 'nonce'],
                outputs: ['validity_proof'],
                estimated_gas: 70000
            },
            {
                name: 'composite_business_proof',
                description: 'Combined verification of all business requirements',
                inputs: ['policy_flags', 'commitment_array', 'nonce'],
                outputs: ['composite_proof'],
                estimated_gas: 120000
            }
        ];

        res.json({
            success: true,
            circuits,
            total_circuits: circuits.length,
            timestamp: Date.now()
        });

    } catch (error) {
        console.error('Error fetching circuits:', error);
        res.status(500).json({
            error: 'Failed to fetch circuit information',
            message: error.message,
            code: 'CIRCUITS_ERROR'
        });
    }
});

/**
 * GET /zk/status/:proof_hash
 * Check status of submitted proof
 * 
 * @param {string} proof_hash - Hash of the proof to check
 * 
 * @returns {Object} { status, verification_result }
 */
router.get('/status/:proof_hash', async (req, res) => {
    try {
        const { proof_hash } = req.params;

        if (!proof_hash || !/^0x[a-fA-F0-9]{64}$/.test(proof_hash)) {
            return res.status(400).json({
                error: 'Invalid proof hash format',
                code: 'INVALID_HASH'
            });
        }

        // Check proof status on Stylus chain
        const statusResult = await submitProofToStylus.checkStatus(proof_hash);

        res.json({
            success: true,
            proof_hash,
            status: statusResult.status,
            verification_result: statusResult.verified,
            block_number: statusResult.block_number,
            timestamp: statusResult.timestamp
        });

    } catch (error) {
        console.error('Status check error:', error);
        res.status(500).json({
            error: 'Failed to check proof status',
            message: error.message,
            code: 'STATUS_ERROR'
        });
    }
});

/**
 * POST /zk/verify
 * Verify proof locally (without blockchain submission)
 * 
 * @body {Object} proof_json - The proof to verify
 * @body {Array} public_inputs - Public inputs for verification
 * @body {string} circuit - Circuit name for verification
 * 
 * @returns {Object} { valid, verification_time }
 */
router.post('/verify', async (req, res) => {
    try {
        const { proof_json, public_inputs, circuit } = req.body;

        if (!proof_json || !circuit) {
            return res.status(400).json({
                error: 'Missing required fields: proof_json, circuit',
                code: 'INVALID_INPUT'
            });
        }

        console.log(`Verifying proof for circuit: ${circuit}`);

        const circuitDir = path.resolve(__dirname, `../../zk/noir-circuits/${circuit}`);
        const startTime = Date.now();

        // Run nargo verify
        const verifyCommand = `nargo verify --manifest-path "${path.join(circuitDir, 'Nargo.toml')}"`;
        
        try {
            const output = execSync(verifyCommand, {
                cwd: circuitDir,
                encoding: 'utf8',
                timeout: 30000,
                stdio: 'pipe'
            });

            const verificationTime = Date.now() - startTime;
            console.log(`Proof verified in ${verificationTime}ms`);

            res.json({
                success: true,
                valid: true,
                circuit,
                verification_time_ms: verificationTime,
                message: 'Proof verification successful',
                timestamp: Date.now()
            });

        } catch (verifyError) {
            const verificationTime = Date.now() - startTime;
            console.error('Proof verification failed:', verifyError.message);

            res.json({
                success: true,
                valid: false,
                circuit,
                verification_time_ms: verificationTime,
                message: 'Proof verification failed',
                error: verifyError.message,
                timestamp: Date.now()
            });
        }

    } catch (error) {
        console.error('Verification error:', error);
        res.status(500).json({
            error: 'Failed to verify proof',
            message: error.message,
            code: 'VERIFICATION_ERROR'
        });
    }
});

module.exports = router;