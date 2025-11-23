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

function Write-Error {
    param($Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Change to project root
Set-Location "$PSScriptRoot\.."

Write-Info "Checking prerequisites..."

# Check Noir toolchain
try {
    $nargoVersion = nargo --version
    Write-Success "Noir $nargoVersion found"
} catch {
    Write-Error "Noir (nargo) not found. Please install from: https://noir-lang.org/getting_started/installation"
    exit 1
}

# Check Node.js for Aztec backend
try {
    $nodeVersion = node --version
    Write-Success "Node.js $nodeVersion found"
} catch {
    Write-Warning "Node.js not found. Aztec backend integration will be limited."
}

Write-Info "Building all ZK circuits..."

# Compile all circuits using workspace
if (Test-Path "Nargo.toml") {
    Write-Info "Compiling workspace circuits..."
    try {
        nargo compile --workspace
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Workspace circuits compiled successfully"
        } else {
            Write-Error "Workspace compilation failed"
            exit 1
        }
    } catch {
        Write-Error "Workspace compilation failed"
        exit 1
    }
} else {
    Write-Warning "No workspace Nargo.toml found, compiling circuits individually"
    
    # Compile circuits individually
    Set-Location "zk\scripts"
    if (Test-Path "compile_all.ps1") {
        .\compile_all.ps1
    } else {
        Write-Error "compile_all.ps1 not found"
        exit 1
    }
    Set-Location "..\.."
}

Write-Info "Setting up development environment..."

# Create necessary directories
$directories = @("zk\proofs", "zk\verifiers", "logs")
foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
}

Write-Success "ZK Infrastructure build completed!"

Write-Info "Available commands:"
Write-Host "  Compile circuits: .\zk\scripts\compile_all.ps1"
Write-Host "  Generate proof:  .\zk\scripts\generate_proof.ps1 [circuit_name]"
Write-Host "  Test circuits:   nargo test --workspace"
Write-Host "  List circuits:   node zk\scripts\aztec_backend.js circuits"