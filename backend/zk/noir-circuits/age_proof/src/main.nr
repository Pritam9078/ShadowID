/**
 * Age Proof Circuit
 * 
 * This circuit proves that a person is at least 18 years old (or any minimum age)
 * without revealing their exact birth date or age.
 * 
 * Private Inputs:
 * - birth_year: The year the person was born
 * - birth_month: The month the person was born (1-12)
 * - birth_day: The day the person was born (1-31)
 * 
 * Public Inputs:
 * - min_age: Minimum required age (default 18)
 * - current_year: Current year for age calculation
 * - current_month: Current month for precise age calculation
 * - current_day: Current day for precise age calculation
 * 
 * Output:
 * - age_valid: Boolean indicating if person meets minimum age requirement
 * - age_commitment: Poseidon hash commitment of the age verification
 */

use std::hash::poseidon;

fn main(
    // Private inputs - never revealed on-chain
    birth_year: u32,
    birth_month: u32,
    birth_day: u32,
    
    // Public inputs - visible on-chain
    min_age: pub u32,
    current_year: pub u32,
    current_month: pub u32,
    current_day: pub u32,
    
    // Public outputs
    age_valid: pub bool,
    age_commitment: pub Field
) {
    // Validate input ranges
    assert(birth_month >= 1);
    assert(birth_month <= 12);
    assert(birth_day >= 1);
    assert(birth_day <= 31);
    assert(current_month >= 1);
    assert(current_month <= 12);
    assert(current_day >= 1);
    assert(current_day <= 31);
    
    // Calculate age with precise month/day consideration
    let mut calculated_age = current_year - birth_year;
    
    // Adjust for month and day
    let birth_passed_this_year = if current_month > birth_month {
        true
    } else if current_month == birth_month {
        current_day >= birth_day
    } else {
        false
    };
    
    if !birth_passed_this_year {
        calculated_age = calculated_age - 1;
    }
    
    // Check if age meets minimum requirement
    let meets_requirement = calculated_age >= min_age;
    
    // Ensure the public output matches our calculation
    assert(age_valid == meets_requirement);
    
    // Create commitment using Poseidon hash for privacy
    // Hash includes private birth info + validation result for integrity
    let commitment_inputs = [
        birth_year as Field,
        birth_month as Field, 
        birth_day as Field,
        calculated_age as Field,
        meets_requirement as Field
    ];
    
    let computed_commitment = poseidon::hash(commitment_inputs);
    
    // Ensure the public commitment matches our computation
    assert(age_commitment == computed_commitment);
    
    // Additional privacy constraint: ensure birth year is reasonable
    // (prevents malicious inputs like year 0 or future years)
    assert(birth_year >= 1900);
    assert(birth_year <= current_year);
}