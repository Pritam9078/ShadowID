# DVote Noir ZK Scripts Documentation

## 🎯 Overview

This directory contains comprehensive scripts for building, proving, and verifying Noir ZK circuits for the DVote privacy-preserving DAO system.

## 📁 **File Structure**

```
scripts/
├── build_zk_noir.sh         # 🐧 Linux/Mac build script
├── build_zk_noir.bat        # 🪟 Windows build script
├── prove_noir.sh            # 🐧 Linux/Mac proof generation
├── prove_noir.bat           # 🪟 Windows proof generation
├── verify_noir.sh           # 🐧 Linux/Mac proof verification
├── verify_noir.bat          # 🪟 Windows proof verification
├── proof_helper.js          # 📦 Node.js proof generation helper
└── verify_helper.js         # 📦 Node.js verification helper

zk/
├── proofs/                  # 📄 Generated proofs and public inputs
│   ├── age_proof/
│   │   ├── proof.json
│   │   └── public_inputs.json
│   ├── citizenship_proof/
│   └── attribute_proof/
└── verifiers/               # 🔑 Verification keys and results
    ├── age_proof/
    │   ├── verification_key.json
    │   ├── verification_result.json
    │   └── build_info.json
    ├── citizenship_proof/
    └── attribute_proof/
```

## 🚀 **Quick Start**

### **1. Build All Circuits**
```bash
# Linux/Mac
./scripts/build_zk_noir.sh --all

# Windows
.\scripts\build_zk_noir.bat --all
```

### **2. Generate Proofs**
```bash
# Linux/Mac
./scripts/prove_noir.sh age_proof

# Windows  
.\scripts\prove_noir.bat age_proof
```

### **3. Verify Proofs**
```bash
# Linux/Mac
./scripts/verify_noir.sh age_proof --export-vk

# Windows
.\scripts\verify_noir.bat age_proof --export-vk
```

## 📋 **Script Reference**

### **build_zk_noir (.sh/.bat)**

**Purpose**: Compiles Noir circuits using nargo and organizes build artifacts

**Usage**: 
```bash
build_zk_noir.sh [circuit_name] [--all] [--help]
```

**Examples**:
```bash
build_zk_noir.sh age_proof                    # Compile specific circuit
build_zk_noir.sh --all                       # Compile all circuits
```

**Features**:
- ✅ Validates circuit structure (Nargo.toml, src/main.nr)
- ✅ Compiles circuits using available nargo implementation
- ✅ Organizes artifacts in `zk/verifiers/` directory
- ✅ Creates build metadata and timestamps
- ✅ Supports both individual and batch compilation

### **prove_noir (.sh/.bat)**

**Purpose**: Generates ZK proofs using Noir circuits with Aztec backend

**Usage**:
```bash
prove_noir.sh <circuit_name> [--input-file file.json] [--witness]
```

**Examples**:
```bash
prove_noir.sh age_proof                           # Default inputs
prove_noir.sh age_proof --witness                 # Generate witness
prove_noir.sh citizenship_proof --input-file custom.json
```

**Features**:
- ✅ Default input templates for all circuits
- ✅ Custom JSON input file support
- ✅ Mock proof generation for development
- ✅ Generates `proof.json` and `public_inputs.json`
- ✅ Comprehensive error handling and validation

**Default Inputs**:

**Age Proof**:
```json
{
    "birth_year": 1995,
    "birth_month": 6, 
    "birth_day": 15,
    "current_year": 2024,
    "current_month": 11,
    "current_day": 22,
    "min_age": 18,
    "salt": "0x1234567890abcdef..."
}
```

**Citizenship Proof**:
```json
{
    "country_code": 356,
    "document_hash": "0xabcdef...",
    "allowed_countries": [356, 840, 826, 276],
    "salt": "0x1234567890abcdef..."
}
```

### **verify_noir (.sh/.bat)**

**Purpose**: Verifies ZK proofs and exports verification keys

**Usage**:
```bash
verify_noir.sh <circuit_name> [--proof-file file.json] [--export-vk]
```

**Examples**:
```bash
verify_noir.sh age_proof                          # Verify default proof
verify_noir.sh age_proof --export-vk              # Export verification key
verify_noir.sh citizenship_proof --proof-file custom_proof.json
```

**Features**:
- ✅ Proof validation and verification
- ✅ Verification key generation and export
- ✅ Comprehensive verification reports
- ✅ Mock verification for development testing
- ✅ Generates `verification_result.json` and `verification_key.json`

## 🔧 **Node.js Helpers**

### **proof_helper.js**

Cross-platform Node.js script for reliable proof generation:
- ✅ Handles JSON input parsing safely
- ✅ Generates mock proofs for development
- ✅ Creates proper file structure
- ✅ Comprehensive error handling

### **verify_helper.js**

Cross-platform Node.js script for proof verification:
- ✅ Validates proof structure and content  
- ✅ Exports verification keys in standard format
- ✅ Generates detailed verification reports
- ✅ Mock verification for development workflow

## 📄 **Output File Formats**

### **proof.json**
```json
{
    "circuit_name": "age_proof",
    "proof": [1, 2, 3, ...],
    "public_inputs": ["0xabc..."],
    "generated_at": "2025-11-22T13:51:55.753Z",
    "mock": true,
    "inputs": { ... },
    "metadata": {
        "generator": "dvote-proof-helper",
        "platform": "Windows",
        "node_version": "v22.11.0"
    }
}
```

### **public_inputs.json**
```json
{
    "circuit_name": "age_proof",
    "public_inputs": ["0xabc..."],
    "generated_at": "2025-11-22T13:51:55.753Z",
    "metadata": { ... }
}
```

### **verification_key.json**
```json
{
    "circuit_name": "age_proof",
    "verification_key": {
        "alpha_g1": "0x...",
        "beta_g2": "0x...",
        "gamma_g2": "0x...",
        "delta_g2": "0x...",
        "ic": ["0x..."]
    },
    "key_type": "groth16",
    "curve": "bn254",
    "generated_at": "2025-11-22T13:54:38.334Z",
    "mock": true
}
```

### **verification_result.json**
```json
{
    "circuit_name": "age_proof",
    "proof_valid": true,
    "verified_at": "2025-11-22T13:54:38.334Z",
    "proof_hash": "de5d950c74f8a33f...",
    "public_inputs": ["0xabc..."],
    "mock": false,
    "metadata": { ... }
}
```

## 🔍 **Development vs Production**

### **Development Mode (Current)**
- ✅ Mock proof generation using secure random values
- ✅ Mock verification with structure validation
- ✅ Complete workflow testing without cryptographic overhead
- ✅ File format compatibility with production systems
- ✅ Comprehensive logging and debugging information

### **Production Mode (Future)**
- 🔄 Real cryptographic proof generation using Barretenberg
- 🔄 Actual SNARK verification with curve operations
- 🔄 Trusted setup ceremony integration
- 🔄 Production verification key management

## 🛠️ **Available Circuits**

### **1. age_proof**
- **Purpose**: Proves age ≥ 18 without revealing exact birthdate
- **Private Inputs**: Birth date, salt
- **Public Inputs**: Minimum age, current date, age commitment
- **Use Case**: DAO voting eligibility

### **2. citizenship_proof**  
- **Purpose**: Proves citizenship in allowed countries without revealing which one
- **Private Inputs**: Country code, document hash, salt
- **Public Inputs**: Allowed countries list, citizenship commitment
- **Use Case**: Jurisdiction-based DAO participation

### **3. attribute_proof**
- **Purpose**: Selectively reveals specific attributes while keeping others private
- **Private Inputs**: 10 personal attributes, reveal flags, salt  
- **Public Inputs**: Revealed attributes, proof commitment
- **Use Case**: Selective disclosure for specialized DAO roles

## 🚦 **Testing Workflow**

### **Complete Integration Test**:
```bash
# 1. Build all circuits
.\scripts\build_zk_noir.bat --all

# 2. Generate proofs for all circuits
.\scripts\prove_noir.bat age_proof
.\scripts\prove_noir.bat citizenship_proof  
.\scripts\prove_noir.bat attribute_proof

# 3. Verify all proofs with verification keys
.\scripts\verify_noir.bat age_proof --export-vk
.\scripts\verify_noir.bat citizenship_proof --export-vk
.\scripts\verify_noir.bat attribute_proof --export-vk

# 4. Check generated files
Get-ChildItem zk\proofs -Recurse
Get-ChildItem zk\verifiers -Recurse
```

## 🔐 **Security Considerations**

### **Current (Development)**:
- ✅ Mock proofs use cryptographically secure random values
- ✅ Proper file permissions and directory structure
- ✅ No private key material exposure in logs
- ✅ Input validation and sanitization

### **Production Requirements**:
- 🔄 Trusted setup ceremony for circuit parameters
- 🔄 Hardware security module (HSM) integration
- 🔄 Audit trails for proof generation and verification
- 🔄 Zero-knowledge property validation

## 📈 **Performance Metrics**

**Current Development Performance**:
- Circuit compilation: ~1-2 seconds per circuit
- Mock proof generation: ~100-200ms per proof
- Mock verification: ~50-100ms per proof
- File I/O operations: ~10-20ms per file

**Expected Production Performance**:
- Real proof generation: ~2-5 seconds per proof
- Real verification: ~100-500ms per proof
- Circuit compilation: ~5-15 seconds per circuit

## ✅ **Status Summary**

**✅ Completed Features**:
- Complete script suite for Windows and Linux/Mac
- All three ZK circuits (age, citizenship, attribute) 
- Mock proof generation and verification workflow
- Comprehensive file organization and metadata
- Cross-platform Node.js helpers
- Detailed documentation and examples

**🔄 Next Steps**:
- Integration with real Barretenberg backend
- Production verification key management
- Automated testing and CI/CD integration
- Performance optimization and benchmarking