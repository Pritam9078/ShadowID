#!/usr/bin/env node
/**
 * Composite Business Proof Circuit Integration Test
 * 
 * Tests the composite circuit with all policy combinations and scenarios
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Circuit directory
const CIRCUIT_DIR = path.resolve(__dirname, '../noir-circuits/composite_business_proof');

// Test configuration
const CONFIG = {
    verbose: true,
    cleanup: true,
    benchmarking: true
};

// Policy configurations to test
const POLICY_TESTS = [
    {
        name: 'Registration Only',
        policyId: 1,      // 0x1
        proverFile: 'Prover_registration_only.toml',
        description: 'Simple business registration verification',
        expectedCommitments: 1
    },
    {
        name: 'UBO Only', 
        policyId: 2,      // 0x2
        proverFile: 'Prover_ubo_only.toml',
        description: 'Ultimate beneficial owner verification',
        expectedCommitments: 1,
        requiresCustomProver: true
    },
    {
        name: 'Revenue Only',
        policyId: 4,      // 0x4
        proverFile: 'Prover_revenue_only.toml', 
        description: 'Revenue threshold verification',
        expectedCommitments: 1,
        requiresCustomProver: true
    },
    {
        name: 'Financial Compliance',
        policyId: 6,      // 0x6 = UBO + Revenue
        proverFile: 'Prover_financial_only.toml',
        description: 'UBO and revenue verification combined',
        expectedCommitments: 2
    },
    {
        name: 'Basic Business',
        policyId: 7,      // 0x7 = Registration + UBO + Revenue
        proverFile: 'Prover_basic_business.toml',
        description: 'Standard business verification without documents',
        expectedCommitments: 3
    },
    {
        name: 'Document Only',
        policyId: 8,      // 0x8
        proverFile: 'Prover_document_only.toml',
        description: 'Document possession verification',
        expectedCommitments: 1,
        requiresCustomProver: true
    },
    {
        name: 'Full Compliance',
        policyId: 15,     // 0xF = All checks
        proverFile: 'Prover.toml',
        description: 'Complete business verification with all checks',
        expectedCommitments: 4
    },
    {
        name: 'Secure Registration',
        policyId: 17,     // 0x11 = Registration + Wallet binding
        proverFile: 'Prover_secure_registration.toml',
        description: 'Registration with anti-replay protection',
        expectedCommitments: 1,
        requiresCustomProver: true
    }
];

// Helper functions
function log(message, level = 'INFO') {
    if (CONFIG.verbose) {
        const timestamp = new Date().toISOString();
        const colors = {
            'ERROR': '\x1b[31m',
            'WARN': '\x1b[33m', 
            'INFO': '\x1b[37m',
            'SUCCESS': '\x1b[32m',
            'PERF': '\x1b[36m'
        };
        const resetColor = '\x1b[0m';
        console.log(`${colors[level] || colors.INFO}[${timestamp}] ${level}: ${message}${resetColor}`);
    }
}

function createMissingProverFiles() {
    log('Creating missing Prover files for comprehensive testing...');
    
    // UBO Only Prover
    const uboOnlyProver = `# UBO Verification Only
# Policy ID: 0x2 = 2 = 00010 binary

commitments = [
    "0x2345678901bcdef02345678901bcdef02345678901bcdef02345678901bcdef0",
    "0x0000000000000000000000000000000000000000000000000000000000000000",
    "0x0000000000000000000000000000000000000000000000000000000000000000",
    "0x0000000000000000000000000000000000000000000000000000000000000000",
    "0x0000000000000000000000000000000000000000000000000000000000000000",
    "0x0000000000000000000000000000000000000000000000000000000000000000",
    "0x0000000000000000000000000000000000000000000000000000000000000000",
    "0x0000000000000000000000000000000000000000000000000000000000000000",
    "0x0000000000000000000000000000000000000000000000000000000000000000",
    "0x0000000000000000000000000000000000000000000000000000000000000000"
]

policy_id = "2"
nonce = "1734567890123456789"
wallet_bind = "0"

# Registration (unused)
reg_issuer = "0x0000000000000000000000000000000000000000"
reg_issued_at = "0"
reg_expiry = "0"

# UBO parameters
ubo_threshold = "25"
ubo_merkle_root = "0x0000000000000000000000000000000000000000000000000000000000000000"

# Revenue (unused)
revenue_min_threshold = "0"
revenue_max_threshold = "0"
revenue_scaling_factor = "1"

# Document (unused)
doc_type_required = "0"

# Private inputs
reg_business_id = "0x0000000000000000000000000000000000000000000000000000000000000000"
reg_salt = "0x0000000000000000000000000000000000000000000000000000000000000000"
reg_registration_hash = "0x0000000000000000000000000000000000000000000000000000000000000000"

ubo_salt = "0x4444444444444444444444444444444444444444444444444444444444444444"
ubo_shares = ["30", "25", "20", "15", "10", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0"]
ubo_merkle_path = ["0x0", "0x0", "0x0", "0x0", "0x0", "0x0", "0x0", "0x0"]
ubo_merkle_indices = ["0", "0", "0", "0", "0", "0", "0", "0"]
ubo_proof_mode = "0"

revenue_salt = "0x0000000000000000000000000000000000000000000000000000000000000000"
revenue_actual = "0"
revenue_fiscal_year = "2024"

doc_salt = "0x0000000000000000000000000000000000000000000000000000000000000000"
doc_hash_raw = "0x0000000000000000000000000000000000000000000000000000000000000000"
doc_type_actual = "0"

wallet_private = "0x0000000000000000000000000000000000000000000000000000000000000000"`;

    // Revenue Only Prover
    const revenueOnlyProver = `# Revenue Verification Only
# Policy ID: 0x4 = 4 = 00100 binary

commitments = [
    "0x3456789012cdef123456789012cdef123456789012cdef123456789012cdef12",
    "0x0000000000000000000000000000000000000000000000000000000000000000",
    "0x0000000000000000000000000000000000000000000000000000000000000000",
    "0x0000000000000000000000000000000000000000000000000000000000000000",
    "0x0000000000000000000000000000000000000000000000000000000000000000",
    "0x0000000000000000000000000000000000000000000000000000000000000000",
    "0x0000000000000000000000000000000000000000000000000000000000000000",
    "0x0000000000000000000000000000000000000000000000000000000000000000",
    "0x0000000000000000000000000000000000000000000000000000000000000000",
    "0x0000000000000000000000000000000000000000000000000000000000000000"
]

policy_id = "4"
nonce = "1734567890123456789"
wallet_bind = "0"

# Registration (unused)
reg_issuer = "0x0000000000000000000000000000000000000000"
reg_issued_at = "0"
reg_expiry = "0"

# UBO (unused)
ubo_threshold = "0"
ubo_merkle_root = "0x0000000000000000000000000000000000000000000000000000000000000000"

# Revenue parameters
revenue_min_threshold = "100000"
revenue_max_threshold = "0"
revenue_scaling_factor = "100"

# Document (unused)
doc_type_required = "0"

# Private inputs
reg_business_id = "0x0000000000000000000000000000000000000000000000000000000000000000"
reg_salt = "0x0000000000000000000000000000000000000000000000000000000000000000"
reg_registration_hash = "0x0000000000000000000000000000000000000000000000000000000000000000"

ubo_salt = "0x0000000000000000000000000000000000000000000000000000000000000000"
ubo_shares = ["0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0"]
ubo_merkle_path = ["0x0", "0x0", "0x0", "0x0", "0x0", "0x0", "0x0", "0x0"]
ubo_merkle_indices = ["0", "0", "0", "0", "0", "0", "0", "0"]
ubo_proof_mode = "0"

revenue_salt = "0x5555555555555555555555555555555555555555555555555555555555555555"
revenue_actual = "1500"
revenue_fiscal_year = "2024"

doc_salt = "0x0000000000000000000000000000000000000000000000000000000000000000"
doc_hash_raw = "0x0000000000000000000000000000000000000000000000000000000000000000"
doc_type_actual = "0"

wallet_private = "0x0000000000000000000000000000000000000000000000000000000000000000"`;

    // Document Only Prover
    const documentOnlyProver = `# Document Verification Only
# Policy ID: 0x8 = 8 = 01000 binary

commitments = [
    "0x456789013def2345456789013def2345456789013def2345456789013def2345",
    "0x0000000000000000000000000000000000000000000000000000000000000000",
    "0x0000000000000000000000000000000000000000000000000000000000000000",
    "0x0000000000000000000000000000000000000000000000000000000000000000",
    "0x0000000000000000000000000000000000000000000000000000000000000000",
    "0x0000000000000000000000000000000000000000000000000000000000000000",
    "0x0000000000000000000000000000000000000000000000000000000000000000",
    "0x0000000000000000000000000000000000000000000000000000000000000000",
    "0x0000000000000000000000000000000000000000000000000000000000000000",
    "0x0000000000000000000000000000000000000000000000000000000000000000"
]

policy_id = "8"
nonce = "1734567890123456789"
wallet_bind = "0"

# Registration (unused)
reg_issuer = "0x0000000000000000000000000000000000000000"
reg_issued_at = "0"
reg_expiry = "0"

# UBO (unused)
ubo_threshold = "0"
ubo_merkle_root = "0x0000000000000000000000000000000000000000000000000000000000000000"

# Revenue (unused)
revenue_min_threshold = "0"
revenue_max_threshold = "0"
revenue_scaling_factor = "1"

# Document parameters
doc_type_required = "4"

# Private inputs
reg_business_id = "0x0000000000000000000000000000000000000000000000000000000000000000"
reg_salt = "0x0000000000000000000000000000000000000000000000000000000000000000"
reg_registration_hash = "0x0000000000000000000000000000000000000000000000000000000000000000"

ubo_salt = "0x0000000000000000000000000000000000000000000000000000000000000000"
ubo_shares = ["0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0"]
ubo_merkle_path = ["0x0", "0x0", "0x0", "0x0", "0x0", "0x0", "0x0", "0x0"]
ubo_merkle_indices = ["0", "0", "0", "0", "0", "0", "0", "0"]
ubo_proof_mode = "0"

revenue_salt = "0x0000000000000000000000000000000000000000000000000000000000000000"
revenue_actual = "0"
revenue_fiscal_year = "2024"

doc_salt = "0x6666666666666666666666666666666666666666666666666666666666666666"
doc_hash_raw = "0x7777777777777777777777777777777777777777777777777777777777777777"
doc_type_actual = "4"

wallet_private = "0x0000000000000000000000000000000000000000000000000000000000000000"`;

    // Secure Registration Prover
    const secureRegistrationProver = `# Secure Registration with Wallet Binding
# Policy ID: 0x11 = 17 = 10001 binary

commitments = [
    "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    "0x0000000000000000000000000000000000000000000000000000000000000000",
    "0x0000000000000000000000000000000000000000000000000000000000000000",
    "0x0000000000000000000000000000000000000000000000000000000000000000",
    "0x0000000000000000000000000000000000000000000000000000000000000000",
    "0x0000000000000000000000000000000000000000000000000000000000000000",
    "0x0000000000000000000000000000000000000000000000000000000000000000",
    "0x0000000000000000000000000000000000000000000000000000000000000000",
    "0x0000000000000000000000000000000000000000000000000000000000000000",
    "0x0000000000000000000000000000000000000000000000000000000000000000"
]

policy_id = "17"
nonce = "1734567890123456789"
wallet_bind = "0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba"

# Registration parameters
reg_issuer = "0xabcdef1234567890abcdef1234567890abcdef12"
reg_issued_at = "1704067200"
reg_expiry = "1767225600"

# UBO (unused)
ubo_threshold = "0"
ubo_merkle_root = "0x0000000000000000000000000000000000000000000000000000000000000000"

# Revenue (unused)
revenue_min_threshold = "0"
revenue_max_threshold = "0"
revenue_scaling_factor = "1"

# Document (unused)
doc_type_required = "0"

# Private inputs
reg_business_id = "0x1111111111111111111111111111111111111111111111111111111111111111"
reg_salt = "0x2222222222222222222222222222222222222222222222222222222222222222"
reg_registration_hash = "0x3333333333333333333333333333333333333333333333333333333333333333"

ubo_salt = "0x0000000000000000000000000000000000000000000000000000000000000000"
ubo_shares = ["0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0"]
ubo_merkle_path = ["0x0", "0x0", "0x0", "0x0", "0x0", "0x0", "0x0", "0x0"]
ubo_merkle_indices = ["0", "0", "0", "0", "0", "0", "0", "0"]
ubo_proof_mode = "0"

revenue_salt = "0x0000000000000000000000000000000000000000000000000000000000000000"
revenue_actual = "0"
revenue_fiscal_year = "2024"

doc_salt = "0x0000000000000000000000000000000000000000000000000000000000000000"
doc_hash_raw = "0x0000000000000000000000000000000000000000000000000000000000000000"
doc_type_actual = "0"

wallet_private = "0x8888888888888888888888888888888888888888888888888888888888888888"`;

    // Write missing prover files
    const proverFiles = [
        { name: 'Prover_ubo_only.toml', content: uboOnlyProver },
        { name: 'Prover_revenue_only.toml', content: revenueOnlyProver },
        { name: 'Prover_document_only.toml', content: documentOnlyProver },
        { name: 'Prover_secure_registration.toml', content: secureRegistrationProver }
    ];

    proverFiles.forEach(file => {
        const filePath = path.join(CIRCUIT_DIR, file.name);
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, file.content);
            log(`Created ${file.name}`);
        }
    });
}

function runCircuit(proverFile) {
    try {
        log(`Using prover file: ${proverFile}`);
        
        // Copy prover file
        const sourcePath = path.join(CIRCUIT_DIR, proverFile);
        const targetPath = path.join(CIRCUIT_DIR, 'Prover.toml');
        
        if (!fs.existsSync(sourcePath)) {
            throw new Error(`Prover file not found: ${sourcePath}`);
        }
        
        fs.copyFileSync(sourcePath, targetPath);
        
        // Compile circuit
        execSync('nargo compile', { 
            cwd: CIRCUIT_DIR, 
            stdio: 'pipe' 
        });
        
        // Generate proof
        const proveResult = execSync('nargo prove', { 
            cwd: CIRCUIT_DIR, 
            encoding: 'utf8'
        });
        
        // Verify proof
        const verifyResult = execSync('nargo verify', { 
            cwd: CIRCUIT_DIR, 
            encoding: 'utf8'
        });
        
        return {
            success: true,
            proveOutput: proveResult,
            verifyOutput: verifyResult
        };
    } catch (error) {
        log(`Circuit execution failed: ${error.message}`, 'ERROR');
        return {
            success: false,
            error: error.message,
            stderr: error.stderr
        };
    }
}

function benchmarkTest(testFn, description) {
    if (!CONFIG.benchmarking) return testFn();
    
    const startTime = process.hrtime.bigint();
    const result = testFn();
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1_000_000; // Convert to milliseconds
    
    log(`⏱️  ${description}: ${duration.toFixed(2)}ms`, 'PERF');
    return result;
}

function testPolicyScenario(policyTest) {
    log(`\n🧪 Testing ${policyTest.name} (Policy ID: ${policyTest.policyId})...`);
    
    const testResult = {
        name: policyTest.name,
        policyId: policyTest.policyId,
        success: false,
        stages: {}
    };
    
    try {
        // Run circuit with policy
        const circuitResult = benchmarkTest(
            () => runCircuit(policyTest.proverFile),
            `Policy ${policyTest.policyId} execution`
        );
        
        if (!circuitResult.success) {
            testResult.error = circuitResult.error;
            log(`❌ ${policyTest.name}: ${circuitResult.error}`, 'ERROR');
            return testResult;
        }
        
        testResult.success = true;
        testResult.stages.circuit = true;
        
        log(`✅ ${policyTest.name}: Policy verification successful`, 'SUCCESS');
        
    } catch (error) {
        log(`❌ ${policyTest.name} failed: ${error.message}`, 'ERROR');
        testResult.error = error.message;
    }
    
    return testResult;
}

function testInvalidCases() {
    log('\n🚨 Testing Invalid Cases...');
    
    const invalidTests = [
        {
            name: 'Invalid Policy ID (32)',
            createProver: () => `policy_id = "32"  # Out of range
nonce = "1734567890123456789"
wallet_bind = "0"
commitments = ["0x0", "0x0", "0x0", "0x0", "0x0", "0x0", "0x0", "0x0", "0x0", "0x0"]
reg_issuer = "0x0000000000000000000000000000000000000000"
reg_issued_at = "0"
reg_expiry = "0"
ubo_threshold = "0"
ubo_merkle_root = "0x0000000000000000000000000000000000000000000000000000000000000000"
revenue_min_threshold = "0"
revenue_max_threshold = "0"
revenue_scaling_factor = "1"
doc_type_required = "0"
reg_business_id = "0x0000000000000000000000000000000000000000000000000000000000000000"
reg_salt = "0x0000000000000000000000000000000000000000000000000000000000000000"
reg_registration_hash = "0x0000000000000000000000000000000000000000000000000000000000000000"
ubo_salt = "0x0000000000000000000000000000000000000000000000000000000000000000"
ubo_shares = ["0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0"]
ubo_merkle_path = ["0x0", "0x0", "0x0", "0x0", "0x0", "0x0", "0x0", "0x0"]
ubo_merkle_indices = ["0", "0", "0", "0", "0", "0", "0", "0"]
ubo_proof_mode = "0"
revenue_salt = "0x0000000000000000000000000000000000000000000000000000000000000000"
revenue_actual = "0"
revenue_fiscal_year = "2024"
doc_salt = "0x0000000000000000000000000000000000000000000000000000000000000000"
doc_hash_raw = "0x0000000000000000000000000000000000000000000000000000000000000000"
doc_type_actual = "0"
wallet_private = "0x0000000000000000000000000000000000000000000000000000000000000000"`
        },
        {
            name: 'Zero Policy ID',
            createProver: () => `policy_id = "0"  # No checks enabled
nonce = "1734567890123456789"
wallet_bind = "0"
commitments = ["0x0", "0x0", "0x0", "0x0", "0x0", "0x0", "0x0", "0x0", "0x0", "0x0"]
reg_issuer = "0x0000000000000000000000000000000000000000"
reg_issued_at = "0"
reg_expiry = "0"
ubo_threshold = "0"
ubo_merkle_root = "0x0000000000000000000000000000000000000000000000000000000000000000"
revenue_min_threshold = "0"
revenue_max_threshold = "0"
revenue_scaling_factor = "1"
doc_type_required = "0"
reg_business_id = "0x0000000000000000000000000000000000000000000000000000000000000000"
reg_salt = "0x0000000000000000000000000000000000000000000000000000000000000000"
reg_registration_hash = "0x0000000000000000000000000000000000000000000000000000000000000000"
ubo_salt = "0x0000000000000000000000000000000000000000000000000000000000000000"
ubo_shares = ["0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0", "0"]
ubo_merkle_path = ["0x0", "0x0", "0x0", "0x0", "0x0", "0x0", "0x0", "0x0"]
ubo_merkle_indices = ["0", "0", "0", "0", "0", "0", "0", "0"]
ubo_proof_mode = "0"
revenue_salt = "0x0000000000000000000000000000000000000000000000000000000000000000"
revenue_actual = "0"
revenue_fiscal_year = "2024"
doc_salt = "0x0000000000000000000000000000000000000000000000000000000000000000"
doc_hash_raw = "0x0000000000000000000000000000000000000000000000000000000000000000"
doc_type_actual = "0"
wallet_private = "0x0000000000000000000000000000000000000000000000000000000000000000"`
        }
    ];
    
    const errorResults = [];
    
    for (const test of invalidTests) {
        log(`Testing: ${test.name}`);
        
        try {
            // Create invalid Prover.toml
            const proverContent = test.createProver();
            fs.writeFileSync(
                path.join(CIRCUIT_DIR, 'Prover.toml'),
                proverContent
            );
            
            // Try to prove (should fail)
            const result = runCircuit('Prover.toml');
            
            if (result.success) {
                log(`❌ ${test.name}: Expected failure but test passed`, 'ERROR');
                errorResults.push({ test: test.name, success: false, reason: 'Unexpected success' });
            } else {
                log(`✅ ${test.name}: Correctly failed as expected`, 'SUCCESS');
                errorResults.push({ test: test.name, success: true });
            }
            
        } catch (error) {
            log(`✅ ${test.name}: Correctly failed with error`, 'SUCCESS');
            errorResults.push({ test: test.name, success: true });
        }
    }
    
    return errorResults;
}

async function runCompositeTests() {
    log('🚀 Starting Composite Business Proof Integration Tests\n');
    
    // Backup original Prover.toml if it exists
    const originalProver = path.join(CIRCUIT_DIR, 'Prover.toml');
    const backupProver = path.join(CIRCUIT_DIR, 'Prover.toml.backup');
    if (fs.existsSync(originalProver)) {
        fs.copyFileSync(originalProver, backupProver);
    }
    
    const testResults = {
        startTime: new Date(),
        policyTests: [],
        errorTests: [],
        summary: {}
    };
    
    try {
        // Create missing prover files
        createMissingProverFiles();
        
        // Test each policy configuration
        for (const policyTest of POLICY_TESTS) {
            const result = testPolicyScenario(policyTest);
            testResults.policyTests.push(result);
        }
        
        // Test error cases
        const errorResults = testInvalidCases();
        testResults.errorTests = errorResults;
        
        // Generate summary
        const successful = testResults.policyTests.filter(t => t.success).length;
        const total = testResults.policyTests.length;
        const errorSuccessful = testResults.errorTests.filter(t => t.success).length;
        const errorTotal = testResults.errorTests.length;
        
        testResults.summary = {
            policyTests: { successful, total, rate: (successful/total * 100).toFixed(1) },
            errorTests: { successful: errorSuccessful, total: errorTotal, rate: (errorSuccessful/errorTotal * 100).toFixed(1) },
            overallSuccess: successful === total && errorSuccessful === errorTotal
        };
        
    } finally {
        // Cleanup
        if (CONFIG.cleanup) {
            // Restore original Prover.toml
            if (fs.existsSync(backupProver)) {
                fs.copyFileSync(backupProver, originalProver);
                fs.unlinkSync(backupProver);
            }
        }
        
        testResults.endTime = new Date();
        testResults.duration = testResults.endTime - testResults.startTime;
    }
    
    // Print results
    log('\n📊 Composite Circuit Test Results');
    log('═══════════════════════════════════════');
    log(`Policy Tests: ${testResults.summary.policyTests.successful}/${testResults.summary.policyTests.total} (${testResults.summary.policyTests.rate}%)`);
    log(`Error Tests: ${testResults.summary.errorTests.successful}/${testResults.summary.errorTests.total} (${testResults.summary.errorTests.rate}%)`);
    log(`Total Duration: ${testResults.duration}ms`);
    log(`Overall Success: ${testResults.summary.overallSuccess ? '✅ PASS' : '❌ FAIL'}`, testResults.summary.overallSuccess ? 'SUCCESS' : 'ERROR');
    
    // Detailed results
    if (!testResults.summary.overallSuccess) {
        log('\n❌ Failed Tests:');
        testResults.policyTests.filter(t => !t.success).forEach(t => {
            log(`  - ${t.name}: ${t.error || 'Unknown error'}`);
        });
        testResults.errorTests.filter(t => !t.success).forEach(t => {
            log(`  - ${t.test}: ${t.reason || 'Unknown error'}`);
        });
    }
    
    log('\n🎯 Policy Coverage Summary:');
    POLICY_TESTS.forEach(test => {
        const result = testResults.policyTests.find(r => r.name === test.name);
        const status = result?.success ? '✅' : '❌';
        log(`  ${status} Policy ${test.policyId} (0x${test.policyId.toString(16)}): ${test.description}`);
    });
    
    log('\n🏁 Composite circuit tests completed');
    return testResults;
}

// Run tests if called directly
if (require.main === module) {
    runCompositeTests()
        .then(results => {
            process.exit(results.summary.overallSuccess ? 0 : 1);
        })
        .catch(error => {
            console.error('Composite test failed:', error);
            process.exit(1);
        });
}

module.exports = {
    runCompositeTests,
    POLICY_TESTS,
    testPolicyScenario
};