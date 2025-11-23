#!/bin/bash
# build_zk_noir.sh
# Script to compile Noir circuits using nargo and prepare for proof generation
# 
# Usage: ./scripts/build_zk_noir.sh [circuit_name] [--all]
#
# Examples:
#   ./scripts/build_zk_noir.sh age_proof
#   ./scripts/build_zk_noir.sh --all
#

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CIRCUITS_DIR="$PROJECT_ROOT/zk/noir-circuits"
PROOFS_DIR="$PROJECT_ROOT/zk/proofs"
VERIFIERS_DIR="$PROJECT_ROOT/zk/verifiers"

# Available circuits
CIRCUITS=("age_proof" "citizenship_proof" "attribute_proof")

# Functions
print_header() {
    echo -e "${BLUE}================================================${NC}"
    echo -e "${BLUE}🏗️  DVote Noir Circuit Builder${NC}"
    echo -e "${BLUE}================================================${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

check_dependencies() {
    print_info "Checking dependencies..."
    
    # Check if nargo is available (either system or our Node.js version)
    if command -v nargo >/dev/null 2>&1; then
        print_success "nargo found in system PATH"
        NARGO_CMD="nargo"
    elif [ -f "$CIRCUITS_DIR/nargo.bat" ]; then
        print_success "Using custom nargo.bat implementation"
        NARGO_CMD="$CIRCUITS_DIR/nargo.bat"
    elif [ -f "$CIRCUITS_DIR/nargo.js" ]; then
        print_success "Using Node.js nargo implementation"
        NARGO_CMD="node $CIRCUITS_DIR/nargo.js"
    else
        print_error "nargo not found. Please install nargo or run from circuits directory."
        exit 1
    fi
    
    # Check Node.js for our implementation
    if ! command -v node >/dev/null 2>&1; then
        print_warning "Node.js not found. Some features may not work."
    fi
    
    print_success "All dependencies checked"
}

compile_circuit() {
    local circuit_name=$1
    local circuit_path="$CIRCUITS_DIR/$circuit_name"
    
    print_info "Compiling circuit: $circuit_name"
    
    # Check if circuit directory exists
    if [ ! -d "$circuit_path" ]; then
        print_error "Circuit directory not found: $circuit_path"
        return 1
    fi
    
    # Check for required files
    if [ ! -f "$circuit_path/Nargo.toml" ]; then
        print_error "Nargo.toml not found in $circuit_path"
        return 1
    fi
    
    if [ ! -f "$circuit_path/src/main.nr" ]; then
        print_error "src/main.nr not found in $circuit_path"
        return 1
    fi
    
    # Navigate to circuit directory and compile
    cd "$circuit_path"
    
    print_info "Running: $NARGO_CMD compile"
    if $NARGO_CMD compile; then
        print_success "Circuit $circuit_name compiled successfully"
        
        # Check if target directory was created
        if [ -d "target" ]; then
            print_success "Target directory created"
            
            # List compiled artifacts
            print_info "Compiled artifacts:"
            ls -la target/ || true
            
            # Copy artifacts to organized locations
            copy_artifacts "$circuit_name"
        else
            print_warning "No target directory found after compilation"
        fi
    else
        print_error "Failed to compile circuit $circuit_name"
        return 1
    fi
    
    cd "$PROJECT_ROOT"
}

copy_artifacts() {
    local circuit_name=$1
    local circuit_path="$CIRCUITS_DIR/$circuit_name"
    local target_path="$circuit_path/target"
    
    print_info "Organizing compiled artifacts for $circuit_name..."
    
    # Create circuit-specific directories
    mkdir -p "$PROOFS_DIR/$circuit_name"
    mkdir -p "$VERIFIERS_DIR/$circuit_name"
    
    # Copy bytecode and ABI files
    if [ -f "$target_path/${circuit_name}.json" ]; then
        cp "$target_path/${circuit_name}.json" "$VERIFIERS_DIR/$circuit_name/"
        print_success "Copied compiled circuit to verifiers directory"
    fi
    
    # Copy any other artifacts
    if [ -d "$target_path" ]; then
        find "$target_path" -name "*.json" -exec cp {} "$VERIFIERS_DIR/$circuit_name/" \;
        find "$target_path" -name "*.toml" -exec cp {} "$VERIFIERS_DIR/$circuit_name/" \;
    fi
    
    # Create a build info file
    cat > "$VERIFIERS_DIR/$circuit_name/build_info.json" << EOF
{
    "circuit_name": "$circuit_name",
    "compiled_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "nargo_version": "$(${NARGO_CMD} --version 2>/dev/null || echo 'unknown')",
    "source_path": "$circuit_path",
    "artifacts": [
        "$(ls "$target_path" 2>/dev/null | tr '\n' ',' | sed 's/,$//')"
    ]
}
EOF
    
    print_success "Build information saved"
}

compile_all_circuits() {
    print_info "Compiling all circuits..."
    
    local failed_circuits=()
    
    for circuit in "${CIRCUITS[@]}"; do
        echo ""
        print_info "=== Processing Circuit: $circuit ==="
        
        if compile_circuit "$circuit"; then
            print_success "✓ $circuit compilation completed"
        else
            print_error "✗ $circuit compilation failed"
            failed_circuits+=("$circuit")
        fi
    done
    
    echo ""
    print_header
    
    if [ ${#failed_circuits[@]} -eq 0 ]; then
        print_success "All circuits compiled successfully!"
    else
        print_error "Failed circuits: ${failed_circuits[*]}"
        exit 1
    fi
}

show_usage() {
    echo "Usage: $0 [circuit_name] [--all] [--help]"
    echo ""
    echo "Options:"
    echo "  circuit_name    Compile specific circuit (age_proof, citizenship_proof, attribute_proof)"
    echo "  --all           Compile all available circuits"
    echo "  --help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 age_proof                    # Compile age_proof circuit"
    echo "  $0 --all                       # Compile all circuits"
    echo ""
    echo "Available circuits:"
    for circuit in "${CIRCUITS[@]}"; do
        echo "  - $circuit"
    done
}

# Main execution
main() {
    print_header
    
    # Parse arguments
    if [ $# -eq 0 ] || [ "$1" = "--help" ]; then
        show_usage
        exit 0
    fi
    
    check_dependencies
    
    if [ "$1" = "--all" ]; then
        compile_all_circuits
    else
        # Check if specified circuit is valid
        circuit_name="$1"
        if [[ " ${CIRCUITS[*]} " =~ " ${circuit_name} " ]]; then
            compile_circuit "$circuit_name"
        else
            print_error "Unknown circuit: $circuit_name"
            echo ""
            show_usage
            exit 1
        fi
    fi
    
    echo ""
    print_success "Build process completed!"
    print_info "Compiled artifacts saved to: $VERIFIERS_DIR"
    print_info "Ready for proof generation with prove_noir.sh"
}

# Run main function with all arguments
main "$@"