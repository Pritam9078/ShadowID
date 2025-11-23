# Compile all Noir circuits for KYB verification (PowerShell)
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

function Write-Error {
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
            nargo compile
            if ($LASTEXITCODE -eq 0) {
                Write-Success "$CircuitName compiled successfully"
                $result = $true
            } else {
                Write-Error "Failed to compile $CircuitName"
                $result = $false
            }
        } catch {
            Write-Error "Error compiling $CircuitName"
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
    $nargoVersion = nargo --version
    Write-Info "Found nargo: $nargoVersion"
} catch {
    Write-Error "nargo not found. Please install Noir toolchain."
    Write-Host "Visit: https://noir-lang.org/getting_started/installation"
    exit 1
}

Write-Info "Starting compilation of all KYB circuits..."

# Compile all circuits
$circuits = @("kyb_verification", "business_age", "revenue_proof")

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
    if (-not (Compile-Circuit $circuit)) {
        $allSucceeded = $false
    }
}

if ($allSucceeded) {
    Write-Success "All circuit compilation completed!"
    Write-Info "Compiled circuits are ready for proof generation."
} else {
    Write-Warning "Some circuits failed to compile. Check errors above."
}