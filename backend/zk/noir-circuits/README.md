# DVote ZK Circuits

This directory contains Noir circuits for generating zero-knowledge proofs for privacy-preserving identity verification in the DVote DAO system integrated with ShadowID Registry.

## Circuit Overview

### 1. Age Proof Circuit (`age_proof/`)
- **Purpose**: Proves age ≥ 18 without revealing exact age or birth date
- **Private inputs**: Birth year, month, day, salt for privacy
- **Public inputs**: Minimum age requirement, current date, age commitment
- **Proof**: You meet age requirements without revealing your birth date
- **Files**: `main.nr`, `test.nr`, `Nargo.toml`, `Prover.toml`

### 2. Citizenship Proof Circuit (`citizenship_proof/`)  
- **Purpose**: Proves citizenship in allowed countries without revealing exact country
- **Private inputs**: Country code, document ID, salt
- **Public inputs**: List of allowed countries, citizenship commitment
- **Proof**: You are a citizen of an allowed jurisdiction without revealing which one
- **Files**: `main.nr`, `test.nr`, `Nargo.toml`, `Prover.toml`

### 3. Attribute Proof Circuit (`attribute_proof/`)
- **Purpose**: Selectively reveals specific attributes while keeping others private
- **Private inputs**: 10 personal attributes, reveal flags, salt
- **Public inputs**: Revealed attributes, proof commitment  
- **Proof**: Selective disclosure of attributes with privacy for non-revealed data
- **Files**: `main.nr`, `test.nr`, `Nargo.toml`, `Prover.toml`

### 4. Legacy Circuits (for reference)
- **KYC Verification**: Prove you know KYC data that hashes to stored hash
- **KYB Verification**: Prove business registration and ownership  
- **Age Verification**: Basic age verification (superseded by enhanced age_proof)
- **Citizenship Verification**: Basic citizenship check (superseded by citizenship_proof)

## Installation & Setup

### Prerequisites
1. **Install Noir and Nargo**:
   ```bash
   # Install Nargo (Noir's build tool and package manager)
   curl -L https://raw.githubusercontent.com/noir-lang/noirup/main/install | bash
   noirup
   ```

2. **Install Node.js dependencies**:
   ```bash
   # In the zk/noir-circuits directory
   npm install
   ```

### Building the Circuits

1. **Compile all circuits**:
   ```bash
   npm run build
   # or manually: nargo compile
   ```

2. **Run circuit tests**:
   ```bash
   npm run test
   # or manually: nargo test
   ```

3. **Generate proofs** (after compiling):
   ```bash
   npm run prove
   # or manually: nargo prove
   ```

4. **Verify proofs**:
   ```bash
   npm run verify
   # or manually: nargo verify
   ```

### TypeScript Integration

1. **Compile TypeScript integration example**:
   ```bash
   npm run compile-integration
   ```

2. **Run integration example**:
   ```bash
   npm run run-integration
   ```

## Integration with ShadowID Registry

1. **Off-chain**: User generates ZK proof using their private identity data
2. **On-chain**: User submits proof hash to `store_zk_proof()` function
3. **Verification**: Admin validates the proof and calls `complete_verification()`
4. **Badge Issuance**: User receives a verification badge (NFT-like token)

## Security Considerations

- **Private inputs are never stored or transmitted**
- **Only proof hashes are stored on-chain**
- **Proofs can be independently verified by any party**
- **Circuit logic ensures data integrity without revealing sensitive information**

## TypeScript Integration

The `integration_example.ts` file demonstrates the complete workflow:
1. Generate ZK proofs using Noir circuits
2. Submit proofs to ShadowIDRegistry contract  
3. Use verified identity for DAO participation
4. Handle proof generation to voting workflow

## File Structure
```
zk/noir-circuits/
├── age_proof/              # Enhanced age verification circuit
│   ├── src/main.nr         # Main circuit logic
│   ├── src/test.nr         # Circuit tests
│   ├── Nargo.toml         # Circuit configuration
│   └── Prover.toml        # Proof generation settings
├── citizenship_proof/      # Enhanced citizenship verification circuit  
│   ├── src/main.nr
│   ├── src/test.nr
│   ├── Nargo.toml
│   └── Prover.toml
├── attribute_proof/        # Selective attribute disclosure circuit
│   ├── src/main.nr
│   ├── src/test.nr
│   ├── Nargo.toml
│   └── Prover.toml
├── integration_example.ts  # TypeScript integration example
├── package.json           # Node.js dependencies
├── tsconfig.json          # TypeScript configuration
├── ZK_ISSUES_FIXED.md     # Documentation of recent fixes
└── README.md              # This file
```

## Troubleshooting

### Common Issues
1. **Nargo not found**: Ensure Noir is properly installed and in PATH
2. **Circuit compilation fails**: Check `.nr` syntax and dependencies  
3. **TypeScript errors**: Ensure all npm packages are installed
4. **Proof generation fails**: Verify input format matches circuit expectations

### Recent Fixes Applied
- ✅ Updated all circuits from `dep::std` imports to `std::` imports
- ✅ Modernized Poseidon hash calls from `poseidon::bn254::hash_*` to `poseidon::hash`
- ✅ Fixed array indexing and loop ranges in circuits
- ✅ Added proper TypeScript integration with ethers.js
- ✅ Created package.json and build scripts for easy setup