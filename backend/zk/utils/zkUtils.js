// ZK Utilities for commitment generation, validation, and proof formatting
// Uses Poseidon hash and field operations compatible with Noir circuits

const crypto = require('crypto');
const { buildPoseidon } = require('circomlibjs');

/**
 * Poseidon hasher instance (lazy initialization)
 */
let poseidonHasher = null;

async function getPoseidonHasher() {
    if (!poseidonHasher) {
        poseidonHasher = await buildPoseidon();
    }
    return poseidonHasher;
}

/**
 * Convert hex string to BigInt for Poseidon hashing
 */
function hexToBigInt(hex) {
    return BigInt(hex.startsWith('0x') ? hex : '0x' + hex);
}

/**
 * Convert string to BigInt by hashing
 */
function stringToBigInt(str) {
    const hash = crypto.createHash('sha256').update(str).digest('hex');
    return BigInt('0x' + hash);
}

/**
 * Convert number to field element (ensure it's within BN254 field)
 */
function numberToField(num) {
    const BN254_PRIME = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');
    const bigNum = BigInt(num);
    return bigNum % BN254_PRIME;
}

/**
 * Compute Poseidon commitment for different data types
 * 
 * @param {string} type - Type of commitment ('registration', 'revenue', 'ubo', 'document', 'composite')
 * @param {Object} payload - Data to commit to
 * @returns {Promise<Object>} { commitment, nonce, hash, inputs }
 */
async function computeCommitment(type, payload) {
    const poseidon = await getPoseidonHasher();
    const nonce = crypto.randomBytes(32).toString('hex');
    
    let inputs = [];
    
    try {
        switch (type) {
            case 'registration':
                inputs = await computeRegistrationCommitment(payload, nonce);
                break;
            case 'revenue':
                inputs = await computeRevenueCommitment(payload, nonce);
                break;
            case 'ubo':
                inputs = await computeUboCommitment(payload, nonce);
                break;
            case 'document':
                inputs = await computeDocumentCommitment(payload, nonce);
                break;
            case 'composite':
                inputs = await computeCompositeCommitment(payload, nonce);
                break;
            default:
                throw new Error(`Unsupported commitment type: ${type}`);
        }

        // Compute Poseidon hash
        const commitment = poseidon(inputs);
        const commitmentHex = '0x' + commitment.toString(16).padStart(64, '0');
        
        // Also compute SHA256 hash for additional verification
        const sha256Hash = crypto.createHash('sha256')
            .update(JSON.stringify({ type, payload, nonce }))
            .digest('hex');

        console.log(`Computed ${type} commitment:`, {
            inputs: inputs.map(i => '0x' + i.toString(16)),
            commitment: commitmentHex,
            nonce: '0x' + nonce
        });

        return {
            commitment: commitmentHex,
            nonce: '0x' + nonce,
            hash: '0x' + sha256Hash,
            inputs: inputs.map(i => '0x' + i.toString(16).padStart(64, '0')),
            type
        };

    } catch (error) {
        console.error(`Error computing ${type} commitment:`, error);
        throw new Error(`Failed to compute ${type} commitment: ${error.message}`);
    }
}

/**
 * Compute business registration commitment
 */
async function computeRegistrationCommitment(payload, nonce) {
    const {
        registration_number,
        registration_date,
        jurisdiction,
        is_active = true
    } = payload;

    if (!registration_number || !registration_date || !jurisdiction) {
        throw new Error('Missing required registration fields: registration_number, registration_date, jurisdiction');
    }

    return [
        stringToBigInt(registration_number),
        numberToField(new Date(registration_date).getTime()),
        stringToBigInt(jurisdiction),
        numberToField(is_active ? 1 : 0),
        hexToBigInt(nonce)
    ];
}

/**
 * Compute revenue threshold commitment
 */
async function computeRevenueCommitment(payload, nonce) {
    const {
        revenue_amount,
        threshold,
        currency_code = 'USD',
        reporting_period,
        audit_hash
    } = payload;

    if (!revenue_amount || !threshold || !reporting_period) {
        throw new Error('Missing required revenue fields: revenue_amount, threshold, reporting_period');
    }

    // Convert amounts to fixed-point representation (multiply by 100 for 2 decimal places)
    const revenueFixed = Math.floor(parseFloat(revenue_amount) * 100);
    const thresholdFixed = Math.floor(parseFloat(threshold) * 100);

    return [
        numberToField(revenueFixed),
        numberToField(thresholdFixed),
        stringToBigInt(currency_code),
        stringToBigInt(reporting_period),
        audit_hash ? hexToBigInt(audit_hash) : numberToField(0),
        hexToBigInt(nonce)
    ];
}

/**
 * Compute UBO (Ultimate Beneficial Ownership) commitment
 */
async function computeUboCommitment(payload, nonce) {
    const {
        total_individuals,
        ownership_percentages = [],
        individual_hashes = [],
        verification_mode = 'single'
    } = payload;

    if (!total_individuals || ownership_percentages.length === 0) {
        throw new Error('Missing required UBO fields: total_individuals, ownership_percentages');
    }

    // Verify percentages add up to 100%
    const totalPercentage = ownership_percentages.reduce((sum, pct) => sum + parseFloat(pct), 0);
    if (Math.abs(totalPercentage - 100) > 0.01) {
        throw new Error(`Ownership percentages must sum to 100%, got ${totalPercentage}%`);
    }

    // Convert percentages to fixed-point (multiply by 100)
    const percentagesFixed = ownership_percentages.map(pct => 
        numberToField(Math.floor(parseFloat(pct) * 100))
    );

    // Hash individual identifiers
    const individualFields = individual_hashes.slice(0, 10).map(hash => // Limit to 10 individuals
        typeof hash === 'string' ? stringToBigInt(hash) : numberToField(hash)
    );

    // Pad with zeros if fewer than expected individuals
    while (individualFields.length < 10) {
        individualFields.push(numberToField(0));
    }

    return [
        numberToField(total_individuals),
        ...percentagesFixed.slice(0, 10), // Limit to 10 percentages
        ...individualFields,
        numberToField(verification_mode === 'multiple' ? 1 : 0),
        hexToBigInt(nonce)
    ].slice(0, 25); // Ensure we don't exceed reasonable input limit
}

/**
 * Compute document hash commitment
 */
async function computeDocumentCommitment(payload, nonce) {
    const {
        document_hashes = [],
        document_types = [],
        issuer_signatures = [],
        expiry_dates = []
    } = payload;

    if (document_hashes.length === 0) {
        throw new Error('At least one document hash is required');
    }

    // Limit to 10 documents
    const maxDocs = Math.min(10, document_hashes.length);
    
    const hashFields = [];
    for (let i = 0; i < maxDocs; i++) {
        hashFields.push(hexToBigInt(document_hashes[i]));
        
        // Add document type if available
        if (document_types[i]) {
            hashFields.push(stringToBigInt(document_types[i]));
        } else {
            hashFields.push(numberToField(0));
        }
        
        // Add issuer signature if available
        if (issuer_signatures[i]) {
            hashFields.push(hexToBigInt(issuer_signatures[i]));
        } else {
            hashFields.push(numberToField(0));
        }
        
        // Add expiry date if available
        if (expiry_dates[i]) {
            hashFields.push(numberToField(new Date(expiry_dates[i]).getTime()));
        } else {
            hashFields.push(numberToField(0));
        }
    }

    return [
        numberToField(maxDocs),
        ...hashFields,
        hexToBigInt(nonce)
    ];
}

/**
 * Compute composite commitment (combination of multiple proofs)
 */
async function computeCompositeCommitment(payload, nonce) {
    const {
        policy_flags = 0x1F, // Default: all verifications enabled
        commitment_array = [],
        sub_proofs = {}
    } = payload;

    // Ensure we have commitments for each required verification type
    const requiredTypes = ['registration', 'ubo', 'revenue', 'document'];
    const commitmentFields = [];

    for (let i = 0; i < requiredTypes.length; i++) {
        const type = requiredTypes[i];
        if (commitment_array[i]) {
            commitmentFields.push(hexToBigInt(commitment_array[i]));
        } else if (sub_proofs[type]) {
            // Compute sub-commitment if not provided
            const subCommitment = await computeCommitment(type, sub_proofs[type]);
            commitmentFields.push(hexToBigInt(subCommitment.commitment));
        } else {
            // Use zero if verification not required
            commitmentFields.push(numberToField(0));
        }
    }

    return [
        numberToField(policy_flags),
        ...commitmentFields,
        hexToBigInt(nonce)
    ];
}

/**
 * Validate circuit inputs based on circuit type
 * 
 * @param {string} circuit - Circuit name
 * @param {Object} privateInputs - Private inputs to validate
 * @param {Object} publicInputs - Public inputs to validate (optional)
 * @returns {Object} { valid: boolean, errors: Array }
 */
function validateInputs(circuit, privateInputs, publicInputs = {}) {
    const errors = [];
    
    try {
        switch (circuit) {
            case 'business_registration':
                validateRegistrationInputs(privateInputs, errors);
                break;
            case 'ubo_proof':
                validateUboInputs(privateInputs, errors);
                break;
            case 'revenue_threshold':
                validateRevenueInputs(privateInputs, errors);
                break;
            case 'document_hash_proof':
                validateDocumentInputs(privateInputs, errors);
                break;
            case 'composite_business_proof':
                validateCompositeInputs(privateInputs, errors);
                break;
            default:
                errors.push(`Unknown circuit: ${circuit}`);
        }

        // Validate common fields
        if (!privateInputs.nonce) {
            errors.push('Missing required field: nonce');
        } else if (!/^0x[a-fA-F0-9]+$/.test(privateInputs.nonce)) {
            errors.push('Invalid nonce format (must be hex string)');
        }

    } catch (error) {
        errors.push(`Validation error: ${error.message}`);
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Validate business registration inputs
 */
function validateRegistrationInputs(inputs, errors) {
    const required = ['registration_number', 'registration_date', 'jurisdiction'];
    
    required.forEach(field => {
        if (!inputs[field]) {
            errors.push(`Missing required field: ${field}`);
        }
    });

    if (inputs.registration_date && isNaN(new Date(inputs.registration_date).getTime())) {
        errors.push('Invalid registration_date format');
    }
}

/**
 * Validate UBO inputs
 */
function validateUboInputs(inputs, errors) {
    if (!inputs.total_individuals || inputs.total_individuals < 1) {
        errors.push('total_individuals must be at least 1');
    }

    if (!Array.isArray(inputs.ownership_percentages) || inputs.ownership_percentages.length === 0) {
        errors.push('ownership_percentages must be a non-empty array');
    } else {
        const total = inputs.ownership_percentages.reduce((sum, pct) => sum + parseFloat(pct || 0), 0);
        if (Math.abs(total - 100) > 0.01) {
            errors.push(`Ownership percentages must sum to 100%, got ${total}%`);
        }
    }
}

/**
 * Validate revenue inputs
 */
function validateRevenueInputs(inputs, errors) {
    const required = ['revenue_commitment', 'threshold'];
    
    required.forEach(field => {
        if (inputs[field] === undefined || inputs[field] === null) {
            errors.push(`Missing required field: ${field}`);
        }
    });

    if (inputs.threshold && parseFloat(inputs.threshold) < 0) {
        errors.push('Threshold must be non-negative');
    }
}

/**
 * Validate document inputs
 */
function validateDocumentInputs(inputs, errors) {
    if (!Array.isArray(inputs.document_hashes) || inputs.document_hashes.length === 0) {
        errors.push('document_hashes must be a non-empty array');
    } else {
        inputs.document_hashes.forEach((hash, index) => {
            if (!/^0x[a-fA-F0-9]+$/.test(hash)) {
                errors.push(`Invalid hash format at index ${index}`);
            }
        });
    }
}

/**
 * Validate composite inputs
 */
function validateCompositeInputs(inputs, errors) {
    if (!inputs.policy_flags && inputs.policy_flags !== 0) {
        errors.push('Missing required field: policy_flags');
    }

    if (!Array.isArray(inputs.commitment_array) && !inputs.sub_proofs) {
        errors.push('Either commitment_array or sub_proofs must be provided');
    }
}

/**
 * Format proof data for frontend consumption
 * 
 * @param {string} proofHex - Hex-encoded proof bytes
 * @param {Array} publicInputs - Public inputs array
 * @param {string} circuit - Circuit name
 * @returns {Object} Formatted proof object
 */
function formatProofData(proofHex, publicInputs, circuit) {
    return {
        proof: proofHex.startsWith('0x') ? proofHex : '0x' + proofHex,
        publicInputs: Array.isArray(publicInputs) ? publicInputs : [],
        circuit,
        version: '1.0',
        timestamp: Date.now()
    };
}

/**
 * Compute SHA256 hash of proof for tracking and deduplication
 * 
 * @param {Object} proofData - Proof object to hash
 * @returns {string} Hex-encoded hash
 */
function hashProof(proofData) {
    const proofString = typeof proofData === 'string' ? proofData : JSON.stringify(proofData);
    return '0x' + crypto.createHash('sha256').update(proofString).digest('hex');
}

/**
 * Convert field element to hex string (for circuit compatibility)
 */
function fieldToHex(fieldElement) {
    return '0x' + BigInt(fieldElement).toString(16).padStart(64, '0');
}

/**
 * Convert hex string to field element
 */
function hexToField(hexString) {
    return BigInt(hexString.startsWith('0x') ? hexString : '0x' + hexString);
}

/**
 * Generate secure random nonce for circuit inputs
 */
function generateNonce() {
    return '0x' + crypto.randomBytes(32).toString('hex');
}

/**
 * Validate field element is within BN254 field
 */
function isValidFieldElement(value) {
    try {
        const BN254_PRIME = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');
        const bigValue = BigInt(value);
        return bigValue >= 0n && bigValue < BN254_PRIME;
    } catch {
        return false;
    }
}

module.exports = {
    computeCommitment,
    validateInputs,
    formatProofData,
    hashProof,
    fieldToHex,
    hexToField,
    generateNonce,
    isValidFieldElement,
    getPoseidonHasher
};