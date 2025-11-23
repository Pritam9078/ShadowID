/**
 * Test file for Age Proof Circuit
 * 
 * Tests various scenarios:
 * 1. Valid age (over 18)
 * 2. Invalid age (under 18) 
 * 3. Edge cases (exactly 18, leap years, etc.)
 * 4. Boundary conditions
 */

use std::hash::poseidon;

// Import the main function from our circuit
use crate::main;

#[test]
fn test_valid_age_over_18() {
    // Test case: Person born May 15, 1995, current date Nov 22, 2024 (age 29)
    let birth_year = 1995;
    let birth_month = 5;
    let birth_day = 15;
    let min_age = 18;
    let current_year = 2024;
    let current_month = 11;
    let current_day = 22;
    
    // Calculate expected values
    let age_valid = true;  // 29 >= 18
    
    let commitment_inputs = [
        birth_year as Field,
        birth_month as Field,
        birth_day as Field,
        29 as Field,  // calculated age
        age_valid as Field
    ];
    let age_commitment = poseidon::hash(commitment_inputs);
    
    // This should not panic
    main(
        birth_year, birth_month, birth_day,
        min_age, current_year, current_month, current_day,
        age_valid, age_commitment
    );
}

#[test]
fn test_exactly_18_birthday_passed() {
    // Test case: Person born Nov 22, 2006, current date Nov 22, 2024 (exactly 18 today)
    let birth_year = 2006;
    let birth_month = 11;
    let birth_day = 22;
    let min_age = 18;
    let current_year = 2024;
    let current_month = 11;
    let current_day = 22;
    
    let age_valid = true;  // Exactly 18
    
    let commitment_inputs = [
        birth_year as Field,
        birth_month as Field,
        birth_day as Field,
        18 as Field,
        age_valid as Field
    ];
    let age_commitment = poseidon::hash(commitment_inputs);
    
    main(
        birth_year, birth_month, birth_day,
        min_age, current_year, current_month, current_day,
        age_valid, age_commitment
    );
}

#[test]
fn test_exactly_18_birthday_not_passed() {
    // Test case: Person born Nov 23, 2006, current date Nov 22, 2024 (still 17)
    let birth_year = 2006;
    let birth_month = 11;
    let birth_day = 23;
    let min_age = 18;
    let current_year = 2024;
    let current_month = 11;
    let current_day = 22;
    
    let age_valid = false;  // Still 17
    
    let commitment_inputs = [
        birth_year as Field,
        birth_month as Field,
        birth_day as Field,
        17 as Field,
        age_valid as Field
    ];
    let age_commitment = poseidon::hash(commitment_inputs);
    
    main(
        birth_year, birth_month, birth_day,
        min_age, current_year, current_month, current_day,
        age_valid, age_commitment
    );
}

#[test]
fn test_leap_year_birthday() {
    // Test case: Person born Feb 29, 2000 (leap year), current date Mar 1, 2024
    let birth_year = 2000;
    let birth_month = 2;
    let birth_day = 29;
    let min_age = 18;
    let current_year = 2024;
    let current_month = 3;
    let current_day = 1;
    
    let age_valid = true;  // 24 years old
    
    let commitment_inputs = [
        birth_year as Field,
        birth_month as Field,
        birth_day as Field,
        24 as Field,
        age_valid as Field
    ];
    let age_commitment = poseidon::hash(commitment_inputs);
    
    main(
        birth_year, birth_month, birth_day,
        min_age, current_year, current_month, current_day,
        age_valid, age_commitment
    );
}

#[test]
fn test_different_min_age() {
    // Test case: Different minimum age requirement (21 for some jurisdictions)
    let birth_year = 2000;
    let birth_month = 5;
    let birth_day = 15;
    let min_age = 21;  // Different minimum
    let current_year = 2024;
    let current_month = 11;
    let current_day = 22;
    
    let age_valid = true;  // 24 >= 21
    
    let commitment_inputs = [
        birth_year as Field,
        birth_month as Field,
        birth_day as Field,
        24 as Field,
        age_valid as Field
    ];
    let age_commitment = poseidon::hash(commitment_inputs);
    
    main(
        birth_year, birth_month, birth_day,
        min_age, current_year, current_month, current_day,
        age_valid, age_commitment
    );
}
