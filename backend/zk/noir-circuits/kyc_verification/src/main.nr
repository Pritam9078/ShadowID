// KYC Verification Circuit - Zero-Knowledge Proof for Identity Verification
// This circuit allows users to prove they possess valid KYC data 
// without revealing the actual sensitive information

use dep::std;

// Circuit to prove KYC data validity without revealing sensitive information
fn main(
    // Private inputs (never revealed on-chain)
    full_name: str<64>,           // User's full legal name
    date_of_birth: [u32; 3],      // [year, month, day] - birth date
    ssn_last_four: str<4>,        // Last 4 digits of SSN (for US users)
    passport_number: str<20>,     // Passport number
    address_hash: Field,          // Hash of home address
    phone_hash: Field,            // Hash of phone number
    
    // Public inputs (visible on-chain)
    expected_kyc_hash: Field,     // The KYC hash stored on ShadowID Registry
    min_age: u32,                 // Minimum age requirement (e.g., 18)
    current_timestamp: u32,       // Current timestamp for age calculation
    
    // Circuit constraints
    allowed_countries: [str<3>; 10], // Array of allowed country codes
    user_country: str<3>             // User's country of residence
) {
    // 1. Verify that the provided KYC data hashes to the expected hash
    let computed_kyc_hash = hash_kyc_data(
        full_name,
        date_of_birth,
        ssn_last_four,
        passport_number,
        address_hash,
        phone_hash
    );
    
    assert(computed_kyc_hash == expected_kyc_hash);
    
    // 2. Age verification - prove user is above minimum age
    let user_age = calculate_age(date_of_birth, current_timestamp);
    assert(user_age >= min_age);
    
    // 3. Verify user is from an allowed jurisdiction
    let is_allowed_country = check_country_allowed(user_country, allowed_countries);
    assert(is_allowed_country == true);
    
    // 4. Additional validations
    
    // Ensure name is not empty (basic sanity check)
    assert(full_name.len() > 0);
    
    // Ensure passport number follows basic format (not empty, correct length)
    assert(passport_number.len() >= 6);
    assert(passport_number.len() <= 20);
    
    // Ensure SSN last four is exactly 4 digits
    assert(ssn_last_four.len() == 4);
    
    // Ensure date of birth is reasonable (after 1900, before current year)
    assert(date_of_birth[0] >= 1900);
    assert(date_of_birth[0] <= 2024);
    assert(date_of_birth[1] >= 1);
    assert(date_of_birth[1] <= 12);
    assert(date_of_birth[2] >= 1);
    assert(date_of_birth[2] <= 31);
}

// Helper function to hash KYC data consistently
fn hash_kyc_data(
    name: str<64>,
    dob: [u32; 3], 
    ssn: str<4>,
    passport: str<20>,
    addr_hash: Field,
    phone_hash: Field
) -> Field {
    // Create a composite hash of all KYC components
    // This should match the hashing used off-chain when generating the original KYC hash
    
    let mut data_to_hash: [Field; 8] = [0; 8];
    
    // Convert strings and numbers to Field elements for hashing
    data_to_hash[0] = string_to_field(name);
    data_to_hash[1] = dob[0] as Field;  // year
    data_to_hash[2] = dob[1] as Field;  // month  
    data_to_hash[3] = dob[2] as Field;  // day
    data_to_hash[4] = string_to_field(ssn);
    data_to_hash[5] = string_to_field(passport);
    data_to_hash[6] = addr_hash;
    data_to_hash[7] = phone_hash;
    
    // Use Pedersen hash for consistency with Ethereum
    std::hash::pedersen_hash(data_to_hash)
}

// Calculate age from birth date and current timestamp
fn calculate_age(birth_date: [u32; 3], current_timestamp: u32) -> u32 {
    // Convert timestamp to year (simplified - assumes 365.25 days per year)
    let seconds_per_year = 365 * 24 * 60 * 60 + 6 * 60 * 60; // ~365.25 days
    let current_year = 1970 + (current_timestamp / seconds_per_year);
    
    let birth_year = birth_date[0];
    let birth_month = birth_date[1];
    let birth_day = birth_date[2];
    
    // Basic age calculation (can be made more precise)
    let age = current_year - birth_year;
    
    // Simple month/day adjustment (for more precision, could get current month/day from timestamp)
    if birth_month > 6 { // Rough adjustment - if born in later half of year, subtract 1
        age - 1
    } else {
        age
    }
}

// Check if user's country is in the allowed list
fn check_country_allowed(user_country: str<3>, allowed_countries: [str<3>; 10]) -> bool {
    let mut is_allowed = false;
    
    for i in 0..10 {
        if user_country == allowed_countries[i] {
            is_allowed = true;
        }
    }
    
    is_allowed
}

// Helper function to convert string to Field (simplified)
fn string_to_field(s: str<64>) -> Field {
    // This is a simplified conversion - in practice, you might want a more robust method
    // For now, we'll use the hash of the string bytes
    let mut bytes: [u8; 64] = [0; 64];
    
    // Copy string bytes (this is pseudocode - actual implementation depends on Noir's string handling)
    for i in 0..s.len() {
        if i < 64 {
            bytes[i] = s.as_bytes()[i];
        }
    }
    
    // Hash the bytes to get a Field element
    std::hash::pedersen_hash(bytes)[0]
}

// Helper function for shorter strings
fn string_to_field_short(s: str<20>) -> Field {
    let mut bytes: [u8; 20] = [0; 20];
    
    for i in 0..s.len() {
        if i < 20 {
            bytes[i] = s.as_bytes()[i];
        }
    }
    
    std::hash::pedersen_hash(bytes)[0]
}

// Test function (for development/testing)
#[test]
fn test_kyc_verification() {
    // Sample test data
    let test_name = "John Doe";
    let test_dob = [1990, 3, 15];
    let test_ssn = "1234";
    let test_passport = "AB1234567";
    let test_addr_hash = 12345;
    let test_phone_hash = 67890;
    
    let expected_hash = hash_kyc_data(
        test_name,
        test_dob,
        test_ssn,
        test_passport,
        test_addr_hash,
        test_phone_hash
    );
    
    let test_countries = ["USA", "CAN", "GBR", "DEU", "FRA", "AUS", "JPN", "KOR", "SGP", "CHE"];
    
    // This should pass
    main(
        test_name,
        test_dob,
        test_ssn,
        test_passport,
        test_addr_hash,
        test_phone_hash,
        expected_hash,
        18,  // min age
        1672531200, // timestamp for 2023
        test_countries,
        "USA"
    );
}