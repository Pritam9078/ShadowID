/**
 * Test file for Citizenship Proof Circuit
 * 
 * Tests various scenarios:
 * 1. Valid citizenship match
 * 2. Invalid citizenship mismatch
 * 3. Different country codes
 * 4. Edge cases and boundary conditions
 */

use std::hash::poseidon;

// Import the main function from our circuit
use crate::main;

#[test]
fn test_valid_indian_citizenship() {
    // Test case: Indian citizen proving Indian citizenship
    let citizen_code = 356;  // India
    let document_id = 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef;
    let salt = 0x1111111111111111111111111111111111111111111111111111111111111111;
    let required_citizenship = 356;  // India required
    
    let citizenship_valid = true;  // Match
    
    let commitment_inputs = [
        citizen_code as Field,
        document_id,
        salt,
        citizenship_valid as Field,
        required_citizenship as Field
    ];
    let citizenship_commitment = poseidon::hash(commitment_inputs);
    
    main(
        citizen_code, document_id, salt,
        required_citizenship,
        citizenship_valid, citizenship_commitment
    );
}

#[test]
fn test_citizenship_mismatch() {
    // Test case: US citizen trying to prove Indian citizenship
    let citizen_code = 840;  // United States
    let document_id = 0x2234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef;
    let salt = 0x2222222222222222222222222222222222222222222222222222222222222222;
    let required_citizenship = 356;  // India required
    
    let citizenship_valid = false;  // No match
    
    let commitment_inputs = [
        citizen_code as Field,
        document_id,
        salt,
        citizenship_valid as Field,
        required_citizenship as Field
    ];
    let citizenship_commitment = poseidon::hash(commitment_inputs);
    
    main(
        citizen_code, document_id, salt,
        required_citizenship,
        citizenship_valid, citizenship_commitment
    );
}

#[test]
fn test_uk_citizenship() {
    // Test case: UK citizen proving UK citizenship
    let citizen_code = 826;  // United Kingdom
    let document_id = 0x3334567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef;
    let salt = 0x3333333333333333333333333333333333333333333333333333333333333333;
    let required_citizenship = 826;  // UK required
    
    let citizenship_valid = true;  // Match
    
    let commitment_inputs = [
        citizen_code as Field,
        document_id,
        salt,
        citizenship_valid as Field,
        required_citizenship as Field
    ];
    let citizenship_commitment = poseidon::hash(commitment_inputs);
    
    main(
        citizen_code, document_id, salt,
        required_citizenship,
        citizenship_valid, citizenship_commitment
    );
}

#[test]
fn test_canadian_to_us_mismatch() {
    // Test case: Canadian citizen trying to prove US citizenship
    let citizen_code = 124;  // Canada
    let document_id = 0x4444567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef;
    let salt = 0x4444444444444444444444444444444444444444444444444444444444444444;
    let required_citizenship = 840;  // United States required
    
    let citizenship_valid = false;  // No match
    
    let commitment_inputs = [
        citizen_code as Field,
        document_id,
        salt,
        citizenship_valid as Field,
        required_citizenship as Field
    ];
    let citizenship_commitment = poseidon::hash(commitment_inputs);
    
    main(
        citizen_code, document_id, salt,
        required_citizenship,
        citizenship_valid, citizenship_commitment
    );
}

#[test]
fn test_australian_citizenship() {
    // Test case: Australian citizen proving Australian citizenship  
    let citizen_code = 36;   // Australia (code 036, but leading zero not needed)
    let document_id = 0x5555567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef;
    let salt = 0x5555555555555555555555555555555555555555555555555555555555555555;
    let required_citizenship = 36;  // Australia required
    
    let citizenship_valid = true;  // Match
    
    let commitment_inputs = [
        citizen_code as Field,
        document_id,
        salt,
        citizenship_valid as Field,
        required_citizenship as Field
    ];
    let citizenship_commitment = poseidon::hash(commitment_inputs);
    
    main(
        citizen_code, document_id, salt,
        required_citizenship,
        citizenship_valid, citizenship_commitment
    );
}

#[test]
fn test_different_salt_same_citizenship() {
    // Test case: Same citizenship but different salt (privacy test)
    let citizen_code = 356;  // India
    let document_id = 0x6666567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef;
    let salt = 0x6666666666666666666666666666666666666666666666666666666666666666;  // Different salt
    let required_citizenship = 356;  // India required
    
    let citizenship_valid = true;  // Match
    
    let commitment_inputs = [
        citizen_code as Field,
        document_id,
        salt,
        citizenship_valid as Field,
        required_citizenship as Field
    ];
    let citizenship_commitment = poseidon::hash(commitment_inputs);
    
    main(
        citizen_code, document_id, salt,
        required_citizenship,
        citizenship_valid, citizenship_commitment
    );
}
