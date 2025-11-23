use dep::std;

// Business age verification circuit
// Proves business has been operating for minimum required years

fn main(
    // Private inputs
    incorporation_year: u32,
    incorporation_month: u32,
    incorporation_day: u32,
    salt: Field,
    
    // Public inputs
    pub min_years_operating: pub u32,
    pub current_year: pub u32,
    pub current_month: pub u32,
    pub current_day: pub u32,
    
    // Public output
    pub commitment: pub Field
) {
    // Validate date ranges
    assert(incorporation_month > 0);
    assert(incorporation_month <= 12);
    assert(incorporation_day > 0);
    assert(incorporation_day <= 31);
    assert(current_month > 0);
    assert(current_month <= 12);
    assert(current_day > 0);
    assert(current_day <= 31);
    
    // Calculate years in operation
    let mut years_operating = current_year - incorporation_year;
    
    // Adjust if anniversary hasn't passed this year
    if (current_month < incorporation_month) |
       ((current_month == incorporation_month) & (current_day < incorporation_day)) {
        years_operating = years_operating - 1;
    }
    
    // Assert minimum operating years requirement
    assert(years_operating >= min_years_operating);
    
    // Generate commitment
    let date_commitment = std::hash::pedersen_hash([
        incorporation_year as Field,
        incorporation_month as Field,
        incorporation_day as Field,
        salt
    ]);
    
    assert(commitment == date_commitment[0]);
}