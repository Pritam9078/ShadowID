# Compile all Noir circuits for KYB verification (PowerShell) - Fixed Version
Write-Host "Compiling all KYB Noir circuits..." -ForegroundColor Green

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

# Function to compile a circuit
function Compile-Circuit {
    param($CircuitName)
    
    $circuitPath = "..\noir-circuits\$CircuitName"
    
    Write-Info "Compiling $CircuitName..."
    
    if (Test-Path $circuitPath) {
        Push-Location $circuitPath
        
        try {
            $output = nargo compile 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Success "$CircuitName compiled successfully"
                $result = $true
            } else {
                Write-Error-Custom "Failed to compile $CircuitName"
                Write-Host $output
                $result = $false
            }
        } catch {
            Write-Error-Custom "Error compiling $CircuitName"
            $result = $false
        }
        
        Pop-Location
    } else {
        Write-Warning "Circuit directory $circuitPath not found"
        $result = $false
    }
    
    return $result
}

# Change to scripts directory
Set-Location $PSScriptRoot

# Check if nargo is available
try {
    $nargoVersion = nargo --version 2>$null
    Write-Info "Found nargo: $nargoVersion"
} catch {
    Write-Error-Custom "nargo not found. Please install Noir toolchain."
    Write-Host "Visit: https://noir-lang.org/getting_started/installation"
    exit 1
}

Write-Info "Starting compilation of all KYB circuits..."

# Compile all circuits
$circuits = @("kyb_verification", "business_age", "revenue_proof", "business_registration", "ubo_proof", "revenue_threshold")

# Also include existing circuits if they exist  
if (Test-Path "..\noir-circuits\age_proof") {
    $circuits += "age_proof"
}

if (Test-Path "..\noir-circuits\citizenship_proof") {
    $circuits += "citizenship_proof"
}

if (Test-Path "..\noir-circuits\attribute_proof") {
    $circuits += "attribute_proof"
}

$allSucceeded = $true
foreach ($circuit in $circuits) {
    $success = Compile-Circuit $circuit
    if (-not $success) {
        $allSucceeded = $false
    }
}

if ($allSucceeded) {
    Write-Success "All circuit compilation completed!"
    Write-Info "Compiled circuits are ready for proof generation."
    Write-Info "Use '.\generate_proof.ps1 [circuit_name]' to generate proofs."
} else {
    Write-Warning "Some circuits failed to compile. Check errors above."
}