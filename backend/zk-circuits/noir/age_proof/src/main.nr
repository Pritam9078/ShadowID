use dep::std;

// Age verification circuit using Noir
// Proves that user is above minimum age without revealing exact age or birth date

fn main(
    // Private inputs (witness)
    birth_year: u32,
    birth_month: u32,
    birth_day: u32,
    salt: Field,
    
    // Public inputs
    min_age: pub u32,
    current_year: pub u32,
    current_month: pub u32,
    current_day: pub u32,
    
    // Public output - commitment to birth data
    pub commitment: pub Field
) {
    // Validate input ranges
    assert(birth_month > 0);
    assert(birth_month <= 12);
    assert(birth_day > 0);
    assert(birth_day <= 31);
    assert(current_month > 0);
    assert(current_month <= 12);
    assert(current_day > 0);
    assert(current_day <= 31);

    // Calculate age
    let mut age = current_year - birth_year;
    
    // Adjust age if birthday hasn't passed this year
    if (current_month < birth_month) |
       ((current_month == birth_month) & (current_day < birth_day)) {
        age = age - 1;
    }

    // Assert that age meets minimum requirement
    assert(age >= min_age);

    // Generate commitment to birth data for privacy
    let birth_data_hash = std::hash::pedersen_hash([
        birth_year as Field,
        birth_month as Field,
        birth_day as Field,
        salt
    ]);
    
    // Verify the provided commitment matches our calculation
    assert(commitment == birth_data_hash[0]);
}