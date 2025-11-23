# DVote DAO Stylus Deployment Script for Arbitrum Sepolia
# This script compiles and deploys the Stylus contract to Arbitrum Sepolia

param(
    [string]$PrivateKey = $null,
    [string]$RpcUrl = "https://arb-sepolia.g.alchemy.com/v2/mUJMHrybqfzOlpVeT0cj7",
    [switch]$CheckOnly,
    [switch]$Verbose
)

# Colors for output
function Write-Success($msg) { Write-Host $msg -ForegroundColor Green }
function Write-Error($msg) { Write-Host $msg -ForegroundColor Red }
function Write-Info($msg) { Write-Host $msg -ForegroundColor Cyan }
function Write-Warning($msg) { Write-Host $msg -ForegroundColor Yellow }

Write-Host "🚀 DVote DAO Stylus Deployment for Arbitrum Sepolia" -ForegroundColor Magenta
Write-Host "=" * 60

# Check prerequisites
Write-Info "1️⃣ Checking prerequisites..."

# Check Rust
try {
    $rustVersion = rustc --version
    Write-Success "✅ Rust: $rustVersion"
} catch {
    Write-Error "❌ Rust not found. Please install Rust first."
    exit 1
}

# Check cargo stylus
try {
    $stylusVersion = cargo stylus --version
    Write-Success "✅ Cargo Stylus: $stylusVersion"
} catch {
    Write-Error "❌ Cargo Stylus not found. Installing..."
    cargo install cargo-stylus
}

# Check private key
if (-not $PrivateKey) {
    Write-Warning "⚠️ No private key provided. Use -PrivateKey parameter for deployment."
    if (-not $CheckOnly) {
        Write-Info "💡 Run with -CheckOnly to test compilation without deployment"
        $CheckOnly = $true
    }
}

Write-Host ""
Write-Info "2️⃣ Compiling Stylus contract..."

# Clean previous build
if (Test-Path "target") {
    Remove-Item -Recurse -Force target
    Write-Info "🧹 Cleaned previous build"
}

# Build the contract
$buildOutput = cargo build --release 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Error "❌ Compilation failed:"
    Write-Host $buildOutput -ForegroundColor Red
    exit 1
}
Write-Success "✅ Contract compiled successfully"

# Check WASM binary
$wasmPath = "target\wasm32-unknown-unknown\release\dvote_dao_stylus.wasm"
if (-not (Test-Path $wasmPath)) {
    Write-Error "❌ WASM binary not found at $wasmPath"
    exit 1
}

$wasmSize = (Get-Item $wasmPath).Length
$wasmSizeKB = [math]::Round($wasmSize / 1024, 2)
Write-Info "📦 WASM binary size: $wasmSizeKB KB"

if ($wasmSizeKB -gt 128) {
    Write-Error "❌ WASM binary too large for Stylus deployment ($wasmSizeKB KB > 128 KB)"
    Write-Info "💡 Try optimizing the contract or reducing dependencies"
    exit 1
} else {
    Write-Success "✅ WASM binary size acceptable for Stylus deployment"
}

Write-Host ""
Write-Info "3️⃣ Checking contract for Stylus compatibility..."

# Check Stylus compatibility
try {
    $checkOutput = cargo stylus check --wasm-file $wasmPath --endpoint $RpcUrl 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Success "✅ Contract is Stylus compatible"
        if ($Verbose) {
            Write-Host $checkOutput -ForegroundColor Gray
        }
    } else {
        Write-Error "❌ Stylus compatibility check failed:"
        Write-Host $checkOutput -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Error "❌ Failed to check Stylus compatibility: $_"
    exit 1
}

# Export ABI
Write-Info "📋 Exporting contract ABI..."
try {
    $abiOutput = cargo stylus export-abi 2>&1
    if ($LASTEXITCODE -eq 0) {
        # Create ABI directory
        $abiDir = "..\..\frontend\src\abi"
        if (-not (Test-Path $abiDir)) {
            New-Item -ItemType Directory -Path $abiDir -Force | Out-Null
        }
        
        # Save ABI to file
        $abiPath = "$abiDir\DaoStylus.json"
        $abiOutput | Out-File -FilePath $abiPath -Encoding UTF8
        Write-Success "✅ ABI exported to: $abiPath"
    } else {
        Write-Warning "⚠️ ABI export failed, but continuing..."
    }
} catch {
    Write-Warning "⚠️ ABI export error: $_"
}

if ($CheckOnly) {
    Write-Success "🎉 Check complete! Contract is ready for deployment."
    Write-Info "🚀 To deploy, run: .\deploy-stylus.ps1 -PrivateKey <your-private-key>"
    exit 0
}

Write-Host ""
Write-Info "4️⃣ Deploying to Arbitrum Sepolia..."

# Deploy contract
try {
    Write-Info "🚀 Starting deployment..."
    $deployOutput = cargo stylus deploy --private-key $PrivateKey --endpoint $RpcUrl 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "🎉 Contract deployed successfully!"
        Write-Host $deployOutput -ForegroundColor Green
        
        # Extract contract address from output
        $contractAddress = ""
        foreach ($line in $deployOutput -split "`n") {
            if ($line -match "deployed code at address (0x[a-fA-F0-9]{40})") {
                $contractAddress = $matches[1]
                break
            }
        }
        
        if ($contractAddress) {
            Write-Success "📍 Contract Address: $contractAddress"
            
            # Create deployment info
            $deploymentInfo = @{
                network = "arbitrum-sepolia"
                chainId = 421614
                contractAddress = $contractAddress
                deployer = "stylus-deployment"
                timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
                rpcEndpoint = $RpcUrl
                contractName = "DvoteDAOStylus"
                wasmSize = $wasmSizeKB
                stylusVersion = $stylusVersion
            }
            
            # Save deployment info to backend
            $deploymentDir = "..\..\backend\deployments"
            if (-not (Test-Path $deploymentDir)) {
                New-Item -ItemType Directory -Path $deploymentDir -Force | Out-Null
            }
            
            $deploymentPath = "$deploymentDir\arbitrum-sepolia-stylus.json"
            $deploymentInfo | ConvertTo-Json -Depth 10 | Out-File -FilePath $deploymentPath -Encoding UTF8
            Write-Success "✅ Deployment info saved to: $deploymentPath"
            
            # Update main deployment info
            $mainDeploymentPath = "..\..\deployment-info.json"
            if (Test-Path $mainDeploymentPath) {
                $mainDeployment = Get-Content $mainDeploymentPath | ConvertFrom-Json
                # Add Stylus contract info
                $mainDeployment | Add-Member -NotePropertyName "stylus" -NotePropertyValue @{
                    network = "arbitrum-sepolia"
                    chainId = 421614
                    contractAddress = $contractAddress
                    timestamp = $deploymentInfo.timestamp
                } -Force
                $mainDeployment | ConvertTo-Json -Depth 10 | Out-File -FilePath $mainDeploymentPath -Encoding UTF8
                Write-Success "✅ Updated main deployment info"
            }
            
            Write-Host ""
            Write-Success "🎊 Deployment Complete! 🎊"
            Write-Host "=" * 60
            Write-Success "Network: Arbitrum Sepolia (Chain ID: 421614)"
            Write-Success "Contract: $contractAddress"
            Write-Success "Explorer: https://sepolia.arbiscan.io/address/$contractAddress"
            Write-Success "RPC: $RpcUrl"
            Write-Host ""
            Write-Info "🧪 Test the contract:"
            Write-Host "cargo stylus call --address $contractAddress --endpoint $RpcUrl 'info'" -ForegroundColor Gray
            Write-Host ""
            Write-Info "🔗 Integration ready! The backend will now load this contract automatically."
            
        } else {
            Write-Warning "⚠️ Could not extract contract address from deployment output"
        }
        
    } else {
        Write-Error "❌ Deployment failed:"
        Write-Host $deployOutput -ForegroundColor Red
        exit 1
    }
    
} catch {
    Write-Error "❌ Deployment error: $_"
    exit 1
}

Write-Host ""
Write-Success "✨ All done! Your Stylus DAO contract is live on Arbitrum Sepolia!"