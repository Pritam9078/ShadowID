# ShadowID Stylus Contract - Local Deployment Script
# Author: ShadowID Team
# Description: Automated deployment script for Stylus contracts on Nitro Devnode

param(
    [string]$ProjectPath = "c:\Users\HP\Downloads\DVote-main\DVote-main\contracts-stylus",
    [string]$NitroPath = "c:\Users\HP\Downloads\nitro-devnode",
    [switch]$SkipNodeSetup = $false,
    [switch]$EstimateOnly = $false
)

# Color output functions
function Write-Success { param($Message) Write-Host "✅ $Message" -ForegroundColor Green }
function Write-Info { param($Message) Write-Host "ℹ️  $Message" -ForegroundColor Cyan }
function Write-Warning { param($Message) Write-Host "⚠️  $Message" -ForegroundColor Yellow }
function Write-Error { param($Message) Write-Host "❌ $Message" -ForegroundColor Red }

Write-Host "🚀 ShadowID Stylus Local Deployment Script" -ForegroundColor Magenta
Write-Host "============================================" -ForegroundColor Magenta

# Environment variables
$env:NITRO_L1_RPC = "http://localhost:8545"
$env:NITRO_L2_RPC = "http://localhost:8547"
$env:NITRO_PRIVATE_KEY = "0xb6b15c8cb491557369f3c7d2c287b053eb229daa9c22138887752191c9520659"

# Step 1: Check Prerequisites
Write-Info "Checking prerequisites..."

# Check Docker
try {
    $dockerVersion = docker --version 2>$null
    if ($dockerVersion) {
        Write-Success "Docker found: $dockerVersion"
    } else {
        Write-Error "Docker not found. Please install Docker Desktop."
        exit 1
    }
} catch {
    Write-Error "Docker not available. Please install and start Docker Desktop."
    exit 1
}

# Check Rust
try {
    $rustVersion = rustc --version 2>$null
    if ($rustVersion -and $rustVersion -match "1\.([8-9]\d|8[1-9])") {
        Write-Success "Rust found: $rustVersion"
    } else {
        Write-Warning "Rust 1.81+ required. Installing..."
        winget install Rustlang.Rustup
        $env:PATH += ";$env:USERPROFILE\.cargo\bin"
        rustup target add wasm32-unknown-unknown
        Write-Success "Rust installed and WASM target added."
    }
} catch {
    Write-Error "Failed to check Rust. Please install manually."
    exit 1
}

# Check cargo-stylus
try {
    $stylusVersion = cargo stylus --version 2>$null
    if ($stylusVersion) {
        Write-Success "cargo-stylus found: $stylusVersion"
    } else {
        Write-Info "Installing cargo-stylus..."
        cargo install cargo-stylus
        Write-Success "cargo-stylus installed."
    }
} catch {
    Write-Warning "Installing cargo-stylus..."
    cargo install cargo-stylus
}

# Check Cast (Foundry)
try {
    $castVersion = cast --version 2>$null
    if ($castVersion) {
        Write-Success "Cast found: $castVersion"
    } else {
        Write-Warning "Cast not found. Install Foundry from https://getfoundry.sh/"
    }
} catch {
    Write-Warning "Cast not available. Install Foundry for contract interaction."
}

# Step 2: Setup Nitro Devnode
if (-not $SkipNodeSetup) {
    Write-Info "Setting up Nitro Devnode..."
    
    # Clone or update Nitro devnode
    if (-not (Test-Path $NitroPath)) {
        Write-Info "Cloning Nitro devnode..."
        Set-Location (Split-Path $NitroPath -Parent)
        git clone https://github.com/OffchainLabs/nitro-devnode.git
        Write-Success "Nitro devnode cloned."
    } else {
        Write-Info "Nitro devnode directory exists. Updating..."
        Set-Location $NitroPath
        git pull origin main
    }
    
    # Start the devnode
    Set-Location $NitroPath
    Write-Info "Starting Nitro devnode (this may take 2-3 minutes)..."
    
    # Check if already running
    $runningContainers = docker ps --format "table {{.Names}}" | Where-Object { $_ -like "*nitro*" }
    if ($runningContainers) {
        Write-Success "Nitro devnode containers already running."
    } else {
        # Start the devnode
        if (Test-Path "run-dev-node.ps1") {
            .\run-dev-node.ps1
        } elseif (Test-Path "run-dev-node.sh") {
            bash .\run-dev-node.sh
        } else {
            docker-compose up -d
        }
        
        # Wait for startup
        Write-Info "Waiting for Nitro devnode to initialize..."
        $maxAttempts = 30
        $attempt = 0
        
        do {
            Start-Sleep 5
            $attempt++
            Write-Host "." -NoNewline
            
            try {
                $response = Invoke-RestMethod -Uri $env:NITRO_L2_RPC -Method POST -Body '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' -ContentType "application/json" -TimeoutSec 5
                if ($response.result) {
                    Write-Host ""
                    Write-Success "Nitro devnode is ready! Chain ID: $($response.result)"
                    break
                }
            } catch {
                # Continue waiting
            }
        } while ($attempt -lt $maxAttempts)
        
        if ($attempt -eq $maxAttempts) {
            Write-Error "Nitro devnode failed to start within expected time."
            exit 1
        }
    }
} else {
    Write-Info "Skipping Nitro devnode setup (--SkipNodeSetup specified)."
}

# Step 3: Prepare Contract
Write-Info "Preparing Stylus contract..."
Set-Location $ProjectPath

# Check if Cargo.toml exists
if (-not (Test-Path "Cargo.toml")) {
    Write-Error "Cargo.toml not found in $ProjectPath"
    Write-Info "Creating a new Stylus project..."
    Set-Location (Split-Path $ProjectPath -Parent)
    cargo stylus new shadowid-contract
    Set-Location "shadowid-contract"
    $ProjectPath = Get-Location
}

# Display current project info
Write-Info "Project directory: $ProjectPath"
if (Test-Path "Cargo.toml") {
    $cargoContent = Get-Content "Cargo.toml" -Raw
    Write-Info "Project configuration found."
}

# Step 4: Check Contract Compilation
Write-Info "Checking contract compilation..."
try {
    $checkResult = cargo stylus check --endpoint=$env:NITRO_L2_RPC 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Contract compilation check passed."
    } else {
        Write-Warning "Contract check failed. Attempting manual build..."
        cargo build --target wasm32-unknown-unknown --release
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Manual build successful."
        } else {
            Write-Error "Contract compilation failed. Please fix errors and try again."
            exit 1
        }
    }
} catch {
    Write-Error "Failed to check contract compilation: $_"
    exit 1
}

# Step 5: Estimate Gas
Write-Info "Estimating deployment gas..."
try {
    $gasEstimate = cargo stylus deploy --endpoint=$env:NITRO_L2_RPC --private-key=$env:NITRO_PRIVATE_KEY --estimate-gas 2>&1
    Write-Success "Gas estimation completed:"
    Write-Host $gasEstimate -ForegroundColor Yellow
} catch {
    Write-Warning "Gas estimation failed: $_"
}

# Step 6: Deploy Contract (unless estimate-only)
if ($EstimateOnly) {
    Write-Info "Estimate-only mode enabled. Skipping actual deployment."
    exit 0
}

Write-Info "Deploying contract to Nitro devnode..."
try {
    $deployResult = cargo stylus deploy --endpoint=$env:NITRO_L2_RPC --private-key=$env:NITRO_PRIVATE_KEY 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Contract deployed successfully!"
        Write-Host $deployResult -ForegroundColor Green
        
        # Extract contract address from output
        $contractAddress = ($deployResult | Select-String -Pattern "0x[a-fA-F0-9]{40}").Matches.Value | Select-Object -First 1
        if ($contractAddress) {
            Write-Success "Contract Address: $contractAddress"
            
            # Save deployment info
            $deploymentInfo = @"
# ShadowID Stylus Contract Deployment - $(Get-Date)
Contract Address: $contractAddress
Network: Nitro Devnode Local
RPC URL: $($env:NITRO_L2_RPC)
Private Key: $($env:NITRO_PRIVATE_KEY)
Project Path: $ProjectPath

# Interaction Commands:
# Read counter: cast call --rpc-url $($env:NITRO_L2_RPC) $contractAddress "number()(uint256)"
# Increment: cast send --rpc-url $($env:NITRO_L2_RPC) --private-key $($env:NITRO_PRIVATE_KEY) $contractAddress "increment()"
"@
            $deploymentInfo | Out-File -FilePath "deployment-local.txt"
            Write-Success "Deployment info saved to deployment-local.txt"
            
            # Step 7: Test Contract Interaction (if Cast is available)
            if (Get-Command cast -ErrorAction SilentlyContinue) {
                Write-Info "Testing contract interaction..."
                
                try {
                    # Test reading (assuming counter contract)
                    Write-Info "Reading initial value..."
                    $initialValue = cast call --rpc-url $env:NITRO_L2_RPC $contractAddress "number()(uint256)" 2>$null
                    if ($initialValue) {
                        Write-Success "Initial value: $initialValue"
                        
                        # Test increment
                        Write-Info "Testing increment function..."
                        $incrementTx = cast send --rpc-url $env:NITRO_L2_RPC --private-key $env:NITRO_PRIVATE_KEY $contractAddress "increment()" 2>$null
                        if ($incrementTx) {
                            Write-Success "Increment transaction: $incrementTx"
                            
                            Start-Sleep 2
                            $newValue = cast call --rpc-url $env:NITRO_L2_RPC $contractAddress "number()(uint256)" 2>$null
                            if ($newValue) {
                                Write-Success "New value: $newValue"
                            }
                        }
                    }
                } catch {
                    Write-Warning "Contract interaction test failed (this is normal if your contract has different functions): $_"
                }
            }
            
            # Export ABI
            Write-Info "Exporting contract ABI..."
            try {
                $abi = cargo stylus export-abi 2>$null
                if ($abi) {
                    $abi | Out-File -FilePath "contract-abi.json"
                    Write-Success "ABI exported to contract-abi.json"
                }
            } catch {
                Write-Warning "ABI export failed: $_"
            }
        }
    } else {
        Write-Error "Contract deployment failed:"
        Write-Host $deployResult -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Error "Deployment error: $_"
    exit 1
}

Write-Host ""
Write-Success "🎉 ShadowID Stylus contract deployment completed successfully!"
Write-Info "Next steps:"
Write-Host "  1. Use the contract address: $contractAddress" -ForegroundColor Cyan
Write-Host "  2. Check deployment-local.txt for interaction commands" -ForegroundColor Cyan
Write-Host "  3. Test your contract functions using Cast" -ForegroundColor Cyan
Write-Host "  4. Integrate with your frontend using the exported ABI" -ForegroundColor Cyan