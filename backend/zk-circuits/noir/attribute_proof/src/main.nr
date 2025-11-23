use dep::std;

// Generic attribute verification circuit using Noir
// Proves attribute constraints without revealing exact values

fn main(
    // Private inputs (witness)
    attribute_value: u64,       // The actual attribute value (private)
    salt: Field,
    
    // Public inputs
    pub constraint_type: pub u8,    // 0=equal, 1=min, 2=max, 3=range
    pub constraint_value: pub u64,  // The constraint value or lower bound
    pub constraint_upper: pub u64,  // Upper bound for range constraints
    pub attribute_type_hash: pub Field, // Hash of attribute type for verification
    
    // Public output
    pub commitment: pub Field
) {
    // Validate constraint type
    assert(constraint_type <= 3);

    // Apply the appropriate constraint based on type
    if constraint_type == 0 {
        // Equal constraint
        assert(attribute_value == constraint_value);
    } else if constraint_type == 1 {
        // Minimum constraint  
        assert(attribute_value >= constraint_value);
    } else if constraint_type == 2 {
        // Maximum constraint
        assert(attribute_value <= constraint_value);
    } else if constraint_type == 3 {
        // Range constraint
        assert(attribute_value >= constraint_value);
        assert(attribute_value <= constraint_upper);
    }

    // Generate commitment to attribute data
    let attribute_commitment = std::hash::pedersen_hash([
        attribute_value as Field,
        constraint_type as Field,
        constraint_value as Field,
        attribute_type_hash,
        salt
    ]);
    
    // Verify commitment
    assert(commitment == attribute_commitment[0]);
}