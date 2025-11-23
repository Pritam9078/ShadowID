/**
 * Test file for Attribute Proof Circuit
 * 
 * Tests various scenarios:
 * 1. Valid attribute disclosure
 * 2. Invalid attribute (not in set)
 * 3. Different attribute indices
 * 4. Merkle root verification
 * 5. Privacy preservation
 */

use std::hash::poseidon;

// Import the main function and helper from our circuit
use crate::{main, compute_attributes_merkle_root, MAX_ATTRIBUTES};

#[test]
fn test_valid_education_attribute() {
    // Test case: Prove education level from a set of attributes
    let attributes = [
        0x1111111111111111111111111111111111111111111111111111111111111111,  // Education: "Masters"
        0x2222222222222222222222222222222222222222222222222222222222222222,  // University: "MIT"
        0x3333333333333333333333333333333333333333333333333333333333333333,  // GPA: "3.8"
        0x4444444444444444444444444444444444444444444444444444444444444444,  // Income: "$75000"
        0x5555555555555555555555555555555555555555555555555555555555555555,  // Location: "NYC"
        0x6666666666666666666666666666666666666666666666666666666666666666,  // Age: "28"
        0x7777777777777777777777777777777777777777777777777777777777777777,  // Employer: "TechCorp"
        0x8888888888888888888888888888888888888888888888888888888888888888,  // Cert: "CPA"
        0x9999999999999999999999999999999999999999999999999999999999999999,  // Experience: "5yr"
        0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa   // Level: "Senior"
    ];
    
    let attribute_index = 0;  // Prove education (index 0)
    let salt = 0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb;
    
    // Hash of the education attribute
    let target_attribute_hash = poseidon::hash([attributes[0]]);
    
    // Compute merkle root
    let attributes_root = compute_attributes_merkle_root(attributes);
    
    let attribute_exists = true;  // Education attribute exists at index 0
    
    let commitment_inputs = [
        attributes[0],  // revealed attribute
        salt,
        attribute_index as Field,
        attribute_exists as Field,
        attributes_root
    ];
    let proof_commitment = poseidon::hash(commitment_inputs);
    
    main(
        attributes, attribute_index, salt,
        target_attribute_hash, attributes_root,
        attribute_exists, proof_commitment
    );
}

#[test]
fn test_valid_income_attribute() {
    // Test case: Prove income level (different index)
    let attributes = [
        0x1111111111111111111111111111111111111111111111111111111111111111,  // Education
        0x2222222222222222222222222222222222222222222222222222222222222222,  // University
        0x3333333333333333333333333333333333333333333333333333333333333333,  // GPA
        0x4444444444444444444444444444444444444444444444444444444444444444,  // Income: "$75000"
        0x5555555555555555555555555555555555555555555555555555555555555555,  // Location
        0x6666666666666666666666666666666666666666666666666666666666666666,  // Age
        0x7777777777777777777777777777777777777777777777777777777777777777,  // Employer
        0x8888888888888888888888888888888888888888888888888888888888888888,  // Cert
        0x9999999999999999999999999999999999999999999999999999999999999999,  // Experience
        0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa   // Level
    ];
    
    let attribute_index = 3;  // Prove income (index 3)
    let salt = 0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc;
    
    // Hash of the income attribute
    let target_attribute_hash = poseidon::hash([attributes[3]]);
    
    // Compute merkle root
    let attributes_root = compute_attributes_merkle_root(attributes);
    
    let attribute_exists = true;  // Income attribute exists at index 3
    
    let commitment_inputs = [
        attributes[3],  // revealed attribute (income)
        salt,
        attribute_index as Field,
        attribute_exists as Field,
        attributes_root
    ];
    let proof_commitment = poseidon::hash(commitment_inputs);
    
    main(
        attributes, attribute_index, salt,
        target_attribute_hash, attributes_root,
        attribute_exists, proof_commitment
    );
}

#[test]  
fn test_attribute_not_found() {
    // Test case: Try to prove an attribute that doesn't exist in the set
    let attributes = [
        0x1111111111111111111111111111111111111111111111111111111111111111,
        0x2222222222222222222222222222222222222222222222222222222222222222,
        0x3333333333333333333333333333333333333333333333333333333333333333,
        0x4444444444444444444444444444444444444444444444444444444444444444,
        0x5555555555555555555555555555555555555555555555555555555555555555,
        0x6666666666666666666666666666666666666666666666666666666666666666,
        0x7777777777777777777777777777777777777777777777777777777777777777,
        0x8888888888888888888888888888888888888888888888888888888888888888,
        0x9999999999999999999999999999999999999999999999999999999999999999,
        0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
    ];
    
    let attribute_index = 0;  // Look at index 0
    let salt = 0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd;
    
    // Hash of a different attribute (not at index 0)
    let target_attribute_hash = 0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff;
    
    // Compute merkle root
    let attributes_root = compute_attributes_merkle_root(attributes);
    
    let attribute_exists = false;  // Target attribute doesn't exist at index 0
    
    let commitment_inputs = [
        attributes[0],  // actual attribute at index 0
        salt,
        attribute_index as Field,
        attribute_exists as Field,
        attributes_root
    ];
    let proof_commitment = poseidon::hash(commitment_inputs);
    
    main(
        attributes, attribute_index, salt,
        target_attribute_hash, attributes_root,
        attribute_exists, proof_commitment
    );
}

#[test]
fn test_last_index_attribute() {
    // Test case: Prove attribute at the last index (9)
    let attributes = [
        0x1111111111111111111111111111111111111111111111111111111111111111,
        0x2222222222222222222222222222222222222222222222222222222222222222,
        0x3333333333333333333333333333333333333333333333333333333333333333,
        0x4444444444444444444444444444444444444444444444444444444444444444,
        0x5555555555555555555555555555555555555555555555555555555555555555,
        0x6666666666666666666666666666666666666666666666666666666666666666,
        0x7777777777777777777777777777777777777777777777777777777777777777,
        0x8888888888888888888888888888888888888888888888888888888888888888,
        0x9999999999999999999999999999999999999999999999999999999999999999,
        0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee   // Special last attribute
    ];
    
    let attribute_index = 9;  // Last index
    let salt = 0xfefefefefefefefefefefefefefefefefefefefefefefefefefefefefefefefe;
    
    // Hash of the last attribute
    let target_attribute_hash = poseidon::hash([attributes[9]]);
    
    // Compute merkle root
    let attributes_root = compute_attributes_merkle_root(attributes);
    
    let attribute_exists = true;  // Last attribute exists
    
    let commitment_inputs = [
        attributes[9],  // revealed last attribute
        salt,
        attribute_index as Field,
        attribute_exists as Field,
        attributes_root
    ];
    let proof_commitment = poseidon::hash(commitment_inputs);
    
    main(
        attributes, attribute_index, salt,
        target_attribute_hash, attributes_root,
        attribute_exists, proof_commitment
    );
}

#[test]
fn test_merkle_root_computation() {
    // Test case: Verify merkle root computation is deterministic
    let attributes = [
        0x1000000000000000000000000000000000000000000000000000000000000001,
        0x2000000000000000000000000000000000000000000000000000000000000002,
        0x3000000000000000000000000000000000000000000000000000000000000003,
        0x4000000000000000000000000000000000000000000000000000000000000004,
        0x5000000000000000000000000000000000000000000000000000000000000005,
        0x6000000000000000000000000000000000000000000000000000000000000006,
        0x7000000000000000000000000000000000000000000000000000000000000007,
        0x8000000000000000000000000000000000000000000000000000000000000008,
        0x9000000000000000000000000000000000000000000000000000000000000009,
        0xa00000000000000000000000000000000000000000000000000000000000000a
    ];
    
    // Compute root twice to verify deterministic behavior
    let root1 = compute_attributes_merkle_root(attributes);
    let root2 = compute_attributes_merkle_root(attributes);
    
    // Should be equal
    assert(root1 == root2);
}
