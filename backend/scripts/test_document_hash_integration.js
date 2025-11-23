#!/usr/bin/env node
/**
 * Document Hash Proof Integration Test
 * 
 * Comprehensive testing of the document hash proof circuit with:
 * - Multiple document types
 * - Real file processing
 * - End-to-end workflow validation
 * - Error case testing
 * - Performance benchmarking
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

// Circuit directory
const CIRCUIT_DIR = path.resolve(__dirname, '../noir-circuits/document_hash_proof');
const SCRIPTS_DIR = path.resolve(__dirname);

// Test configuration
const TEST_CONFIG = {
    verbose: true,
    cleanup: true,
    benchmarking: true
};

// Document test samples
const TEST_DOCUMENTS = [
    {
        name: 'incorporation_cert.txt',
        content: `CERTIFICATE OF INCORPORATION
        
Company Name: TechCorp Inc.
Registration Number: 123456789
Date of Incorporation: January 15, 2024
State: Delaware
Business Purpose: Technology Services
Share Capital: 1,000,000 authorized shares

This certifies that TechCorp Inc. has been duly incorporated
under the laws of Delaware.

Secretary of State
Corporate Division`,
        docType: 1,
        description: 'Sample incorporation certificate'
    },
    {
        name: 'business_license.json',
        content: JSON.stringify({
            license_number: "BL2024-7891",
            business_name: "Green Energy Solutions LLC",
            license_type: "General Business License",
            issued_date: "2024-02-01",
            expiry_date: "2025-01-31",
            issuing_authority: "City Business Department",
            business_category: "Renewable Energy Services",
            address: "123 Solar Street, Green City, GC 12345",
            status: "Active"
        }, null, 2),
        docType: 2,
        description: 'Sample business license in JSON format'
    },
    {
        name: 'audit_report.txt',
        content: `INDEPENDENT AUDITOR'S REPORT

To the Board of Directors
DataCorp Technologies Inc.

Opinion
We have audited the financial statements of DataCorp Technologies Inc.
as of December 31, 2023, and for the year then ended.

In our opinion, the financial statements present fairly, in all
material respects, the financial position of DataCorp Technologies Inc.
as of December 31, 2023.

Basis for Opinion
We conducted our audit in accordance with Generally Accepted Auditing
Standards. Our responsibilities under those standards are described
in the Auditor's Responsibilities section.

Key Audit Matters
- Revenue Recognition for Software Licenses
- Valuation of Intangible Assets
- Assessment of Going Concern

Certified Public Accountants
March 15, 2024`,
        docType: 4,
        description: 'Sample audit report'
    },
    {
        name: 'financial_statement.txt',
        content: `CONSOLIDATED BALANCE SHEET
As of December 31, 2023
(Amounts in thousands)

ASSETS
Current Assets:
  Cash and cash equivalents         $2,150
  Accounts receivable, net          $1,890
  Inventory                         $3,245
  Prepaid expenses                   $456
Total Current Assets               $7,741

Non-Current Assets:
  Property, plant & equipment, net  $8,923
  Intangible assets, net           $4,567
  Goodwill                         $2,134
Total Non-Current Assets          $15,624

TOTAL ASSETS                      $23,365

LIABILITIES AND EQUITY
Current Liabilities:
  Accounts payable                 $1,234
  Accrued liabilities               $987
  Short-term debt                  $1,500
Total Current Liabilities         $3,721

Long-term debt                     $5,000
Total Liabilities                 $8,721

Shareholders' Equity              $14,644

TOTAL LIABILITIES AND EQUITY      $23,365`,
        docType: 5,
        description: 'Sample financial statement'
    },
    {
        name: 'compliance_cert.txt',
        content: `REGULATORY COMPLIANCE CERTIFICATE

Certificate Number: RC-2024-0892
Company: SecureTech Solutions Inc.
Regulation: SOC 2 Type II
Compliance Period: January 1, 2024 - December 31, 2024

This certificate confirms that SecureTech Solutions Inc.
has demonstrated compliance with SOC 2 security controls
for the period specified above.

Areas of Compliance:
- Security
- Availability  
- Processing Integrity
- Confidentiality
- Privacy

Issued by: CyberSec Assurance LLC
Date: March 1, 2024
Valid Until: February 28, 2025

Authorized Signature: Digital Certificate Authority`,
        docType: 6,
        description: 'Sample compliance certificate'
    }
];

// Helper functions
function log(message, level = 'INFO') {
    if (TEST_CONFIG.verbose) {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] ${level}: ${message}`);
    }
}

function createTestDocument(doc, tempDir) {
    const filePath = path.join(tempDir, doc.name);
    fs.writeFileSync(filePath, doc.content, 'utf8');
    log(`Created test document: ${doc.name} (${doc.content.length} bytes)`);
    return filePath;
}

function computeDocumentHash(filePath, docType, normalize = true) {
    try {
        const scriptPath = path.join(SCRIPTS_DIR, 'compute_document_hash.js');
        const cmd = `node "${scriptPath}" "${filePath}" --type ${docType}${normalize ? '' : ' --no-normalize'}`;
        
        log(`Computing hash: ${cmd}`);
        const result = execSync(cmd, { 
            encoding: 'utf8',
            cwd: CIRCUIT_DIR
        });
        
        // Parse the Prover.toml content
        if (fs.existsSync(path.join(CIRCUIT_DIR, 'Prover.toml'))) {
            const proverContent = fs.readFileSync(path.join(CIRCUIT_DIR, 'Prover.toml'), 'utf8');
            return {
                success: true,
                proverContent,
                output: result
            };
        } else {
            throw new Error('Prover.toml not generated');
        }
    } catch (error) {
        log(`Hash computation failed: ${error.message}`, 'ERROR');
        return {
            success: false,
            error: error.message
        };
    }
}

function runCircuit() {
    try {
        log('Compiling circuit...');
        execSync('nargo compile', { 
            cwd: CIRCUIT_DIR, 
            stdio: 'pipe' 
        });
        
        log('Generating proof...');
        const proveResult = execSync('nargo prove', { 
            cwd: CIRCUIT_DIR, 
            encoding: 'utf8'
        });
        
        log('Verifying proof...');
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
    if (!TEST_CONFIG.benchmarking) return testFn();
    
    const startTime = process.hrtime.bigint();
    const result = testFn();
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1_000_000; // Convert to milliseconds
    
    log(`⏱️  ${description}: ${duration.toFixed(2)}ms`, 'PERF');
    return result;
}

function testDocumentScenario(doc, tempDir) {
    log(`\n🧪 Testing ${doc.description}...`);
    
    const testResults = {
        document: doc.name,
        docType: doc.docType,
        success: false,
        stages: {}
    };
    
    try {
        // Stage 1: Create test document
        const filePath = benchmarkTest(
            () => createTestDocument(doc, tempDir),
            'Document creation'
        );
        testResults.stages.creation = true;
        
        // Stage 2: Compute document hash
        const hashResult = benchmarkTest(
            () => computeDocumentHash(filePath, doc.docType, true),
            'Hash computation'
        );
        
        if (!hashResult.success) {
            testResults.stages.hashing = false;
            testResults.error = hashResult.error;
            return testResults;
        }
        testResults.stages.hashing = true;
        
        // Stage 3: Run circuit proof and verification
        const circuitResult = benchmarkTest(
            () => runCircuit(),
            'Circuit execution'
        );
        
        if (!circuitResult.success) {
            testResults.stages.circuit = false;
            testResults.error = circuitResult.error;
            return testResults;
        }
        testResults.stages.circuit = true;
        
        testResults.success = true;
        log(`✅ ${doc.description} test passed`);
        
    } catch (error) {
        log(`❌ ${doc.description} test failed: ${error.message}`, 'ERROR');
        testResults.error = error.message;
    }
    
    return testResults;
}

function testErrorCases() {
    log('\n🚨 Testing Error Cases...');
    
    const errorTests = [
        {
            name: 'Invalid Document Type',
            proverContent: `
doc_commitment = "0x1234567890123456789012345678901234567890123456789012345678901234"
doc_type_code = "150"
enable_type_check = "1"
doc_hash_raw = "0x1234567890123456789012345678901234567890123456789012345678901234"
salt = "0x9876543210987654321098765432109876543210987654321098765432109876"
expected_doc_type = "1"
`,
            expectFailure: true
        },
        {
            name: 'Zero Salt',
            proverContent: `
doc_commitment = "0x1234567890123456789012345678901234567890123456789012345678901234"
doc_type_code = "1"
enable_type_check = "1"
doc_hash_raw = "0x1234567890123456789012345678901234567890123456789012345678901234"
salt = "0x0000000000000000000000000000000000000000000000000000000000000000"
expected_doc_type = "1"
`,
            expectFailure: true
        },
        {
            name: 'Type Mismatch',
            proverContent: `
doc_commitment = "0x1234567890123456789012345678901234567890123456789012345678901234"
doc_type_code = "1"
enable_type_check = "1"
doc_hash_raw = "0x1234567890123456789012345678901234567890123456789012345678901234"
salt = "0x9876543210987654321098765432109876543210987654321098765432109876"
expected_doc_type = "2"
`,
            expectFailure: true
        }
    ];
    
    const errorResults = [];
    
    for (const test of errorTests) {
        log(`Testing: ${test.name}`);
        
        try {
            // Write invalid Prover.toml
            fs.writeFileSync(
                path.join(CIRCUIT_DIR, 'Prover.toml'),
                test.proverContent
            );
            
            // Try to prove (should fail)
            const result = runCircuit();
            
            if (test.expectFailure && result.success) {
                log(`❌ ${test.name}: Expected failure but test passed`, 'ERROR');
                errorResults.push({ test: test.name, success: false, reason: 'Unexpected success' });
            } else if (test.expectFailure && !result.success) {
                log(`✅ ${test.name}: Correctly failed as expected`);
                errorResults.push({ test: test.name, success: true });
            } else {
                log(`❌ ${test.name}: Unexpected result`, 'ERROR');
                errorResults.push({ test: test.name, success: false, reason: 'Unexpected result' });
            }
            
        } catch (error) {
            if (test.expectFailure) {
                log(`✅ ${test.name}: Correctly failed with error`);
                errorResults.push({ test: test.name, success: true });
            } else {
                log(`❌ ${test.name}: Unexpected error: ${error.message}`, 'ERROR');
                errorResults.push({ test: test.name, success: false, reason: error.message });
            }
        }
    }
    
    return errorResults;
}

async function runIntegrationTests() {
    log('🚀 Starting Document Hash Proof Integration Tests\n');
    
    // Setup
    const tempDir = path.join(__dirname, 'temp_test_docs');
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Backup original Prover.toml if it exists
    const originalProver = path.join(CIRCUIT_DIR, 'Prover.toml');
    const backupProver = path.join(CIRCUIT_DIR, 'Prover.toml.backup');
    if (fs.existsSync(originalProver)) {
        fs.copyFileSync(originalProver, backupProver);
    }
    
    const testResults = {
        startTime: new Date(),
        documentTests: [],
        errorTests: [],
        summary: {}
    };
    
    try {
        // Test each document type
        for (const doc of TEST_DOCUMENTS) {
            const result = testDocumentScenario(doc, tempDir);
            testResults.documentTests.push(result);
        }
        
        // Test error cases
        const errorResults = testErrorCases();
        testResults.errorTests = errorResults;
        
        // Generate summary
        const successful = testResults.documentTests.filter(t => t.success).length;
        const total = testResults.documentTests.length;
        const errorSuccessful = testResults.errorTests.filter(t => t.success).length;
        const errorTotal = testResults.errorTests.length;
        
        testResults.summary = {
            documentTests: { successful, total, rate: (successful/total * 100).toFixed(1) },
            errorTests: { successful: errorSuccessful, total: errorTotal, rate: (errorSuccessful/errorTotal * 100).toFixed(1) },
            overallSuccess: successful === total && errorSuccessful === errorTotal
        };
        
    } finally {
        // Cleanup
        if (TEST_CONFIG.cleanup) {
            if (fs.existsSync(tempDir)) {
                fs.rmSync(tempDir, { recursive: true, force: true });
            }
            
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
    log('\n📊 Test Results Summary');
    log('═══════════════════════════════════════');
    log(`Document Tests: ${testResults.summary.documentTests.successful}/${testResults.summary.documentTests.total} (${testResults.summary.documentTests.rate}%)`);
    log(`Error Tests: ${testResults.summary.errorTests.successful}/${testResults.summary.errorTests.total} (${testResults.summary.errorTests.rate}%)`);
    log(`Total Duration: ${testResults.duration}ms`);
    log(`Overall Success: ${testResults.summary.overallSuccess ? '✅ PASS' : '❌ FAIL'}`);
    
    // Detailed results
    if (!testResults.summary.overallSuccess) {
        log('\n❌ Failed Tests:');
        testResults.documentTests.filter(t => !t.success).forEach(t => {
            log(`  - ${t.document}: ${t.error || 'Unknown error'}`);
        });
        testResults.errorTests.filter(t => !t.success).forEach(t => {
            log(`  - ${t.test}: ${t.reason || 'Unknown error'}`);
        });
    }
    
    log('\n🏁 Integration tests completed');
    return testResults;
}

// Run tests if called directly
if (require.main === module) {
    runIntegrationTests()
        .then(results => {
            process.exit(results.summary.overallSuccess ? 0 : 1);
        })
        .catch(error => {
            console.error('Integration test failed:', error);
            process.exit(1);
        });
}

module.exports = {
    runIntegrationTests,
    TEST_DOCUMENTS,
    testDocumentScenario,
    testErrorCases
};