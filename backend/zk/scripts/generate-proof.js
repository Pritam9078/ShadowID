#!/usr/bin/env node
/**
 * Generate ZK Proofs
 * 
 * Generates zero-knowledge proofs for specified circuits using provided
 * input data and manages proof artifacts.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CIRCUITS_DIR = path.resolve(__dirname, '../noir-circuits');
const PROOFS_DIR = path.resolve(__dirname, '../proofs');
const VERIFIERS_DIR = path.resolve(__dirname, '../verifiers');

const CIRCUITS = [
    'business_registration',
    'ubo_proof',
    'revenue_threshold',
    'document_hash_proof',
    'composite_business_proof'
];

const CONFIG = {
    verbose: process.argv.includes('--verbose') || process.argv.includes('-v'),
    export: process.argv.includes('--export') || process.argv.includes('-e'),
    timing: true
};

// Helper functions
function log(message, level = 'INFO') {
    if (CONFIG.verbose || level === 'ERROR' || level === 'SUCCESS') {
        const colors = {
            'ERROR': '\x1b[31m',
            'WARN': '\x1b[33m',
            'INFO': '\x1b[37m',
            'SUCCESS': '\x1b[32m',
            'PERF': '\x1b[36m'
        };
        const resetColor = '\x1b[0m';
        const timestamp = new Date().toISOString();
        console.log(`${colors[level] || colors.INFO}[${timestamp}] ${level}: ${message}${resetColor}`);
    }
}

function ensureDirectories() {
    [PROOFS_DIR, VERIFIERS_DIR].forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            log(`Created directory: ${dir}`);
        }
    });
}

function generateProof(circuitName, inputFile = null) {
    const circuitPath = path.join(CIRCUITS_DIR, circuitName);
    const manifestPath = path.join(circuitPath, 'Nargo.toml');
    
    if (!fs.existsSync(manifestPath)) {
        throw new Error(`Circuit manifest not found: ${manifestPath}`);
    }
    
    // Use provided input file or default Prover.toml
    const proverFile = inputFile || path.join(circuitPath, 'Prover.toml');
    if (!fs.existsSync(proverFile)) {
        throw new Error(`Prover input file not found: ${proverFile}`);
    }
    
    log(`Generating proof for: ${circuitName}`);
    if (inputFile) {
        log(`Using input file: ${inputFile}`);
    }
    
    const startTime = process.hrtime.bigint();
    
    try {
        // Copy input file to circuit directory if different
        if (inputFile && path.resolve(inputFile) !== path.resolve(proverFile)) {
            fs.copyFileSync(inputFile, path.join(circuitPath, 'Prover.toml'));
            log(`Copied input file to circuit directory`);
        }
        
        // Generate proof
        const proveResult = execSync(`nargo prove --manifest-path "${manifestPath}"`, {
            encoding: 'utf8',
            cwd: circuitPath
        });
        
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1_000_000;
        
        if (CONFIG.timing) {
            log(`⏱️  Proof generation: ${duration.toFixed(2)}ms`, 'PERF');
        }
        
        // Check for proof files
        const proofFile = path.join(circuitPath, 'proofs', `${circuitName}.proof`);
        const publicFile = path.join(circuitPath, 'proofs', 'public.json');
        
        if (!fs.existsSync(proofFile)) {
            throw new Error('Proof file not generated');
        }
        
        // Export proof artifacts if requested
        if (CONFIG.export) {
            exportProofArtifacts(circuitName, circuitPath);
        }
        
        return {
            circuit: circuitName,
            success: true,
            duration: duration,
            proofFile: proofFile,
            publicFile: publicFile,
            output: proveResult
        };
        
    } catch (error) {
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1_000_000;
        
        log(`Failed to generate proof for ${circuitName}: ${error.message}`, 'ERROR');
        
        return {
            circuit: circuitName,
            success: false,
            duration: duration,
            error: error.message,
            stderr: error.stderr
        };
    }
}

function exportProofArtifacts(circuitName, circuitPath) {
    log(`Exporting proof artifacts for: ${circuitName}`);
    
    const sourceProofDir = path.join(circuitPath, 'proofs');
    const sourceTargetDir = path.join(circuitPath, 'target');
    
    // Export proof file
    const proofFile = path.join(sourceProofDir, `${circuitName}.proof`);
    if (fs.existsSync(proofFile)) {
        const destProofFile = path.join(PROOFS_DIR, `${circuitName}_proof.json`);
        fs.copyFileSync(proofFile, destProofFile);
        log(`Exported proof: ${destProofFile}`);
    }
    
    // Export public inputs
    const publicFile = path.join(sourceProofDir, 'public.json');
    if (fs.existsSync(publicFile)) {
        const destPublicFile = path.join(PROOFS_DIR, `${circuitName}_public.json`);
        fs.copyFileSync(publicFile, destPublicFile);
        log(`Exported public inputs: ${destPublicFile}`);
    }
    
    // Export verification key
    const vkFile = path.join(sourceTargetDir, `${circuitName}.vk`);
    if (fs.existsSync(vkFile)) {
        const destVkFile = path.join(VERIFIERS_DIR, `${circuitName}_vk.json`);
        fs.copyFileSync(vkFile, destVkFile);
        log(`Exported verification key: ${destVkFile}`);
    } else {
        // Try alternative VK location
        const altVkFile = path.join(sourceTargetDir, 'verification_key.json');
        if (fs.existsSync(altVkFile)) {
            const destVkFile = path.join(VERIFIERS_DIR, `${circuitName}_vk.json`);
            fs.copyFileSync(altVkFile, destVkFile);
            log(`Exported verification key: ${destVkFile}`);
        }
    }
    
    // Create proof package
    const proofPackage = {
        circuit: circuitName,
        timestamp: new Date().toISOString(),
        files: {
            proof: `${circuitName}_proof.json`,
            public: `${circuitName}_public.json`,
            verificationKey: `${circuitName}_vk.json`
        }
    };
    
    const packageFile = path.join(PROOFS_DIR, `${circuitName}_package.json`);
    fs.writeFileSync(packageFile, JSON.stringify(proofPackage, null, 2));
    log(`Created proof package: ${packageFile}`);
}

function generateAllProofs() {
    log('🔮 Generating proofs for all circuits...\n');
    
    ensureDirectories();
    
    const results = [];
    const startTime = Date.now();
    
    for (const circuit of CIRCUITS) {
        try {
            const result = generateProof(circuit);
            results.push(result);
            
            if (result.success) {
                log(`✅ Successfully generated proof for: ${circuit}`, 'SUCCESS');
            } else {
                log(`❌ Failed to generate proof for: ${circuit}`, 'ERROR');
            }
            
        } catch (error) {
            log(`❌ Error generating proof for ${circuit}: ${error.message}`, 'ERROR');
            results.push({
                circuit: circuit,
                success: false,
                error: error.message
            });
        }
    }
    
    const endTime = Date.now();
    const totalDuration = endTime - startTime;
    
    // Summary
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    log('\n📊 Proof Generation Results:');
    log('═══════════════════════════════════════');
    log(`✅ Successful: ${successful.length}/${CIRCUITS.length} circuits`, successful.length === CIRCUITS.length ? 'SUCCESS' : 'INFO');
    
    if (successful.length > 0) {
        successful.forEach(result => {
            log(`   ✓ ${result.circuit} (${result.duration.toFixed(2)}ms)`);
        });
    }
    
    if (failed.length > 0) {
        log(`❌ Failed: ${failed.length}/${CIRCUITS.length} circuits`, 'ERROR');
        failed.forEach(result => {
            log(`   ✗ ${result.circuit}: ${result.error || 'Unknown error'}`, 'ERROR');
        });
    }
    
    log(`\n⏱️  Total generation time: ${totalDuration}ms`, 'PERF');
    
    return results;
}

function generateSingleProof() {
    const circuitArg = process.argv.find(arg => arg.startsWith('--circuit='));
    const inputArg = process.argv.find(arg => arg.startsWith('--input='));
    
    if (!circuitArg) {
        log('❌ Circuit name required. Use --circuit=<name>', 'ERROR');
        process.exit(1);
    }
    
    const circuitName = circuitArg.split('=')[1];
    const inputFile = inputArg ? inputArg.split('=')[1] : null;
    
    if (!CIRCUITS.includes(circuitName)) {
        log(`❌ Unknown circuit: ${circuitName}. Available: ${CIRCUITS.join(', ')}`, 'ERROR');
        process.exit(1);
    }
    
    if (inputFile && !fs.existsSync(inputFile)) {
        log(`❌ Input file not found: ${inputFile}`, 'ERROR');
        process.exit(1);
    }
    
    ensureDirectories();
    
    try {
        const result = generateProof(circuitName, inputFile);
        
        if (result.success) {
            log(`🎉 Successfully generated proof for: ${circuitName}`, 'SUCCESS');
            log(`   Proof file: ${result.proofFile}`);
            
            if (CONFIG.export) {
                log(`   Exported to: ${PROOFS_DIR}`);
            }
            
            process.exit(0);
        } else {
            log(`💥 Failed to generate proof for: ${circuitName}`, 'ERROR');
            log(`   Error: ${result.error}`, 'ERROR');
            process.exit(1);
        }
        
    } catch (error) {
        log(`❌ Proof generation failed: ${error.message}`, 'ERROR');
        process.exit(1);
    }
}

// Show help
function showHelp() {
    console.log(`
ZK Proof Generation Tool

Usage: node generate-proof.js [options]

Options:
  --circuit=<name>     Generate proof for specific circuit
  --input=<file>       Use custom input file (default: circuit's Prover.toml)
  --all               Generate proofs for all circuits
  -v, --verbose       Enable verbose logging
  -e, --export        Export proof artifacts to zk/proofs and zk/verifiers
  -h, --help          Show this help message

Examples:
  node generate-proof.js --all --export
  node generate-proof.js --circuit=business_registration
  node generate-proof.js --circuit=ubo_proof --input=./custom_input.json
  node generate-proof.js --circuit=composite_business_proof --verbose

Available Circuits:
  - business_registration
  - ubo_proof
  - revenue_threshold
  - document_hash_proof
  - composite_business_proof

Output Directories:
  Proofs: ${PROOFS_DIR}
  Verifiers: ${VERIFIERS_DIR}
`);
}

// Main execution
if (require.main === module) {
    if (process.argv.includes('--help') || process.argv.includes('-h')) {
        showHelp();
        process.exit(0);
    }
    
    if (process.argv.includes('--all')) {
        const results = generateAllProofs();
        const failed = results.filter(r => !r.success);
        process.exit(failed.length === 0 ? 0 : 1);
    } else {
        generateSingleProof();
    }
}

module.exports = {
    generateProof,
    generateAllProofs,
    exportProofArtifacts,
    CIRCUITS
};