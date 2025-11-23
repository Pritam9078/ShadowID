#!/bin/bash

# UBO Proof Circuit Testing Utility
# Helps test different proof modes and scenarios

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Function to display colored messages
info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

header() {
    echo -e "${PURPLE}=== $1 ===${NC}"
}

# Function to run a test case
run_test_case() {
    local test_name=$1
    local expected_result=$2
    local description=$3
    
    header "Testing: $test_name"
    info "Description: $description"
    info "Expected result: $expected_result"
    
    # Generate proof
    info "Generating proof..."
    if nargo prove 2>/dev/null; then
        if [ "$expected_result" = "pass" ]; then
            success "✓ Test passed - Proof generated successfully"
            
            # Verify the proof
            info "Verifying proof..."
            if nargo verify 2>/dev/null; then
                success "✓ Proof verification successful"
            else
                error "✗ Proof verification failed"
                return 1
            fi
        else
            error "✗ Test failed - Expected failure but proof generated"
            return 1
        fi
    else
        if [ "$expected_result" = "fail" ]; then
            success "✓ Test passed - Proof correctly rejected"
        else
            error "✗ Test failed - Expected success but proof generation failed"
            return 1
        fi
    fi
    
    echo
    return 0
}

# Function to extract test case from test_cases.toml
extract_test_case() {
    local test_case=$1
    
    # Use awk to extract the specific test case section
    awk "/\[$test_case\]/,/^\[/ { if (/^\[/ && !/\[$test_case\]/) exit; if (!/^\[/) print }" test_cases.toml > temp_test.toml
    
    # Remove the section header and extract just the key-value pairs
    tail -n +2 temp_test.toml | grep -v "expected_result\|description" > Prover.toml
    
    # Extract expected result and description
    local expected=$(grep "expected_result" temp_test.toml | cut -d'"' -f2)
    local desc=$(grep "description" temp_test.toml | cut -d'"' -f2)
    
    echo "$expected|$desc"
    rm -f temp_test.toml
}

# Change to circuit directory
cd "$(dirname "$0")/../noir-circuits/ubo_proof" || {
    error "Could not find ubo_proof circuit directory"
    exit 1
}

# Check if circuit is compiled
if [ ! -f "target/ubo_proof.json" ]; then
    warning "Circuit not compiled. Compiling now..."
    if ! nargo compile; then
        error "Failed to compile circuit"
        exit 1
    fi
fi

# Main testing menu
while true; do
    echo
    header "UBO Proof Circuit Test Menu"
    echo "1. Test Mode 1 (Merkle Inclusion) - Valid case"
    echo "2. Test Mode 1 (Merkle Inclusion) - Invalid case (below threshold)"
    echo "3. Test Mode 2 (Aggregate Count) - Valid case"
    echo "4. Test Mode 2 (Aggregate Count) - Invalid case (wrong count)"
    echo "5. Test Edge Cases (boundary conditions)"
    echo "6. Test Input Validation (zero values, invalid modes)"
    echo "7. Run All Test Cases"
    echo "8. Manual Test (use current Prover.toml)"
    echo "9. Switch to Mode 1 example"
    echo "10. Switch to Mode 2 example"
    echo "0. Exit"
    echo
    read -p "Select an option (0-10): " choice

    case $choice in
        1)
            info "Testing Mode 1 - Valid Merkle inclusion..."
            result=$(extract_test_case "test_case_1.valid_merkle_inclusion")
            expected=$(echo "$result" | cut -d'|' -f1)
            desc=$(echo "$result" | cut -d'|' -f2)
            run_test_case "Mode 1 Valid" "$expected" "$desc"
            ;;
        2)
            info "Testing Mode 1 - Below threshold..."
            result=$(extract_test_case "test_case_3.invalid_below_threshold")
            expected=$(echo "$result" | cut -d'|' -f1)
            desc=$(echo "$result" | cut -d'|' -f2)
            run_test_case "Mode 1 Below Threshold" "$expected" "$desc"
            ;;
        3)
            info "Testing Mode 2 - Valid aggregate count..."
            result=$(extract_test_case "test_case_2.valid_aggregate_count")
            expected=$(echo "$result" | cut -d'|' -f1)
            desc=$(echo "$result" | cut -d'|' -f2)
            run_test_case "Mode 2 Valid" "$expected" "$desc"
            ;;
        4)
            info "Testing Mode 2 - Wrong count..."
            result=$(extract_test_case "test_case_4.invalid_wrong_count")
            expected=$(echo "$result" | cut -d'|' -f1)
            desc=$(echo "$result" | cut -d'|' -f2)
            run_test_case "Mode 2 Wrong Count" "$expected" "$desc"
            ;;
        5)
            info "Testing edge cases..."
            result=$(extract_test_case "test_case_8.edge_case_exactly_threshold")
            expected=$(echo "$result" | cut -d'|' -f1)
            desc=$(echo "$result" | cut -d'|' -f2)
            run_test_case "Edge Case - Exact Threshold" "$expected" "$desc"
            ;;
        6)
            info "Testing input validation..."
            
            # Test zero owner ID
            result=$(extract_test_case "test_case_5.invalid_zero_owner_id")
            expected=$(echo "$result" | cut -d'|' -f1)
            desc=$(echo "$result" | cut -d'|' -f2)
            run_test_case "Zero Owner ID" "$expected" "$desc"
            
            # Test invalid mode
            result=$(extract_test_case "test_case_9.invalid_mode")
            expected=$(echo "$result" | cut -d'|' -f1)
            desc=$(echo "$result" | cut -d'|' -f2)
            run_test_case "Invalid Mode" "$expected" "$desc"
            ;;
        7)
            info "Running all test cases..."
            total_tests=0
            passed_tests=0
            
            for test in test_case_1.valid_merkle_inclusion test_case_2.valid_aggregate_count test_case_3.invalid_below_threshold test_case_4.invalid_wrong_count test_case_5.invalid_zero_owner_id test_case_6.invalid_zero_salt test_case_7.invalid_over_100_percent test_case_8.edge_case_exactly_threshold test_case_9.invalid_mode; do
                total_tests=$((total_tests + 1))
                result=$(extract_test_case "$test")
                expected=$(echo "$result" | cut -d'|' -f1)
                desc=$(echo "$result" | cut -d'|' -f2)
                
                if run_test_case "$test" "$expected" "$desc"; then
                    passed_tests=$((passed_tests + 1))
                fi
                echo "---"
            done
            
            echo
            header "Test Results Summary"
            success "Passed: $passed_tests/$total_tests"
            if [ $passed_tests -eq $total_tests ]; then
                success "🎉 All tests passed!"
            else
                warning "⚠️  Some tests failed. Review the output above."
            fi
            ;;
        8)
            info "Running manual test with current Prover.toml..."
            if [ -f "Prover.toml" ]; then
                run_test_case "Manual Test" "unknown" "Using current Prover.toml configuration"
            else
                error "No Prover.toml file found"
            fi
            ;;
        9)
            info "Switching to Mode 1 example..."
            if [ -f "Prover_mode1.toml" ]; then
                cp Prover_mode1.toml Prover.toml
                success "Switched to Mode 1 (Merkle inclusion) example"
                info "You can now run option 8 for manual testing"
            else
                error "Prover_mode1.toml not found"
            fi
            ;;
        10)
            info "Switching to Mode 2 example..."
            if [ -f "Prover_mode2.toml" ]; then
                cp Prover_mode2.toml Prover.toml
                success "Switched to Mode 2 (Aggregate count) example"
                info "You can now run option 8 for manual testing"
            else
                error "Prover_mode2.toml not found"
            fi
            ;;
        0)
            info "Exiting test utility..."
            exit 0
            ;;
        *)
            error "Invalid option. Please select 0-10."
            ;;
    esac
done