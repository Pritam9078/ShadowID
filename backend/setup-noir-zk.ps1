# DVote Noir ZK Backend Quick Start Script (Windows PowerShell)
Write-Host "Starting DVote Noir ZK Backend Setup..." -ForegroundColor Green

# Function to print colored output
function Write-Info {
    param($Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-Success {
    param($Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param($Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param($Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Change to backend directory
Set-Location $PSScriptRoot

Write-Info "Checking prerequisites..."

# Check Node.js version
try {
    $nodeVersion = node --version
    $majorVersion = [int]$nodeVersion.Substring(1).Split('.')[0]
    if ($majorVersion -ge 18) {
        Write-Success "Node.js $nodeVersion found"
    } else {
        Write-Error "Node.js >= 18 required, found $nodeVersion"
        exit 1
    }
} catch {
    Write-Error "Node.js not found. Please install Node.js >= 18"
    exit 1
}

# Check npm
try {
    $npmVersion = npm --version
    Write-Success "npm $npmVersion found"
} catch {
    Write-Error "npm not found"
    exit 1
}

# Check Noir toolchain
try {
    $nargoVersion = nargo --version
    Write-Success "Noir $nargoVersion found"
} catch {
    Write-Warning "Noir (nargo) not found. ZK proof generation will not work without it."
    Write-Info "Install from: https://noir-lang.org/getting_started/installation"
}

Write-Info "Installing Node.js dependencies..."

# Copy package.json for installation
Copy-Item "package-noir-zk.json" "package.json" -Force

# Install dependencies
try {
    npm install
    Write-Success "Dependencies installed successfully"
} catch {
    Write-Error "Failed to install dependencies"
    exit 1
}

Write-Info "Setting up environment configuration..."

# Setup environment file
if (-not (Test-Path ".env")) {
    Copy-Item ".env.noir-zk" ".env"
    Write-Warning "Created .env file from template. Please configure your settings:"
    Write-Info "  - Set contract addresses"
    Write-Info "  - Set backend private key"
    Write-Info "  - Configure RPC endpoints"
} else {
    Write-Info "Environment file already exists"
}

Write-Info "Setting up Noir circuits..."

# Create circuit directories if they don't exist
$circuitPaths = @(
    "../zk-circuits/noir/age_proof/src",
    "../zk-circuits/noir/citizenship_proof/src",
    "../zk-circuits/noir/attribute_proof/src"
)

foreach ($path in $circuitPaths) {
    if (-not (Test-Path $path)) {
        New-Item -ItemType Directory -Path $path -Force | Out-Null
    }
}

Write-Success "Circuit directories created"

Write-Info "Compiling Noir circuits (if nargo is available)..."

$nargoAvailable = $false
try {
    nargo --version | Out-Null
    $nargoAvailable = $true
} catch {
    # nargo not available
}

if ($nargoAvailable) {
    # Compile age proof circuit
    if (Test-Path "../zk-circuits/noir/age_proof") {
        Push-Location "../zk-circuits/noir/age_proof"
        try {
            nargo compile
            Write-Success "Age proof circuit compiled"
        } catch {
            Write-Warning "Age proof circuit compilation failed"
        }
        Pop-Location
    }

    # Compile citizenship proof circuit
    if (Test-Path "../zk-circuits/noir/citizenship_proof") {
        Push-Location "../zk-circuits/noir/citizenship_proof"
        try {
            nargo compile
            Write-Success "Citizenship proof circuit compiled"
        } catch {
            Write-Warning "Citizenship proof circuit compilation failed"
        }
        Pop-Location
    }

    # Compile attribute proof circuit
    if (Test-Path "../zk-circuits/noir/attribute_proof") {
        Push-Location "../zk-circuits/noir/attribute_proof"
        try {
            nargo compile
            Write-Success "Attribute proof circuit compiled"
        } catch {
            Write-Warning "Attribute proof circuit compilation failed"
        }
        Pop-Location
    }
} else {
    Write-Warning "Skipping circuit compilation (nargo not available)"
}

Write-Info "Testing backend health check..."

# Start server in background for health check
$serverJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    node server-noir-zk.js
}

# Wait for server to start
Start-Sleep -Seconds 3

# Test health endpoint
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3001/health" -TimeoutSec 5
    Write-Success "Backend health check passed"
} catch {
    Write-Warning "Health check failed - server may not be fully configured"
}

# Stop test server
Stop-Job $serverJob -ErrorAction SilentlyContinue
Remove-Job $serverJob -ErrorAction SilentlyContinue

Write-Success "DVote Noir ZK Backend setup complete!"

Write-Host ""
Write-Info "Next steps:"
Write-Host "  1. Configure .env file with your settings"
Write-Host "  2. Deploy DAO and ShadowID contracts"
Write-Host "  3. Update contract addresses in .env"
Write-Host "  4. Run: npm run dev (development) or npm start (production)"
Write-Host ""
Write-Info "Available endpoints:"
Write-Host "  Health: GET http://localhost:3001/health"
Write-Host "  KYC: POST http://localhost:3001/kyc/commitment"  
Write-Host "  Age Proof: POST http://localhost:3001/zk/age"
Write-Host "  Citizenship: POST http://localhost:3001/zk/citizenship"
Write-Host "  Attributes: POST http://localhost:3001/zk/attribute"
Write-Host "  DAO Submit: POST http://localhost:3001/dao/submit-proof"
Write-Host ""
Write-Info "Documentation: README-NOIR-ZK.md"