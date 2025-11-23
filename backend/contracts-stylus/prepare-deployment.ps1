# DVote DAO Deployment Preparation Script
# This script prepares deployment files and configurations for when Stylus compilation is working

param(
    [switch]$MockDeploy,
    [switch]$PrepareOnly,
    [string]$Network = "arbitrum-sepolia"
)

function Write-Success($msg) { Write-Host $msg -ForegroundColor Green }
function Write-Error($msg) { Write-Host $msg -ForegroundColor Red }
function Write-Info($msg) { Write-Host $msg -ForegroundColor Cyan }
function Write-Warning($msg) { Write-Host $msg -ForegroundColor Yellow }

Write-Host "🏗️ DVote DAO Deployment Preparation" -ForegroundColor Magenta
Write-Host "=" * 50

# Check if we're in the right directory
if (-not (Test-Path "Cargo.toml")) {
    Write-Error "❌ Not in contracts-stylus directory. Please run from: contracts-stylus/"
    exit 1
}

Write-Info "1️⃣ Checking deployment environment..."

# Create deployment directory if it doesn't exist
$deploymentDir = "..\backend\deployments"
if (-not (Test-Path $deploymentDir)) {
    New-Item -ItemType Directory -Path $deploymentDir -Force | Out-Null
    Write-Success "✅ Created deployment directory"
}

# Check Rust installation
try {
    $rustVersion = rustc --version
    Write-Success "✅ Rust: $rustVersion"
} catch {
    Write-Warning "⚠️ Rust not found - needed for actual deployment"
}

# Check cargo stylus
try {
    $stylusVersion = cargo stylus --version
    Write-Success "✅ Cargo Stylus: $stylusVersion"
} catch {
    Write-Warning "⚠️ Cargo Stylus not found - needed for actual deployment"
}

Write-Info "2️⃣ Preparing deployment configuration..."

# Read current deployment config
$deploymentPath = "$deploymentDir\$Network.json"
$deploymentConfig = @{
    network = $Network
    chainId = if ($Network -eq "arbitrum-sepolia") { 421614 } else { 42161 }
    rpcUrl = if ($Network -eq "arbitrum-sepolia") { 
        "https://arb-sepolia.g.alchemy.com/v2/mUJMHrybqfzOlpVeT0cj7" 
    } else { 
        "https://arb1.arbitrum.io/rpc" 
    }
    explorer = if ($Network -eq "arbitrum-sepolia") { 
        "https://sepolia.arbiscan.io" 
    } else { 
        "https://arbiscan.io" 
    }
    contracts = @{
        stylus = @{
            DvoteDAOStylus = @{
                address = ""
                deployed = $false
                type = "stylus"
                description = "Main DAO contract implemented in Rust for Arbitrum Stylus"
            }
        }
        solidity = @{
            GovernanceToken = @{
                address = ""
                deployed = $false
                type = "erc20"
                description = "DVT governance token contract"
                symbol = "DVT"
                decimals = 18
            }
            Treasury = @{
                address = ""
                deployed = $false
                type = "treasury"
                description = "DAO treasury management contract"
            }
        }
    }
    deployment = @{
        timestamp = $null
        deployer = $null
        status = "prepared"
    }
}

if ($MockDeploy) {
    Write-Warning "3️⃣ Creating mock deployment..."
    
    # Mock addresses for development
    $deploymentConfig.contracts.stylus.DvoteDAOStylus.address = "0x1234567890123456789012345678901234567890"
    $deploymentConfig.contracts.stylus.DvoteDAOStylus.deployed = $true
    $deploymentConfig.contracts.solidity.GovernanceToken.address = "0x2345678901234567890123456789012345678901"
    $deploymentConfig.contracts.solidity.GovernanceToken.deployed = $true
    $deploymentConfig.contracts.solidity.Treasury.address = "0x3456789012345678901234567890123456789012"
    $deploymentConfig.contracts.solidity.Treasury.deployed = $true
    
    $deploymentConfig.deployment.timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    $deploymentConfig.deployment.deployer = "0xa62463A56EE9D742F810920F56cEbc4B696eBd0a"
    $deploymentConfig.deployment.status = "mock-deployed"
    $deploymentConfig.deployment.note = "Mock deployment for development - contracts not yet deployed to network"
    
    Write-Success "✅ Mock deployment configured"
}

# Save deployment config
$deploymentConfig | ConvertTo-Json -Depth 10 | Out-File -FilePath $deploymentPath -Encoding UTF8
Write-Success "✅ Deployment config saved: $deploymentPath"

Write-Info "4️⃣ Creating ABI files..."

# Create ABI directory
$abiDir = "..\frontend\src\abi"
if (-not (Test-Path $abiDir)) {
    New-Item -ItemType Directory -Path $abiDir -Force | Out-Null
}

# Create mock Stylus ABI (simplified interface)
$stylusABI = @{
    name = "DvoteDAOStylus"
    type = "stylus"
    description = "DVote DAO Stylus Contract Interface"
    methods = @(
        @{
            name = "add_member"
            description = "Add a verified member to the DAO"
            input = "string"
            output = "string"
        },
        @{
            name = "get_member_count"
            description = "Get total number of members"
            input = ""
            output = "number"
        },
        @{
            name = "create_proposal"
            description = "Create a new proposal"
            input = "string"
            output = "string"
        },
        @{
            name = "get_proposal_count"
            description = "Get total number of proposals"
            input = ""
            output = "number"
        },
        @{
            name = "info"
            description = "Get contract information"
            input = ""
            output = "string"
        }
    )
}

$stylusABI | ConvertTo-Json -Depth 10 | Out-File -FilePath "$abiDir\DaoStylus.json" -Encoding UTF8
Write-Success "✅ Stylus ABI created: $abiDir\DaoStylus.json"

Write-Info "5️⃣ Creating deployment helper scripts..."

# Create Windows deployment helper
$deployHelper = @"
@echo off
echo DVote DAO Stylus Deployment Helper
echo ==================================
echo.
echo This script helps with Stylus contract deployment on Windows
echo.
echo Prerequisites:
echo 1. Rust installed (rustc --version)
echo 2. Cargo Stylus installed (cargo install cargo-stylus)
echo 3. Private key for deployment
echo 4. Windows build tools (Visual Studio Build Tools)
echo.
echo Steps to deploy:
echo 1. Fix Windows compilation issues:
echo    - Install Visual Studio Build Tools 2022
echo    - Set RUSTFLAGS environment variable if needed
echo.
echo 2. Compile contract:
echo    cargo build --release --target wasm32-unknown-unknown
echo.
echo 3. Check Stylus compatibility:
echo    cargo stylus check --wasm-file target\wasm32-unknown-unknown\release\dvote_dao_stylus.wasm
echo.
echo 4. Deploy to Arbitrum Sepolia:
echo    cargo stylus deploy --private-key YOUR_PRIVATE_KEY --endpoint https://arb-sepolia.g.alchemy.com/v2/mUJMHrybqfzOlpVeT0cj7
echo.
echo For help with Windows compilation issues, see:
echo https://github.com/OffchainLabs/stylus-sdk-rs/issues
echo.
pause
"@

$deployHelper | Out-File -FilePath "deploy-helper.bat" -Encoding ASCII
Write-Success "✅ Deployment helper created: deploy-helper.bat"

Write-Info "6️⃣ Updating backend service integration..."

# Update the main deployment info file
$mainDeploymentPath = "..\deployment-info.json"
if (Test-Path $mainDeploymentPath) {
    $mainDeployment = Get-Content $mainDeploymentPath | ConvertFrom-Json
    
    # Add Stylus section
    $stylusInfo = @{
        network = $deploymentConfig.network
        chainId = $deploymentConfig.chainId
        contracts = $deploymentConfig.contracts
        status = $deploymentConfig.deployment.status
        timestamp = $deploymentConfig.deployment.timestamp
    }
    
    $mainDeployment | Add-Member -NotePropertyName "stylus" -NotePropertyValue $stylusInfo -Force
    $mainDeployment | ConvertTo-Json -Depth 10 | Out-File -FilePath $mainDeploymentPath -Encoding UTF8
    Write-Success "✅ Updated main deployment info"
}

Write-Host ""
Write-Success "🎉 Deployment preparation complete!"
Write-Host "=" * 50

if ($MockDeploy) {
    Write-Success "📍 Mock deployment created for development"
    Write-Info "🔗 Backend will now load mock contract addresses"
    Write-Info "🎯 Ready for frontend testing with mock data"
} else {
    Write-Info "📝 Deployment configuration prepared"
    Write-Info "🚀 Run deploy-helper.bat for deployment steps"
    Write-Info "🔧 Fix Windows compilation issues before actual deployment"
}

Write-Host ""
Write-Info "Next steps:"
if ($MockDeploy) {
    Write-Host "1. Restart backend server to load new deployment config" -ForegroundColor Yellow
    Write-Host "2. Test frontend integration with mock contracts" -ForegroundColor Yellow
    Write-Host "3. Deploy real contracts when compilation issues are resolved" -ForegroundColor Yellow
} else {
    Write-Host "1. Follow deploy-helper.bat instructions" -ForegroundColor Yellow
    Write-Host "2. Fix Windows Stylus compilation issues" -ForegroundColor Yellow
    Write-Host "3. Deploy contracts to Arbitrum Sepolia" -ForegroundColor Yellow
}
Write-Host "4. Update deployment config with real contract addresses" -ForegroundColor Yellow
"@

Write-Host ""
Write-Success "✅ Deployment preparation completed successfully!"