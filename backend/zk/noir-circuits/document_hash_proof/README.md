# Document Hash Proof Circuit

A Noir zero-knowledge circuit for privacy-preserving document verification. Proves possession of a document matching a stored commitment without revealing the document content.

## Overview

This circuit enables businesses and individuals to prove they possess specific documents for:
- Business registration verification (incorporation certificates)
- Regulatory compliance (licenses, permits)
- Financial due diligence (audit reports, statements)
- Identity verification (government documents)
- Ownership proof (property deeds, equity certificates)

All while maintaining complete document confidentiality and preventing unauthorized disclosure.

## Circuit Specifications

### Public Inputs
- `doc_commitment`: Poseidon hash commitment binding document and salt
- `doc_type_code`: Document classification code (1-99)
- `enable_type_check`: Flag to enable/disable document type verification

### Private Inputs
- `doc_hash_raw`: SHA-256 hash of document converted to field element
- `salt`: Cryptographic randomness for commitment hiding
- `expected_doc_type`: Expected document type for verification

### Core Logic
```noir
// Verify commitment binding  
computed_commitment = Poseidon(doc_hash_raw, salt)
assert(computed_commitment == doc_commitment)

// Optional document type verification
if enable_type_check == 1 {
    assert(doc_type_code == expected_doc_type)
}

// Input validation and security checks
assert(salt != 0)          // Non-zero salt required
assert(doc_hash_raw != 0)  // Valid document hash required
```

## Document Type Classification

The circuit supports standardized document type codes for selective verification:

| Code | Type | Use Case |
|------|------|----------|
| 1 | Incorporation Certificate | Business legal existence proof |
| 2 | Business License | Operational authorization |
| 3 | Tax Certificate | Tax compliance status |
| 4 | Audit Report | Financial audit completion |
| 5 | Financial Statement | Financial disclosure |
| 6 | Compliance Certificate | Regulatory compliance |
| 7 | Registration Form | Process completion |
| 8 | Identity Document | Individual verification |
| 9 | Ownership Proof | Asset/equity ownership |
| 99 | Other | Flexible classification |

## Document Hashing Workflow

### 1. Document Preparation
```bash
# Canonical normalization for consistent hashing
- Remove metadata and timestamps
- Standardize encoding (UTF-8)
- Normalize line endings (LF)
- Strip non-essential formatting
```

### 2. Hash Computation
```bash
# Using provided helper scripts
node compute_document_hash.js document.pdf --type 1
python compute_document_hash.py document.pdf --type 1
```

### 3. Field Element Conversion
```javascript
// SHA-256 → Field Element
const sha256Hash = crypto.createHash('sha256').update(documentBytes).digest();
const hashBigInt = BigInt('0x' + sha256Hash.toString('hex'));
const fieldElement = hashBigInt.toString();
```

### 4. Commitment Creation
```javascript
// Poseidon commitment binding
const commitment = poseidon([fieldElement, salt]);
```

## Helper Scripts

### Node.js Script (`compute_document_hash.js`)

**Features:**
- Automatic document normalization
- Multiple document type support
- Field element validation
- Prover.toml generation
- CLI interface with options

**Usage:**
```bash
# Basic usage
node compute_document_hash.js document.pdf

# With document type
node compute_document_hash.js contract.json --type 7

# Skip normalization  
node compute_document_hash.js cert.pdf --no-normalize

# Custom salt
node compute_document_hash.js report.txt --salt 0x1234...
```

### Python Script (`compute_document_hash.py`)

**Features:**
- Cross-platform compatibility
- JSON/text normalization
- Automatic Prover.toml output
- Type safety validation
- Comprehensive error handling

**Usage:**
```bash
# Basic usage
python compute_document_hash.py document.pdf

# With document type and options
python compute_document_hash.py contract.json --type 7 --no-normalize
```

## Security Properties

### Document Confidentiality
- **Content Privacy**: Document bytes never revealed
- **Structure Hiding**: File size and format concealed
- **Metadata Protection**: Timestamps and properties hidden
- **Zero-Knowledge**: Only possession and type proven

### Cryptographic Security
- **Collision Resistance**: SHA-256 + Poseidon dual hashing
- **Preimage Security**: Salt prevents rainbow table attacks
- **Commitment Binding**: Cryptographic document binding
- **Field Arithmetic**: Natural constant-time operations

### Input Validation
- **Non-Zero Constraints**: Prevents empty documents and salts
- **Type Validation**: Document codes within valid ranges
- **Hash Format**: SHA-256 field element bounds checking
- **Flag Validation**: Type check enable/disable verification

## Test Cases

The circuit includes 15 comprehensive test scenarios:

### Valid Cases ✅
1. **Incorporation Certificate** - Business registration proof
2. **Business License** - Operational authorization  
3. **Audit Report** - Financial compliance (no type check)
4. **Financial Statement** - Investment due diligence
5. **Compliance Certificate** - Regulatory verification
6. **Identity Document** - Individual verification
7. **Other Document Type** - Flexible classification
8. **No Type Verification** - Generic document proof
9. **Ownership Proof** - Asset ownership verification

### Invalid Cases ❌
10. **Wrong Commitment** - Manipulation detection
11. **Type Mismatch** - Document classification failure
12. **Zero Salt** - Security vulnerability prevention
13. **Zero Hash** - Invalid document rejection
14. **Excessive Type Code** - Bounds validation
15. **Invalid Type Flag** - Flag validation testing

## Usage Examples

### Compile and Test
```bash
# Navigate to circuit directory
cd zk/noir-circuits/document_hash_proof

# Compile the circuit
nargo compile

# Test incorporation certificate scenario
cp Prover.toml temp.toml
nargo prove && nargo verify

# Test audit report scenario
cp Prover_audit.toml Prover.toml
nargo prove && nargo verify

# Test business license scenario  
cp Prover_license.toml Prover.toml
nargo prove && nargo verify
```

### Document Hash Generation
```bash
# Create test document
echo "Sample Business License Content" > license.txt

# Generate hash and circuit inputs
node ../../../scripts/compute_document_hash.js license.txt --type 2

# Use generated Prover inputs
cp license_prover.toml Prover.toml
nargo prove && nargo verify
```

### Integration Example
```javascript
// Complete workflow
const documentPath = './incorporation-cert.pdf';

// 1. Compute document hash
const hashInfo = computeDocumentHash(documentPath, true);
const salt = generateFieldSalt();
const commitment = poseidon([hashInfo.fieldElement, salt]);

// 2. Store commitment on-chain
await documentRegistry.storeAttestation({
    commitment,
    docType: DOC_TYPES.INCORPORATION_CERT,
    issuer: authorizedIssuer,
    expiry: Date.now() + (365 * 24 * 60 * 60 * 1000) // 1 year
});

// 3. Generate ZK proof
const proof = await noir.generateProof({
    doc_commitment: commitment,
    doc_type_code: DOC_TYPES.INCORPORATION_CERT,
    enable_type_check: 1,
    doc_hash_raw: hashInfo.fieldElement,
    salt: salt,
    expected_doc_type: DOC_TYPES.INCORPORATION_CERT
});

// 4. Verify proof for DAO eligibility
const isValid = await verifyDocumentProof(proof, commitment);
```

## On-Chain Integration

### Stylus Contract Interface
```rust
struct DocumentAttestation {
    commitment: U256,           // Document commitment hash
    doc_type: u8,              // Document classification
    issuer: Address,           // Authorized issuer
    issued_at: U256,           // Attestation timestamp
    expiry: U256,              // Document expiry
    revoked: bool,             // Revocation status
    verification_level: u8,     // Trust level (1-5)
}

// Storage mappings
document_attestations: mapping(U256 => DocumentAttestation)
authorized_issuers: mapping(Address => mapping(u8 => bool))
verification_count: mapping(U256 => u32)
```

### Verification Workflow
1. **Document Issuance**: Authorized entity creates commitment
2. **On-Chain Storage**: Commitment stored with metadata
3. **Proof Generation**: Document holder creates ZK proof
4. **Verification**: System validates proof and attestation status
5. **Access Grant**: Compliance confirmed without document exposure

## Use Case Scenarios

### Business Registration Verification
- **Requirement**: Prove legal business existence for DAO governance
- **Document**: Incorporation certificate from government registry
- **Privacy**: Business details remain confidential
- **Compliance**: Meets eligibility without over-disclosure

### Audit Compliance Verification  
- **Requirement**: Prove completed financial audit for investment
- **Document**: Certified audit report from accounting firm
- **Privacy**: Audit findings stay confidential
- **Compliance**: Due diligence satisfied without competitive intelligence

### Regulatory License Verification
- **Requirement**: Prove operational authorization for partnerships
- **Document**: Business license from regulatory authority
- **Privacy**: License specifics remain private
- **Compliance**: Partnership eligibility confirmed

### Financial Due Diligence
- **Requirement**: Prove financial disclosure for credit facilities
- **Document**: Audited financial statements
- **Privacy**: Financial metrics stay confidential  
- **Compliance**: Credit evaluation enabled

## File Structure
```
document_hash_proof/
├── src/
│   └── main.nr                    # Main circuit implementation
├── Nargo.toml                    # Package configuration
├── Prover.toml                   # Default (incorporation cert)
├── Prover_audit.toml             # Audit report scenario
├── Prover_license.toml           # Business license scenario
├── Prover_financial.toml         # Financial statement scenario
├── Prover_generic.toml           # Generic document scenario
├── Verifier.toml                 # Public input verification
├── test_cases.toml              # Comprehensive test suite
└── README.md                     # This documentation

../scripts/
├── compute_document_hash.js      # Node.js helper script
└── compute_document_hash.py      # Python helper script
```

## Development

### Prerequisites
- Noir compiler >= 0.19.0
- Node.js or Python for helper scripts
- Document samples for testing

### Testing Workflow
1. Prepare test document (PDF, JSON, TXT, etc.)
2. Generate hash using helper script
3. Copy inputs to `Prover.toml`
4. Run `nargo prove && nargo verify`
5. Test different document types and scenarios

### Security Considerations
- Use cryptographically secure salt generation
- Apply consistent document normalization
- Validate field element bounds checking
- Implement proper access controls for attestations
- Regular audit of on-chain document registry

## Related Circuits
- `business_registration`: Business identity verification
- `revenue_threshold`: Financial compliance proof
- `ubo_proof`: Ownership structure verification
- `kyb_verification`: Overall business verification

---

*This circuit enables privacy-preserving document verification for the DVote ecosystem, maintaining document confidentiality while ensuring regulatory compliance and business eligibility.*