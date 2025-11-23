# Revenue Threshold Verification Circuit

A Noir zero-knowledge circuit for privacy-preserving business revenue verification against public thresholds. Proves revenue compliance without revealing exact amounts.

## Overview

This circuit enables businesses to demonstrate they meet minimum revenue requirements for:
- DAO governance eligibility  
- Investment tier qualification
- Partnership prerequisites
- Regulatory compliance
- Credit facility requirements

All while keeping exact revenue amounts confidential from competitors and the public.

## Circuit Specifications

### Public Inputs
- `commitment`: Poseidon hash binding revenue to prevent manipulation
- `threshold_value`: Minimum revenue requirement (in scaled units)
- `unit_scale`: Scaling factor (100 = cents, 1000 = mills)

### Private Inputs  
- `revenue_value`: Actual business revenue (in scaled units)
- `salt`: Cryptographic randomness for commitment hiding

### Core Logic
```noir
// Verify commitment binding
computed_commitment = Poseidon(revenue_value, salt)
assert(computed_commitment == commitment)

// Prove revenue threshold compliance
assert(revenue_value >= threshold_value)

// Validate all inputs within reasonable bounds
assert(revenue_value <= MAX_REVENUE)  // $100B limit
assert(revenue_value >= MIN_REVENUE)  // $1 minimum
```

## Security Properties

### Privacy Guarantees
- **Revenue Confidentiality**: Exact amounts never revealed
- **Competitive Protection**: Prevents corporate intelligence gathering
- **Zero-Knowledge**: Only proves compliance, not specific values
- **Commitment Hiding**: Cryptographic binding prevents manipulation

### Timing Attack Prevention
- **Constant-Time Operations**: No data-dependent execution paths
- **Field Arithmetic**: Natural constant-time properties
- **No Conditional Branches**: All code paths execute uniformly
- **Side-Channel Resistance**: No secret-dependent memory access

### Range Leakage Mitigation
- **Commitment Binding**: Salt prevents rainbow table attacks
- **Threshold Independence**: No correlation between threshold and revenue
- **Uniform Proofs**: Same proof size regardless of actual revenue
- **No Upper Bound Disclosure**: Only minimum compliance proven

## Scaling and Precision

### Unit Scaling Options

**Cents (Default - Scale 100)**
```
$1,234.56 → 123,456 cents
Precision: $0.01
Use Case: Standard USD transactions
```

**Mills (High Precision - Scale 1000)**  
```
$1,234.567 → 1,234,567 mills
Precision: $0.001
Use Case: Financial regulations, high-value transactions
```

**Custom Scaling**
```
Scale Factor: 1 to 10,000
Precision: $1/scale
Use Case: Flexible precision requirements
```

### Fixed-Point Arithmetic
- All calculations in scaled integers
- No floating-point precision loss
- Input validation ensures proper alignment
- Overflow protection with reasonable bounds

## Input Validation

### Revenue Bounds
- **Minimum**: $1.00 (100 cents) - Prevents zero/negative values
- **Maximum**: $100 billion - Prevents overflow attacks
- **Scaling**: Must align with unit_scale specification
- **Non-Zero Salt**: Required for cryptographic security

### Threshold Bounds  
- **Minimum**: $1.00 equivalent in chosen scale
- **Maximum**: $10 billion - Prevents unreasonable requirements
- **Business Logic**: Must make economic sense
- **Scale Consistency**: Aligned with revenue scaling

## Test Cases

The circuit includes 15 comprehensive test cases:

### Valid Scenarios ✅
1. **Revenue above threshold** - Standard compliance case
2. **Exact threshold** - Boundary condition testing  
3. **Mills precision** - High-precision financial verification
4. **Small business** - Low-value threshold compliance
5. **Investment qualification** - Large-scale institutional requirements
6. **Minimum valid revenue** - Edge case at $1.00

### Invalid Scenarios ❌
7. **Below threshold** - Insufficient revenue rejection
8. **Zero revenue** - Invalid business state
9. **Zero salt** - Security vulnerability prevention
10. **Excessive revenue** - Overflow protection testing
11. **Excessive threshold** - Unreasonable requirement rejection
12. **Wrong commitment** - Manipulation attempt detection
13. **Sub-minimum revenue** - Below $1.00 rejection
14. **Invalid scaling** - Precision attack prevention
15. **Zero unit scale** - Division by zero protection

## Usage Examples

### Compile and Test
```bash
# Navigate to circuit directory
cd zk/noir-circuits/revenue_threshold

# Compile the circuit
nargo compile

# Test standard scenario
cp Prover.toml temp.toml
nargo prove && nargo verify

# Test investment qualification
cp Prover_investment.toml Prover.toml  
nargo prove && nargo verify

# Test partnership scenario
cp Prover_partnership.toml Prover.toml
nargo prove && nargo verify
```

### Integration Example
```javascript
// Generate revenue compliance proof
const proof = await noir.generateProof({
  // Public inputs (visible)
  commitment: auditedCommitment,
  threshold_value: 100000000, // $1M in cents
  unit_scale: 100,            // Cents
  
  // Private inputs (hidden)
  revenue_value: actualRevenue * 100, // Convert to cents
  salt: cryptographicSalt
});

// Verify against on-chain attestation
const isValid = await verifyRevenueProof(proof, commitment);
```

### DAO Integration
```solidity
function checkRevenueEligibility(
    bytes calldata zkProof,
    uint256 commitment,
    uint256 minRevenue
) external view returns (bool) {
    // Verify ZK proof
    require(verifyRevenueProof(zkProof), "Invalid revenue proof");
    
    // Check on-chain attestation
    RevenueAttestation memory attestation = revenue_attestations[commitment];
    require(!attestation.revoked, "Attestation revoked");
    require(block.timestamp <= attestation.expiry, "Attestation expired");
    require(authorized_auditors[attestation.auditor], "Unauthorized auditor");
    
    return true;
}
```

## On-Chain Integration

### Stylus Contract Interface
```rust
struct RevenueAttestation {
    commitment: U256,        // Revenue commitment hash
    auditor: Address,        // Certified auditor/CPA
    period_start: U256,      // Financial period start  
    period_end: U256,        // Financial period end
    currency: [u8; 3],       // Currency code (USD, EUR, etc.)
    expiry: U256,           // Attestation expiry timestamp
    revoked: bool,          // Revocation status
}

// Storage mappings
revenue_attestations: mapping(U256 => RevenueAttestation)
authorized_auditors: mapping(Address => bool)
audit_trail: mapping(U256 => AuditRecord[])
```

### Attestation Lifecycle
1. **Audit Phase**: CPA/Auditor verifies financial statements
2. **Commitment**: Create `Poseidon(revenue_cents, salt)`
3. **On-Chain Storage**: Store commitment with audit metadata
4. **Proof Generation**: Business creates ZK proof of compliance
5. **Verification**: DAO/system verifies proof against attestation
6. **Maintenance**: Periodic re-audit and attestation renewal

## Use Case Scenarios

### DAO Governance
- **Requirement**: $1M minimum revenue for voting rights
- **Proof**: Revenue exceeds threshold without revealing amount
- **Privacy**: Exact revenue stays confidential
- **Compliance**: Meets governance participation requirements

### Investment Tiers
- **Institutional**: $10M+ revenue for accredited investor access  
- **Strategic**: $5M+ revenue for strategic partnership pools
- **Standard**: $1M+ revenue for general investment opportunities
- **Privacy**: Revenue bands hidden, only tier eligibility proven

### Regulatory Compliance
- **Banking**: Capital requirements based on revenue thresholds
- **Insurance**: Premium calculations with privacy protection
- **Securities**: Accredited entity status verification
- **Tax**: Compliance verification without revenue disclosure

### Partnership Qualification
- **Vendor**: Minimum revenue for enterprise partnerships
- **Distribution**: Revenue requirements for channel partnerships  
- **Joint Venture**: Financial capacity verification
- **M&A**: Due diligence with confidentiality protection

## File Structure
```
revenue_threshold/
├── src/
│   └── main.nr              # Main circuit implementation
├── Nargo.toml              # Package configuration
├── Prover.toml             # Default scenario (DAO governance)
├── Prover_investment.toml   # Investment qualification example
├── Prover_partnership.toml  # Partnership scenario example
├── Prover_mills.toml       # High-precision mills example
├── Verifier.toml           # Public input verification
├── test_cases.toml         # Comprehensive test suite
└── README.md               # This documentation
```

## Development

### Prerequisites
- Noir compiler >= 0.19.0
- Node.js for backend integration
- Stylus contracts for attestation storage

### Testing Workflow
1. Copy scenario from test cases to `Prover.toml`
2. Run `nargo prove` to generate proof
3. Run `nargo verify` to validate proof
4. Test both success and failure cases
5. Verify timing consistency across different inputs

### Security Considerations
- Use cryptographically secure salt generation
- Validate commitment binding before proof generation  
- Implement proper access controls for attestation creation
- Regular audit of on-chain attestation data
- Monitor for timing correlation attacks

## Related Circuits
- `business_registration`: Basic business identity verification
- `ubo_proof`: Ultimate beneficial owner verification
- `kyb_verification`: Overall KYB compliance proof
- `business_age`: Company maturity verification

---

*This circuit enables privacy-preserving revenue verification for the DVote governance ecosystem, maintaining competitive confidentiality while ensuring compliance requirements.*