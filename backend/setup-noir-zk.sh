#!/bin/bash

# DVote Noir ZK Backend Quick Start Script
echo "🚀 Starting DVote Noir ZK Backend Setup..."

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

# Change to backend directory
cd "$(dirname "$0")"

print_status "Checking prerequisites..."

# Check Node.js version
if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -ge 18 ]; then
        print_success "Node.js $(node --version) found"
    else
        print_error "Node.js >= 18 required, found $(node --version)"
        exit 1
    fi
else
    print_error "Node.js not found. Please install Node.js >= 18"
    exit 1
fi

# Check npm
if command -v npm >/dev/null 2>&1; then
    print_success "npm $(npm --version) found"
else
    print_error "npm not found"
    exit 1
fi

# Check Noir toolchain
if command -v nargo >/dev/null 2>&1; then
    print_success "Noir $(nargo --version) found"
else
    print_warning "Noir (nargo) not found. ZK proof generation will not work without it."
    print_status "Install from: https://noir-lang.org/getting_started/installation"
fi

print_status "Installing Node.js dependencies..."

# Copy package.json for installation
cp package-noir-zk.json package.json

# Install dependencies
if npm install; then
    print_success "Dependencies installed successfully"
else
    print_error "Failed to install dependencies"
    exit 1
fi

print_status "Setting up environment configuration..."

# Setup environment file
if [ ! -f .env ]; then
    cp .env.noir-zk .env
    print_warning "Created .env file from template. Please configure your settings:"
    print_status "  - Set contract addresses"
    print_status "  - Set backend private key"
    print_status "  - Configure RPC endpoints"
else
    print_status "Environment file already exists"
fi

print_status "Setting up Noir circuits..."

# Create circuit directories if they don't exist
mkdir -p ../zk-circuits/noir/age_proof/src
mkdir -p ../zk-circuits/noir/citizenship_proof/src
mkdir -p ../zk-circuits/noir/attribute_proof/src

print_success "Circuit directories created"

print_status "Compiling Noir circuits (if nargo is available)..."

if command -v nargo >/dev/null 2>&1; then
    # Compile age proof circuit
    if [ -d "../zk-circuits/noir/age_proof" ]; then
        cd ../zk-circuits/noir/age_proof
        if nargo compile; then
            print_success "Age proof circuit compiled"
        else
            print_warning "Age proof circuit compilation failed"
        fi
        cd - >/dev/null
    fi

    # Compile citizenship proof circuit
    if [ -d "../zk-circuits/noir/citizenship_proof" ]; then
        cd ../zk-circuits/noir/citizenship_proof
        if nargo compile; then
            print_success "Citizenship proof circuit compiled"
        else
            print_warning "Citizenship proof circuit compilation failed"
        fi
        cd - >/dev/null
    fi

    # Compile attribute proof circuit
    if [ -d "../zk-circuits/noir/attribute_proof" ]; then
        cd ../zk-circuits/noir/attribute_proof
        if nargo compile; then
            print_success "Attribute proof circuit compiled"
        else
            print_warning "Attribute proof circuit compilation failed"
        fi
        cd - >/dev/null
    fi
else
    print_warning "Skipping circuit compilation (nargo not available)"
fi

print_status "Testing backend health check..."

# Start server in background for health check
timeout 10s node server-noir-zk.js &
SERVER_PID=$!

# Wait a moment for server to start
sleep 3

# Test health endpoint
if curl -s http://localhost:3001/health > /dev/null; then
    print_success "Backend health check passed"
else
    print_warning "Health check failed - server may not be fully configured"
fi

# Stop test server
kill $SERVER_PID 2>/dev/null || true

print_success "🎉 DVote Noir ZK Backend setup complete!"

echo ""
print_status "Next steps:"
echo "  1. Configure .env file with your settings"
echo "  2. Deploy DAO and ShadowID contracts"
echo "  3. Update contract addresses in .env"
echo "  4. Run: npm run dev (development) or npm start (production)"
echo ""
print_status "Available endpoints:"
echo "  📋 Health: GET http://localhost:3001/health"
echo "  🔐 KYC: POST http://localhost:3001/kyc/commitment"
echo "  🎯 Age Proof: POST http://localhost:3001/zk/age"
echo "  🌍 Citizenship: POST http://localhost:3001/zk/citizenship"
echo "  📊 Attributes: POST http://localhost:3001/zk/attribute"
echo "  ⚖️ DAO Submit: POST http://localhost:3001/dao/submit-proof"
echo ""
print_status "Documentation: README-NOIR-ZK.md"