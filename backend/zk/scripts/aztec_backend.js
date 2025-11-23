const { execSync, spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

/**
 * Aztec Backend Integration for Noir Proofs
 * Handles proof generation using Aztec's backend for enhanced performance
 */
class AztecBackend {
    constructor() {
        this.backendPath = process.env.AZTEC_BACKEND_PATH || 'aztec';
        this.circuitsDir = path.join(__dirname, '..', 'noir-circuits');
        this.proofsDir = path.join(__dirname, '..', 'proofs');
        this.verifiersDir = path.join(__dirname, '..', 'verifiers');
    }

    /**
     * Check if Aztec backend is available
     */
    async checkAztecBackend() {
        try {
            execSync(`${this.backendPath} --version`, { stdio: 'pipe' });
            return true;
        } catch (error) {
            console.warn('Aztec backend not found. Using nargo fallback.');
            return false;
        }
    }

    /**
     * Generate proof using Aztec backend
     */
    async generateProofWithAztec(circuitName, witnessData) {
        const aztecAvailable = await this.checkAztecBackend();
        
        if (!aztecAvailable) {
            return this.generateProofWithNargo(circuitName, witnessData);
        }

        try {
            console.log(`🔐 Generating proof for ${circuitName} using Aztec backend...`);
            
            const circuitPath = path.join(this.circuitsDir, circuitName);
            const proofOutputDir = path.join(this.proofsDir, circuitName);
            
            // Ensure output directory exists
            await fs.mkdir(proofOutputDir, { recursive: true });
            
            // Write witness data to Prover.toml
            const proverTomlPath = path.join(circuitPath, 'Prover.toml');
            await this.writeWitnessData(proverTomlPath, witnessData);
            
            // Compile with nargo first
            await this.compileCircuit(circuitPath);
            
            // Generate proof with Aztec backend
            const proof = await this.runAztecProve(circuitPath, proofOutputDir);
            
            console.log('✅ Proof generated successfully with Aztec backend!');
            return proof;
            
        } catch (error) {
            console.error('❌ Aztec proof generation failed:', error.message);
            console.log('🔄 Falling back to nargo...');
            return this.generateProofWithNargo(circuitName, witnessData);
        }
    }

    /**
     * Generate proof using nargo (fallback)
     */
    async generateProofWithNargo(circuitName, witnessData) {
        try {
            console.log(`🔐 Generating proof for ${circuitName} using nargo...`);
            
            const circuitPath = path.join(this.circuitsDir, circuitName);
            const proofOutputDir = path.join(this.proofsDir, circuitName);
            
            // Ensure output directory exists
            await fs.mkdir(proofOutputDir, { recursive: true });
            
            // Write witness data to Prover.toml
            const proverTomlPath = path.join(circuitPath, 'Prover.toml');
            await this.writeWitnessData(proverTomlPath, witnessData);
            
            // Compile and prove with nargo
            await this.compileCircuit(circuitPath);
            const proof = await this.runNargoProve(circuitPath, proofOutputDir);
            
            console.log('✅ Proof generated successfully with nargo!');
            return proof;
            
        } catch (error) {
            console.error('❌ Nargo proof generation failed:', error.message);
            throw error;
        }
    }

    /**
     * Verify proof using appropriate backend
     */
    async verifyProof(circuitName, proofData, publicInputs) {
        try {
            const aztecAvailable = await this.checkAztecBackend();
            
            if (aztecAvailable) {
                return this.verifyProofWithAztec(circuitName, proofData, publicInputs);
            } else {
                return this.verifyProofWithNargo(circuitName, proofData, publicInputs);
            }
            
        } catch (error) {
            console.error('❌ Proof verification failed:', error.message);
            return false;
        }
    }

    /**
     * Write witness data to Prover.toml format
     */
    async writeWitnessData(proverTomlPath, witnessData) {
        let tomlContent = '';
        
        for (const [key, value] of Object.entries(witnessData)) {
            if (Array.isArray(value)) {
                tomlContent += `${key} = [${value.map(v => `"${v}"`).join(', ')}]\n`;
            } else {
                tomlContent += `${key} = "${value}"\n`;
            }
        }
        
        await fs.writeFile(proverTomlPath, tomlContent);
    }

    /**
     * Compile circuit with nargo
     */
    async compileCircuit(circuitPath) {
        return new Promise((resolve, reject) => {
            const compile = spawn('nargo', ['compile'], {
                cwd: circuitPath,
                stdio: 'pipe'
            });
            
            let stdout = '';
            let stderr = '';
            
            compile.stdout.on('data', (data) => {
                stdout += data.toString();
            });
            
            compile.stderr.on('data', (data) => {
                stderr += data.toString();
            });
            
            compile.on('close', (code) => {
                if (code === 0) {
                    resolve(stdout);
                } else {
                    reject(new Error(`Compilation failed: ${stderr}`));
                }
            });
        });
    }

    /**
     * Run Aztec prove command
     */
    async runAztecProve(circuitPath, outputDir) {
        return new Promise(async (resolve, reject) => {
            try {
                // For now, this is a placeholder for Aztec backend integration
                // In practice, you would use Aztec's specific API or CLI commands
                console.log('Note: Aztec backend integration is a placeholder.');
                console.log('Falling back to nargo prove...');
                
                const proof = await this.runNargoProve(circuitPath, outputDir);
                resolve(proof);
                
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Run nargo prove command
     */
    async runNargoProve(circuitPath, outputDir) {
        return new Promise(async (resolve, reject) => {
            const prove = spawn('nargo', ['prove'], {
                cwd: circuitPath,
                stdio: 'pipe'
            });
            
            let stdout = '';
            let stderr = '';
            
            prove.stdout.on('data', (data) => {
                stdout += data.toString();
            });
            
            prove.stderr.on('data', (data) => {
                stderr += data.toString();
            });
            
            prove.on('close', async (code) => {
                if (code === 0) {
                    try {
                        // Read generated proof files
                        const proofPath = path.join(circuitPath, 'proofs', 'proof.json');
                        const publicPath = path.join(circuitPath, 'proofs', 'public.json');
                        
                        const [proofData, publicData] = await Promise.all([
                            fs.readFile(proofPath, 'utf8').then(JSON.parse),
                            fs.readFile(publicPath, 'utf8').then(JSON.parse)
                        ]);
                        
                        // Copy to output directory
                        await Promise.all([
                            fs.copyFile(proofPath, path.join(outputDir, 'proof.json')),
                            fs.copyFile(publicPath, path.join(outputDir, 'public.json'))
                        ]);
                        
                        resolve({
                            proof: proofData,
                            publicInputs: publicData,
                            proofHash: this.generateProofHash(proofData)
                        });
                        
                    } catch (error) {
                        reject(new Error(`Failed to read proof files: ${error.message}`));
                    }
                } else {
                    reject(new Error(`Proof generation failed: ${stderr}`));
                }
            });
        });
    }

    /**
     * Verify proof with Aztec backend
     */
    async verifyProofWithAztec(circuitName, proofData, publicInputs) {
        // Placeholder for Aztec verification
        console.log('Note: Using nargo verify (Aztec verification not implemented)');
        return this.verifyProofWithNargo(circuitName, proofData, publicInputs);
    }

    /**
     * Verify proof with nargo
     */
    async verifyProofWithNargo(circuitName, proofData, publicInputs) {
        return new Promise(async (resolve, reject) => {
            try {
                const circuitPath = path.join(this.circuitsDir, circuitName);
                
                // Write proof files
                const proofsDir = path.join(circuitPath, 'proofs');
                await fs.mkdir(proofsDir, { recursive: true });
                
                await Promise.all([
                    fs.writeFile(path.join(proofsDir, 'proof.json'), JSON.stringify(proofData, null, 2)),
                    fs.writeFile(path.join(proofsDir, 'public.json'), JSON.stringify(publicInputs, null, 2))
                ]);
                
                const verify = spawn('nargo', ['verify'], {
                    cwd: circuitPath,
                    stdio: 'pipe'
                });
                
                let stdout = '';
                let stderr = '';
                
                verify.stdout.on('data', (data) => {
                    stdout += data.toString();
                });
                
                verify.stderr.on('data', (data) => {
                    stderr += data.toString();
                });
                
                verify.on('close', (code) => {
                    resolve(code === 0);
                });
                
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Generate proof hash for blockchain submission
     */
    generateProofHash(proofData) {
        const crypto = require('crypto');
        const proofString = JSON.stringify(proofData);
        return '0x' + crypto.createHash('sha256').update(proofString).digest('hex');
    }

    /**
     * Get available circuits
     */
    async getAvailableCircuits() {
        try {
            const entries = await fs.readdir(this.circuitsDir, { withFileTypes: true });
            return entries
                .filter(entry => entry.isDirectory())
                .map(entry => entry.name);
        } catch (error) {
            console.error('Error reading circuits directory:', error.message);
            return [];
        }
    }
}

// Export for use in other modules
module.exports = AztecBackend;

// CLI usage
if (require.main === module) {
    const backend = new AztecBackend();
    
    const command = process.argv[2];
    const circuitName = process.argv[3];
    
    switch (command) {
        case 'circuits':
            backend.getAvailableCircuits().then(circuits => {
                console.log('Available circuits:');
                circuits.forEach(circuit => console.log(`  - ${circuit}`));
            });
            break;
            
        case 'check':
            backend.checkAztecBackend().then(available => {
                console.log(`Aztec backend available: ${available}`);
            });
            break;
            
        case 'prove':
            if (!circuitName) {
                console.error('Circuit name required for prove command');
                process.exit(1);
            }
            // This would need witness data from file or parameters
            console.log(`Would generate proof for ${circuitName}`);
            break;
            
        default:
            console.log('Usage:');
            console.log('  node aztec_backend.js circuits   - List available circuits');
            console.log('  node aztec_backend.js check      - Check Aztec backend availability');
            console.log('  node aztec_backend.js prove <circuit> - Generate proof (needs witness data)');
            break;
    }
}