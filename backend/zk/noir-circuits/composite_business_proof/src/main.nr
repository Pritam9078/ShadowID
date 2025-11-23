/**
 * Composite Business Proof Circuit
 * 
 * Combines multiple business verification predicates into a single proof:
 * - Business Registration Verification
 * - UBO (Ultimate Beneficial Owner) Compliance 
 * - Revenue Threshold Verification
 * 
 * This allows relying parties to request one proof that satisfies
 * multiple compliance requirements while maintaining privacy.
 */

use std::hash::poseidon;

// Maximum number of commitments supported
global MAX_COMMITMENTS = 10;

// Maximum number of UBOs for ownership verification
global MAX_UBOS = 20;

// Policy ID bit flags for enabling/disabling checks
// Bit 0: Business Registration Check (0x1)
// Bit 1: UBO Compliance Check (0x2) 
// Bit 2: Revenue Threshold Check (0x4)
// Bit 3: Document Verification Check (0x8)
// Bit 4: Wallet Binding Required (0x10)
// Bit 5-7: Reserved for future use

// Common policy combinations:
// BASIC_BUSINESS = 0x7  // Registration + UBO + Revenue
// FULL_COMPLIANCE = 0xF // All checks enabled  
// REGISTRATION_ONLY = 0x1 // Just registration check
// FINANCIAL_ONLY = 0x6 // UBO + Revenue only

fn main(
    // ========== PUBLIC INPUTS ==========
    commitments: [Field; MAX_COMMITMENTS],  // Array of commitments to verify
    policy_id: Field,                       // Bit flags defining required checks
    nonce: Field,                          // One-time binding to prevent replay
    wallet_bind: Field,                    // Optional wallet binding (0 if not used)
    
    // Business registration public inputs
    reg_issuer: Field,                     // Registration issuer address
    reg_issued_at: Field,                  // Registration timestamp
    reg_expiry: Field,                     // Registration expiry timestamp
    
    // UBO compliance public inputs  
    ubo_threshold: Field,                  // Required ownership threshold (e.g., 25%)
    ubo_merkle_root: Field,               // Merkle root of allowed UBOs
    
    // Revenue threshold public inputs
    revenue_min_threshold: Field,          // Minimum revenue requirement
    revenue_max_threshold: Field,          // Maximum revenue cap (0 = no cap)
    revenue_scaling_factor: Field,         // Scaling factor (100=cents, 1000=mills)
    
    // Document verification public inputs
    doc_type_required: Field,             // Required document type code
    
    // ========== PRIVATE INPUTS ==========
    
    // Business registration private inputs
    reg_business_id: Field,               // Business registration identifier
    reg_salt: Field,                      // Registration commitment salt
    reg_registration_hash: Field,         // Hash of registration data
    
    // UBO private inputs
    ubo_salt: Field,                      // UBO commitment salt
    ubo_shares: [Field; MAX_UBOS],       // Individual ownership shares
    ubo_merkle_path: [Field; 8],         // Merkle inclusion path
    ubo_merkle_indices: [Field; 8],      // Merkle path indices
    ubo_proof_mode: Field,               // 0=aggregate, 1=merkle
    
    // Revenue private inputs
    revenue_salt: Field,                  // Revenue commitment salt
    revenue_actual: Field,                // Actual revenue amount
    revenue_fiscal_year: Field,           // Fiscal year of revenue
    
    // Document private inputs
    doc_salt: Field,                      // Document commitment salt
    doc_hash_raw: Field,                  // Document hash converted to field
    doc_type_actual: Field,               // Actual document type
    
    // Nonce binding private input
    wallet_private: Field                 // Private wallet value for binding
) {
    
    // ========== POLICY VALIDATION ==========
    
    // Extract policy flags
    let registration_required = (policy_id & 1) != 0;
    let ubo_required = (policy_id & 2) != 0; 
    let revenue_required = (policy_id & 4) != 0;
    let document_required = (policy_id & 8) != 0;
    let wallet_binding_required = (policy_id & 16) != 0;
    
    // Validate policy ID is within supported range (0-31 for 5 bits)
    assert(policy_id < 32);
    
    // ========== NONCE AND WALLET BINDING ==========
    
    // Verify nonce binding to prevent replay attacks
    assert(nonce != 0); // Nonce must be non-zero
    
    // If wallet binding is required, verify the binding
    if wallet_binding_required {
        assert(wallet_bind != 0); // Wallet binding must be specified
        let computed_wallet_bind = poseidon([nonce, wallet_private]);
        assert(computed_wallet_bind == wallet_bind);
    }
    
    // ========== COMMITMENT COUNTER ==========
    let mut commitment_index = 0;
    
    // ========== BUSINESS REGISTRATION VERIFICATION ==========
    
    if registration_required {
        // Validate registration inputs
        assert(reg_salt != 0);
        assert(reg_business_id != 0);
        assert(reg_registration_hash != 0);
        assert(reg_issuer != 0);
        assert(reg_issued_at > 0);
        assert(reg_expiry > reg_issued_at); // Expiry must be after issuance
        
        // Verify registration is still valid (not expired)
        // Note: In practice, current_time would be a public input
        // For this circuit, we assume expiry validation is done off-chain
        
        // Compute registration commitment
        let reg_commitment = poseidon([
            poseidon([reg_business_id, reg_registration_hash]), 
            reg_salt
        ]);
        
        // Verify commitment matches expected value
        assert(reg_commitment == commitments[commitment_index]);
        commitment_index = commitment_index + 1;
    }
    
    // ========== UBO COMPLIANCE VERIFICATION ==========
    
    if ubo_required {
        // Validate UBO inputs
        assert(ubo_salt != 0);
        assert(ubo_threshold > 0);
        assert(ubo_threshold <= 100); // Threshold as percentage (0-100)
        
        if ubo_proof_mode == 0 {
            // Aggregate mode: sum all ownership shares
            let mut total_ownership = 0;
            for i in 0..MAX_UBOS {
                total_ownership = total_ownership + ubo_shares[i];
            }
            
            // Verify total ownership meets threshold
            assert(total_ownership >= ubo_threshold);
            
            // Compute aggregate commitment
            let shares_hash = poseidon(ubo_shares);
            let ubo_commitment = poseidon([shares_hash, ubo_salt]);
            
            assert(ubo_commitment == commitments[commitment_index]);
            
        } else {
            // Merkle mode: verify inclusion in allowed UBOs tree
            assert(ubo_merkle_root != 0);
            
            // Compute leaf hash from shares
            let shares_hash = poseidon(ubo_shares);
            let mut current_hash = shares_hash;
            
            // Verify Merkle path
            for i in 0..8 {
                let path_element = ubo_merkle_path[i];
                let is_right = ubo_merkle_indices[i];
                
                if is_right == 0 {
                    current_hash = poseidon([current_hash, path_element]);
                } else {
                    current_hash = poseidon([path_element, current_hash]);
                }
            }
            
            // Verify root matches
            assert(current_hash == ubo_merkle_root);
            
            // Compute UBO commitment
            let ubo_commitment = poseidon([shares_hash, ubo_salt]);
            assert(ubo_commitment == commitments[commitment_index]);
        }
        
        commitment_index = commitment_index + 1;
    }
    
    // ========== REVENUE THRESHOLD VERIFICATION ==========
    
    if revenue_required {
        // Validate revenue inputs
        assert(revenue_salt != 0);
        assert(revenue_actual >= 0); // Revenue can be zero
        assert(revenue_min_threshold >= 0);
        assert(revenue_scaling_factor > 0);
        assert(revenue_fiscal_year > 2000); // Reasonable year range
        assert(revenue_fiscal_year < 3000);
        
        // Apply scaling factor to actual revenue
        let scaled_revenue = revenue_actual * revenue_scaling_factor;
        
        // Verify minimum threshold
        assert(scaled_revenue >= revenue_min_threshold);
        
        // Verify maximum threshold if specified (0 = no cap)
        if revenue_max_threshold > 0 {
            assert(scaled_revenue <= revenue_max_threshold);
        }
        
        // Prevent overflow in scaling
        assert(revenue_actual < (2147483647 / revenue_scaling_factor)); // Safe multiplication
        
        // Compute revenue commitment with constant-time operations
        let revenue_commitment = poseidon([
            poseidon([revenue_actual, revenue_fiscal_year]),
            revenue_salt
        ]);
        
        assert(revenue_commitment == commitments[commitment_index]);
        commitment_index = commitment_index + 1;
    }
    
    // ========== DOCUMENT VERIFICATION ==========
    
    if document_required {
        // Validate document inputs
        assert(doc_salt != 0);
        assert(doc_hash_raw != 0);
        assert(doc_type_required > 0);
        assert(doc_type_required < 100); // Document type codes 1-99
        assert(doc_type_actual > 0);
        assert(doc_type_actual < 100);
        
        // Verify document type matches requirement
        assert(doc_type_actual == doc_type_required);
        
        // Compute document commitment
        let doc_commitment = poseidon([doc_hash_raw, doc_salt]);
        
        assert(doc_commitment == commitments[commitment_index]);
        commitment_index = commitment_index + 1;
    }
    
    // ========== FINAL VALIDATIONS ==========
    
    // Ensure we used the expected number of commitments
    // Unused commitments should be zero
    for i in commitment_index..MAX_COMMITMENTS {
        assert(commitments[i] == 0);
    }
    
    // Ensure at least one check was enabled
    assert(policy_id > 0);
}

// ========== HELPER FUNCTIONS ==========

/**
 * Compute business registration commitment
 * Used by external systems to generate expected commitments
 */
fn compute_registration_commitment(
    business_id: Field,
    registration_hash: Field, 
    salt: Field
) -> Field {
    poseidon([
        poseidon([business_id, registration_hash]),
        salt
    ])
}

/**
 * Compute UBO aggregate commitment
 */
fn compute_ubo_aggregate_commitment(
    shares: [Field; MAX_UBOS],
    salt: Field
) -> Field {
    let shares_hash = poseidon(shares);
    poseidon([shares_hash, salt])
}

/**
 * Compute revenue commitment
 */
fn compute_revenue_commitment(
    revenue_actual: Field,
    fiscal_year: Field,
    salt: Field
) -> Field {
    poseidon([
        poseidon([revenue_actual, fiscal_year]),
        salt
    ])
}

/**
 * Compute document commitment
 */
fn compute_document_commitment(
    doc_hash_raw: Field,
    salt: Field
) -> Field {
    poseidon([doc_hash_raw, salt])
}

/**
 * Validate policy configuration
 * Returns true if policy is valid, false otherwise
 */
fn is_valid_policy(policy_id: Field) -> bool {
    // Policy must be non-zero and within 5-bit range
    policy_id > 0 && policy_id < 32
}

/**
 * Count required commitments based on policy
 */
fn count_required_commitments(policy_id: Field) -> Field {
    let mut count = 0;
    
    if (policy_id & 1) != 0 { count = count + 1; }  // Registration
    if (policy_id & 2) != 0 { count = count + 1; }  // UBO  
    if (policy_id & 4) != 0 { count = count + 1; }  // Revenue
    if (policy_id & 8) != 0 { count = count + 1; }  // Document
    
    count
}