#!/usr/bin/env node
/**
 * Setup ZK Circuits Development Environment
 * 
 * Initializes the development environment for ZK circuits including:
 * - Checking Nargo installation
 * - Setting up directories
 * - Initializing circuits
 * - Installing dependencies
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
            'SETUP': '\x1b[35m'
        };
        const resetColor = '\x1b[0m';
        const timestamp = new Date().toISOString();
        console.log(`${colors[level] || colors.INFO}[${timestamp}] ${level}: ${message}${resetColor}`);
    }
}

function checkNargoInstallation() {
    log('🔍 Checking Nargo installation...', 'SETUP');
    
    try {
        const version = execSync('nargo --version', { encoding: 'utf8' }).trim();
        log(`✅ Nargo found: ${version}`, 'SUCCESS');
        return true;
    } catch (error) {
        log('❌ Nargo not found! Please install Nargo first.', 'ERROR');
        log('   Visit: https://noir-lang.org/getting_started/nargo_installation', 'ERROR');
        log('   Or run: curl -L https://raw.githubusercontent.com/noir-lang/noirup/main/install | bash', 'ERROR');
        return false;
    }
}

function createDirectories() {
    log('📁 Creating directory structure...', 'SETUP');
    
    const directories = [
        PROOFS_DIR,
        VERIFIERS_DIR,
        ARTIFACTS_DIR,
        path.join(ARTIFACTS_DIR, 'witnesses'),
        path.join(ARTIFACTS_DIR, 'proofs'),
        path.join(ARTIFACTS_DIR, 'verification_keys'),
        path.join(ARTIFACTS_DIR, 'public_inputs')
    ];
    
    directories.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            log(`   Created: ${path.relative(ZK_DIR, dir)}`, 'SUCCESS');
        } else {
            log(`   Exists: ${path.relative(ZK_DIR, dir)}`, CONFIG.verbose ? 'INFO' : null);
        }
    });
}

function checkCircuitStructure() {
    log('🔧 Checking circuit structure...', 'SETUP');
    
    let allValid = true;
    
    CIRCUITS.forEach(circuit => {
        const circuitPath = path.join(CIRCUITS_DIR, circuit);
        const manifestPath = path.join(circuitPath, 'Nargo.toml');
        const srcPath = path.join(circuitPath, 'src');
        const mainPath = path.join(srcPath, 'main.nr');
        
        if (!fs.existsSync(circuitPath)) {
            log(`   ❌ Circuit directory missing: ${circuit}`, 'ERROR');
            allValid = false;
        } else if (!fs.existsSync(manifestPath)) {
            log(`   ❌ Nargo.toml missing for: ${circuit}`, 'ERROR');
            allValid = false;
        } else if (!fs.existsSync(mainPath)) {
            log(`   ❌ main.nr missing for: ${circuit}`, 'ERROR');
            allValid = false;
        } else {
            log(`   ✅ ${circuit} structure valid`, 'SUCCESS');
        }
    });
    
    return allValid;
}

function initializeCircuits() {
    log('⚙️  Initializing circuits...', 'SETUP');
    
    let successful = 0;
    
    CIRCUITS.forEach(circuit => {
        const circuitPath = path.join(CIRCUITS_DIR, circuit);
        
        if (!fs.existsSync(circuitPath)) {
            log(`   ⚠️  Skipping missing circuit: ${circuit}`, 'WARN');
            return;
        }
        
        try {
            // Check circuit by trying to compile
            log(`   Checking: ${circuit}`);
            
            const result = execSync(`nargo check --manifest-path "${path.join(circuitPath, 'Nargo.toml')}"`, {
                encoding: 'utf8',
                cwd: circuitPath,
                stdio: 'pipe'
            });
            
            log(`   ✅ ${circuit} initialized successfully`, 'SUCCESS');
            successful++;
            
        } catch (error) {
            log(`   ❌ Failed to initialize ${circuit}: ${error.message}`, 'ERROR');
            if (CONFIG.verbose) {
                log(`      Error details: ${error.stderr}`, 'ERROR');
            }
        }
    });
    
    log(`📊 Initialized ${successful}/${CIRCUITS.length} circuits`, successful === CIRCUITS.length ? 'SUCCESS' : 'WARN');
    return successful === CIRCUITS.length;
}

function createGitignore() {
    log('📄 Creating .gitignore...', 'SETUP');
    
    const gitignorePath = path.join(ZK_DIR, '.gitignore');
    const gitignoreContent = `# ZK Circuit Artifacts
target/
proofs/*.proof
proofs/*.witness
artifacts/witnesses/
artifacts/proofs/
artifacts/verification_keys/
artifacts/public_inputs/

# Temporary files
*.tmp
*.temp
.cache/

# IDE files
.vscode/
.idea/

# OS files
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Dependencies
node_modules/

# Optional: Keep sample input files but ignore generated ones
# Uncomment these if you want to ignore all proof files:
# proofs/*.json
# verifiers/*.json
`;
    
    if (!fs.existsSync(gitignorePath) || CONFIG.force) {
        fs.writeFileSync(gitignorePath, gitignoreContent);
        log(`   ✅ Created .gitignore`, 'SUCCESS');
    } else {
        log(`   ⚠️  .gitignore exists, skipping (use --force to overwrite)`, 'WARN');
    }
}

function createReadme() {
    log('📖 Creating README...', 'SETUP');
    
    const readmePath = path.join(ZK_DIR, 'README.md');
    const readmeContent = `# ZK Circuits for Business Verification

This directory contains Zero Knowledge circuits for privacy-preserving business verification using Noir.

## Quick Start

\`\`\`bash
# Setup environment
npm run zk:setup

# Compile all circuits
npm run zk:compile

# Run tests
npm run zk:test

# Generate proofs
npm run zk:prove --all

# Verify proofs
npm run zk:verify --all
\`\`\`

## Circuits

1. **business_registration**: Verifies business registration status
2. **ubo_proof**: Proves Ultimate Beneficial Ownership compliance
3. **revenue_threshold**: Verifies revenue meets minimum threshold
4. **document_hash_proof**: Validates document authenticity
5. **composite_business_proof**: Combined verification of all business requirements

## Directory Structure

\`\`\`
zk/
├── noir-circuits/           # Circuit source code
│   ├── business_registration/
│   ├── ubo_proof/
│   ├── revenue_threshold/
│   ├── document_hash_proof/
│   └── composite_business_proof/
├── scripts/                 # Build and deployment scripts
├── proofs/                  # Sample inputs and generated proofs
├── verifiers/              # Verification keys and artifacts
└── artifacts/              # Compilation outputs
\`\`\`

## Development Scripts

### Cross-Platform Commands

\`\`\`bash
# Node.js scripts (cross-platform)
npm run zk:compile         # Compile all circuits
npm run zk:test           # Run circuit tests
npm run zk:prove          # Generate proofs
npm run zk:verify         # Verify proofs
npm run zk:setup          # Setup environment
npm run zk:clean          # Clean artifacts

# Windows PowerShell scripts
npm run zk:compile:win    # Compile (PowerShell)
npm run zk:test:win      # Test (PowerShell)
npm run zk:prove:win     # Prove (PowerShell)
npm run zk:verify:win    # Verify (PowerShell)
\`\`\`

### Manual Script Usage

\`\`\`bash
# Node.js
node scripts/compile-all.js --parallel
node scripts/test-all.js --integration
node scripts/generate-proof.js --circuit=composite_business_proof
node scripts/verify-proof.js --all

# PowerShell
.\\scripts\\compile-all.ps1 -Parallel
.\\scripts\\test-all.ps1 -Integration
.\\scripts\\generate-proof.ps1 -Circuit composite_business_proof
.\\scripts\\verify-proof.ps1 -All
\`\`\`

## Requirements

- [Nargo](https://noir-lang.org/getting_started/nargo_installation) (Latest stable)
- Node.js 16+
- PowerShell 5.1+ (Windows only)

## Sample Inputs

Sample JSON input files are provided in the \`proofs/\` directory for testing:

- \`business_registration_inputs.json\`
- \`ubo_proof_inputs.json\`
- \`revenue_threshold_inputs.json\`
- \`document_hash_proof_inputs.json\`
- \`composite_business_proof_inputs.json\`

## Integration with DVote

These circuits integrate with the DVote governance system to provide:

- Privacy-preserving business verification
- Compliance checking without revealing sensitive data
- Cryptographic proofs for DAO membership eligibility
- Trustless verification of business credentials

## Development

1. Modify circuits in \`noir-circuits/\`
2. Update sample inputs in \`proofs/\`
3. Run tests to validate changes
4. Generate and verify proofs
5. Export artifacts for frontend integration

## Troubleshooting

### Common Issues

1. **Nargo not found**: Install Nargo following the official guide
2. **Compilation errors**: Check circuit syntax and dependencies
3. **Proof generation fails**: Verify input format and circuit constraints
4. **Windows script execution**: Enable PowerShell execution policy

### Getting Help

- Check circuit-specific README files
- Review sample inputs for proper format
- Use \`--verbose\` flag for detailed logging
- Consult [Noir documentation](https://noir-lang.org/docs)
`;
    
    if (!fs.existsSync(readmePath) || CONFIG.force) {
        fs.writeFileSync(readmePath, readmeContent);
        log(`   ✅ Created README.md`, 'SUCCESS');
    } else {
        log(`   ⚠️  README.md exists, skipping (use --force to overwrite)`, 'WARN');
    }
}

function checkWorkspaceToml() {
    log('🔧 Checking workspace configuration...', 'SETUP');
    
    const workspaceTomlPath = path.join(ZK_DIR, 'Nargo.toml');
    
    if (fs.existsSync(workspaceTomlPath)) {
        try {
            const content = fs.readFileSync(workspaceTomlPath, 'utf8');
            log(`   ✅ Workspace Nargo.toml exists`, 'SUCCESS');
            
            // Check if all circuits are included
            CIRCUITS.forEach(circuit => {
                if (content.includes(`"noir-circuits/${circuit}"`)) {
                    if (CONFIG.verbose) {
                        log(`   ✓ ${circuit} included in workspace`);
                    }
                } else {
                    log(`   ⚠️  ${circuit} not found in workspace`, 'WARN');
                }
            });
            
        } catch (error) {
            log(`   ❌ Error reading workspace Nargo.toml: ${error.message}`, 'ERROR');
        }
    } else {
        log(`   ⚠️  Workspace Nargo.toml not found`, 'WARN');
        log(`   Consider creating one to manage all circuits together`, 'INFO');
    }
}

function displaySummary() {
    log('\n🎉 ZK Circuits Setup Complete!', 'SUCCESS');
    log('═══════════════════════════════════════', 'SUCCESS');
    
    log('\n📋 Next Steps:');
    log('   1. Compile circuits: npm run zk:compile');
    log('   2. Run tests: npm run zk:test');
    log('   3. Generate proofs: npm run zk:prove --all');
    log('   4. Verify proofs: npm run zk:verify --all');
    
    log('\n📁 Directory Structure:');
    log(`   ZK Root: ${ZK_DIR}`);
    log(`   Circuits: ${CIRCUITS_DIR}`);
    log(`   Proofs: ${PROOFS_DIR}`);
    log(`   Verifiers: ${VERIFIERS_DIR}`);
    log(`   Artifacts: ${ARTIFACTS_DIR}`);
    
    log('\n🔗 Available Circuits:');
    CIRCUITS.forEach(circuit => {
        const circuitPath = path.join(CIRCUITS_DIR, circuit);
        const status = fs.existsSync(circuitPath) ? '✅' : '❌';
        log(`   ${status} ${circuit}`);
    });
    
    log('\n💡 Tips:');
    log('   • Use --verbose for detailed output');
    log('   • Use --force to overwrite existing files');
    log('   • Check README.md for complete documentation');
    log('   • Sample inputs are in proofs/ directory');
}

function showHelp() {
    console.log(`
ZK Circuits Setup Tool

Usage: node setup-circuits.js [options]

Options:
  -v, --verbose        Enable verbose logging
  -f, --force          Force overwrite existing files
  -h, --help           Show this help message

What this script does:
  1. ✓ Check Nargo installation
  2. ✓ Create directory structure
  3. ✓ Validate circuit structure
  4. ✓ Initialize circuits
  5. ✓ Create .gitignore
  6. ✓ Create README.md
  7. ✓ Check workspace configuration
  8. ✓ Display setup summary

Examples:
  node setup-circuits.js
  node setup-circuits.js --verbose
  node setup-circuits.js --force --verbose

Requirements:
  - Nargo (install from https://noir-lang.org)
  - Node.js 16+
  - Existing circuit directories in noir-circuits/
`);
}

// Main execution
if (require.main === module) {
    if (process.argv.includes('--help') || process.argv.includes('-h')) {
        showHelp();
        process.exit(0);
    }
    
    log('🚀 Starting ZK Circuits Setup...', 'SETUP');
    
    try {
        // Step 1: Check Nargo
        if (!checkNargoInstallation()) {
            process.exit(1);
        }
        
        // Step 2: Create directories
        createDirectories();
        
        // Step 3: Check circuit structure
        const circuitsValid = checkCircuitStructure();
        if (!circuitsValid) {
            log('❌ Some circuits have invalid structure. Please fix before continuing.', 'ERROR');
            process.exit(1);
        }
        
        // Step 4: Initialize circuits
        const circuitsInitialized = initializeCircuits();
        if (!circuitsInitialized) {
            log('⚠️  Some circuits failed to initialize, but continuing...', 'WARN');
        }
        
        // Step 5: Create auxiliary files
        createGitignore();
        createReadme();
        
        // Step 6: Check workspace
        checkWorkspaceToml();
        
        // Step 7: Summary
        displaySummary();
        
        log('✅ Setup completed successfully!', 'SUCCESS');
        process.exit(0);
        
    } catch (error) {
        log(`❌ Setup failed: ${error.message}`, 'ERROR');
        if (CONFIG.verbose) {
            console.error(error.stack);
        }
        process.exit(1);
    }
}

module.exports = {
    checkNargoInstallation,
    createDirectories,
    checkCircuitStructure,
    initializeCircuits
};