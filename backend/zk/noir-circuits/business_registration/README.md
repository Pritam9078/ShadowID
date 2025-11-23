# Business Registration Verification Circuit

A Noir zero-knowledge circuit that proves ownership of a valid business registration commitment without revealing the actual business ID.

## Overview

This circuit enables privacy-preserving business registration verification by proving that:
- The prover knows the preimage (business_id + salt) of a publicly known commitment
- The registration has not expired
- Optional: The commitment was signed by an authorized issuer

## Circuit Logic

### Public Inputs
- `commitment`: Poseidon hash of (business_id, salt) stored on-chain
- `issued_by`: Numeric identifier of the issuing authority
- `expiry_ts`: Expiration timestamp for the registration
- `current_time`: Current timestamp for expiry validation

### Private Inputs
- `biz_id`: Actual business registration ID (kept secret)
- `salt`: Random value used in commitment generation
- `issuer_signature_r`, `issuer_signature_s`: ECDSA signature components (optional)
- `use_signature`: Flag to enable/disable signature verification

### Verification Steps

1. **Commitment Verification**: `Poseidon(biz_id, salt) == commitment`
2. **Expiry Check**: `current_time <= expiry_ts`
3. **Input Validation**: Non-zero business ID and salt
4. **Signature Verification**: If enabled, validates issuer signature

## On-Chain Integration

This circuit integrates with Stylus contracts for attestation storage:

```rust
// Stylus contract storage
struct AttestationData {
    issuer: Address,
    expiry: U256, 
    active: bool,
}

// Storage mapping
commitments: mapping(U256 => AttestationData)
```

### Workflow

1. **Attestation Creation**: 
   - Government agency generates `commitment = Poseidon(business_id, salt)`
   - Stores commitment on Stylus contract with metadata

2. **Proof Generation**:
   - Business owner uses this circuit with private inputs
   - Generates ZK proof of valid registration

3. **Verification**:
   - DAO/verifier checks proof against on-chain commitment
   - Validates business eligibility without learning business ID

## Usage

### Compile the Circuit
```bash
cd zk/noir-circuits/business_registration
nargo compile
```

### Generate Proof
```bash
# Edit Prover.toml with your inputs
nargo prove
```

### Verify Proof
```bash
nargo verify
```

## Test Cases

The `test_cases.toml` file includes comprehensive test scenarios:

- ✅ Valid registration with correct commitment
- ❌ Invalid commitment (wrong business_id/salt)
- ❌ Expired registration
- ❌ Zero business ID or salt
- ✅ Valid signature verification
- ❌ Signature required but missing

## Security Features

### Privacy
- **Business ID Protection**: Actual registration ID never revealed
- **Salt Hiding**: Random salt prevents rainbow table attacks
- **Zero-Knowledge**: Only proves validity, not specific details

### Integrity
- **Commitment Binding**: Cryptographically links to on-chain attestation
- **Expiry Enforcement**: Prevents use of stale registrations
- **Issuer Authentication**: Optional signature verification
- **Input Validation**: Prevents zero values and edge cases

### Auditability
- **On-Chain Trail**: All commitments stored immutably
- **Issuer Tracking**: Links attestations to authorized entities
- **Revocation Support**: Contracts can deactivate commitments

## Integration Examples

### Frontend Usage
```javascript
// Query valid commitments
const commitment = await stylus_contract.getCommitment(businessHash);

// Generate proof
const proof = await noir.generateProof({
  commitment: commitment,
  issued_by: commitment.issuer,
  expiry_ts: commitment.expiry,
  current_time: Date.now() / 1000,
  // Private inputs provided by user
  biz_id: userBusinessId,
  salt: userSalt
});
```

### DAO Integration
```solidity
// Verify business eligibility for governance
function submitProposal(bytes calldata proof) external {
    require(verifyBusinessProof(proof), "Invalid business registration");
    // Create governance proposal
}
```

## File Structure

```
business_registration/
├── src/
│   └── main.nr          # Main circuit implementation
├── Nargo.toml           # Package configuration
├── Prover.toml          # Sample private inputs
├── Verifier.toml        # Public inputs for verification
├── test_cases.toml      # Comprehensive test scenarios
└── README.md            # This documentation
```

## Development

### Prerequisites
- [Noir](https://noir-lang.org/) compiler (>= 0.19.0)
- Node.js for backend integration
- Stylus contracts deployed

### Testing
1. Copy test case from `test_cases.toml` to `Prover.toml`
2. Run `nargo prove` to generate proof
3. Run `nargo verify` to validate proof
4. Verify expected outcome matches test case

### Production Deployment
1. Deploy Stylus attestation contracts
2. Integrate circuit with backend proof generation
3. Configure authorized issuers
4. Set up commitment creation workflow
5. Enable DAO governance integration

## Related Circuits

- `kyb_verification`: Overall KYB compliance proof
- `business_age`: Proves minimum business age
- `revenue_proof`: Proves revenue thresholds
- `citizenship_proof`: Proves business location/citizenship

---

*This circuit is part of the DVote privacy-preserving governance system.*