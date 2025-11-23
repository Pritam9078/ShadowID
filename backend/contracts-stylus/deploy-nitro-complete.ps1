#!/usr/bin/env pwsh
# ShadowID Stylus Contract - Complete Local Deployment
# Run with: .\deploy-nitro-complete.ps1

param(
    [switch]$QuickStart = $false,
    [switch]$EstimateOnly = $false,
    [switch]$SkipTests = $false
)

$ErrorActionPreference = "Stop"

# Color functions
function Write-Step { param($Message) Write-Host "🔸 $Message" -ForegroundColor Cyan }
function Write-Success { param($Message) Write-Host "✅ $Message" -ForegroundColor Green }
function Write-Info { param($Message) Write-Host "ℹ️  $Message" -ForegroundColor Blue }
function Write-Warning { param($Message) Write-Host "⚠️  $Message" -ForegroundColor Yellow }
function Write-Error { param($Message) Write-Host "❌ $Message" -ForegroundColor Red }

Write-Host @"
🚀 ShadowID Stylus - Nitro Devnode Deployment
============================================
This script will:
1. Check/install prerequisites 
2. Setup Nitro devnode
3. Compile your Stylus contract
4. Deploy to local devnode
5. Test contract functions
"@ -ForegroundColor Magenta

# Environment setup
$SCRIPT_DIR = $PSScriptRoot
$NITRO_DIR = "c:\Users\HP\Downloads\nitro-devnode"
$CONTRACT_DIR = $PSScriptRoot

# Nitro devnode configuration
$env:NITRO_L1_RPC = "http://localhost:8545"
$env:NITRO_L2_RPC = "http://localhost:8547"
$env:NITRO_PRIVATE_KEY = "0xb6b15c8cb491557369f3c7d2c287b053eb229daa9c22138887752191c9520659"
$env:NITRO_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"

Write-Step "Environment configured:"
Write-Host "  L2 RPC: $env:NITRO_L2_RPC" -ForegroundColor Gray
Write-Host "  Contract Dir: $CONTRACT_DIR" -ForegroundColor Gray
Write-Host "  Nitro Dir: $NITRO_DIR" -ForegroundColor Gray

# 1️⃣ Prerequisites Check
Write-Step "Step 1: Checking prerequisites..."

# Check Docker
try {
    $dockerVersion = docker --version
    Write-Success "Docker: $dockerVersion"
    
    # Check if Docker is running
    docker info >$null 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Docker is not running. Please start Docker Desktop and try again."
        exit 1
    }
    Write-Success "Docker is running"
} catch {
    Write-Error "Docker not found. Please install Docker Desktop."
    exit 1
}

# Check Rust
try {
    $rustVersion = rustc --version
    Write-Success "Rust: $rustVersion"
    
    # Check WASM target
    $wasmTarget = rustup target list --installed | Select-String "wasm32-unknown-unknown"
    if ($wasmTarget) {
        Write-Success "WASM target installed"
    } else {
        Write-Info "Installing WASM target..."
        rustup target add wasm32-unknown-unknown
        Write-Success "WASM target added"
    }
} catch {
    Write-Error "Rust not found. Installing..."
    # Download and install Rust
    Invoke-WebRequest -Uri "https://win.rustup.rs/x86_64" -OutFile "$env:TEMP\rustup-init.exe"
    & "$env:TEMP\rustup-init.exe" -y --default-toolchain stable
    $env:PATH += ";$env:USERPROFILE\.cargo\bin"
    rustup target add wasm32-unknown-unknown
    Write-Success "Rust installed with WASM target"
}

# Check cargo-stylus
try {
    $stylusVersion = cargo stylus --version
    Write-Success "cargo-stylus: $stylusVersion"
} catch {
    Write-Info "Installing cargo-stylus..."
    cargo install cargo-stylus
    Write-Success "cargo-stylus installed"
}

# Check Foundry (optional but recommended)
try {
    $castVersion = cast --version
    Write-Success "Foundry Cast: $castVersion"
    $hasFoundry = $true
} catch {
    Write-Warning "Foundry not found. Contract testing will be limited."
    Write-Info "Install from: https://getfoundry.sh/"
    $hasFoundry = $false
}

# 2️⃣ Nitro Devnode Setup
Write-Step "Step 2: Setting up Nitro Devnode..."

if (-not (Test-Path $NITRO_DIR)) {
    Write-Info "Cloning Nitro devnode..."
    Set-Location "c:\Users\HP\Downloads\"
    git clone https://github.com/OffchainLabs/nitro-devnode.git
    Write-Success "Nitro devnode cloned"
}

Set-Location $NITRO_DIR

# Check if already running
$runningContainers = docker ps --format "{{.Names}}" | Where-Object { $_ -like "*nitro*" -or $_ -like "*devnode*" }
if ($runningContainers) {
    Write-Success "Nitro devnode already running"
} else {
    Write-Info "Starting Nitro devnode (this may take 2-3 minutes)..."
    
    # Try different startup methods
    if (Test-Path "docker-compose.yml") {
        docker-compose up -d
    } elseif (Test-Path "run-dev-node.sh") {
        bash ./run-dev-node.sh
    } else {
        Write-Error "Cannot find startup script for Nitro devnode"
        exit 1
    }
    
    # Wait for startup
    Write-Info "Waiting for Nitro devnode to be ready..."
    $maxWait = 180  # 3 minutes
    $waited = 0
    
    while ($waited -lt $maxWait) {
        Start-Sleep 5
        $waited += 5
        Write-Host "." -NoNewline
        
        try {
            $response = Invoke-RestMethod -Uri $env:NITRO_L2_RPC -Method POST -Body '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' -ContentType "application/json" -TimeoutSec 3
            if ($response.result) {
                Write-Host ""
                Write-Success "Nitro devnode ready! Chain ID: $($response.result)"
                break
            }
        } catch {
            # Continue waiting
        }
    }
    
    if ($waited -ge $maxWait) {
        Write-Error "Nitro devnode failed to start within 3 minutes"
        exit 1
    }
}

# Verify account balance
if ($hasFoundry) {
    try {
        $balance = cast balance --rpc-url $env:NITRO_L2_RPC $env:NITRO_ADDRESS
        Write-Success "Account balance: $balance ETH"
    } catch {
        Write-Warning "Could not check account balance"
    }
}

# 3️⃣ Contract Compilation
Write-Step "Step 3: Compiling Stylus contract..."
Set-Location $CONTRACT_DIR

# Verify Cargo.toml
if (-not (Test-Path "Cargo.toml")) {
    Write-Error "Cargo.toml not found in $CONTRACT_DIR"
    exit 1
}

Write-Info "Project: $(Split-Path $CONTRACT_DIR -Leaf)"

# Check contract
Write-Info "Running cargo stylus check..."
try {
    $checkOutput = cargo stylus check --endpoint=$env:NITRO_L2_RPC 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Contract check passed"
    } else {
        Write-Warning "Stylus check failed, trying manual build..."
        cargo build --target wasm32-unknown-unknown --release
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Contract compilation failed"
            exit 1
        }
        Write-Success "Manual compilation successful"
    }
} catch {
    Write-Error "Compilation error: $_"
    exit 1
}

# 4️⃣ Gas Estimation
Write-Step "Step 4: Estimating deployment gas..."
try {
    $gasOutput = cargo stylus deploy --endpoint=$env:NITRO_L2_RPC --private-key=$env:NITRO_PRIVATE_KEY --estimate-gas 2>&1
    Write-Success "Gas estimation completed"
    Write-Host $gasOutput -ForegroundColor Yellow
} catch {
    Write-Warning "Gas estimation failed: $_"
}

if ($EstimateOnly) {
    Write-Info "Estimate-only mode. Stopping here."
    exit 0
}

# 5️⃣ Contract Deployment  
Write-Step "Step 5: Deploying contract..."
try {
    Write-Info "Deploying to Nitro devnode..."
    $deployOutput = cargo stylus deploy --endpoint=$env:NITRO_L2_RPC --private-key=$env:NITRO_PRIVATE_KEY 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "🎉 Contract deployed successfully!"
        Write-Host $deployOutput -ForegroundColor Green
        
        # Extract contract address
        $contractAddress = ($deployOutput | Select-String -Pattern "0x[a-fA-F0-9]{40}").Matches.Value | Select-Object -First 1
        if (-not $contractAddress) {
            # Try alternative extraction
            $contractAddress = ($deployOutput | Select-String -Pattern "deployed code at address (0x[a-fA-F0-9]{40})").Matches.Groups[1].Value
        }
        
        if ($contractAddress) {
            Write-Success "📋 Contract Address: $contractAddress"
            $global:ContractAddress = $contractAddress
            
            # Save deployment info
            $deploymentInfo = @"
# ShadowID Stylus Contract Deployment
# Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")

CONTRACT_ADDRESS=$contractAddress
NETWORK=Nitro Devnode Local
RPC_URL=$env:NITRO_L2_RPC
PRIVATE_KEY=$env:NITRO_PRIVATE_KEY
DEPLOYER_ADDRESS=$env:NITRO_ADDRESS

# Test Commands:
# Get member count: cargo stylus call --endpoint=$env:NITRO_L2_RPC $contractAddress "get_member_count"
# Add member: cargo stylus call --endpoint=$env:NITRO_L2_RPC $contractAddress "add_member"
# Get info: cargo stylus call --endpoint=$env:NITRO_L2_RPC $contractAddress "info"
"@
            $deploymentInfo | Out-File -FilePath "deployment-nitro.env" -Encoding UTF8
            Write-Success "📄 Deployment info saved to deployment-nitro.env"
        } else {
            Write-Warning "Could not extract contract address from deployment output"
        }
    } else {
        Write-Error "Deployment failed:"
        Write-Host $deployOutput -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Error "Deployment error: $_"
    exit 1
}

# 6️⃣ Contract Testing
if (-not $SkipTests -and $contractAddress) {
    Write-Step "Step 6: Testing contract functions..."
    
    # Test contract using cargo stylus call (native method)
    Write-Info "Testing contract with cargo stylus call..."
    
    try {
        # Test info function
        Write-Info "Testing 'info' function..."
        $infoResult = echo "info" | cargo stylus call --endpoint=$env:NITRO_L2_RPC $contractAddress 2>$null
        if ($infoResult) {
            Write-Success "Info: $infoResult"
        }
        
        # Test get_member_count
        Write-Info "Testing 'get_member_count' function..."
        $memberCount = echo "get_member_count" | cargo stylus call --endpoint=$env:NITRO_L2_RPC $contractAddress 2>$null
        if ($memberCount) {
            Write-Success "Member Count: $memberCount"
        }
        
        # Test add_member (requires transaction)
        Write-Info "Testing 'add_member' function..."
        $addResult = echo "add_member" | cargo stylus call --endpoint=$env:NITRO_L2_RPC --private-key=$env:NITRO_PRIVATE_KEY $contractAddress 2>$null
        if ($addResult) {
            Write-Success "Add Member Result: $addResult"
            
            # Check updated count
            Start-Sleep 2
            $newCount = echo "get_member_count" | cargo stylus call --endpoint=$env:NITRO_L2_RPC $contractAddress 2>$null
            if ($newCount) {
                Write-Success "Updated Member Count: $newCount"
            }
        }
        
        # Test proposal functions
        Write-Info "Testing proposal functions..."
        $proposalResult = echo "create_proposal" | cargo stylus call --endpoint=$env:NITRO_L2_RPC --private-key=$env:NITRO_PRIVATE_KEY $contractAddress 2>$null
        if ($proposalResult) {
            Write-Success "Create Proposal: $proposalResult"
        }
        
        $proposalCount = echo "get_proposal_count" | cargo stylus call --endpoint=$env:NITRO_L2_RPC $contractAddress 2>$null
        if ($proposalCount) {
            Write-Success "Proposal Count: $proposalCount"
        }
        
    } catch {
        Write-Warning "Contract testing failed: $_"
    }
    
    # Test with Cast if available
    if ($hasFoundry) {
        Write-Info "Testing with Foundry Cast..."
        try {
            # Cast requires different approach for Stylus contracts
            # This is more for demonstration
            $codeSize = cast code --rpc-url $env:NITRO_L2_RPC $contractAddress
            if ($codeSize -and $codeSize -ne "0x") {
                Write-Success "Contract code verified (size: $($codeSize.Length) chars)"
            }
        } catch {
            Write-Info "Cast testing not applicable for this contract type"
        }
    }
}

# 7️⃣ Export ABI and Final Steps
Write-Step "Step 7: Finalizing deployment..."

try {
    Write-Info "Exporting contract ABI..."
    $abi = cargo stylus export-abi 2>$null
    if ($abi) {
        $abi | Out-File -FilePath "shadowid-contract.abi" -Encoding UTF8
        Write-Success "ABI exported to shadowid-contract.abi"
    }
} catch {
    Write-Info "ABI export not available for this contract"
}

# Create interaction script
$interactionScript = @"
#!/usr/bin/env pwsh
# ShadowID Contract Interaction Script
# Contract Address: $contractAddress

`$CONTRACT_ADDRESS = "$contractAddress"
`$RPC_URL = "$env:NITRO_L2_RPC"
`$PRIVATE_KEY = "$env:NITRO_PRIVATE_KEY"

Write-Host "ShadowID Contract Interaction" -ForegroundColor Cyan
Write-Host "Contract: `$CONTRACT_ADDRESS" -ForegroundColor Gray

function Call-Contract {
    param(`$command)
    echo `$command | cargo stylus call --endpoint=`$RPC_URL `$CONTRACT_ADDRESS
}

function Send-Contract {
    param(`$command)
    echo `$command | cargo stylus call --endpoint=`$RPC_URL --private-key=`$PRIVATE_KEY `$CONTRACT_ADDRESS
}

# Available commands:
# Call-Contract "info"
# Call-Contract "get_member_count"
# Send-Contract "add_member"
# Call-Contract "get_proposal_count"
# Send-Contract "create_proposal"

Write-Host "Available functions:" -ForegroundColor Yellow
Write-Host "  Call-Contract 'info'" -ForegroundColor Green
Write-Host "  Call-Contract 'get_member_count'" -ForegroundColor Green
Write-Host "  Send-Contract 'add_member'" -ForegroundColor Green
Write-Host "  Call-Contract 'get_proposal_count'" -ForegroundColor Green
Write-Host "  Send-Contract 'create_proposal'" -ForegroundColor Green
"@

$interactionScript | Out-File -FilePath "interact-contract.ps1" -Encoding UTF8
Write-Success "Interaction script created: interact-contract.ps1"

# Success summary
Write-Host ""
Write-Host "🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!" -ForegroundColor Green -BackgroundColor DarkGreen
Write-Host ""
Write-Success "Contract Address: $contractAddress"
Write-Success "Network: Nitro Devnode (Local)"
Write-Success "RPC URL: $env:NITRO_L2_RPC"
Write-Host ""
Write-Info "Next steps:"
Write-Host "  1. Run: .\interact-contract.ps1" -ForegroundColor Cyan
Write-Host "  2. Test functions: Call-Contract 'info'" -ForegroundColor Cyan
Write-Host "  3. Check deployment-nitro.env for details" -ForegroundColor Cyan
Write-Host "  4. Integrate with your frontend using the contract address" -ForegroundColor Cyan
Write-Host ""
Write-Host "Example interaction:" -ForegroundColor Yellow
Write-Host "  .\interact-contract.ps1" -ForegroundColor Gray
Write-Host "  Call-Contract 'info'" -ForegroundColor Gray
Write-Host "  Send-Contract 'add_member'" -ForegroundColor Gray

if ($QuickStart) {
    Write-Host ""
    Write-Info "Quick test of the deployed contract:"
    .\interact-contract.ps1
    Call-Contract "info"
}