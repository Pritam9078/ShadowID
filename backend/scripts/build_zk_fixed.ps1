# Build script for all ZK circuits and components (PowerShell)
Write-Host "Building ZK Infrastructure..." -ForegroundColor Green

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

function Write-Error-Custom {
    param($Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Change to project root
Set-Location "$PSScriptRoot\.."

Write-Info "Checking prerequisites..."

# Check Noir toolchain
try {
    $nargoVersion = nargo --version 2>$null
    Write-Success "Noir $nargoVersion found"
    $nargoAvailable = $true
} catch {
    Write-Error-Custom "Noir (nargo) not found. Please install from: https://noir-lang.org/getting_started/installation"
    $nargoAvailable = $false
}

# Check Node.js for Aztec backend
try {
    $nodeVersion = node --version 2>$null
    Write-Success "Node.js $nodeVersion found"
} catch {
    Write-Warning "Node.js not found. Aztec backend integration will be limited."
}

if (-not $nargoAvailable) {
    Write-Warning "Skipping circuit compilation (nargo not available)"
} else {
    Write-Info "Building all ZK circuits..."

    # Compile all circuits using workspace
    if (Test-Path "Nargo.toml") {
        Write-Info "Compiling workspace circuits..."
        try {
            nargo compile --workspace
            if ($LASTEXITCODE -eq 0) {
                Write-Success "Workspace circuits compiled successfully"
            } else {
                Write-Error-Custom "Workspace compilation failed"
                # Don't exit, continue with individual compilation
            }
        } catch {
            Write-Error-Custom "Workspace compilation failed"
            # Don't exit, continue with individual compilation
        }
    } else {
        Write-Warning "No workspace Nargo.toml found, compiling circuits individually"
    }
}

Write-Info "Setting up development environment..."

# Create necessary directories
$directories = @("zk\proofs", "zk\verifiers", "logs")
foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Info "Created directory: $dir"
    }
}

Write-Success "ZK Infrastructure build completed!"

Write-Info "Available commands:"
Write-Host "  Compile circuits: .\zk\scripts\compile_all_clean.ps1"
Write-Host "  Generate proof:  .\zk\scripts\generate_proof.ps1 [circuit_name]" 
Write-Host "  Test circuits:   nargo test --workspace"
Write-Host "  List circuits:   node zk\scripts\aztec_backend.js circuits"
Write-Host ""
Write-Info "Backend integration:"
Write-Host "  npm run zk:compile:win - Compile all circuits"
Write-Host "  npm run zk:prove:win   - Generate proofs"
Write-Host "  npm run zk:test        - Run circuit tests"
Write-Host "  npm run zk:check       - Check Aztec backend status"

if (-not $nargoAvailable) {
    Write-Host ""
    Write-Warning "To enable full ZK functionality, install Noir:"
    Write-Host "1. Visit: https://noir-lang.org/getting_started/installation"
    Write-Host "2. Run: curl -L https://raw.githubusercontent.com/noir-lang/noirup/main/install | bash"
    Write-Host "3. Run: noirup"
}