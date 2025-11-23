#!/bin/bash
# DVote Noir Circuits Setup Script
# This script helps set up and test the Noir ZK circuits

set -e

echo "🚀 DVote Noir Circuits Setup Script"
echo "===================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [[ ! -d "age_proof" || ! -d "citizenship_proof" || ! -d "attribute_proof" ]]; then
    print_error "Please run this script from the zk/noir-circuits directory"
    exit 1
fi

# Check if nargo is installed
if ! command -v nargo &> /dev/null; then
    print_warning "Nargo is not installed. Installing now..."
    
    # Install noirup
    print_status "Installing noirup..."
    curl -L https://raw.githubusercontent.com/noir-lang/noirup/main/install | bash
    
    # Source the environment
    export PATH="$HOME/.nargo/bin:$PATH"
    
    # Install nargo
    print_status "Installing nargo..."
    noirup
    
    print_success "Nargo installed successfully!"
else
    print_success "Nargo is already installed: $(nargo --version)"
fi

# Function to build and test a circuit
build_and_test_circuit() {
    local circuit_name=$1
    print_status "Building and testing $circuit_name circuit..."
    
    cd "$circuit_name"
    
    # Check if Nargo.toml exists
    if [[ ! -f "Nargo.toml" ]]; then
        print_error "Nargo.toml not found in $circuit_name"
        cd ..
        return 1
    fi
    
    # Build the circuit
    print_status "Building $circuit_name..."
    if nargo build; then
        print_success "$circuit_name built successfully"
    else
        print_error "Failed to build $circuit_name"
        cd ..
        return 1
    fi
    
    # Run tests if they exist
    if [[ -f "src/test.nr" ]]; then
        print_status "Running tests for $circuit_name..."
        if nargo test; then
            print_success "$circuit_name tests passed"
        else
            print_error "$circuit_name tests failed"
            cd ..
            return 1
        fi
    else
        print_warning "No tests found for $circuit_name"
    fi
    
    # Show circuit info
    print_status "Circuit info for $circuit_name:"
    nargo info
    
    cd ..
    return 0
}

# Build and test all circuits
echo ""
print_status "Building and testing all circuits..."
echo ""

# Age Proof Circuit
build_and_test_circuit "age_proof"
echo ""

# Citizenship Proof Circuit  
build_and_test_circuit "citizenship_proof"
echo ""

# Attribute Proof Circuit
build_and_test_circuit "attribute_proof"
echo ""

# Summary
print_success "All circuits have been built and tested successfully!"
echo ""
echo "Next steps:"
echo "1. Review the Prover.toml files in each circuit directory for example inputs"
echo "2. Modify the inputs with your actual data"
echo "3. Run 'nargo prove' in each circuit directory to generate proofs"
echo "4. Use the generated proofs with your ShadowIDRegistry smart contract"
echo ""
echo "For more information, see the NOIR_CIRCUITS_README.md file"

print_success "Setup complete! 🎉"