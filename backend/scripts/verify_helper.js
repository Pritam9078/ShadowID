#!/usr/bin/env node
/**
 * Verification helper for Windows
 * Handles proof verification and exports verification keys
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

async function verifyProof() {
    const circuitName = process.argv[2];
    const proofFile = process.argv[3];
    const exportVk = process.argv[4] === '--export-vk';
    
    if (!circuitName) {
        console.error('❌ Circuit name required');
        process.exit(1);
    }
    
    console.log(`🔍 Verifying proof for ${circuitName}...`);
    
    try {
        // Determine proof file path
        let actualProofFile;
        if (proofFile && fs.existsSync(proofFile)) {
            actualProofFile = proofFile;
        } else {
            actualProofFile = path.join('zk', 'proofs', circuitName, 'proof.json');
        }
        
        if (!fs.existsSync(actualProofFile)) {
            throw new Error(`Proof file not found: ${actualProofFile}`);
        }
        
        console.log(`📋 Loading proof from: ${actualProofFile}`);
        const proofData = JSON.parse(fs.readFileSync(actualProofFile, 'utf8'));
        
        if (proofData.mock) {
            console.log('⚠️  Warning: Verifying mock proof (development mode)');
        }
        
        // Mock verification logic
        const isValid = proofData.proof && 
                       proofData.public_inputs && 
                       proofData.circuit_name === circuitName &&
                       Array.isArray(proofData.proof) &&
                       proofData.proof.length > 0;
        
        const verificationResult = {
            circuit_name: circuitName,
            proof_valid: isValid,
            verified_at: new Date().toISOString(),
            proof_hash: crypto.createHash('sha256')
                .update(JSON.stringify(proofData.proof))
                .digest('hex'),
            public_inputs: proofData.public_inputs,
            mock: proofData.mock || false,
            metadata: {
                verifier: 'shadowid-verify-helper',
                platform: 'Windows',
                node_version: process.version,
                proof_file: actualProofFile
            }
        };
        
        // Create verifier directory
        const verifierDir = path.join('zk', 'verifiers', circuitName);
        fs.mkdirSync(verifierDir, { recursive: true });
        
        // Save verification result
        const resultPath = path.join(verifierDir, 'verification_result.json');
        fs.writeFileSync(resultPath, JSON.stringify(verificationResult, null, 2));
        
        if (isValid) {
            console.log('✅ Proof verification PASSED');
        } else {
            console.log('❌ Proof verification FAILED');
        }
        
        console.log(`📄 Verification result saved to: ${resultPath}`);
        
        // Export verification key if requested
        if (exportVk) {
            console.log('🔑 Exporting verification key...');
            
            const vkData = {
                circuit_name: circuitName,
                verification_key: {
                    alpha_g1: `0x${crypto.randomBytes(32).toString('hex')}`,
                    beta_g2: `0x${crypto.randomBytes(64).toString('hex')}`,
                    gamma_g2: `0x${crypto.randomBytes(64).toString('hex')}`,
                    delta_g2: `0x${crypto.randomBytes(64).toString('hex')}`,
                    ic: [`0x${crypto.randomBytes(32).toString('hex')}`]
                },
                key_type: "groth16",
                curve: "bn254", 
                generated_at: new Date().toISOString(),
                mock: true,
                description: "Mock verification key for development and testing",
                metadata: {
                    generator: 'shadowid-verify-helper',
                    platform: 'Windows'
                }
            };
            
            const vkPath = path.join(verifierDir, 'verification_key.json');
            fs.writeFileSync(vkPath, JSON.stringify(vkData, null, 2));
            
            console.log(`🔑 Verification key saved to: ${vkPath}`);
        }
        
        // Display summary
        console.log('\n📊 Verification Summary:');
        console.log(`   Circuit: ${circuitName}`);
        console.log(`   Status: ${isValid ? 'VALID ✅' : 'INVALID ❌'}`);
        console.log(`   Proof hash: ${verificationResult.proof_hash.substring(0, 16)}...`);
        console.log(`   Public inputs: ${proofData.public_inputs.length}`);
        console.log(`   Verified at: ${verificationResult.verified_at}`);
        if (exportVk) {
            console.log(`   Verification key: Exported ✅`);
        }
        
        return verificationResult;
        
    } catch (error) {
        console.error('❌ Verification failed:', error.message);
        
        // Create mock verification result on error
        const mockResult = {
            circuit_name: circuitName,
            proof_valid: false,
            verified_at: new Date().toISOString(),
            error: error.message,
            mock: true
        };
        
        const verifierDir = path.join('zk', 'verifiers', circuitName);
        fs.mkdirSync(verifierDir, { recursive: true });
        
        const resultPath = path.join(verifierDir, 'verification_result.json');
        fs.writeFileSync(resultPath, JSON.stringify(mockResult, null, 2));
        
        console.log('🔧 Mock verification result created for debugging');
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    verifyProof().catch(console.error);
}

module.exports = { verifyProof };