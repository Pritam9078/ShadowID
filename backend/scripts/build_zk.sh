#!/bin/bash

# Build script for all ZK circuits and components
echo "🔨 Building ZK Infrastructure..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Change to project root
cd "$(dirname "$0")/.."

print_status "Checking prerequisites..."

# Check Noir toolchain
if command -v nargo >/dev/null 2>&1; then
    print_success "Noir $(nargo --version) found"
else
    print_error "Noir (nargo) not found. Please install from: https://noir-lang.org/getting_started/installation"
    exit 1
fi

# Check Node.js for Aztec backend
if command -v node >/dev/null 2>&1; then
    print_success "Node.js $(node --version) found"
else
    print_warning "Node.js not found. Aztec backend integration will be limited."
fi

print_status "Building all ZK circuits..."

# Compile all circuits using workspace
if [ -f "Nargo.toml" ]; then
    print_status "Compiling workspace circuits..."
    if nargo compile --workspace; then
        print_success "Workspace circuits compiled successfully"
    else
        print_error "Workspace compilation failed"
        exit 1
    fi
else
    print_warning "No workspace Nargo.toml found, compiling circuits individually"
    
    # Compile circuits individually
    cd zk/scripts
    if [ -f "compile_all.sh" ]; then
        chmod +x compile_all.sh
        ./compile_all.sh
    else
        print_error "compile_all.sh not found"
        exit 1
    fi
    cd ../..
fi

print_status "Running circuit tests..."

# Run tests if available
if nargo test --workspace 2>/dev/null; then
    print_success "All circuit tests passed"
else
    print_warning "Circuit tests failed or not available"
fi

print_status "Checking Aztec backend integration..."

# Check Aztec backend
cd zk/scripts
if node aztec_backend.js check; then
    print_success "Aztec backend integration ready"
else
    print_warning "Aztec backend not available, using nargo fallback"
fi
cd ../..

print_status "Setting up development environment..."

# Create necessary directories
mkdir -p zk/proofs
mkdir -p zk/verifiers
mkdir -p logs

# Make scripts executable
chmod +x zk/scripts/*.sh
chmod +x scripts/*.sh

print_success "🎉 ZK Infrastructure build completed!"

print_status "Available commands:"
echo "  Compile circuits: ./zk/scripts/compile_all.sh"
echo "  Generate proof:  ./zk/scripts/generate_proof.sh <circuit_name>"
echo "  Verify proof:    ./zk/scripts/verify_proof.sh <circuit_name>"
echo "  Test circuits:   nargo test --workspace"
echo "  List circuits:   node zk/scripts/aztec_backend.js circuits"
echo ""
print_status "Backend integration:"
echo "  npm run zk:compile     - Compile all circuits"
echo "  npm run zk:prove       - Generate proofs (interactive)"
echo "  npm run zk:verify      - Verify proofs"
echo "  npm run zk:test        - Run circuit tests"
echo "  npm run zk:check       - Check Aztec backend status"