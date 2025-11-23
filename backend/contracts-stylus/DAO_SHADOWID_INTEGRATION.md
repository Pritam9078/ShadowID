# DAO ShadowID Integration Flow

This document describes the complete flow for integrating ShadowID verification with the DAO contract.

## Complete Flow Implementation

### STEP 1: User uploads KYC → generates commitment via Noir

**Frontend Process:**
1. User uploads KYC documents to frontend
2. Frontend generates KYC data structure
3. Noir circuit generates commitment hash from KYC data
4. Commitment stored locally for proof generation

**Noir Circuit (Age Proof Example):**
```javascript
// Frontend calls Noir circuit
const kycData = {
    birth_year: user.birthYear,
    birth_month: user.birthMonth,  
    birth_day: user.birthDay,
    document_hash: user.documentHash,
    salt: generateRandomSalt()
};

const commitment = await generateNoirCommitment(kycData);
// commitment = poseidon_hash(birth_year, birth_month, birth_day, document_hash, salt)
```

### STEP 2: User generates ZK proof → Aztec

**ZK Proof Generation:**
```javascript
// Frontend generates ZK proof using Aztec backend
const proof = await generateAztecProof(kycData, commitment);
const proofHash = sha256(proof);
```

### STEP 3: Backend sends proof_hash to ShadowIDRegistry

**Backend Service:**
```javascript
// Backend receives proof and validates it
const isValidProof = await validateZKProof(proof, commitment);

if (isValidProof) {
    // Send to ShadowIDRegistry
    await shadowIDRegistry.registerProof(userAddress, commitment, proofHash);
    
    // Also notify DAO contract
    await dao.submitZKProof(userAddress, commitment, proofHash);
}
```

### STEP 4: DAO checks verification status

**DAO Contract Check:**
```rust
// In create_proposal, vote, execute_proposal functions
if !self.is_user_verified_in_shadowid(user)? {
    evm::log(UserVerificationRequired { user });
    return Err(b"KYC required - User not verified in ShadowIDRegistry".to_vec());
}
```

## Contract Integration Points

### New Events Added

```solidity
event UserVerificationRequired(address indexed user);
event ProofSubmitted(address indexed user);
```

### Key Functions

#### 1. `submit_zk_proof()` - Backend Integration
```rust
pub fn submit_zk_proof(
    &mut self,
    user: Address,
    kyc_commitment: [u8; 32],     // From Noir circuit
    proof_hash: [u8; 32],        // From Aztec backend
) -> Result<(), Vec<u8>>
```

**Usage:** Called by backend after proof generation and validation.

#### 2. `is_user_verified()` - Verification Check
```rust
pub fn is_user_verified(&self, user: Address) -> bool
```

**Usage:** Public view function to check if user passed KYC flow.

#### 3. `get_kyc_status()` - Frontend Status
```rust
pub fn get_kyc_status(&self, user: Address) -> (bool, bool, bool, bool)
// Returns: (needs_kyc_upload, needs_zk_proof, is_verified, proof_submitted)
```

**Usage:** Frontend can determine which step user is on in KYC flow.

#### 4. `require_verification()` - Helper Function
```rust
pub fn require_verification(&self, user: Address) -> Result<(), Vec<u8>>
```

**Usage:** Triggers `UserVerificationRequired` event for frontend handling.

## Frontend Integration Flow

### 1. Check User Status
```javascript
const [needsKyc, needsProof, isVerified, proofSubmitted] = await dao.getKycStatus(userAddress);

if (needsKyc) {
    // Show KYC upload form
    showKycUploadForm();
} else if (needsProof) {
    // Show proof generation UI
    showProofGenerationUI();
} else if (!isVerified) {
    // Show waiting for verification
    showWaitingForVerification();
} else {
    // User verified - allow DAO interactions
    enableDaoFeatures();
}
```

### 2. Handle DAO Operations
```javascript
try {
    await dao.createProposal(title, description, target, value, data, commitment, proofHash);
} catch (error) {
    if (error.message.includes("KYC required")) {
        // Trigger KYC flow
        redirectToKycFlow();
    }
}
```

### 3. Listen for Events
```javascript
// Listen for verification requirements
dao.on('UserVerificationRequired', (user) => {
    if (user === currentUser) {
        showKycRequiredModal();
    }
});

// Listen for successful proof submission
dao.on('ProofSubmitted', (user) => {
    if (user === currentUser) {
        showSuccessMessage("Proof submitted successfully!");
    }
});
```

## Backend Integration

### 1. Proof Validation Service
```javascript
class ZKProofService {
    async validateAndSubmit(userAddress, kycData, proof) {
        // Validate ZK proof
        const isValid = await this.validateProof(proof, kycData);
        
        if (!isValid) {
            throw new Error("Invalid ZK proof");
        }
        
        // Generate commitment and proof hash
        const commitment = generateCommitment(kycData);
        const proofHash = sha256(proof);
        
        // Submit to contracts
        await Promise.all([
            this.shadowIDRegistry.registerProof(userAddress, commitment, proofHash),
            this.dao.submitZKProof(userAddress, commitment, proofHash)
        ]);
        
        return { commitment, proofHash };
    }
}
```

### 2. KYC Processing Pipeline
```javascript
// Process KYC submission
app.post('/kyc/submit', async (req, res) => {
    const { userAddress, kycDocuments } = req.body;
    
    try {
        // Process KYC documents
        const kycData = await processKycDocuments(kycDocuments);
        
        // Generate Noir commitment
        const commitment = await generateNoirCommitment(kycData);
        
        // Generate ZK proof via Aztec
        const proof = await generateAztecProof(kycData, commitment);
        
        // Submit to blockchain
        const result = await zkProofService.validateAndSubmit(userAddress, kycData, proof);
        
        res.json({ success: true, ...result });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});
```

## Security Considerations

### 1. Access Control
- Only authorized backend services can call `submit_zk_proof()`
- Only ShadowIDRegistry can call `register_verified_user()`
- Owner can manage verifiers and update registry address

### 2. Proof Validation
- Commitments and proof hashes must be non-zero
- ZK proofs are validated off-chain before submission
- Timestamp tracking for verification expiry

### 3. Privacy Protection
- KYC data never stored on-chain
- Only commitments and proof hashes are stored
- Users maintain privacy while proving compliance

## Error Handling

### DAO Contract Errors
```rust
// User not verified
"KYC required - User not verified in ShadowIDRegistry"

// Invalid proof data
"Invalid commitment or proof hash"

// Authorization errors
"Only authorized backend can submit proofs"
```

### Frontend Error Handling
```javascript
const handleDaoOperation = async (operation) => {
    try {
        await operation();
    } catch (error) {
        if (error.message.includes("KYC required")) {
            // Redirect to KYC flow
            window.location.href = "/kyc";
        } else if (error.message.includes("Invalid proof")) {
            // Show proof regeneration UI
            showProofRegenerationUI();
        } else {
            // Generic error handling
            showErrorMessage(error.message);
        }
    }
};
```

## Testing Flow

### 1. Test KYC Submission
```javascript
describe("KYC Flow Integration", () => {
    it("should complete full KYC flow", async () => {
        // Step 1: Submit KYC
        const kycData = generateMockKycData();
        const commitment = await generateCommitment(kycData);
        
        // Step 2: Generate proof
        const proof = await generateMockProof(kycData);
        const proofHash = sha256(proof);
        
        // Step 3: Submit to DAO
        await dao.submitZKProof(userAddress, commitment, proofHash);
        
        // Step 4: Verify user can now participate
        const isVerified = await dao.isUserVerified(userAddress);
        expect(isVerified).to.be.true;
        
        // Step 5: Test DAO operations
        await dao.createProposal(title, desc, target, value, data, commitment, proofHash);
    });
});
```

## Deployment Configuration

### Contract Deployment
```javascript
// Deploy contracts with proper addresses
const dao = await DAO.deploy(
    governanceTokenAddress,
    treasuryAddress,
    shadowIDRegistryAddress,  // Critical: ShadowIDRegistry integration
    votingPeriod,
    quorumPercent,
    executionDelay,
    proposalThreshold
);
```

This integration ensures that all DAO operations require proper KYC verification while maintaining user privacy through ZK proofs.