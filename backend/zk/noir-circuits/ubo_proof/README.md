# UBO (Ultimate Beneficial Owner) Proof Circuit

A Noir zero-knowledge circuit for privacy-preserving business ownership verification. Proves ownership properties without revealing individual UBO identities or exact ownership percentages.

## Overview

This circuit enables compliance with regulatory requirements (such as 25% ownership disclosure rules) while maintaining privacy of business ownership structures. It supports two proof modes:

- **Mode 1 (Merkle Inclusion)**: Prove a specific UBO owns ≥ threshold percentage
- **Mode 2 (Aggregate Count)**: Prove the count of UBOs above threshold without revealing identities

## Circuit Specifications

### Global Constants
- `MAX_UBOS = 20`: Maximum supported UBOs per proof
- `SCALE_FACTOR = 10000`: Basis points scaling (10000 = 100%)
- `MERKLE_DEPTH = 8`: Maximum Merkle tree depth for inclusion proofs

### Public Inputs
- `commitment_root`: Merkle root of UBO commitments (Mode 1) or aggregate root (Mode 2)
- `threshold_pct`: Ownership threshold in basis points (e.g., 2500 = 25%)
- `claimed_owner_index`: Index of UBO being proven (Mode 1 only)
- `claimed_count`: Number of UBOs above threshold (Mode 2 only)
- `merkle_proof`: Inclusion proof path (Mode 1 only)
- `proof_mode`: 1 = Merkle inclusion, 2 = Aggregate count

### Private Inputs
- `owner_shares[20]`: Ownership percentages for each UBO (basis points)
- `owner_salts[20]`: Randomness for commitment generation
- `owner_ids[20]`: Hashed identities of UBOs
- `actual_ubo_count`: Number of active UBOs in arrays

## Proof Modes

### Mode 1: Merkle Inclusion Proof

**Use Case**: Prove "At least one disclosed UBO owns ≥ 25% of the company"

**Process**:
1. Create UBO commitment: `Poseidon(owner_id, owner_share, owner_salt)`
2. Verify Merkle inclusion of commitment in `commitment_root`
3. Prove `owner_share ≥ threshold_pct`
4. Validate all inputs are non-zero and within bounds

**Benefits**:
- Constant proof size regardless of UBO count
- O(log n) verification complexity
- Privacy-preserving for large ownership structures
- Scalable for companies with many UBOs

**Best For**: Companies with >10 UBOs, frequent ownership verification

### Mode 2: Aggregate Count Proof

**Use Case**: Prove "Exactly N UBOs own ≥ 10% of the company"

**Process**:
1. Iterate through all UBO ownership percentages
2. Count UBOs with `owner_share ≥ threshold_pct`
3. Verify `computed_count == claimed_count`
4. Validate total ownership ≤ 100%
5. Optional: Verify aggregate commitment root

**Benefits**:
- Simple counting logic
- Direct verification of ownership distribution
- Efficient for small UBO sets
- Clear regulatory compliance demonstration

**Best For**: Companies with <10 UBOs, regulatory reporting

## Security Properties

### Privacy Guarantees
- **UBO Identity Protection**: Individual owner identities never revealed
- **Ownership Percentage Hiding**: Exact percentages remain private
- **Structure Concealment**: Company ownership structure stays confidential
- **Zero-Knowledge**: Only proves compliance, not specific details

### Integrity Assurances
- **Commitment Binding**: Cryptographically links to on-chain attestations
- **Non-Malleability**: Prevents manipulation of ownership data
- **Completeness**: Valid ownership structures always produce valid proofs
- **Soundness**: Invalid structures cannot generate valid proofs

### Input Validation
- **Non-Zero Validation**: Prevents zero owner IDs, salts, and shares
- **Range Checks**: Ownership percentages within 0-100% bounds
- **Total Ownership**: Aggregate ownership cannot exceed 100%
- **Array Bounds**: UBO count within maximum supported limit

## On-Chain Integration

### Stylus Contract Interface

```rust
struct UBOAttestation {
    commitment_root: U256,      // Merkle/aggregate root of UBO commitments
    threshold_required: u16,    // Minimum ownership (basis points)
    issuer: Address,           // Authorized attestation issuer
    expiry: U256,              // Attestation expiry timestamp
    revoked: bool,             // Revocation status
    attestation_type: u8,      // 1 = Merkle, 2 = Aggregate
}

// Storage mappings
ubo_attestations: mapping(U256 => UBOAttestation)
authorized_issuers: mapping(Address => bool)
revocation_list: mapping(U256 => bool)
```

### Attestation Lifecycle

1. **Initial Registration**:
   - Company submits UBO list to authorized issuer
   - Issuer creates commitments for each UBO
   - Root commitment stored on-chain with metadata

2. **Proof Generation**:
   - Company generates ZK proof using this circuit
   - Chooses appropriate mode based on compliance requirement
   - Submits proof to DAO or regulatory system

3. **Verification**:
   - Verifier checks proof against on-chain commitment root
   - Validates attestation is current and not revoked
   - Confirms issuer authorization and expiry

4. **Maintenance**:
   - Periodic re-attestation for ownership changes
   - Emergency revocation for compliance violations
   - Automated expiry handling

## Gas and Size Analysis

### Mode 1 (Merkle Inclusion)
- **Proof Size**: ~2KB (constant)
- **Verification Gas**: ~100K gas
- **Generation Time**: ~5-10 seconds
- **Scalability**: O(log n) in UBO count
- **Privacy**: Maximum (individual UBO protection)

### Mode 2 (Aggregate Count)  
- **Proof Size**: ~500 bytes + (UBO_count × 50 bytes)
- **Verification Gas**: ~50K + (UBO_count × 5K) gas
- **Generation Time**: ~1-3 seconds
- **Scalability**: O(n) in UBO count
- **Privacy**: Medium (count revealed)

### Recommendations
- **Use Mode 1** for companies with >10 UBOs or high privacy requirements
- **Use Mode 2** for companies with <10 UBOs or regulatory count reporting
- **Consider hybrid**: Mode 2 for initial compliance, Mode 1 for governance

## Usage Examples

### Compile and Test
```bash
# Navigate to circuit directory
cd zk/noir-circuits/ubo_proof

# Compile the circuit
nargo compile

# Test Mode 1 (Merkle inclusion)
cp Prover_mode1.toml Prover.toml
nargo prove
nargo verify

# Test Mode 2 (Aggregate count)  
cp Prover_mode2.toml Prover.toml
nargo prove
nargo verify
```

### Integration Example
```javascript
// Frontend: Generate ownership proof
const proof = await noir.generateProof({
  // Public inputs
  commitment_root: onChainRoot,
  threshold_pct: 2500, // 25%
  proof_mode: 1,       // Merkle inclusion
  
  // Private inputs (from secure storage)
  owner_shares: uboShares,
  owner_salts: uboSalts,
  owner_ids: uboIds,
  actual_ubo_count: ubos.length
});

// Backend: Verify against on-chain data
const isValid = await verifyUBOProof(proof, commitmentRoot);
```

### DAO Governance Integration
```solidity
function checkOwnershipEligibility(
    bytes calldata zkProof,
    uint256 commitmentRoot
) external view returns (bool) {
    // Verify ZK proof
    require(verifyUBOProof(zkProof), "Invalid UBO proof");
    
    // Check on-chain attestation
    UBOAttestation memory attestation = ubo_attestations[commitmentRoot];
    require(!attestation.revoked, "Attestation revoked");
    require(block.timestamp <= attestation.expiry, "Attestation expired");
    require(authorized_issuers[attestation.issuer], "Unauthorized issuer");
    
    return true;
}
```

## Test Cases

The `test_cases.toml` file includes comprehensive scenarios:

1. ✅ **Valid Merkle inclusion** - UBO above threshold
2. ✅ **Valid aggregate count** - Correct count of qualified UBOs  
3. ❌ **Below threshold** - UBO ownership insufficient
4. ❌ **Wrong count** - Incorrect aggregate count claim
5. ❌ **Zero inputs** - Invalid zero owner ID or salt
6. ❌ **Over 100%** - Total ownership exceeds maximum
7. ✅ **Exact threshold** - Boundary case testing
8. ❌ **Invalid mode** - Unsupported proof mode

## Regulatory Compliance

### Supported Requirements
- **25% Ownership Rule**: Prove major stakeholder compliance
- **UBO Count Limits**: Demonstrate ownership concentration
- **Sanctions Screening**: Enable privacy-preserving checks
- **Tax Reporting**: Support beneficial ownership disclosure
- **AML Compliance**: Verify ownership structure requirements

### Privacy Benefits
- **Competitive Protection**: Ownership structure remains confidential
- **Individual Privacy**: UBO identities protected from competitors
- **Strategic Advantage**: Prevents corporate intelligence gathering
- **Regulatory Balance**: Compliance without over-disclosure

## Development

### File Structure
```
ubo_proof/
├── src/
│   └── main.nr           # Main circuit implementation
├── Nargo.toml           # Package configuration
├── Prover.toml          # Default inputs (Mode 1)
├── Prover_mode1.toml    # Merkle inclusion examples
├── Prover_mode2.toml    # Aggregate count examples  
├── test_cases.toml      # Comprehensive test suite
└── README.md            # This documentation
```

### Prerequisites
- Noir compiler >= 0.19.0
- Node.js for backend integration
- Stylus contracts for attestation storage

### Testing Workflow
1. Copy test case from `test_cases.toml` to `Prover.toml`
2. Run `nargo prove` to generate proof
3. Run `nargo verify` to validate proof
4. Compare result with expected outcome
5. Test both success and failure scenarios

## Related Circuits

- `business_registration`: Basic business identity verification
- `kyb_verification`: Overall KYB compliance proof  
- `business_age`: Company age and maturity verification
- `revenue_proof`: Financial threshold compliance

---

*This circuit is part of the DVote privacy-preserving governance ecosystem, enabling regulatory compliance while maintaining competitive confidentiality.*