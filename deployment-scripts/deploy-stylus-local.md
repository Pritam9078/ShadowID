# 🚀 Stylus Rust Smart Contract - Local Deployment Guide with Nitro Devnode

## Prerequisites Check

Before starting, ensure you have:
- ✅ Docker Desktop installed and running
- ✅ Git installed
- ✅ Windows PowerShell or Command Prompt

---

## 1️⃣ **Set up the Development Environment**

### Install Rust Toolchain (1.81+)
```powershell
# Install Rust via rustup
winget install Rustlang.Rustup

# Or download from: https://rustup.rs/
# After installation, restart your terminal

# Verify Rust installation
rustc --version
cargo --version
```

### Add WASM Target
```powershell
# Add WebAssembly target for Stylus
rustup target add wasm32-unknown-unknown

# Verify target is added
rustup target list --installed | findstr wasm32
```

### Install cargo-stylus CLI
```powershell
# Install the Stylus CLI tool
cargo install cargo-stylus

# Verify installation
cargo stylus --version
```

### Install Foundry (for Cast tool)
```powershell
# Download and install Foundry
curl -L https://foundry.paradigm.xyz | bash

# Add to PATH and restart terminal, then:
foundryup

# Verify installation
cast --version
```

---

## 2️⃣ **Clone and Launch Nitro Devnode**

### Clone Nitro Devnode Repository
```powershell
# Navigate to your projects directory
cd c:\Users\HP\Downloads\

# Clone the Nitro devnode
git clone https://github.com/OffchainLabs/nitro-devnode.git

# Navigate to the directory
cd nitro-devnode
```

### Launch the Development Node
```powershell
# Make sure Docker is running first!
docker --version

# For Windows PowerShell, use:
.\run-dev-node.ps1

# Or if you have WSL/Git Bash:
# ./run-dev-node.sh
```

### Wait for Node to Start
The devnode will take 2-3 minutes to fully initialize. Look for output like:
```
Nitro node is ready!
L1 chain: http://localhost:8545
L2 chain: http://localhost:8547
```

### Set Environment Variables
```powershell
# Set up environment variables for easier use
$env:NITRO_L1_RPC = "http://localhost:8545"
$env:NITRO_L2_RPC = "http://localhost:8547"
$env:NITRO_PRIVATE_KEY = "0xb6b15c8cb491557369f3c7d2c287b053eb229daa9c22138887752191c9520659"

# Verify the node is running
curl http://localhost:8547 -Method POST -Body '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' -ContentType "application/json"
```

---

## 3️⃣ **Create / Use Stylus Project**

### Option A: Create New Stylus Project
```powershell
# Navigate back to your working directory
cd c:\Users\HP\Downloads\DVote-main\DVote-main\

# Create a new Stylus project
cargo stylus new my-stylus-contract

# Navigate to the project
cd my-stylus-contract
```

### Option B: Use Existing Contract (ShadowIDStylus)
```powershell
# Navigate to your existing contract
cd c:\Users\HP\Downloads\DVote-main\DVote-main\contracts-stylus

# Check if Cargo.toml exists and is properly configured
Get-Content Cargo.toml
```

### Check the Contract Compilation
```powershell
# Check if the contract compiles correctly
cargo stylus check --endpoint=$env:NITRO_L2_RPC

# If check fails, compile manually to see errors
cargo build --target wasm32-unknown-unknown --release

# Fix any compilation errors before proceeding
```

---

## 4️⃣ **Estimate Deployment Gas**

```powershell
# Estimate gas cost for deployment
cargo stylus deploy `
  --endpoint=$env:NITRO_L2_RPC `
  --private-key=$env:NITRO_PRIVATE_KEY `
  --estimate-gas

# Expected output: Gas estimate and deployment cost in ETH
```

---

## 5️⃣ **Deploy the Contract**

### Deploy to Local Nitro Devnode
```powershell
# Deploy the contract
cargo stylus deploy `
  --endpoint=$env:NITRO_L2_RPC `
  --private-key=$env:NITRO_PRIVATE_KEY

# Save the output - you'll get:
# - Contract Address: 0x...
# - Transaction Hash: 0x...
# - "wasm already activated!" or deployment success message
```

### Save Deployment Information
```powershell
# Create a deployment info file
@"
# Stylus Contract Deployment - $(Get-Date)
Contract Address: [REPLACE_WITH_ACTUAL_ADDRESS]
Transaction Hash: [REPLACE_WITH_ACTUAL_HASH]
Network: Nitro Devnode Local
RPC URL: http://localhost:8547
Deployer: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
"@ | Out-File -FilePath "deployment-local.txt"
```

---

## 6️⃣ **Interact with the Contract using Cast**

### Set Contract Address Variable
```powershell
# Replace with your actual deployed contract address
$CONTRACT_ADDRESS = "0x[YOUR_CONTRACT_ADDRESS_HERE]"
```

### Check Initial State (Example for Counter Contract)
```powershell
# Read the current number/counter value
cast call `
  --rpc-url $env:NITRO_L2_RPC `
  --private-key $env:NITRO_PRIVATE_KEY `
  $CONTRACT_ADDRESS `
  "number()(uint256)"
```

### Call Contract Functions
```powershell
# Increment the counter (write function)
cast send `
  --rpc-url $env:NITRO_L2_RPC `
  --private-key $env:NITRO_PRIVATE_KEY `
  $CONTRACT_ADDRESS `
  "increment()"

# Read the updated value
cast call `
  --rpc-url $env:NITRO_L2_RPC `
  --private-key $env:NITRO_PRIVATE_KEY `
  $CONTRACT_ADDRESS `
  "number()(uint256)"
```

### Additional Contract Interactions (Customize based on your contract)
```powershell
# Set a specific value (if your contract has this function)
cast send `
  --rpc-url $env:NITRO_L2_RPC `
  --private-key $env:NITRO_PRIVATE_KEY `
  $CONTRACT_ADDRESS `
  "setNumber(uint256)" 42

# Get contract owner (if applicable)
cast call `
  --rpc-url $env:NITRO_L2_RPC `
  --private-key $env:NITRO_PRIVATE_KEY `
  $CONTRACT_ADDRESS `
  "owner()(address)"
```

---

## 7️⃣ **Export ABI and Integration**

### Export Contract ABI
```powershell
# Generate ABI for frontend integration
cargo stylus export-abi

# Save ABI to file
cargo stylus export-abi > contract-abi.json

# Display the ABI
Get-Content contract-abi.json
```

### Integration with Frontend
```powershell
# Copy ABI to frontend directory (if you have one)
Copy-Item contract-abi.json c:\Users\HP\Downloads\DVote-main\DVote-main\frontend\src\abi\StylusContract.json

# Update your frontend config with new contract address
# Edit: frontend/src/config/contracts.js
```

---

## 🔧 **Troubleshooting Commands**

### Check Nitro Devnode Status
```powershell
# Check if containers are running
docker ps

# Check logs if something fails
docker logs nitro_devnode_1

# Restart devnode if needed
cd c:\Users\HP\Downloads\nitro-devnode\
docker-compose down
docker-compose up -d
```

### Verify Account Balance
```powershell
# Check ETH balance of the deployer account
cast balance `
  --rpc-url $env:NITRO_L2_RPC `
  0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
```

### Clean and Rebuild Contract
```powershell
# Clean previous builds
cargo clean

# Rebuild for WASM target
cargo build --target wasm32-unknown-unknown --release

# Re-check the contract
cargo stylus check --endpoint=$env:NITRO_L2_RPC
```

---

## 📝 **Quick Reference**

### Environment Variables
```powershell
$env:NITRO_L2_RPC = "http://localhost:8547"
$env:NITRO_PRIVATE_KEY = "0xb6b15c8cb491557369f3c7d2c287b053eb229daa9c22138887752191c9520659"
```

### Pre-funded Accounts on Nitro Devnode
- **Account 0**: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` (10000 ETH)
- **Private Key**: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`
- **Account 1**: `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` (10000 ETH)
- **Private Key**: `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d`

### Useful Cast Commands Template
```powershell
# Template for reading contract state
cast call --rpc-url $env:NITRO_L2_RPC $CONTRACT_ADDRESS "functionName()(returnType)"

# Template for sending transactions
cast send --rpc-url $env:NITRO_L2_RPC --private-key $env:NITRO_PRIVATE_KEY $CONTRACT_ADDRESS "functionName(paramType)" paramValue
```

---

## ✅ **Success Checklist**

- [ ] Rust 1.81+ installed and verified
- [ ] WASM target added to Rust
- [ ] cargo-stylus CLI installed
- [ ] Foundry/Cast installed
- [ ] Docker running
- [ ] Nitro devnode cloned and running
- [ ] Environment variables set
- [ ] Contract compiles successfully
- [ ] Gas estimation completed
- [ ] Contract deployed successfully
- [ ] Contract address saved
- [ ] Contract functions callable via Cast
- [ ] ABI exported (optional)

**🎉 Your Stylus contract is now deployed locally and ready for testing!**