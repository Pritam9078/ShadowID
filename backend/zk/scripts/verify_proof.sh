#!/bin/bash

# Verify ZK proof for specified circuit
echo "✓ Verifying ZK proof..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check arguments
if [ $# -eq 0 ]; then
    echo -e "${RED}[ERROR]${NC} Circuit name required."
    echo "Usage: $0 <circuit_name>"
    exit 1
fi

CIRCUIT_NAME=$1
CIRCUIT_PATH="../noir-circuits/$CIRCUIT_NAME"
PROOFS_DIR="../proofs/$CIRCUIT_NAME"

# Check if circuit exists
if [ ! -d "$CIRCUIT_PATH" ]; then
    echo -e "${RED}[ERROR]${NC} Circuit '$CIRCUIT_NAME' not found at $CIRCUIT_PATH"
    exit 1
fi

# Check if proof exists
if [ ! -f "$CIRCUIT_PATH/proofs/proof.json" ] && [ ! -f "$PROOFS_DIR/proof.json" ]; then
    echo -e "${RED}[ERROR]${NC} No proof found for circuit '$CIRCUIT_NAME'"
    echo "Generate a proof first using: ./generate_proof.sh $CIRCUIT_NAME"
    exit 1
fi

echo -e "${BLUE}[INFO]${NC} Verifying proof for circuit: $CIRCUIT_NAME"

# Change to circuit directory
cd "$CIRCUIT_PATH"

# Copy proof from proofs directory if it exists there
if [ -f "../../proofs/$CIRCUIT_NAME/proof.json" ] && [ ! -f "proofs/proof.json" ]; then
    mkdir -p proofs
    cp "../../proofs/$CIRCUIT_NAME/proof.json" "proofs/"
    cp "../../proofs/$CIRCUIT_NAME/public.json" "proofs/" 2>/dev/null || true
fi

# Verify proof
echo -e "${BLUE}[INFO]${NC} Running nargo verify..."
if nargo verify; then
    echo -e "${GREEN}[SUCCESS]${NC} ✓ Proof verification successful!"
    echo -e "${BLUE}[INFO]${NC} The proof is cryptographically valid."
else
    echo -e "${RED}[ERROR]${NC} ✗ Proof verification failed!"
    echo -e "${RED}[ERROR]${NC} The proof is invalid or corrupted."
    exit 1
fi