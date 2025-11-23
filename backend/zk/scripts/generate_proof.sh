#!/bin/bash

# Generate ZK proof for specified circuit
echo "🔐 Generating ZK proof..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check arguments
if [ $# -eq 0 ]; then
    echo -e "${RED}[ERROR]${NC} Circuit name required."
    echo "Usage: $0 <circuit_name> [prover_file]"
    echo "Available circuits:"
    echo "  - kyb_verification"
    echo "  - business_age"
    echo "  - revenue_proof"
    echo "  - age_proof"
    echo "  - citizenship_proof"
    echo "  - attribute_proof"
    exit 1
fi

CIRCUIT_NAME=$1
PROVER_FILE=${2:-"Prover.toml"}
CIRCUIT_PATH="../noir-circuits/$CIRCUIT_NAME"
PROOFS_DIR="../proofs/$CIRCUIT_NAME"

# Check if circuit exists
if [ ! -d "$CIRCUIT_PATH" ]; then
    echo -e "${RED}[ERROR]${NC} Circuit '$CIRCUIT_NAME' not found at $CIRCUIT_PATH"
    exit 1
fi

# Create proofs directory
mkdir -p "$PROOFS_DIR"

echo -e "${BLUE}[INFO]${NC} Generating proof for circuit: $CIRCUIT_NAME"
echo -e "${BLUE}[INFO]${NC} Using prover file: $PROVER_FILE"

# Change to circuit directory
cd "$CIRCUIT_PATH"

# Check if Prover.toml exists
if [ ! -f "$PROVER_FILE" ]; then
    echo -e "${YELLOW}[WARNING]${NC} $PROVER_FILE not found. Creating template..."
    
    case $CIRCUIT_NAME in
        "kyb_verification")
            cat > "$PROVER_FILE" << EOF
# KYB Verification Circuit Inputs
# Fill in actual values before generating proof

# Private inputs (witness)
business_registration_number = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
business_type = "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"
jurisdiction = "0x123456789abcdef123456789abcdef123456789abcdef123456789abcdef12"
annual_revenue = "1000000"
employee_count = "50"
incorporation_year = "2020"
salt = "0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba"

# Public inputs
min_revenue = "500000"
min_employees = "10"
allowed_jurisdictions = ["0x123456789abcdef123456789abcdef123456789abcdef123456789abcdef12", "0x0", "0x0", "0x0", "0x0", "0x0", "0x0", "0x0", "0x0", "0x0"]
allowed_business_types = ["0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890", "0x0", "0x0", "0x0", "0x0"]
current_year = "2024"
min_business_age = "2"

# Public output
commitment = "0x0000000000000000000000000000000000000000000000000000000000000000"
EOF
            ;;
        "business_age")
            cat > "$PROVER_FILE" << EOF
# Business Age Verification Circuit Inputs

incorporation_year = "2020"
incorporation_month = "6"
incorporation_day = "15"
salt = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"

min_years_operating = "2"
current_year = "2024"
current_month = "11"
current_day = "23"

commitment = "0x0000000000000000000000000000000000000000000000000000000000000000"
EOF
            ;;
        "revenue_proof")
            cat > "$PROVER_FILE" << EOF
# Revenue Proof Circuit Inputs

annual_revenue = "1500000"
revenue_currency = "0x555344000000000000000000000000000000000000000000000000000000000"  # "USD" hash
fiscal_year = "2023"
salt = "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"

min_revenue_threshold = "1000000"
max_revenue_cap = "10000000"
allowed_currencies = ["0x555344000000000000000000000000000000000000000000000000000000000", "0x0", "0x0", "0x0", "0x0"]
current_fiscal_year = "2024"

commitment = "0x0000000000000000000000000000000000000000000000000000000000000000"
EOF
            ;;
        *)
            echo -e "${YELLOW}[WARNING]${NC} Unknown circuit. Creating generic Prover.toml"
            echo "# Fill in circuit-specific inputs" > "$PROVER_FILE"
            ;;
    esac
    
    echo -e "${YELLOW}[WARNING]${NC} Please edit $PROVER_FILE with actual values before generating proof."
fi

# Compile if needed
if [ ! -d "target" ]; then
    echo -e "${BLUE}[INFO]${NC} Compiling circuit first..."
    if ! nargo compile; then
        echo -e "${RED}[ERROR]${NC} Circuit compilation failed"
        exit 1
    fi
fi

# Generate proof
echo -e "${BLUE}[INFO]${NC} Generating proof..."
if nargo prove; then
    echo -e "${GREEN}[SUCCESS]${NC} Proof generated successfully!"
    
    # Copy proof files to proofs directory
    if [ -f "proofs/proof.json" ]; then
        cp "proofs/proof.json" "../../proofs/$CIRCUIT_NAME/"
        echo -e "${BLUE}[INFO]${NC} Proof saved to: ../proofs/$CIRCUIT_NAME/proof.json"
    fi
    
    if [ -f "proofs/public.json" ]; then
        cp "proofs/public.json" "../../proofs/$CIRCUIT_NAME/"
        echo -e "${BLUE}[INFO]${NC} Public inputs saved to: ../proofs/$CIRCUIT_NAME/public.json"
    fi
    
    echo -e "${GREEN}[SUCCESS]${NC} Proof generation completed!"
    echo -e "${BLUE}[INFO]${NC} Use './verify_proof.sh $CIRCUIT_NAME' to verify the proof."
else
    echo -e "${RED}[ERROR]${NC} Proof generation failed"
    exit 1
fi