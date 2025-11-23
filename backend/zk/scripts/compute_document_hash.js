#!/usr/bin/env node

/**
 * Document Hash Computation Helper
 * Computes SHA-256 hash of documents and converts to field elements for Noir circuits
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// BN254 field modulus (same as used in Noir circuits)
const FIELD_MODULUS = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');

// Document type constants (matching circuit definitions)
const DOC_TYPES = {
    INCORPORATION_CERT: 1,
    BUSINESS_LICENSE: 2,
    TAX_CERTIFICATE: 3,
    AUDIT_REPORT: 4,
    FINANCIAL_STATEMENT: 5,
    COMPLIANCE_CERT: 6,
    REGISTRATION_FORM: 7,
    IDENTITY_DOCUMENT: 8,
    OWNERSHIP_PROOF: 9,
    OTHER: 99
};

/**
 * Normalize document content for canonical hashing
 * @param {Buffer} buffer - Original document bytes
 * @param {string} fileExtension - File extension for type-specific normalization
 * @returns {Buffer} - Normalized document bytes
 */
function normalizeDocument(buffer, fileExtension) {
    const ext = fileExtension.toLowerCase();
    
    switch (ext) {
        case '.txt':
        case '.md':
        case '.csv':
            // Text files: normalize line endings and encoding
            return normalizeTextDocument(buffer);
            
        case '.json':
            // JSON: parse and stringify with consistent formatting
            return normalizeJsonDocument(buffer);
            
        case '.pdf':
        case '.docx':
        case '.xlsx':
            // Binary documents: use as-is (normalization would require complex libraries)
            console.warn(`Warning: Binary file ${ext} used without normalization`);
            return buffer;
            
        default:
            // Unknown type: use raw bytes
            console.warn(`Warning: Unknown file type ${ext}, using raw bytes`);
            return buffer;
    }
}

/**
 * Normalize text documents
 * @param {Buffer} buffer - Text document buffer
 * @returns {Buffer} - Normalized text buffer
 */
function normalizeTextDocument(buffer) {
    let text = buffer.toString('utf8');
    
    // Normalize line endings to LF
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // Trim trailing whitespace from lines
    text = text.split('\n').map(line => line.trimEnd()).join('\n');
    
    // Remove final trailing newline if present
    text = text.replace(/\n$/, '');
    
    // Convert back to buffer with consistent encoding
    return Buffer.from(text, 'utf8');
}

/**
 * Normalize JSON documents
 * @param {Buffer} buffer - JSON document buffer
 * @returns {Buffer} - Normalized JSON buffer
 */
function normalizeJsonDocument(buffer) {
    try {
        const jsonData = JSON.parse(buffer.toString('utf8'));
        
        // Stringify with consistent formatting (no whitespace, sorted keys)
        const normalizedJson = JSON.stringify(jsonData, Object.keys(jsonData).sort());
        
        return Buffer.from(normalizedJson, 'utf8');
    } catch (error) {
        console.error('Invalid JSON document, using raw bytes');
        return buffer;
    }
}

/**
 * Compute SHA-256 hash of document and convert to field element
 * @param {string} filePath - Path to document file
 * @param {boolean} normalize - Whether to apply normalization
 * @returns {object} - Hash information including field element representation
 */
function computeDocumentHash(filePath, normalize = true) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }
    
    // Read file
    let fileBuffer = fs.readFileSync(filePath);
    const fileExtension = path.extname(filePath);
    const fileSize = fileBuffer.length;
    
    console.log(`Processing file: ${filePath}`);
    console.log(`File size: ${fileSize} bytes`);
    console.log(`File type: ${fileExtension || 'unknown'}`);
    
    // Apply normalization if requested
    if (normalize) {
        console.log('Applying document normalization...');
        fileBuffer = normalizeDocument(fileBuffer, fileExtension);
        
        if (fileBuffer.length !== fileSize) {
            console.log(`Normalized size: ${fileBuffer.length} bytes`);
        }
    }
    
    // Compute SHA-256 hash
    const sha256Hash = crypto.createHash('sha256').update(fileBuffer).digest();
    const hashHex = sha256Hash.toString('hex');
    
    console.log(`SHA-256: ${hashHex}`);
    
    // Convert to field element (big-endian interpretation)
    const hashBigInt = BigInt('0x' + hashHex);
    
    // Check field modulus constraint
    if (hashBigInt >= FIELD_MODULUS) {
        throw new Error(`Hash value exceeds BN254 field modulus. Hash: ${hashBigInt}, Modulus: ${FIELD_MODULUS}`);
    }
    
    const fieldElement = hashBigInt.toString();
    console.log(`Field element: ${fieldElement}`);
    
    return {
        filePath,
        fileSize,
        normalizedSize: fileBuffer.length,
        sha256Hex: hashHex,
        sha256BigInt: hashBigInt,
        fieldElement: fieldElement,
        normalized: normalize
    };
}

/**
 * Generate cryptographically secure random salt
 * @param {number} bytes - Number of random bytes (default: 32)
 * @returns {string} - Hex-encoded random salt
 */
function generateSalt(bytes = 32) {
    const salt = crypto.randomBytes(bytes);
    return '0x' + salt.toString('hex');
}

/**
 * Generate random field element for salt
 * @returns {string} - Field element as string
 */
function generateFieldSalt() {
    let salt;
    do {
        salt = crypto.randomBytes(32);
        const saltBigInt = BigInt('0x' + salt.toString('hex'));
        if (saltBigInt < FIELD_MODULUS) {
            return saltBigInt.toString();
        }
    } while (true);
}

/**
 * Create document commitment using Poseidon hash (simulated)
 * Note: This is a placeholder - actual Poseidon hashing requires specialized libraries
 * @param {string} docHashField - Document hash as field element
 * @param {string} saltField - Salt as field element  
 * @returns {string} - Simulated commitment (in practice, use actual Poseidon implementation)
 */
function createCommitment(docHashField, saltField) {
    // Placeholder: In production, use actual Poseidon hash implementation
    // This is just for demonstration and testing
    const combined = docHashField + saltField;
    const sha256Commitment = crypto.createHash('sha256').update(combined).digest('hex');
    console.log('Warning: Using SHA-256 as Poseidon placeholder');
    return '0x' + sha256Commitment;
}

/**
 * Main CLI function
 */
function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log(`
Document Hash Computation Helper

Usage:
  node compute_document_hash.js <file_path> [options]

Options:
  --no-normalize    Skip document normalization
  --type <code>     Document type code (1-99)
  --salt <hex>      Use specific salt (hex string)
  --help            Show this help

Document Types:
  1  - Incorporation Certificate
  2  - Business License  
  3  - Tax Certificate
  4  - Audit Report
  5  - Financial Statement
  6  - Compliance Certificate
  7  - Registration Form
  8  - Identity Document
  9  - Ownership Proof
  99 - Other

Examples:
  node compute_document_hash.js ./document.pdf
  node compute_document_hash.js ./contract.json --type 7
  node compute_document_hash.js ./cert.pdf --no-normalize --salt 0x1234...
        `);
        process.exit(0);
    }
    
    const filePath = args[0];
    let normalize = true;
    let docType = null;
    let customSalt = null;
    
    // Parse command line arguments
    for (let i = 1; i < args.length; i++) {
        switch (args[i]) {
            case '--no-normalize':
                normalize = false;
                break;
            case '--type':
                docType = parseInt(args[++i]);
                if (isNaN(docType) || docType < 1 || docType > 99) {
                    console.error('Invalid document type. Must be 1-99.');
                    process.exit(1);
                }
                break;
            case '--salt':
                customSalt = args[++i];
                if (!customSalt.startsWith('0x')) {
                    console.error('Salt must be hex string starting with 0x');
                    process.exit(1);
                }
                break;
            case '--help':
                main(); // Show help
                break;
            default:
                console.error(`Unknown option: ${args[i]}`);
                process.exit(1);
        }
    }
    
    try {
        // Compute document hash
        const hashInfo = computeDocumentHash(filePath, normalize);
        
        // Generate or use provided salt
        const saltField = customSalt ? BigInt(customSalt).toString() : generateFieldSalt();
        
        // Create commitment (placeholder implementation)
        const commitment = createCommitment(hashInfo.fieldElement, saltField);
        
        console.log('\n--- Circuit Inputs ---');
        console.log(`doc_commitment = "${commitment}"`);
        console.log(`doc_type_code = "${docType || DOC_TYPES.OTHER}"`);
        console.log(`enable_type_check = "${docType ? 1 : 0}"`);
        console.log(`doc_hash_raw = "${hashInfo.fieldElement}"`);
        console.log(`salt = "${saltField}"`);
        console.log(`expected_doc_type = "${docType || DOC_TYPES.OTHER}"`);
        
        console.log('\n--- Summary ---');
        console.log(`File: ${hashInfo.filePath}`);
        console.log(`Size: ${hashInfo.fileSize} bytes${hashInfo.normalizedSize !== hashInfo.fileSize ? ` (${hashInfo.normalizedSize} normalized)` : ''}`);
        console.log(`SHA-256: ${hashInfo.sha256Hex}`);
        console.log(`Field Element: ${hashInfo.fieldElement}`);
        console.log(`Salt: ${saltField}`);
        console.log(`Commitment: ${commitment}`);
        console.log(`Document Type: ${docType ? `${docType} (${getDocTypeName(docType)})` : 'Not specified'}`);
        
        // Output Prover.toml format
        console.log('\n--- Prover.toml Format ---');
        console.log(`# Generated from: ${hashInfo.filePath}`);
        console.log(`doc_commitment = "${commitment}"`);
        console.log(`doc_type_code = "${docType || DOC_TYPES.OTHER}"`);
        console.log(`enable_type_check = "${docType ? 1 : 0}"`);
        console.log(`doc_hash_raw = "${hashInfo.fieldElement}"`);
        console.log(`salt = "${saltField}"`);
        console.log(`expected_doc_type = "${docType || DOC_TYPES.OTHER}"`);
        
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

/**
 * Get document type name from code
 * @param {number} code - Document type code
 * @returns {string} - Document type name
 */
function getDocTypeName(code) {
    const typeNames = {
        1: 'Incorporation Certificate',
        2: 'Business License',
        3: 'Tax Certificate', 
        4: 'Audit Report',
        5: 'Financial Statement',
        6: 'Compliance Certificate',
        7: 'Registration Form',
        8: 'Identity Document',
        9: 'Ownership Proof',
        99: 'Other'
    };
    return typeNames[code] || 'Unknown';
}

// Export functions for use as module
module.exports = {
    computeDocumentHash,
    generateSalt,
    generateFieldSalt,
    createCommitment,
    normalizeDocument,
    DOC_TYPES,
    FIELD_MODULUS
};

// Run main function if called directly
if (require.main === module) {
    main();
}