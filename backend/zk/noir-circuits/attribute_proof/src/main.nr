/**
 * Attribute Proof Circuit - Generic Selective Disclosure
 * 
 * This circuit enables selective disclosure of specific attributes from a larger
 * set of personal data without revealing any other attributes.
 * 
 * Use Cases:
 * - Prove education level without revealing university name
 * - Prove income bracket without revealing exact salary
 * - Prove address region without revealing exact address
 * - Prove professional certification without revealing employer
 * 
 * Private Inputs:
 * - attributes: Array of all user attributes (up to 10 for this implementation)
 * - attribute_index: Index of the specific attribute to prove
 * - salt: Random salt for privacy
 * 
 * Public Inputs:
 * - target_attribute_hash: Hash of the specific attribute we want to prove
 * - attributes_root: Merkle root of all attributes for integrity
 * 
 * Output:
 * - attribute_exists: Boolean indicating if the target attribute exists
 * - proof_commitment: Privacy-preserving commitment
 */

use std::hash::poseidon;

global MAX_ATTRIBUTES: Field = 10;

fn main(
    // Private inputs - never revealed on-chain
    attributes: [Field; MAX_ATTRIBUTES],
    attribute_index: Field,
    salt: Field,
    
    // Public inputs - visible on-chain  
    target_attribute_hash: pub Field,
    attributes_root: pub Field,
    
    // Public outputs
    attribute_exists: pub bool,
    proof_commitment: pub Field
) {
    // Validate attribute index is within bounds
    assert(attribute_index < MAX_ATTRIBUTES);
    
    // Convert to comptime known value for array access
    // We need to use a comptime constant for array indexing
    let revealed_attribute = if attribute_index == 0 {
        attributes[0]
    } else if attribute_index == 1 {
        attributes[1]
    } else if attribute_index == 2 {
        attributes[2]
    } else if attribute_index == 3 {
        attributes[3]
    } else if attribute_index == 4 {
        attributes[4]
    } else if attribute_index == 5 {
        attributes[5]
    } else if attribute_index == 6 {
        attributes[6]
    } else if attribute_index == 7 {
        attributes[7]
    } else if attribute_index == 8 {
        attributes[8]
    } else {
        attributes[9]
    };
    
    // Hash the revealed attribute to compare with target
    let revealed_hash = poseidon::hash([revealed_attribute]);
    
    // Check if this attribute matches what we're trying to prove
    let attribute_matches = revealed_hash == target_attribute_hash;
    
    // Ensure the public output matches our calculation
    assert(attribute_exists == attribute_matches);
    
    // Compute Merkle root of all attributes for integrity verification
    let computed_root = compute_attributes_merkle_root(attributes);
    
    // Ensure the provided root matches our computation
    // This prevents tampering with the attribute set
    assert(attributes_root == computed_root);
    
    // Create privacy-preserving commitment
    let commitment_inputs = [
        revealed_attribute,
        salt,
        attribute_index,
        attribute_matches as Field,
        attributes_root
    ];
    
    let computed_commitment = poseidon::hash(commitment_inputs);
    
    // Ensure the public commitment matches our computation
    assert(proof_commitment == computed_commitment);
    
    // Additional privacy constraint: ensure salt is not zero
    assert(salt != 0);
    
    // Constraint: ensure revealed attribute is not zero (valid attributes should be non-zero)
    if attribute_matches {
        assert(revealed_attribute != 0);
    }
}

/**
 * Compute Merkle root of attributes array using Poseidon hash
 * This creates a compact commitment to all attributes while preserving their order
 */
fn compute_attributes_merkle_root(attributes: [Field; MAX_ATTRIBUTES]) -> Field {
    // Start with first attribute
    let mut current_hash = attributes[0];
    
    // Hash each subsequent attribute with the running hash
    for i in 1..10 {
        let hash_inputs = [current_hash, attributes[i]];
        current_hash = poseidon::hash(hash_inputs);
    }
    
    current_hash
}

/**
 * Alternative implementation using a more traditional Merkle tree approach
 * Uncomment this if you prefer a standard binary Merkle tree structure
 */
/*
fn compute_merkle_root_binary(attributes: [Field; MAX_ATTRIBUTES]) -> Field {
    let mut tree_level = attributes;
    let mut level_size = MAX_ATTRIBUTES;
    
    while level_size > 1 {
        let mut next_level: [Field; MAX_ATTRIBUTES] = [0; MAX_ATTRIBUTES];
        let mut next_size = 0;
        
        let mut i = 0;
        while i < level_size {
            if i + 1 < level_size {
                // Hash pair of nodes
                let hash_inputs = [tree_level[i], tree_level[i + 1]];
                next_level[next_size] = poseidon::hash(hash_inputs);
                next_size += 1;
                i += 2;
            } else {
                // Odd node, promote to next level
                next_level[next_size] = tree_level[i];
                next_size += 1;
                i += 1;
            }
        }
        
        tree_level = next_level;
        level_size = next_size;
    }
    
    tree_level[0]
}
*/