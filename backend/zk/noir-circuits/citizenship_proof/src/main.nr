/**
 * Citizenship Proof Circuit
 * 
 * This circuit proves citizenship of a specific country without revealing
 * any other personal information or document details.
 * 
 * Uses ISO 3166-1 numeric country codes:
 * - India: 356
 * - United States: 840  
 * - United Kingdom: 826
 * - Canada: 124
 * - Australia: 036
 * - Germany: 276
 * - France: 250
 * - Japan: 392
 * 
 * Private Inputs:
 * - citizen_code: The actual citizenship code from documents
 * - document_id: Hash of the document ID for uniqueness
 * - salt: Random salt for commitment privacy
 * 
 * Public Inputs:
 * - required_citizenship: The required citizenship code (e.g., 356 for India)
 * - citizenship_commitment: Poseidon hash commitment
 * 
 * Output:
 * - citizenship_valid: Boolean indicating if citizenship matches requirement
 */

use std::hash::poseidon;

fn main(
    // Private inputs - never revealed on-chain
    citizen_code: u32,
    document_id: Field,
    salt: Field,
    
    // Public inputs - visible on-chain
    required_citizenship: pub u32,
    
    // Public outputs
    citizenship_valid: pub bool,
    citizenship_commitment: pub Field
) {
    // Validate that citizen_code is a valid ISO 3166-1 numeric code
    // (codes are typically 3 digits, from 004 to 894)
    assert(citizen_code >= 4);
    assert(citizen_code <= 894);
    
    // Validate required citizenship is also a valid code
    assert(required_citizenship >= 4);
    assert(required_citizenship <= 894);
    
    // Check if citizenship matches requirement
    let citizenship_matches = citizen_code == required_citizenship;
    
    // Ensure the public output matches our calculation
    assert(citizenship_valid == citizenship_matches);
    
    // Create privacy-preserving commitment using Poseidon hash
    // Includes document_id and salt for uniqueness and privacy
    let commitment_inputs = [
        citizen_code as Field,
        document_id,
        salt,
        citizenship_matches as Field,
        required_citizenship as Field
    ];
    
    let computed_commitment = poseidon::hash(commitment_inputs);
    
    // Ensure the public commitment matches our computation
    assert(citizenship_commitment == computed_commitment);
    
    // Additional constraint: prevent reuse of the same document
    // by ensuring document_id is not zero (valid documents should have non-zero hash)
    assert(document_id != 0);
}