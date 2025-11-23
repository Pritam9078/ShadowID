# Noir ZK Proof Verifier for Stylus

This module provides comprehensive Zero Knowledge proof verification capabilities for Arbitrum Stylus smart contracts, specifically designed for the DVote DAO governance system.

## Overview

The `zk_noir_verifier.rs` module enables on-chain verification of Noir zero-knowledge proofs within Stylus smart contracts. It provides tools for:

- Parsing Noir proof JSON and public inputs
- Converting between different field element representations
- Verifying proofs with built-in safety checks
- Gas-optimized batch verification
- Integration with DAO membership verification

## Key Features

### 🔐 **Proof Verification**
- Support for Groth16 and PLONK proof systems
- BN254 elliptic curve field operations
- Configurable verification backends (native vs. mock)

### ⚡ **Gas Optimization**
- Efficient field element conversion
- Proof caching for repeated verifications
- Batch processing capabilities
- Size validation to prevent DoS attacks

### 🛡️ **Security**
- Input validation and sanitization
- Protection against proof replay attacks
- Field element range checking
- Comprehensive error handling

## Expected Formats

### Noir Proof JSON Structure
```json
{
  "proof": "0x1a2b3c...",           // Hex-encoded proof bytes (64-512 bytes)
  "publicInputs": [                // Array of field elements
    "0x0000000000000000000000000000000000000000000000000000000000000001",
    "0x0000000000000000000000000000000000000000000000000000000000000002"
  ]
}
```

### Verification Key JSON Structure
```json
{
  "keyAsHex": "0x...",             // Hex-encoded verification key
  "curve": "bn254",                // Curve identifier
  "protocol": "groth16"            // Proof system protocol
}
```

### Size Constraints

| Component | Size Range | Description |
|-----------|------------|-------------|
| **Proof** | 64-512 bytes | Depends on circuit complexity |
| **Verification Key** | 576-2048 bytes | Circuit-dependent |
| **Public Inputs** | Up to 32 elements | 32 bytes each (BN254 field) |
| **Field Element** | 32 bytes | 256-bit BN254 field element |

## Usage Examples

### Basic Proof Verification

```rust
use contracts_stylus::zk_noir_verifier::verify_noir_proof_raw;

// Raw bytes verification (most efficient)
let proof_bytes = hex::decode("0x1234567890abcdef...").unwrap();
let public_inputs = hex::decode("0x0000000000000000000000000000000000000000000000000000000000000001").unwrap();

let is_valid = verify_noir_proof_raw(&proof_bytes, &public_inputs);
if is_valid {
    println!("Proof verified successfully!");
}
```

### JSON Proof Parsing

```rust
use contracts_stylus::zk_noir_verifier::{NoirVerifier, utils};

let proof_json = r#"
{
    "proof": "0x1a2b3c4d...",
    "publicInputs": ["0x1", "0x2", "0x3"]
}
"#;

// Convert JSON to raw bytes
let (proof_bytes, public_bytes) = utils::proof_json_to_raw_bytes(proof_json)?;

// Verify
let is_valid = verify_noir_proof_raw(&proof_bytes, &public_bytes);
```

### Stylus Contract Integration

```rust
use stylus_sdk::prelude::*;
use contracts_stylus::zk_noir_verifier::verify_noir_proof_raw;

#[entrypoint]
pub struct BusinessDAO {
    verified_members: StorageMap<Address, StorageBool>,
}

#[external]
impl BusinessDAO {
    pub fn join_with_proof(
        &mut self,
        proof_bytes: Vec<u8>,
        public_inputs: Vec<u8>,
    ) -> Result<(), Vec<u8>> {
        // Verify business eligibility proof
        let is_valid = verify_noir_proof_raw(&proof_bytes, &public_inputs);
        
        if !is_valid {
            return Err(b"Invalid business proof".to_vec());
        }
        
        // Add verified member
        let caller = msg::sender();
        self.verified_members.insert(caller, StorageBool::new(true));
        
        Ok(())
    }
}
```

## Field Element Conversion

The verifier provides utilities for converting between different field representations:

```rust
use contracts_stylus::zk_noir_verifier::{FieldElement, convert_field_encoding, FieldFormat};

// Create field element from hex
let field = FieldElement::from_hex("0x123456789abcdef")?;

// Convert between endianness formats
let big_endian_bytes = field.bytes;
let little_endian_bytes = field.to_le_bytes();

// Batch conversion for multiple elements
let input_bytes = vec![/* field elements as bytes */];
let converted = convert_field_encoding(
    &input_bytes,
    FieldFormat::Noir,        // From Noir format (big-endian)
    FieldFormat::LittleEndian // To little-endian
)?;
```

## Performance Considerations

### Gas Costs (Estimated)

| Operation | Gas Cost | Notes |
|-----------|----------|-------|
| Single Proof Verification | 50k-150k | Depends on proof size |
| Batch Verification (5 proofs) | 200k-500k | More efficient per proof |
| Field Conversion | 1k-5k | Per field element |
| Proof Caching | 20k | Subsequent verifications |

### Optimization Strategies

#### 1. **Off-Chain Verification + Attestation**
For high-volume applications, consider:

```rust
// Off-chain service verifies proofs and signs results
pub struct ProofAttestationService {
    private_key: [u8; 32],
}

impl ProofAttestationService {
    pub fn verify_and_sign(&self, proof_bytes: &[u8], public_inputs: &[u8]) -> Signature {
        let is_valid = verify_noir_proof_raw(proof_bytes, public_inputs);
        if is_valid {
            self.sign_verification_result(proof_bytes, public_inputs)
        } else {
            panic!("Proof verification failed");
        }
    }
}

// On-chain contract only validates signatures (much cheaper)
#[external]
impl BusinessDAO {
    pub fn join_with_attestation(
        &mut self,
        proof_hash: [u8; 32],
        attestation_signature: [u8; 65],
    ) -> Result<(), Vec<u8>> {
        // Verify attestation signature (5k gas vs 100k+ for full verification)
        if self.verify_attestation_signature(proof_hash, attestation_signature) {
            let caller = msg::sender();
            self.verified_members.insert(caller, StorageBool::new(true));
            Ok(())
        } else {
            Err(b"Invalid attestation".to_vec())
        }
    }
}
```

#### 2. **Proof Caching**
```rust
use contracts_stylus::zk_noir_verifier::OptimizedVerifier;

let mut verifier = OptimizedVerifier::new();

// First verification: Full cryptographic verification
let result1 = verifier.verify_with_cache(&proof_bytes, &public_inputs);

// Subsequent verifications: Cache lookup (much faster)
let result2 = verifier.verify_with_cache(&proof_bytes, &public_inputs);
```

#### 3. **Batch Processing**
```rust
use contracts_stylus::zk_noir_verifier::utils;

let proofs = vec![
    (proof_bytes_1, public_inputs_1),
    (proof_bytes_2, public_inputs_2),
    (proof_bytes_3, public_inputs_3),
];

// More efficient than individual verifications
let results = utils::batch_verify_proofs(&proofs);
```

## Circuit Integration

The verifier is designed to work with DVote's business verification circuits:

### Supported Circuits

1. **Business Registration** (`business_registration`)
   - Verifies company registration status
   - Hides sensitive registration details

2. **UBO Compliance** (`ubo_proof`) 
   - Proves Ultimate Beneficial Ownership
   - Validates ownership percentage requirements

3. **Revenue Threshold** (`revenue_threshold`)
   - Verifies minimum revenue requirements
   - Preserves revenue amount privacy

4. **Document Validation** (`document_hash_proof`)
   - Validates document authenticity
   - Checks expiration dates and signatures

5. **Composite Business Proof** (`composite_business_proof`)
   - Combined verification of all requirements
   - Policy-based selective enforcement

### Policy Configuration

The composite circuit supports flexible policy configuration:

```rust
// Policy flags (5-bit configuration)
pub enum VerificationPolicy {
    BusinessRegistration = 1,  // Bit 0
    UboCompliance = 2,         // Bit 1  
    RevenueThreshold = 4,      // Bit 2
    DocumentValidation = 8,    // Bit 3
    WalletBinding = 16,        // Bit 4
}

// Example: Require business registration + UBO compliance
let policy = VerificationPolicy::BusinessRegistration as u32 | 
             VerificationPolicy::UboCompliance as u32;
```

## Error Handling

The verifier provides comprehensive error handling:

```rust
use contracts_stylus::zk_noir_verifier::VerificationError;

match verify_result {
    Ok(true) => println!("Proof verified successfully"),
    Ok(false) => println!("Proof verification failed"),
    Err(VerificationError::InvalidProofFormat) => {
        // Client can retry with corrected format
        println!("Invalid proof format - check input encoding");
    },
    Err(VerificationError::ProofVerificationFailed) => {
        // Cryptographic verification failed - serious issue
        println!("Proof cryptographically invalid");
    },
    Err(e) => println!("Other error: {:?}", e),
}
```

### Error Categories

| Error Type | Recoverable | Description |
|------------|-------------|-------------|
| `InvalidProofFormat` | ✅ | Client formatting issue |
| `InvalidPublicInputs` | ✅ | Input validation failed |
| `InvalidHexEncoding` | ✅ | Hex string malformed |
| `ProofVerificationFailed` | ❌ | Cryptographic failure |
| `UnsupportedCurve` | ❌ | System configuration issue |

## Testing

### Unit Tests
```bash
# Run all tests
cargo test

# Run with features
cargo test --features native_verification

# Run specific test module
cargo test zk_noir_verifier::tests
```

### Integration Tests
```bash
# Test with actual proof data
cargo test integration_tests --features std

# Performance benchmarks
cargo bench --features native_verification
```

### Example Test Data

The module includes comprehensive test cases:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_business_registration_proof() {
        let proof_json = include_str!("../test_data/business_registration_proof.json");
        let verifier = NoirVerifier::new(None);
        let proof = verifier.parse_proof_json(proof_json).unwrap();
        
        let proof_bytes = verifier.extract_proof_bytes(&proof.proof).unwrap();
        let public_inputs = verifier.parse_public_inputs(&proof.public_inputs).unwrap();
        
        // Should verify successfully with test data
        let is_valid = verify_noir_proof_raw(&proof_bytes, &serialize_inputs(&public_inputs));
        assert!(is_valid);
    }
}
```

## Production Deployment

### Cargo.toml Configuration

```toml
[features]
default = ["lightweight"]

# For testing/development
lightweight = []

# For production with full verification
production = ["native_verification"]
native_verification = [
    # Enable when native verification crates are available
    # "noir_rs", 
    # "barretenberg"
]
```

### Deployment Checklist

- [ ] **Choose verification mode**: Native vs. off-chain attestation
- [ ] **Configure gas limits**: Set appropriate limits for proof verification
- [ ] **Set up monitoring**: Track verification success rates and gas usage
- [ ] **Test with real data**: Validate with actual circuit proofs
- [ ] **Enable caching**: Configure proof caching for repeated verifications
- [ ] **Set size limits**: Configure maximum proof and input sizes
- [ ] **Monitor performance**: Track gas costs and optimization opportunities

### Security Considerations

1. **Proof Replay Prevention**: Use unique nonces in circuit inputs
2. **Input Validation**: Always validate field element ranges
3. **Gas Limit Management**: Set appropriate limits to prevent DoS
4. **Key Management**: Secure verification key storage and updates
5. **Access Control**: Implement proper permissions for sensitive operations

## Future Enhancements

### Planned Features
- [ ] Support for additional proof systems (STARK, FFLONK)
- [ ] Optimized field arithmetic operations
- [ ] Compressed proof formats
- [ ] Multi-signature proof aggregation
- [ ] Recursive proof verification

### Integration Roadmap
- [ ] Frontend SDK for proof generation
- [ ] Off-chain verification service
- [ ] Proof aggregation for batch operations
- [ ] Cross-chain proof verification
- [ ] Integration with other ZK frameworks

## Support and Documentation

- **Circuit Documentation**: See `zk/DEVELOPMENT_GUIDE.md`
- **Contract Examples**: See `examples/verify_noir_proof.rs`
- **Gas Optimization**: Use `utils::estimate_verification_gas()`
- **Error Handling**: Reference `VerificationError` enum
- **Performance Tuning**: Enable appropriate feature flags

For questions or issues, consult the DVote DAO documentation or submit issues to the project repository.