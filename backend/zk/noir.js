const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

/**
 * Noir ZK Proof Service
 * Handles Noir circuit compilation, proving, and verification
 */
class NoirService {
    constructor() {
        this.circuitPaths = {
            age_proof: path.join(__dirname, '../../zk-circuits/noir/age_proof'),
            citizenship_proof: path.join(__dirname, '../../zk-circuits/noir/citizenship_proof'),
            attribute_proof: path.join(__dirname, '../../zk-circuits/noir/attribute_proof')
        };
    }

    /**
     * Generate KYC commitment using Noir circuit
     * @param {Object} kycData - KYC data structure
     * @returns {Promise<string>} - Commitment hash
     */
    async generateKycCommitment(kycData) {
        try {
            const { birth_year, birth_month, birth_day, document_hash, salt } = kycData;
            
            // Validate input data
            if (!birth_year || !birth_month || !birth_day || !document_hash) {
                throw new Error('Missing required KYC data fields');
            }

            // Generate salt if not provided
            const kycSalt = salt || crypto.randomBytes(32).toString('hex');

            // Create Prover.toml for commitment generation
            const proverToml = `
birth_year = ${birth_year}
birth_month = ${birth_month}
birth_day = ${birth_day}
document_hash = "${document_hash}"
salt = "${kycSalt}"
`;

            // Write to temporary commitment circuit
            const commitmentPath = path.join(__dirname, 'temp_commitment');
            await this.ensureDirectory(commitmentPath);
            
            await fs.writeFile(path.join(commitmentPath, 'Prover.toml'), proverToml);

            // Run Noir to generate commitment
            const commitment = await this.runNoirCommitment(commitmentPath);

            return {
                commitment,
                salt: kycSalt
            };

        } catch (error) {
            console.error('Error generating KYC commitment:', error);
            throw new Error(`KYC commitment generation failed: ${error.message}`);
        }
    }

    /**
     * Generate ZK proof for age verification
     * @param {Object} proofData - Age proof data
     * @returns {Promise<Object>} - Proof and public inputs
     */
    async generateAgeProof(proofData) {
        const { birth_year, birth_month, birth_day, min_age, current_year, current_month, current_day, salt } = proofData;

        try {
            // Validate age proof data
            if (!birth_year || !birth_month || !birth_day || !min_age) {
                throw new Error('Missing required age proof data');
            }

            const proverToml = `
birth_year = ${birth_year}
birth_month = ${birth_month}
birth_day = ${birth_day}
min_age = ${min_age}
current_year = ${current_year || new Date().getFullYear()}
current_month = ${current_month || (new Date().getMonth() + 1)}
current_day = ${current_day || new Date().getDate()}
salt = "${salt}"
`;

            return await this.generateProof('age_proof', proverToml);

        } catch (error) {
            console.error('Error generating age proof:', error);
            throw new Error(`Age proof generation failed: ${error.message}`);
        }
    }

    /**
     * Generate ZK proof for citizenship verification
     * @param {Object} proofData - Citizenship proof data
     * @returns {Promise<Object>} - Proof and public inputs
     */
    async generateCitizenshipProof(proofData) {
        const { country_code, document_type, document_hash, salt } = proofData;

        try {
            // Validate citizenship proof data
            if (!country_code || !document_type || !document_hash) {
                throw new Error('Missing required citizenship proof data');
            }

            const proverToml = `
country_code = "${country_code}"
document_type = "${document_type}"
document_hash = "${document_hash}"
salt = "${salt}"
`;

            return await this.generateProof('citizenship_proof', proverToml);

        } catch (error) {
            console.error('Error generating citizenship proof:', error);
            throw new Error(`Citizenship proof generation failed: ${error.message}`);
        }
    }

    /**
     * Generate ZK proof for generic attribute verification
     * @param {Object} proofData - Attribute proof data
     * @returns {Promise<Object>} - Proof and public inputs
     */
    async generateAttributeProof(proofData) {
        const { attribute_type, attribute_value, constraint_type, constraint_value, salt } = proofData;

        try {
            // Validate attribute proof data
            if (!attribute_type || attribute_value === undefined || !constraint_type || constraint_value === undefined) {
                throw new Error('Missing required attribute proof data');
            }

            const proverToml = `
attribute_type = "${attribute_type}"
attribute_value = ${attribute_value}
constraint_type = "${constraint_type}"
constraint_value = ${constraint_value}
salt = "${salt}"
`;

            return await this.generateProof('attribute_proof', proverToml);

        } catch (error) {
            console.error('Error generating attribute proof:', error);
            throw new Error(`Attribute proof generation failed: ${error.message}`);
        }
    }

    /**
     * Generic proof generation function
     * @param {string} circuitType - Type of circuit (age_proof, citizenship_proof, etc.)
     * @param {string} proverToml - Prover.toml content
     * @returns {Promise<Object>} - Proof and public inputs
     */
    async generateProof(circuitType, proverToml) {
        const circuitPath = this.circuitPaths[circuitType];
        
        if (!circuitPath) {
            throw new Error(`Unknown circuit type: ${circuitType}`);
        }

        try {
            // Ensure circuit directory exists
            await this.ensureDirectory(circuitPath);

            // Write Prover.toml
            await fs.writeFile(path.join(circuitPath, 'Prover.toml'), proverToml);

            // Check if circuit needs compilation
            const needsCompilation = await this.needsCompilation(circuitPath);
            if (needsCompilation) {
                console.log(`Compiling ${circuitType} circuit...`);
                await this.compileCircuit(circuitPath);
            }

            // Generate proof
            console.log(`Generating proof for ${circuitType}...`);
            await this.runNoirProve(circuitPath);

            // Read proof and public inputs
            const proof = await this.readProofFiles(circuitPath);

            // Generate proof hash for blockchain
            const proofHash = this.generateProofHash(proof);

            return {
                proof: proof.proof,
                publicInputs: proof.publicInputs,
                proofHash,
                circuitType
            };

        } catch (error) {
            console.error(`Error generating ${circuitType} proof:`, error);
            throw error;
        }
    }

    /**
     * Run nargo prove command
     * @param {string} circuitPath - Path to circuit directory
     */
    async runNoirProve(circuitPath) {
        return new Promise((resolve, reject) => {
            const nargoProve = spawn('nargo', ['prove'], {
                cwd: circuitPath,
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let stdout = '';
            let stderr = '';

            nargoProve.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            nargoProve.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            nargoProve.on('close', (code) => {
                if (code === 0) {
                    console.log('Noir proof generation completed:', stdout);
                    resolve(stdout);
                } else {
                    console.error('Noir prove failed:', stderr);
                    reject(new Error(`nargo prove failed with code ${code}: ${stderr}`));
                }
            });

            nargoProve.on('error', (error) => {
                reject(new Error(`Failed to start nargo prove: ${error.message}`));
            });
        });
    }

    /**
     * Run nargo compile command
     * @param {string} circuitPath - Path to circuit directory
     */
    async compileCircuit(circuitPath) {
        return new Promise((resolve, reject) => {
            const nargoCompile = spawn('nargo', ['compile'], {
                cwd: circuitPath,
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let stdout = '';
            let stderr = '';

            nargoCompile.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            nargoCompile.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            nargoCompile.on('close', (code) => {
                if (code === 0) {
                    console.log('Noir compilation completed:', stdout);
                    resolve(stdout);
                } else {
                    console.error('Noir compilation failed:', stderr);
                    reject(new Error(`nargo compile failed with code ${code}: ${stderr}`));
                }
            });

            nargoCompile.on('error', (error) => {
                reject(new Error(`Failed to start nargo compile: ${error.message}`));
            });
        });
    }

    /**
     * Generate commitment using Noir (simplified version)
     * @param {string} commitmentPath - Path to commitment circuit
     * @returns {Promise<string>} - Commitment hash
     */
    async runNoirCommitment(commitmentPath) {
        // This would use a simple Noir circuit to generate Poseidon hash
        // For now, we'll simulate with a standard hash
        const proverContent = await fs.readFile(path.join(commitmentPath, 'Prover.toml'), 'utf8');
        
        // Extract values and create commitment (simplified)
        const hash = crypto.createHash('sha256');
        hash.update(proverContent);
        
        return '0x' + hash.digest('hex');
    }

    /**
     * Read proof and public input files
     * @param {string} circuitPath - Path to circuit directory
     * @returns {Promise<Object>} - Proof data
     */
    async readProofFiles(circuitPath) {
        try {
            const proofPath = path.join(circuitPath, 'proofs', 'proof.json');
            const publicPath = path.join(circuitPath, 'proofs', 'public.json');

            const [proofData, publicData] = await Promise.all([
                fs.readFile(proofPath, 'utf8').then(JSON.parse),
                fs.readFile(publicPath, 'utf8').then(JSON.parse)
            ]);

            return {
                proof: proofData,
                publicInputs: publicData
            };

        } catch (error) {
            throw new Error(`Failed to read proof files: ${error.message}`);
        }
    }

    /**
     * Check if circuit needs compilation
     * @param {string} circuitPath - Path to circuit directory
     * @returns {Promise<boolean>} - True if compilation needed
     */
    async needsCompilation(circuitPath) {
        try {
            const targetPath = path.join(circuitPath, 'target');
            const stats = await fs.stat(targetPath);
            return !stats.isDirectory();
        } catch (error) {
            return true; // Needs compilation if target doesn't exist
        }
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
     * Ensure directory exists
     * @param {string} dirPath - Directory path
     */
    async ensureDirectory(dirPath) {
        try {
            await fs.mkdir(dirPath, { recursive: true });
        } catch (error) {
            if (error.code !== 'EEXIST') {
                throw error;
            }
        }
    }

    /**
     * Verify a ZK proof
     * @param {string} circuitType - Type of circuit
     * @param {Object} proof - Proof data
     * @param {Object} publicInputs - Public inputs
     * @returns {Promise<boolean>} - Verification result
     */
    async verifyProof(circuitType, proof, publicInputs) {
        const circuitPath = this.circuitPaths[circuitType];
        
        if (!circuitPath) {
            throw new Error(`Unknown circuit type: ${circuitType}`);
        }

        try {
            // Write proof files for verification
            await fs.writeFile(
                path.join(circuitPath, 'proofs', 'proof.json'),
                JSON.stringify(proof, null, 2)
            );
            
            await fs.writeFile(
                path.join(circuitPath, 'proofs', 'public.json'),
                JSON.stringify(publicInputs, null, 2)
            );

            // Run nargo verify
            return await this.runNoirVerify(circuitPath);

        } catch (error) {
            console.error(`Error verifying ${circuitType} proof:`, error);
            return false;
        }
    }

    /**
     * Run nargo verify command
     * @param {string} circuitPath - Path to circuit directory
     * @returns {Promise<boolean>} - Verification result
     */
    async runNoirVerify(circuitPath) {
        return new Promise((resolve) => {
            const nargoVerify = spawn('nargo', ['verify'], {
                cwd: circuitPath,
                stdio: ['pipe', 'pipe', 'pipe']
            });

            let stdout = '';
            let stderr = '';

            nargoVerify.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            nargoVerify.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            nargoVerify.on('close', (code) => {
                if (code === 0) {
                    console.log('Noir verification completed:', stdout);
                    resolve(true);
                } else {
                    console.error('Noir verification failed:', stderr);
                    resolve(false);
                }
            });

            nargoVerify.on('error', (error) => {
                console.error('Failed to start nargo verify:', error);
                resolve(false);
            });
        });
    }
}

module.exports = NoirService;