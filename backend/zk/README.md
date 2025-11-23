# ZK Circuits Documentation

This directory contains Zero-Knowledge circuits for privacy-preserving business verification (KYB - Know Your Business) using Noir.

## 📁 Directory Structure

```
zk/
├── noir-circuits/              # Noir circuit source code
│   ├── business_registration/  # Legal business existence verification
│   ├── ubo_proof/             # Ultimate Beneficial Owner compliance
│   ├── revenue_threshold/      # Revenue compliance proofs
│   └── document_hash_proof/    # Document possession verification
├── proofs/                     # Generated proofs (gitignored)
├── verifiers/                  # Verification keys and contracts
└── scripts/                    # Build and development scripts
    ├── compile_all_circuits.sh/ps1     # Compile all circuits
    ├── test_document_hash_integration.js/ps1  # Integration tests
    ├── compute_document_hash.js/py     # Document hash utilities
    └── noir.js                 # Noir backend integration
```

## 🚀 Quick Start

### Prerequisites

1. **Install Noir Toolchain**
   ```bash
   # Visit: https://noir-lang.org/getting_started/installation
   curl -L https://raw.githubusercontent.com/noir-lang/noirup/main/install | bash
   noirup
   ```

2. **Install Node.js** (for Aztec backend)
   ```bash
   # Visit: https://nodejs.org/
   node --version  # Should be >= 18
   ```

### 🔧 Setup Commands

**Linux/macOS:**
```bash
# Build all ZK infrastructure
./scripts/build_zk.sh

# Compile all circuits
./zk/scripts/compile_all.sh

# Test all circuits
nargo test --workspace
```

**Windows:**
```powershell
# Build all ZK infrastructure
.\scripts\build_zk.ps1

# Compile all circuits  
.\zk\scripts\compile_all.ps1

# Test all circuits
nargo test --workspace
```

### 📋 Available Circuits

#### 1. **KYB Verification Circuit** (`kyb_verification`)
Complete business eligibility verification without revealing sensitive data.

**Proves:**
- Business meets minimum revenue requirements
- Sufficient employee count
- Operating for minimum required years  
- Valid jurisdiction and business type
- All without revealing exact values

**Usage:**
```bash
./zk/scripts/generate_proof.sh kyb_verification
```

#### 2. **Business Age Circuit** (`business_age`)
Proves business has been operating for minimum required years.

**Proves:**
- Years since incorporation ≥ minimum requirement
- Without revealing exact incorporation date

#### 3. **Revenue Proof Circuit** (`revenue_proof`) 
Proves annual revenue meets threshold requirements.

**Proves:**
- Revenue ≥ minimum threshold
- Revenue ≤ maximum cap (for tier verification)
- Valid currency and recent fiscal year

#### 4. **Individual Circuits** (KYC Support)
- `age_proof` - Individual age verification
- `citizenship_proof` - Citizenship verification
- `attribute_proof` - Generic attribute constraints

## 🔨 Development Workflow

### 1. **Compile All Circuits**
```bash
# Linux/macOS
npm run zk:compile

# Windows  
npm run zk:compile:win

# Or directly
nargo compile --workspace
```

### 2. **Generate Proofs**

**Interactive Mode:**
```bash
# Linux/macOS
./zk/scripts/generate_proof.sh kyb_verification

# Windows
.\zk\scripts\generate_proof.ps1 kyb_verification
```

**Programmatic (via Node.js):**
```javascript
const AztecBackend = require('./scripts/aztec_backend.js');
const backend = new AztecBackend();

const witnessData = {
    business_registration_number: "0x123...",
    annual_revenue: "1000000",
    employee_count: "50",
    // ... other inputs
};

const proof = await backend.generateProofWithAztec('kyb_verification', witnessData);
```

### 3. **Verify Proofs**
```bash
# Verify generated proof
./zk/scripts/verify_proof.sh kyb_verification

# Or via Node.js
const isValid = await backend.verifyProof('kyb_verification', proof, publicInputs);
```

### 4. **Test Circuits**
```bash
# Run all circuit tests
npm run zk:test

# Test specific circuit
cd zk/noir-circuits/kyb_verification
nargo test
```

## 🔐 Circuit Details

### KYB Verification Circuit Inputs

**Private Inputs (Hidden):**
- `business_registration_number` - Unique business identifier
- `business_type` - Hash of business entity type
- `jurisdiction` - Hash of jurisdiction code  
- `annual_revenue` - Exact revenue amount
- `employee_count` - Exact number of employees
- `incorporation_year` - Year business was incorporated
- `salt` - Privacy salt for commitment

**Public Inputs (Revealed):**
- `min_revenue` - Minimum revenue requirement
- `min_employees` - Minimum employee requirement
- `allowed_jurisdictions` - Array of allowed jurisdiction hashes
- `allowed_business_types` - Array of allowed business type hashes
- `current_year` - Current year for age calculation
- `min_business_age` - Minimum years in operation

**Public Output:**
- `commitment` - Cryptographic commitment to private data

### Proof Generation Example

**1. Create `Prover.toml`:**
```toml
# KYB Verification Circuit Inputs
business_registration_number = "0x1234567890abcdef..."
business_type = "0xabcdef1234567890..."  # Hash of "LLC"
jurisdiction = "0x123456789abcdef12..."  # Hash of "DE"
annual_revenue = "1500000"               # $1.5M revenue
employee_count = "25"                    # 25 employees
incorporation_year = "2021"              # Incorporated in 2021
salt = "0x9876543210fedcba..."          # Random salt

# Public requirements
min_revenue = "1000000"                  # Min $1M revenue
min_employees = "10"                     # Min 10 employees
min_business_age = "2"                   # Min 2 years operating
current_year = "2024"                    # Current year

# Allowed values (as hashes)
allowed_jurisdictions = ["0x123456789abcdef12...", "0x0", ...]
allowed_business_types = ["0xabcdef1234567890...", "0x0", ...]

# Output commitment (calculated by circuit)
commitment = "0x0000000000000000000000000000000000000000000000000000000000000000"
```

**2. Generate Proof:**
```bash
nargo prove
# Outputs: proofs/proof.json, proofs/public.json
```

**3. Verify Proof:**
```bash
nargo verify
# Returns: success/failure
```

## 🔌 Backend Integration

### Express API Integration

The ZK circuits integrate with the Express backend via:

```javascript
// Generate KYB proof
POST /zk/kyb-verification
{
  "businessData": {
    "registrationNumber": "...",
    "businessType": "LLC", 
    "jurisdiction": "DE",
    "annualRevenue": 1500000,
    "employeeCount": 25,
    "incorporationYear": 2021
  },
  "requirements": {
    "minRevenue": 1000000,
    "minEmployees": 10,
    "minBusinessAge": 2
  }
}

// Submit proof to DAO
POST /dao/submit-kyb-proof
{
  "userAddress": "0x123...",
  "proof": { ... },
  "publicInputs": [ ... ],
  "commitment": "0xabc..."
}
```

### Stylus DAO Integration

The proofs are submitted to the Stylus DAO contract:

```rust
// DAO contract verification
if !self.is_business_verified_in_shadowid(business_address)? {
    evm::log(BusinessVerificationRequired { business: business_address });
    return Err(b"KYB required".to_vec());
}
```

## 🛡️ Security Considerations

### Privacy Protection
- **Zero-Knowledge**: Only proves compliance, never reveals exact values
- **Commitment Schemes**: Cryptographic commitments protect private data
- **Salt Usage**: Random salts prevent rainbow table attacks

### Proof Integrity
- **Circuit Constraints**: Mathematical constraints prevent cheating
- **Verification Keys**: Cryptographic verification ensures proof validity
- **Trusted Setup**: Circuits use universal trusted setup (if required)

### Business Logic Security
- **Range Validation**: All inputs validated within reasonable ranges
- **Time Constraints**: Incorporation dates and fiscal years validated
- **Type Safety**: Business types and jurisdictions verified against allowed lists

## 🔧 Advanced Configuration

### Custom Business Types
Add new business entity types by updating allowed hashes:

```javascript
// Generate hash for new business type
const businessTypeHash = ethers.id("Corporation");
// Add to allowed_business_types array in circuit
```

### Jurisdiction Support
Add new jurisdictions:

```javascript
// Generate hash for jurisdiction code
const jurisdictionHash = ethers.id("CA"); // California
// Add to allowed_jurisdictions array
```

### Threshold Customization
Modify verification thresholds:

```toml
# In Prover.toml
min_revenue = "5000000"        # $5M for enterprise tier
min_employees = "100"          # 100+ employees for enterprise
min_business_age = "5"         # 5+ years for established business
```

## 📊 Performance Metrics

### Circuit Sizes (Approximate)
- **KYB Verification**: ~50,000 constraints
- **Business Age**: ~5,000 constraints  
- **Revenue Proof**: ~10,000 constraints

### Proof Generation Times
- **Development**: 5-10 seconds per proof
- **Production**: 30-60 seconds per proof (optimized)
- **Aztec Backend**: 2-5 seconds per proof (when available)

### Verification Times
- **On-chain**: <1 second
- **Off-chain**: <100ms

## 🐛 Troubleshooting

### Common Issues

**1. Compilation Errors**
```bash
# Check Noir version
nargo --version

# Clean and rebuild
rm -rf target/
nargo compile
```

**2. Proof Generation Failures**
```bash
# Check Prover.toml syntax
nargo check

# Verify input constraints
# Ensure all array lengths match circuit expectations
```

**3. Verification Failures**
```bash
# Ensure proof and public input files exist
ls proofs/

# Check for file corruption
nargo verify --verbose
```

### Development Tips

1. **Start Simple**: Begin with basic circuits before complex business logic
2. **Test Thoroughly**: Use `nargo test` extensively during development  
3. **Constraint Optimization**: Minimize constraint count for faster proving
4. **Input Validation**: Always validate inputs in both circuit and application
5. **Commitment Consistency**: Ensure commitment generation is identical across components

## 📚 Resources

- **Noir Documentation**: https://noir-lang.org/
- **Noir Examples**: https://github.com/noir-lang/noir-examples
- **Aztec Documentation**: https://docs.aztec.network/
- **ZK Learning Resources**: https://zkp.science/

## 🤝 Contributing

1. **Add New Circuits**: Create in `noir-circuits/` with proper `Nargo.toml`
2. **Update Scripts**: Modify generation/verification scripts as needed
3. **Test Coverage**: Add tests for all new functionality
4. **Documentation**: Update this README for new features

---

**Ready for privacy-preserving business verification! 🚀**