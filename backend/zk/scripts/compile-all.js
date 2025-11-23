#!/usr/bin/env node
/**
 * Compile All ZK Circuits
 * 
 * Compiles all Noir circuits in the workspace with proper error handling
 * and performance monitoring.
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

// Configuration
const CIRCUITS_DIR = path.resolve(__dirname, '../noir-circuits');
const CIRCUITS = [
    'business_registration',
    'ubo_proof',
    'revenue_threshold', 
    'document_hash_proof',
    'composite_business_proof'
];

const CONFIG = {
    verbose: process.argv.includes('--verbose') || process.argv.includes('-v'),
    parallel: process.argv.includes('--parallel') || process.argv.includes('-p'),
    clean: process.argv.includes('--clean') || process.argv.includes('-c'),
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

function checkNargoInstalled() {
    try {
        execSync('nargo --version', { stdio: 'pipe' });
        return true;
    } catch (error) {
        return false;
    }
}

function compileCircuit(circuitName) {
    const circuitPath = path.join(CIRCUITS_DIR, circuitName);
    const manifestPath = path.join(circuitPath, 'Nargo.toml');
    
    if (!fs.existsSync(manifestPath)) {
        throw new Error(`Circuit manifest not found: ${manifestPath}`);
    }
    
    log(`Compiling circuit: ${circuitName}`);
    
    const startTime = process.hrtime.bigint();
    
    try {
        // Clean if requested
        if (CONFIG.clean) {
            const targetDir = path.join(circuitPath, 'target');
            if (fs.existsSync(targetDir)) {
                fs.rmSync(targetDir, { recursive: true, force: true });
                log(`Cleaned target directory for ${circuitName}`);
            }
        }
        
        // Compile circuit
        const result = execSync(`nargo compile --manifest-path "${manifestPath}"`, {
            encoding: 'utf8',
            cwd: circuitPath
        });
        
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1_000_000; // Convert to milliseconds
        
        if (CONFIG.timing) {
            log(`⏱️  ${circuitName}: ${duration.toFixed(2)}ms`, 'PERF');
        }
        
        return {
            circuit: circuitName,
            success: true,
            duration: duration,
            output: result
        };
        
    } catch (error) {
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1_000_000;
        
        log(`Failed to compile ${circuitName}: ${error.message}`, 'ERROR');
        
        return {
            circuit: circuitName,
            success: false,
            duration: duration,
            error: error.message,
            stderr: error.stderr
        };
    }
}

function compileCircuitParallel(circuitName) {
    return new Promise((resolve, reject) => {
        const circuitPath = path.join(CIRCUITS_DIR, circuitName);
        const manifestPath = path.join(circuitPath, 'Nargo.toml');
        
        if (!fs.existsSync(manifestPath)) {
            reject(new Error(`Circuit manifest not found: ${manifestPath}`));
            return;
        }
        
        log(`Starting parallel compilation: ${circuitName}`);
        
        const startTime = process.hrtime.bigint();
        
        // Clean if requested
        if (CONFIG.clean) {
            const targetDir = path.join(circuitPath, 'target');
            if (fs.existsSync(targetDir)) {
                fs.rmSync(targetDir, { recursive: true, force: true });
            }
        }
        
        const nargoProcess = spawn('nargo', ['compile', '--manifest-path', manifestPath], {
            cwd: circuitPath,
            stdio: 'pipe'
        });
        
        let stdout = '';
        let stderr = '';
        
        nargoProcess.stdout.on('data', (data) => {
            stdout += data.toString();
        });
        
        nargoProcess.stderr.on('data', (data) => {
            stderr += data.toString();
        });
        
        nargoProcess.on('close', (code) => {
            const endTime = process.hrtime.bigint();
            const duration = Number(endTime - startTime) / 1_000_000;
            
            if (code === 0) {
                if (CONFIG.timing) {
                    log(`⏱️  ${circuitName}: ${duration.toFixed(2)}ms`, 'PERF');
                }
                
                resolve({
                    circuit: circuitName,
                    success: true,
                    duration: duration,
                    output: stdout
                });
            } else {
                log(`Failed to compile ${circuitName}: Exit code ${code}`, 'ERROR');
                
                resolve({
                    circuit: circuitName,
                    success: false,
                    duration: duration,
                    error: `Compilation failed with exit code ${code}`,
                    stderr: stderr
                });
            }
        });
        
        nargoProcess.on('error', (error) => {
            const endTime = process.hrtime.bigint();
            const duration = Number(endTime - startTime) / 1_000_000;
            
            log(`Process error for ${circuitName}: ${error.message}`, 'ERROR');
            
            resolve({
                circuit: circuitName,
                success: false,
                duration: duration,
                error: error.message
            });
        });
    });
}

async function compileAllCircuits() {
    log('🔧 Starting ZK circuit compilation...\n');
    
    // Check prerequisites
    if (!checkNargoInstalled()) {
        log('❌ Nargo not found. Please install Noir toolchain:', 'ERROR');
        log('   curl -L https://install.aztec.network | bash', 'ERROR');
        process.exit(1);
    }
    
    // Verify circuits directory
    if (!fs.existsSync(CIRCUITS_DIR)) {
        log(`❌ Circuits directory not found: ${CIRCUITS_DIR}`, 'ERROR');
        process.exit(1);
    }
    
    const startTime = Date.now();
    let results = [];
    
    try {
        if (CONFIG.parallel) {
            log('Using parallel compilation mode');
            
            // Compile circuits in parallel
            const promises = CIRCUITS.map(circuit => compileCircuitParallel(circuit));
            results = await Promise.all(promises);
            
        } else {
            log('Using sequential compilation mode');
            
            // Compile circuits sequentially
            for (const circuit of CIRCUITS) {
                const result = compileCircuit(circuit);
                results.push(result);
            }
        }
        
        const endTime = Date.now();
        const totalDuration = endTime - startTime;
        
        // Summary
        const successful = results.filter(r => r.success);
        const failed = results.filter(r => !r.success);
        
        log('\n📊 Compilation Results:');
        log('═══════════════════════════════════════');
        
        if (successful.length > 0) {
            log(`✅ Successfully compiled: ${successful.length}/${CIRCUITS.length} circuits`, 'SUCCESS');
            successful.forEach(result => {
                log(`   ✓ ${result.circuit} (${result.duration.toFixed(2)}ms)`);
            });
        }
        
        if (failed.length > 0) {
            log(`❌ Failed compilation: ${failed.length}/${CIRCUITS.length} circuits`, 'ERROR');
            failed.forEach(result => {
                log(`   ✗ ${result.circuit}: ${result.error}`, 'ERROR');
            });
        }
        
        log(`\n⏱️  Total compilation time: ${totalDuration}ms`, 'PERF');
        
        // Check workspace compilation
        log('\n🔍 Verifying workspace compilation...');
        try {
            const workspaceResult = execSync('nargo compile', {
                cwd: CIRCUITS_DIR,
                encoding: 'utf8'
            });
            log('✅ Workspace compilation successful', 'SUCCESS');
        } catch (error) {
            log(`❌ Workspace compilation failed: ${error.message}`, 'ERROR');
            failed.push({ circuit: 'workspace', error: error.message });
        }
        
        // Exit with appropriate code
        if (failed.length === 0) {
            log('\n🎉 All circuits compiled successfully!', 'SUCCESS');
            process.exit(0);
        } else {
            log(`\n💥 ${failed.length} circuit(s) failed compilation`, 'ERROR');
            process.exit(1);
        }
        
    } catch (error) {
        log(`❌ Compilation process failed: ${error.message}`, 'ERROR');
        process.exit(1);
    }
}

// Show help
function showHelp() {
    console.log(`
ZK Circuit Compilation Tool

Usage: node compile-all.js [options]

Options:
  -v, --verbose     Enable verbose logging
  -p, --parallel    Compile circuits in parallel
  -c, --clean       Clean target directories before compilation
  -h, --help        Show this help message

Examples:
  node compile-all.js                    # Compile all circuits sequentially
  node compile-all.js --parallel --clean # Clean and compile in parallel
  node compile-all.js --verbose          # Compile with detailed output

Circuits:
  - business_registration
  - ubo_proof
  - revenue_threshold
  - document_hash_proof
  - composite_business_proof
`);
}

// Main execution
if (require.main === module) {
    if (process.argv.includes('--help') || process.argv.includes('-h')) {
        showHelp();
        process.exit(0);
    }
    
    compileAllCircuits().catch(error => {
        console.error('Unexpected error:', error);
        process.exit(1);
    });
}

module.exports = {
    compileAllCircuits,
    compileCircuit,
    CIRCUITS
};