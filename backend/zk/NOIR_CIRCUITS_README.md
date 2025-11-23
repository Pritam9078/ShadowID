# DVote ZK Circuits - Noir Implementation

This directory contains Zero-Knowledge proof circuits implemented in Noir for the DVote DAO system. These circuits enable privacy-preserving identity verification while maintaining the integrity required for governance participation.

## 🏗️ Circuit Architecture

### 1. Age Proof Circuit (`age_proof/`)
**Purpose**: Prove minimum age requirement without revealing exact birth date or age.

**Private Inputs**:
- `birth_year`: Year of birth
- `birth_month`: Month of birth (1-12)  
- `birth_day`: Day of birth (1-31)

**Public Inputs**:
- `min_age`: Minimum required age (default: 18)
- `current_year`: Current year for calculation
- `current_month`: Current month for precise calculation
- `current_day`: Current day for precise calculation

**Outputs**:
- `age_valid`: Boolean if age >= min_age
- `age_commitment`: Poseidon hash commitment

### 2. Citizenship Proof Circuit (`citizenship_proof/`)
**Purpose**: Prove citizenship of a specific country without revealing document details.

**Private Inputs**:
- `citizen_code`: ISO 3166-1 numeric country code
- `document_id`: Hash of document identifier
- `salt`: Random salt for privacy

**Public Inputs**:
- `required_citizenship`: Required country code (e.g., 356 for India)

**Outputs**:
- `citizenship_valid`: Boolean if citizenship matches
- `citizenship_commitment`: Poseidon hash commitment

### 3. Attribute Proof Circuit (`attribute_proof/`)
**Purpose**: Generic selective disclosure of attributes from a larger dataset.

**Private Inputs**:
- `attributes[10]`: Array of all user attributes
- `attribute_index`: Index of attribute to prove
- `salt`: Random salt for privacy

**Public Inputs**:
- `target_attribute_hash`: Hash of specific attribute to prove
- `attributes_root`: Merkle root of all attributes

**Outputs**:
- `attribute_exists`: Boolean if target attribute exists
- `proof_commitment`: Privacy-preserving commitment

## 🚀 Quick Start

### Prerequisites
```bash
# Install Nargo (Noir toolchain)
curl -L https://raw.githubusercontent.com/noir-lang/noirup/main/install | bash
noirup
```

### Building Circuits
```bash
# Build all circuits
cd zk/noir-circuits/age_proof && nargo build
cd ../citizenship_proof && nargo build  
cd ../attribute_proof && nargo build
```

### Testing Circuits
```bash
# Test age proof
cd age_proof
nargo test

# Test citizenship proof  
cd ../citizenship_proof
nargo test

# Test attribute proof
cd ../attribute_proof
nargo test
```

### Generating Proofs
```bash
# Generate proof for age verification
cd age_proof
nargo prove

# Generate proof for citizenship
cd ../citizenship_proof  
nargo prove

# Generate proof for attribute disclosure
cd ../attribute_proof
nargo prove
```

## 📊 Integration with DVote DAO

### ShadowIDRegistry Integration
The circuits integrate with the `ShadowIDRegistry` smart contract:

1. **User Registration**: Users submit commitments from circuit outputs
2. **Proof Verification**: Contract verifies ZK proofs on-chain
3. **Badge Issuance**: Verified users receive Verified Wallet Badges
4. **DAO Access**: Only verified users can participate in governance

### Workflow Example
```
1. User generates age proof     → Commitment Hash A
2. User generates citizenship proof → Commitment Hash B  
3. User generates attribute proof   → Commitment Hash C
4. Submit all commitments to ShadowIDRegistry
5. Admin verifies proofs and issues badge
6. User can now participate in DAO governance
```

## 🔒 Privacy Features

### Zero-Knowledge Properties
- **Age Proof**: Exact age never revealed, only validity
- **Citizenship**: Document details never revealed, only country match
- **Attributes**: Only specific attribute revealed, rest remain private

### Cryptographic Security
- **Poseidon Hash**: SNARK-friendly hash function
- **Merkle Commitments**: Integrity of attribute sets
- **Salt Protection**: Prevents rainbow table attacks
- **Replay Protection**: Document ID prevents proof reuse

## 🛠️ Development Guide

### Adding New Circuits
1. Create new directory in `zk/noir-circuits/`
2. Add `Nargo.toml` configuration
3. Implement circuit in `src/main.nr`
4. Add tests and examples
5. Update this README

### Circuit Testing
```bash
# Create test inputs
echo '{"birth_year": 1995, "birth_month": 5, "birth_day": 15}' > Prover.toml

# Run tests
nargo test

# Check constraints
nargo info
```

### Performance Optimization
- Use efficient Poseidon hashing
- Minimize constraint count
- Optimize loop structures
- Use appropriate field arithmetic

## 📈 Country Codes Reference

Common ISO 3166-1 numeric codes for citizenship proofs:
- 🇮🇳 India: 356
- 🇺🇸 United States: 840
- 🇬🇧 United Kingdom: 826  
- 🇨🇦 Canada: 124
- 🇦🇺 Australia: 036
- 🇩🇪 Germany: 276
- 🇫🇷 France: 250
- 🇯🇵 Japan: 392

## 🔗 Integration APIs

### TypeScript/JavaScript
```typescript
import { generateAgeProof, generateCitizenshipProof } from './circuits';

// Generate age proof
const ageProof = await generateAgeProof({
  birthYear: 1995,
  birthMonth: 5,
  birthDay: 15,
  minAge: 18
});

// Submit to ShadowIDRegistry
await shadowRegistry.submitKyc(userAddress, ageProof.commitment);
await shadowRegistry.submitProof(userAddress, ageProof.hash);
```

### Rust Integration
```rust
// In ShadowIDRegistry contract
pub fn verify_age_proof(
    &self,
    user: Address,
    commitment: FixedBytes<32>,
    proof_hash: FixedBytes<32>
) -> bool {
    // Verify proof against commitment
    self.validate_noir_proof(commitment, proof_hash)
}
```

## 🚀 Deployment

### Production Checklist
- [ ] All circuits tested with valid inputs
- [ ] Performance benchmarks completed  
- [ ] Security audit performed
- [ ] Integration tests with ShadowIDRegistry
- [ ] Frontend proof generation tested
- [ ] Key ceremony completed (if using trusted setup)

### Circuit Compilation
```bash
# Compile for production
nargo build --release

# Generate verification keys
nargo codegen-verifier

# Export for web integration
nargo export-verifier --format json
```

---

**Security Notice**: These circuits handle sensitive personal data. Always use in secure environments and follow zero-knowledge proof best practices for production deployments.