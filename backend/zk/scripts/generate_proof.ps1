# Generate ZK proof for specified circuit (PowerShell)
Write-Host "🔐 Generating ZK proof..." -ForegroundColor Green

param(
    [Parameter(Mandatory=$true)]
    [string]$CircuitName,
    
    [Parameter(Mandatory=$false)]
    [string]$ProverFile = "Prover.toml"
)

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

# Validate inputs
if (-not $CircuitName) {
    Write-Error "Circuit name required."
    Write-Host "Usage: .\generate_proof.ps1 <circuit_name> [prover_file]"
    Write-Host "Available circuits:"
    Write-Host "  - kyb_verification"
    Write-Host "  - business_age"
    Write-Host "  - revenue_proof"
    Write-Host "  - age_proof"
    Write-Host "  - citizenship_proof"
    Write-Host "  - attribute_proof"
    exit 1
}

$circuitPath = "..\noir-circuits\$CircuitName"
$proofsDir = "..\proofs\$CircuitName"

# Check if circuit exists
if (-not (Test-Path $circuitPath)) {
    Write-Error "Circuit '$CircuitName' not found at $circuitPath"
    exit 1
}

# Create proofs directory
New-Item -ItemType Directory -Path $proofsDir -Force | Out-Null

Write-Info "Generating proof for circuit: $CircuitName"
Write-Info "Using prover file: $ProverFile"

# Change to circuit directory
Push-Location $circuitPath

# Check if Prover.toml exists and create template if needed
if (-not (Test-Path $ProverFile)) {
    Write-Warning "$ProverFile not found. Creating template..."
    
    switch ($CircuitName) {
        "kyb_verification" {
            $template = @"
# KYB Verification Circuit Inputs
# Fill in actual values before generating proof

# Private inputs (witness)
business_registration_number = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
business_type = "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"
jurisdiction = "0x123456789abcdef123456789abcdef123456789abcdef123456789abcdef12"
annual_revenue = "1000000"
employee_count = "50"
incorporation_year = "2020"
salt = "0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba"

# Public inputs
min_revenue = "500000"
min_employees = "10"
allowed_jurisdictions = ["0x123456789abcdef123456789abcdef123456789abcdef123456789abcdef12", "0x0", "0x0", "0x0", "0x0", "0x0", "0x0", "0x0", "0x0", "0x0"]
allowed_business_types = ["0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890", "0x0", "0x0", "0x0", "0x0"]
current_year = "2024"
min_business_age = "2"

# Public output
commitment = "0x0000000000000000000000000000000000000000000000000000000000000000"
"@
        }
        "business_age" {
            $template = @"
# Business Age Verification Circuit Inputs

incorporation_year = "2020"
incorporation_month = "6"
incorporation_day = "15"
salt = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"

min_years_operating = "2"
current_year = "2024"
current_month = "11"
current_day = "23"

commitment = "0x0000000000000000000000000000000000000000000000000000000000000000"
"@
        }
        "revenue_proof" {
            $template = @"
# Revenue Proof Circuit Inputs

annual_revenue = "1500000"
revenue_currency = "0x555344000000000000000000000000000000000000000000000000000000000"  # "USD" hash
fiscal_year = "2023"
salt = "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"

min_revenue_threshold = "1000000"
max_revenue_cap = "10000000"
allowed_currencies = ["0x555344000000000000000000000000000000000000000000000000000000000", "0x0", "0x0", "0x0", "0x0"]
current_fiscal_year = "2024"

commitment = "0x0000000000000000000000000000000000000000000000000000000000000000"
"@
        }
        default {
            $template = "# Fill in circuit-specific inputs"
        }
    }
    
    Set-Content -Path $ProverFile -Value $template
    Write-Warning "Please edit $ProverFile with actual values before generating proof."
}

# Compile if needed
if (-not (Test-Path "target")) {
    Write-Info "Compiling circuit first..."
    try {
        nargo compile
        if ($LASTEXITCODE -ne 0) {
            Write-Error "Circuit compilation failed"
            Pop-Location
            exit 1
        }
    } catch {
        Write-Error "Circuit compilation failed: $($_.Exception.Message)"
        Pop-Location
        exit 1
    }
}

# Generate proof
Write-Info "Generating proof..."
try {
    nargo prove
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Proof generated successfully!"
        
        # Copy proof files to proofs directory
        if (Test-Path "proofs\proof.json") {
            Copy-Item "proofs\proof.json" "..\..\proofs\$CircuitName\"
            Write-Info "Proof saved to: ..\proofs\$CircuitName\proof.json"
        }
        
        if (Test-Path "proofs\public.json") {
            Copy-Item "proofs\public.json" "..\..\proofs\$CircuitName\"
            Write-Info "Public inputs saved to: ..\proofs\$CircuitName\public.json"
        }
        
        Write-Success "Proof generation completed!"
        Write-Info "Use '.\verify_proof.ps1 $CircuitName' to verify the proof."
    } else {
        Write-Error "Proof generation failed"
        Pop-Location
        exit 1
    }
} catch {
    Write-Error "Proof generation failed: $($_.Exception.Message)"
    Pop-Location
    exit 1
}

Pop-Location