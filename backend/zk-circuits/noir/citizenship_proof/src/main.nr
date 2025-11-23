use dep::std;

// Citizenship verification circuit using Noir  
// Proves citizenship without revealing document details

fn main(
    // Private inputs (witness)
    country_code: [u8; 2],      // 2-letter country code (private)
    document_type: Field,        // Hash of document type
    document_hash: Field,        // Hash of document number/details
    salt: Field,
    
    // Public inputs
    pub allowed_countries: pub [Field; 10],  // List of allowed country codes (hashed)
    pub required_document_types: pub [Field; 5], // Allowed document types (hashed)
    
    // Public output
    pub commitment: pub Field
) {
    // Convert country code to field for comparison
    let country_field = std::hash::pedersen_hash([
        country_code[0] as Field,
        country_code[1] as Field
    ]);

    // Check if country is in allowed list
    let mut country_valid = false;
    for i in 0..10 {
        if allowed_countries[i] == country_field[0] {
            country_valid = true;
        }
    }
    assert(country_valid);

    // Check if document type is valid
    let mut document_valid = false;
    for i in 0..5 {
        if required_document_types[i] == document_type {
            document_valid = true;
        }
    }
    assert(document_valid);

    // Generate commitment to citizenship data
    let citizenship_commitment = std::hash::pedersen_hash([
        country_field[0],
        document_type,
        document_hash,
        salt
    ]);
    
    // Verify commitment
    assert(commitment == citizenship_commitment[0]);
}