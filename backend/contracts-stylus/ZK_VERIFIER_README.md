# ZK Proof Verifier for Arbitrum Stylus

This module provides comprehensive ZK proof verification capabilities for the DVote DAO system using Arbitrum Stylus smart contracts.

## Features

### 🔐 **Core ZK Verification**
- **Noir Proof Parsing**: Parses JSON-encoded proofs from DVote Noir circuits
- **Verification Key Support**: Handles Groth16 verification keys in JSON format
- **Gas-Optimized Verification**: Efficient verification using `noir_rs` verifier crate
- **Poseidon Hashing**: Integrated Poseidon hash function for public inputs

### 🏗️ **Stylus Integration**
- **ABI-Compatible**: Full Stylus ABI support for on-chain verification
- **Event Emission**: Comprehensive event logging for verification results  
- **Storage Management**: Persistent storage of verified proofs and verification keys
- **Gas Tracking**: Built-in gas optimization and tracking

### 🛡️ **Privacy-Preserving DAO**
- **ZK Membership Proofs**: Age, citizenship, and attribute verification
- **Private Voting**: Nullifier-based anonymous voting system
- **Proposal Requirements**: ZK proof requirements for proposal creation
- **Batch Verification**: Efficient batch processing of multiple proofs

## Architecture

```
contracts-stylus/
├── zk_verifier.rs          # Core ZK verification logic
├── src/
│   ├── lib.rs              # Main library exports
│   ├── zk_integration.rs   # Stylus contract integration
│   ├── zk_enhanced_dao.rs  # Privacy-preserving DAO
│   └── ...                 # Other DAO contracts
└── Cargo.toml              # Dependencies and configuration
```

## Core Functions

### **Main Verification Function**

```rust
pub fn verify_noir_proof(proof: &[u8], vk: &[u8]) -> bool
```

**Parameters:**
- `proof`: JSON-encoded Noir proof from DVote circuits
- `vk`: JSON-encoded Groth16 verification key

**Returns:** `bool` - true if proof is valid

### **Detailed Verification**

```rust
pub fn verify_noir_proof_with_result(proof: &[u8], vk: &[u8]) -> Result<VerificationResult, String>
```

Returns detailed verification results including gas usage, proof hashes, and error information.

### **Stylus Contract Functions**

```rust
// Verify proof on-chain with event emission
pub fn verify_zk_proof(&mut self, proof_json: Bytes, vk_json: Bytes) -> Result<bool, Vec<u8>>

// Batch verify multiple proofs
pub fn batch_verify_proofs(&mut self, proofs: Vec<Bytes>, vks: Vec<Bytes>) -> Result<Vec<bool>, Vec<u8>>

// Register verification keys (admin only)
pub fn register_verification_key(&mut self, circuit_name: String, vk_json: Bytes) -> Result<(), Vec<u8>>
```

## Usage Examples

### **Basic ZK Proof Verification**

```rust
use dvote_zk_verifier::verify_noir_proof;

// Load proof and verification key from DVote circuits
let proof_json = std::fs::read("zk/proofs/age_proof/proof.json").unwrap();
let vk_json = std::fs::read("zk/verifiers/age_proof/verification_key.json").unwrap();

// Verify the proof
let is_valid = verify_noir_proof(&proof_json, &vk_json);
println!("Proof valid: {}", is_valid);
```

### **Stylus Contract Integration**

```rust
use stylus_sdk::prelude::*;
use dvote_stylus::ZkVerificationStorage;

#[storage]
struct MyContract {
    zk_verifier: ZkVerificationStorage,
}

#[public]
impl MyContract {
    pub fn verify_member_proof(&mut self, proof: Bytes, vk: Bytes) -> Result<bool, Vec<u8>> {
        self.zk_verifier.verify_zk_proof(proof, vk)
    }
}
```

### **Privacy-Preserving DAO**

```rust
use dvote_stylus::ZkEnhancedDAO;

#[public]
impl ZkEnhancedDAO {
    // Submit membership proof
    pub fn submit_membership_proof(
        &mut self,
        proof_type: String,          // "age_proof", "citizenship_proof", "attribute_proof"
        proof_json: Bytes,           // JSON-encoded proof
        vk_json: Bytes,              // JSON-encoded verification key
        shadow_id: [u8; 32]          // Privacy-preserving identifier
    ) -> Result<bool, Vec<u8>>;

    // Create proposal with ZK requirements
    pub fn create_zk_proposal(
        &mut self,
        title: String,
        description: String,
        required_proof_type: String,  // Required ZK proof for voting
        voting_period: U256
    ) -> Result<U256, Vec<u8>>;

    // Cast private vote with ZK proofs
    pub fn cast_private_vote(
        &mut self,
        proposal_id: U256,
        vote: bool,
        nullifier_proof: Bytes,      // Prevents double voting
        membership_proof: Bytes,     // Proves voting eligibility
        vk_json: Bytes
    ) -> Result<(), Vec<u8>>;
}
```

## Supported Circuit Types

### **Age Proof Circuit**
- **Purpose**: Prove age ≥ minimum threshold without revealing exact age
- **Public Inputs**: `min_age_threshold`, `current_date_hash`
- **Private Inputs**: `birth_date`, `salt`

### **Citizenship Proof Circuit**
- **Purpose**: Prove citizenship in allowed countries without revealing specific country
- **Public Inputs**: `allowed_countries_merkle_root`
- **Private Inputs**: `country_code`, `document_hash`, `merkle_proof`, `salt`

### **Attribute Proof Circuit**
- **Purpose**: Selectively reveal attributes while keeping others private
- **Public Inputs**: `revealed_attributes_hash`
- **Private Inputs**: `all_attributes`, `reveal_flags`, `salt`

## JSON Formats

### **Proof JSON Format**

```json
{
  "circuit_name": "age_proof",
  "proof": [1, 2, 3, ...],           // Groth16 proof bytes
  "public_inputs": ["0x1234..."],    // Hex-encoded public inputs
  "generated_at": "2025-11-22T14:00:00.000Z",
  "mock": false,                      // Set to true for development
  "metadata": {
    "generator": "dvote-noir-backend",
    "platform": "stylus"
  }
}
```

### **Verification Key JSON Format**

```json
{
  "circuit_name": "age_proof",
  "verification_key": {
    "alpha_g1": "0x1234...",         // G1 point
    "beta_g2": "0xabcd...",          // G2 point  
    "gamma_g2": "0x5678...",         // G2 point
    "delta_g2": "0x9abc...",         // G2 point
    "ic": ["0xdef0..."]              // Array of G1 points
  },
  "key_type": "groth16",
  "curve": "bn254",
  "generated_at": "2025-11-22T14:00:00.000Z"
}
```

## Events

### **Verification Events**

```solidity
event ProofVerified(
    bytes32 indexed proofHash,
    string indexed circuitName,
    address indexed verifier,
    bytes32 publicInputsHash,
    uint256 gasUsed
);

event ProofVerificationFailed(
    bytes32 indexed proofHash,
    string indexed circuitName,
    address indexed verifier,
    string reason
);
```

### **DAO Events**

```solidity
event ZkMembershipVerified(
    address indexed member,
    string indexed proofType,
    bytes32 shadowId
);

event PrivateVoteCast(
    uint256 indexed proposalId,
    bytes32 indexed nullifierHash,
    bytes32 commitmentHash
);
```

## Gas Optimization

### **Verification Costs**
- **Base Verification**: ~50,000 gas
- **Proof Parsing**: ~1,000 gas  
- **Poseidon Hashing**: ~5,000 gas
- **Pairing Operations**: ~50,000 gas
- **Storage Operations**: ~5,000-20,000 gas

### **Optimization Strategies**
- **Batch Verification**: Process multiple proofs in single transaction
- **Verification Key Caching**: Store VKs on-chain to avoid re-parsing
- **Read-Only Verification**: Skip storage for gas-optimized verification
- **Compressed Proofs**: Use proof compression when possible

## Security Considerations

### **Proof Validation**
- ✅ **Circuit Name Matching**: Ensures proof matches expected circuit
- ✅ **Mock Proof Detection**: Rejects development/mock proofs in production
- ✅ **Public Input Validation**: Validates expected public input format
- ✅ **Nullifier Tracking**: Prevents double-spending in private voting

### **Access Control**
- ✅ **Admin-Only VK Registration**: Only admins can register verification keys
- ✅ **Member ZK Verification**: ZK proofs required for DAO participation
- ✅ **Proposal Requirements**: Configurable ZK requirements per proposal

### **Privacy Protection**
- ✅ **Shadow IDs**: Privacy-preserving member identification
- ✅ **Nullifier-Based Voting**: Anonymous voting without double-voting
- ✅ **Selective Disclosure**: Reveal only necessary attributes

## Development Setup

### **Dependencies**

```toml
[dependencies]
stylus-sdk = "0.4.2"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
hex = "0.4"
ark-bn254 = "0.4.0"
poseidon-rs = "0.0.10"
```

### **Build Commands**

```bash
# Build Stylus contract
cargo build --release --target wasm32-unknown-unknown

# Run tests
cargo test

# Export ABI
cargo run --features export-abi

# Deploy to Stylus
cargo stylus deploy --endpoint $RPC_URL
```

### **Testing with DVote Circuits**

```bash
# Generate test proofs
cd zk/noir-circuits
./scripts/prove_noir.sh age_proof
./scripts/verify_noir.sh age_proof --export-vk

# Test with Stylus contract
cargo test test_dvote_integration -- --nocapture
```

## Integration with DVote Frontend

The ZK verifier integrates seamlessly with the DVote frontend through the existing proof generation pipeline:

1. **Frontend** → Generates proofs using Noir circuits
2. **Backend** → Stores proofs in `zk/proofs/*.json` format  
3. **Stylus Contract** → Verifies proofs on-chain using this module
4. **DAO Operations** → Uses verified proofs for governance actions

This provides end-to-end privacy-preserving DAO functionality with cryptographic guarantees.

## License

MIT License - see LICENSE file for details.