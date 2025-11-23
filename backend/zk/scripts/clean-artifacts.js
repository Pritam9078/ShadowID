#!/usr/bin/env node
/**
 * Clean ZK Circuit Artifacts
 * 
 * Removes generated artifacts, proofs, and temporary files
 * from the ZK circuits development environment.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const ZK_DIR = path.resolve(__dirname, '..');
const CIRCUITS_DIR = path.resolve(ZK_DIR, 'noir-circuits');
const PROOFS_DIR = path.resolve(ZK_DIR, 'proofs');
const VERIFIERS_DIR = path.resolve(ZK_DIR, 'verifiers');
const ARTIFACTS_DIR = path.resolve(ZK_DIR, 'artifacts');

const CIRCUITS = [
    'business_registration',
    'ubo_proof', 
    'revenue_threshold',
    'document_hash_proof',
    'composite_business_proof'
];

const CONFIG = {
    verbose: process.argv.includes('--verbose') || process.argv.includes('-v'),
    dryRun: process.argv.includes('--dry-run') || process.argv.includes('-n'),
    keepSamples: !process.argv.includes('--all'),
    force: process.argv.includes('--force') || process.argv.includes('-f')
};

// Helper functions
function log(message, level = 'INFO') {
    if (CONFIG.verbose || level === 'ERROR' || level === 'SUCCESS' || level === 'WARN') {
        const colors = {
            'ERROR': '\x1b[31m',
            'WARN': '\x1b[33m',
            'INFO': '\x1b[37m',
            'SUCCESS': '\x1b[32m',
            'CLEAN': '\x1b[36m'
        };
        const resetColor = '\x1b[0m';
        const timestamp = new Date().toISOString();
        console.log(`${colors[level] || colors.INFO}[${timestamp}] ${level}: ${message}${resetColor}`);
    }
}

function removeFile(filePath, description = null) {
    const desc = description || path.relative(ZK_DIR, filePath);
    
    if (!fs.existsSync(filePath)) {
        if (CONFIG.verbose) {
            log(`   ⚪ Not found: ${desc}`);
        }
        return false;
    }
    
    if (CONFIG.dryRun) {
        log(`   🔍 Would remove: ${desc}`, 'INFO');
        return false;
    }
    
    try {
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            fs.rmSync(filePath, { recursive: true, force: true });
        } else {
            fs.unlinkSync(filePath);
        }
        log(`   ✅ Removed: ${desc}`, 'SUCCESS');
        return true;
    } catch (error) {
        log(`   ❌ Failed to remove ${desc}: ${error.message}`, 'ERROR');
        return false;
    }
}

function removeDirectory(dirPath, description = null) {
    const desc = description || path.relative(ZK_DIR, dirPath);
    
    if (!fs.existsSync(dirPath)) {
        if (CONFIG.verbose) {
            log(`   ⚪ Not found: ${desc}/`);
        }
        return false;
    }
    
    if (CONFIG.dryRun) {
        log(`   🔍 Would remove directory: ${desc}/`, 'INFO');
        return false;
    }
    
    try {
        fs.rmSync(dirPath, { recursive: true, force: true });
        log(`   ✅ Removed directory: ${desc}/`, 'SUCCESS');
        return true;
    } catch (error) {
        log(`   ❌ Failed to remove directory ${desc}/: ${error.message}`, 'ERROR');
        return false;
    }
}

function cleanCircuitArtifacts(circuit) {
    log(`🧹 Cleaning artifacts for: ${circuit}`, 'CLEAN');
    
    const circuitPath = path.join(CIRCUITS_DIR, circuit);
    if (!fs.existsSync(circuitPath)) {
        log(`   ⚠️  Circuit directory not found: ${circuit}`, 'WARN');
        return { removed: 0, errors: 0 };
    }
    
    let removed = 0;
    let errors = 0;
    
    // Circuit-specific artifacts
    const artifactPaths = [
        path.join(circuitPath, 'target'),
        path.join(circuitPath, 'proofs'),
        path.join(circuitPath, '.nargo-cache'),
        path.join(circuitPath, 'Prover.toml.bak'),
        path.join(circuitPath, 'Verifier.toml.bak')
    ];
    
    artifactPaths.forEach(artifactPath => {
        if (removeDirectory(artifactPath) || removeFile(artifactPath)) {
            removed++;
        } else if (fs.existsSync(artifactPath)) {
            errors++;
        }
    });
    
    // Clean specific files
    const filePatterns = [
        '*.proof',
        '*.witness',
        '*.tmp',
        '*.temp'
    ];
    
    filePatterns.forEach(pattern => {
        try {
            const files = fs.readdirSync(circuitPath);
            files.forEach(file => {
                if (pattern.includes('*')) {
                    const ext = pattern.substring(1); // Remove *
                    if (file.endsWith(ext)) {
                        if (removeFile(path.join(circuitPath, file))) {
                            removed++;
                        }
                    }
                } else if (file === pattern) {
                    if (removeFile(path.join(circuitPath, file))) {
                        removed++;
                    }
                }
            });
        } catch (error) {
            if (CONFIG.verbose) {
                log(`   ⚠️  Could not read circuit directory: ${error.message}`, 'WARN');
            }
        }
    });
    
    return { removed, errors };
}

function cleanGlobalArtifacts() {
    log('🧹 Cleaning global artifacts...', 'CLEAN');
    
    let removed = 0;
    let errors = 0;
    
    // Artifacts directory
    const artifactSubdirs = [
        path.join(ARTIFACTS_DIR, 'witnesses'),
        path.join(ARTIFACTS_DIR, 'proofs'),
        path.join(ARTIFACTS_DIR, 'verification_keys'),
        path.join(ARTIFACTS_DIR, 'public_inputs')
    ];
    
    artifactSubdirs.forEach(dir => {
        if (removeDirectory(dir)) {
            removed++;
        } else if (fs.existsSync(dir)) {
            errors++;
        }
    });
    
    // Clean generated proof files (but keep sample inputs unless --all)
    if (fs.existsSync(PROOFS_DIR)) {
        try {
            const files = fs.readdirSync(PROOFS_DIR);
            files.forEach(file => {
                const filePath = path.join(PROOFS_DIR, file);
                
                // Keep sample input files unless --all specified
                if (CONFIG.keepSamples && file.endsWith('_inputs.json')) {
                    if (CONFIG.verbose) {
                        log(`   📋 Keeping sample: ${file}`);
                    }
                    return;
                }
                
                // Remove generated artifacts
                if (file.endsWith('.proof') || 
                    file.endsWith('.witness') || 
                    file.endsWith('_proof.json') ||
                    file.endsWith('_public.json') ||
                    (!CONFIG.keepSamples && file.endsWith('.json'))) {
                    
                    if (removeFile(filePath)) {
                        removed++;
                    }
                }
            });
        } catch (error) {
            log(`   ❌ Error cleaning proofs directory: ${error.message}`, 'ERROR');
            errors++;
        }
    }
    
    // Clean verifiers directory
    if (fs.existsSync(VERIFIERS_DIR)) {
        try {
            const files = fs.readdirSync(VERIFIERS_DIR);
            files.forEach(file => {
                if (file.endsWith('.json') || file.endsWith('.vk')) {
                    if (removeFile(path.join(VERIFIERS_DIR, file))) {
                        removed++;
                    }
                }
            });
        } catch (error) {
            log(`   ❌ Error cleaning verifiers directory: ${error.message}`, 'ERROR');
            errors++;
        }
    }
    
    // Clean temporary files in root
    const tempFiles = [
        path.join(ZK_DIR, '.cache'),
        path.join(ZK_DIR, '*.log'),
        path.join(ZK_DIR, '*.tmp'),
        path.join(ZK_DIR, '*.temp')
    ];
    
    tempFiles.forEach(tempPath => {
        if (tempPath.includes('*')) {
            try {
                const dir = path.dirname(tempPath);
                const pattern = path.basename(tempPath);
                const ext = pattern.substring(1); // Remove *
                
                if (fs.existsSync(dir)) {
                    const files = fs.readdirSync(dir);
                    files.forEach(file => {
                        if (file.endsWith(ext)) {
                            if (removeFile(path.join(dir, file))) {
                                removed++;
                            }
                        }
                    });
                }
            } catch (error) {
                if (CONFIG.verbose) {
                    log(`   ⚠️  Pattern cleanup failed: ${error.message}`, 'WARN');
                }
            }
        } else {
            if (removeFile(tempPath) || removeDirectory(tempPath)) {
                removed++;
            }
        }
    });
    
    return { removed, errors };
}

function cleanNargoCache() {
    log('🧹 Cleaning Nargo cache...', 'CLEAN');
    
    let removed = 0;
    
    try {
        // Try to clean with nargo
        if (CONFIG.dryRun) {
            log('   🔍 Would run: nargo clean', 'INFO');
            return { removed: 0, errors: 0 };
        }
        
        const result = execSync('nargo clean', { 
            encoding: 'utf8', 
            cwd: ZK_DIR,
            stdio: 'pipe'
        });
        
        log('   ✅ Nargo cache cleaned', 'SUCCESS');
        removed = 1;
        
    } catch (error) {
        if (CONFIG.verbose) {
            log(`   ⚠️  Nargo clean failed: ${error.message}`, 'WARN');
            log('   Continuing with manual cleanup...', 'INFO');
        }
        
        // Manual cache cleanup
        const cacheLocations = [
            path.join(ZK_DIR, '.nargo'),
            path.join(ZK_DIR, '.nargo-cache'),
        ];
        
        // Also check user cache directories
        if (process.env.HOME) {
            cacheLocations.push(path.join(process.env.HOME, '.nargo'));
        }
        if (process.env.USERPROFILE) {
            cacheLocations.push(path.join(process.env.USERPROFILE, '.nargo'));
        }
        
        cacheLocations.forEach(cachePath => {
            if (removeDirectory(cachePath)) {
                removed++;
            }
        });
    }
    
    return { removed, errors: 0 };
}

function cleanAllArtifacts() {
    log('🚀 Starting comprehensive cleanup...', 'CLEAN');
    
    const startTime = Date.now();
    let totalRemoved = 0;
    let totalErrors = 0;
    
    if (CONFIG.dryRun) {
        log('🔍 DRY RUN MODE - No files will be deleted', 'WARN');
    }
    
    // Clean individual circuits
    CIRCUITS.forEach(circuit => {
        const result = cleanCircuitArtifacts(circuit);
        totalRemoved += result.removed;
        totalErrors += result.errors;
    });
    
    // Clean global artifacts
    const globalResult = cleanGlobalArtifacts();
    totalRemoved += globalResult.removed;
    totalErrors += globalResult.errors;
    
    // Clean Nargo cache
    const cacheResult = cleanNargoCache();
    totalRemoved += cacheResult.removed;
    totalErrors += cacheResult.errors;
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Summary
    log('\n📊 Cleanup Results:', 'CLEAN');
    log('═══════════════════════════════════════');
    
    if (CONFIG.dryRun) {
        log(`🔍 DRY RUN: Would have processed ${totalRemoved} items`, 'INFO');
    } else {
        log(`✅ Removed: ${totalRemoved} items`, 'SUCCESS');
        if (totalErrors > 0) {
            log(`❌ Errors: ${totalErrors} items`, 'ERROR');
        }
    }
    
    log(`⏱️  Duration: ${duration}ms`, 'INFO');
    
    if (CONFIG.keepSamples && !CONFIG.dryRun) {
        log('\n💡 Sample input files preserved (use --all to remove)', 'INFO');
    }
    
    return { totalRemoved, totalErrors, duration };
}

function showHelp() {
    console.log(`
ZK Circuit Artifacts Cleanup Tool

Usage: node clean-artifacts.js [options]

Options:
  -v, --verbose        Enable verbose logging
  -n, --dry-run        Show what would be deleted without deleting
  -f, --force          Force removal of all files
  -a, --all            Remove everything including sample inputs
  -h, --help           Show this help message

What gets cleaned by default:
  ✓ Circuit target/ directories
  ✓ Generated proofs (.proof, .witness)
  ✓ Artifacts directory contents
  ✓ Verification keys
  ✓ Cache files (.nargo-cache)
  ✓ Temporary files (*.tmp, *.temp, *.log)
  ✗ Sample input files (*_inputs.json) - preserved

With --all flag:
  ✓ Everything above
  ✓ Sample input files
  ✓ All JSON files in proofs/

Examples:
  node clean-artifacts.js                    # Clean artifacts, keep samples
  node clean-artifacts.js --dry-run          # Preview what will be deleted
  node clean-artifacts.js --all              # Clean everything including samples
  node clean-artifacts.js --verbose --all    # Verbose cleanup of everything

Directories affected:
  - ${CIRCUITS_DIR}
  - ${PROOFS_DIR}
  - ${VERIFIERS_DIR}  
  - ${ARTIFACTS_DIR}
  - Cache locations
`);
}

// Main execution
if (require.main === module) {
    if (process.argv.includes('--help') || process.argv.includes('-h')) {
        showHelp();
        process.exit(0);
    }
    
    try {
        const result = cleanAllArtifacts();
        
        if (CONFIG.dryRun) {
            log('\n✅ Dry run completed successfully!', 'SUCCESS');
            process.exit(0);
        } else if (result.totalErrors === 0) {
            log('\n✅ Cleanup completed successfully!', 'SUCCESS');
            process.exit(0);
        } else {
            log('\n⚠️  Cleanup completed with some errors', 'WARN');
            process.exit(1);
        }
        
    } catch (error) {
        log(`❌ Cleanup failed: ${error.message}`, 'ERROR');
        if (CONFIG.verbose) {
            console.error(error.stack);
        }
        process.exit(1);
    }
}

module.exports = {
    cleanCircuitArtifacts,
    cleanGlobalArtifacts,
    cleanNargoCache,
    cleanAllArtifacts
};