#!/bin/bash

# Stylus ZK Verifier Build Script
# Compiles and tests the Noir proof verifier for Arbitrum Stylus

set -e

echo "🚀 Building Stylus ZK Verifier..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
FEATURES=${FEATURES:-"default"}
BUILD_MODE=${BUILD_MODE:-"release"}
TEST_MODE=${TEST_MODE:-"all"}

echo -e "${BLUE}Configuration:${NC}"
echo "  Features: $FEATURES"
echo "  Build Mode: $BUILD_MODE"
echo "  Test Mode: $TEST_MODE"
echo ""

# Function to print step headers
print_step() {
    echo -e "${YELLOW}▶️ $1${NC}"
}

# Function to print success messages
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Function to print error messages
print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "Cargo.toml" ]; then
    print_error "Cargo.toml not found. Please run this script from the contracts-stylus directory."
    exit 1
fi

# Step 1: Check Rust toolchain
print_step "Checking Rust toolchain..."
if ! command -v rustc &> /dev/null; then
    print_error "Rust is not installed. Please install Rust from https://rustup.rs/"
    exit 1
fi

RUST_VERSION=$(rustc --version)
print_success "Rust found: $RUST_VERSION"

# Step 2: Check for Stylus CLI (if needed)
print_step "Checking for Stylus CLI..."
if command -v cargo-stylus &> /dev/null; then
    STYLUS_VERSION=$(cargo stylus --version)
    print_success "Stylus CLI found: $STYLUS_VERSION"
else
    echo -e "${YELLOW}⚠️  Stylus CLI not found. Install with: cargo install cargo-stylus${NC}"
fi

# Step 3: Format code
print_step "Formatting code..."
if cargo fmt --check &> /dev/null; then
    print_success "Code is properly formatted"
else
    echo -e "${YELLOW}⚠️  Formatting code...${NC}"
    cargo fmt
    print_success "Code formatted"
fi

# Step 4: Run Clippy lints
print_step "Running Clippy lints..."
if cargo clippy --features "$FEATURES" -- -D warnings; then
    print_success "No Clippy warnings found"
else
    print_error "Clippy found issues. Please fix them before proceeding."
    exit 1
fi

# Step 5: Build the project
print_step "Building project with features: $FEATURES..."
if [ "$BUILD_MODE" = "release" ]; then
    BUILD_FLAGS="--release"
else
    BUILD_FLAGS=""
fi

if cargo build $BUILD_FLAGS --features "$FEATURES"; then
    print_success "Build completed successfully"
else
    print_error "Build failed"
    exit 1
fi

# Step 6: Run tests
print_step "Running tests..."
case $TEST_MODE in
    "unit")
        cargo test --lib --features "$FEATURES"
        ;;
    "integration")
        cargo test --test '*' --features "$FEATURES"
        ;;
    "all")
        cargo test --features "$FEATURES"
        ;;
    "none")
        echo "Skipping tests (TEST_MODE=none)"
        ;;
    *)
        print_error "Unknown test mode: $TEST_MODE"
        exit 1
        ;;
esac

if [ "$TEST_MODE" != "none" ]; then
    print_success "All tests passed"
fi

# Step 7: Check binary size (for Stylus deployment)
if [ -f "target/release/contracts_stylus.wasm" ] || [ -f "target/wasm32-unknown-unknown/release/contracts_stylus.wasm" ]; then
    print_step "Checking WASM binary size..."
    
    WASM_FILE=""
    if [ -f "target/wasm32-unknown-unknown/release/contracts_stylus.wasm" ]; then
        WASM_FILE="target/wasm32-unknown-unknown/release/contracts_stylus.wasm"
    elif [ -f "target/release/contracts_stylus.wasm" ]; then
        WASM_FILE="target/release/contracts_stylus.wasm"
    fi
    
    if [ -n "$WASM_FILE" ]; then
        WASM_SIZE=$(wc -c < "$WASM_FILE")
        WASM_SIZE_KB=$((WASM_SIZE / 1024))
        
        echo "  WASM size: ${WASM_SIZE_KB} KB"
        
        # Stylus has a size limit (typically 128KB)
        if [ $WASM_SIZE_KB -gt 128 ]; then
            print_error "WASM binary too large for Stylus deployment (${WASM_SIZE_KB} KB > 128 KB)"
            echo "  Consider enabling size optimizations or reducing features"
        else
            print_success "WASM binary size acceptable for Stylus deployment"
        fi
    fi
fi

# Step 8: Generate documentation
print_step "Generating documentation..."
if cargo doc --no-deps --features "$FEATURES"; then
    print_success "Documentation generated"
    echo "  View at: target/doc/contracts_stylus/index.html"
else
    print_error "Documentation generation failed"
fi

# Step 9: Security audit (basic checks)
print_step "Running basic security checks..."

# Check for unsafe code
UNSAFE_COUNT=$(grep -r "unsafe" src/ --include="*.rs" | wc -l || echo "0")
if [ "$UNSAFE_COUNT" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Found $UNSAFE_COUNT unsafe blocks. Review carefully.${NC}"
else
    print_success "No unsafe code blocks found"
fi

# Check for TODO/FIXME comments
TODO_COUNT=$(grep -r -E "(TODO|FIXME|XXX)" src/ --include="*.rs" | wc -l || echo "0")
if [ "$TODO_COUNT" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Found $TODO_COUNT TODO/FIXME comments${NC}"
else
    print_success "No TODO/FIXME comments found"
fi

# Step 10: Performance benchmarks (if available)
if [ -d "benches" ]; then
    print_step "Running performance benchmarks..."
    if cargo bench --features "$FEATURES"; then
        print_success "Benchmarks completed"
    else
        echo -e "${YELLOW}⚠️  Benchmarks failed or not available${NC}"
    fi
fi

# Summary
echo ""
echo -e "${GREEN}🎉 Build process completed successfully!${NC}"
echo ""
echo -e "${BLUE}Summary:${NC}"
echo "  ✅ Code formatted and linted"
echo "  ✅ Project built successfully"
if [ "$TEST_MODE" != "none" ]; then
    echo "  ✅ All tests passed"
fi
echo "  ✅ Documentation generated"
echo ""

# Usage instructions
echo -e "${BLUE}Usage Instructions:${NC}"
echo "  • View documentation: open target/doc/contracts_stylus/index.html"
echo "  • Run specific tests: cargo test <test_name> --features $FEATURES"
echo "  • Build for Stylus: cargo build --target wasm32-unknown-unknown --release"
echo "  • Deploy to Stylus: cargo stylus deploy --private-key=<key>"
echo ""

# Development tips
echo -e "${BLUE}Development Tips:${NC}"
echo "  • Use 'lightweight' feature for testing: FEATURES=lightweight $0"
echo "  • Enable full verification: FEATURES=native_verification $0"
echo "  • Skip tests for faster builds: TEST_MODE=none $0"
echo "  • Build debug version: BUILD_MODE=debug $0"
echo ""

print_success "Ready for development! 🚀"