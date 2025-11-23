#!/bin/bash

# Compile all Noir circuits for KYB verification
echo "🔧 Compiling all KYB Noir circuits..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to compile a circuit
compile_circuit() {
    local circuit_name=$1
    local circuit_path="../noir-circuits/$circuit_name"
    
    echo -e "${BLUE}[INFO]${NC} Compiling $circuit_name..."
    
    if [ -d "$circuit_path" ]; then
        cd "$circuit_path"
        
        if nargo compile; then
            echo -e "${GREEN}[SUCCESS]${NC} $circuit_name compiled successfully"
        else
            echo -e "${RED}[ERROR]${NC} Failed to compile $circuit_name"
            return 1
        fi
        
        cd - > /dev/null
    else
        echo -e "${YELLOW}[WARNING]${NC} Circuit directory $circuit_path not found"
        return 1
    fi
}

# Change to scripts directory
cd "$(dirname "$0")"

# Check if nargo is available
if ! command -v nargo &> /dev/null; then
    echo -e "${RED}[ERROR]${NC} nargo not found. Please install Noir toolchain."
    echo "Visit: https://noir-lang.org/getting_started/installation"
    exit 1
fi

echo -e "${BLUE}[INFO]${NC} Found nargo: $(nargo --version)"

# Compile all circuits
echo -e "${BLUE}[INFO]${NC} Starting compilation of all KYB circuits..."

compile_circuit "kyb_verification"
compile_circuit "business_age"
compile_circuit "revenue_proof"
compile_circuit "business_registration"
compile_circuit "ubo_proof"
compile_circuit "revenue_threshold"

# Also compile existing circuits if they exist
if [ -d "../noir-circuits/age_proof" ]; then
    compile_circuit "age_proof"
fi

if [ -d "../noir-circuits/citizenship_proof" ]; then
    compile_circuit "citizenship_proof"
fi

if [ -d "../noir-circuits/attribute_proof" ]; then
    compile_circuit "attribute_proof"
fi

echo -e "${GREEN}[SUCCESS]${NC} All circuit compilation completed!"
echo -e "${BLUE}[INFO]${NC} Compiled circuits are ready for proof generation."
echo -e "${BLUE}[INFO]${NC} Use './generate_proof.sh <circuit_name>' to generate proofs."