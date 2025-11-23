# Generate proof for specific KYB circuit (PowerShell) - Fixed Version
param(
    [Parameter(Mandatory=$true)]
    [string]$CircuitName,
    
    [Parameter(Mandatory=$false)]
    [string]$InputFile = "input.json"
)

Write-Host "Generating proof for circuit: $CircuitName" -ForegroundColor Green

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

$circuitPath = "..\noir-circuits\$CircuitName"

if (-not (Test-Path $circuitPath)) {
    Write-Error-Custom "Circuit directory $circuitPath not found"
    Write-Host "Available circuits:"
    Get-ChildItem "..\noir-circuits" -Directory | ForEach-Object { Write-Host "  - $($_.Name)" }
    exit 1
}

Push-Location $circuitPath

# Check if input file exists
$inputPath = "Prover.toml"
if ($InputFile -ne "input.json" -and (Test-Path $InputFile)) {
    # Convert JSON input to TOML if needed
    Write-Info "Converting $InputFile to Prover.toml..."
    try {
        $jsonContent = Get-Content $InputFile | ConvertFrom-Json
        $tomlContent = ""
        foreach ($property in $jsonContent.PSObject.Properties) {
            if ($property.Value -is [string]) {
                $tomlContent += "$($property.Name) = `"$($property.Value)`"`n"
            } else {
                $tomlContent += "$($property.Name) = $($property.Value)`n"
            }
        }
        Set-Content "Prover.toml" $tomlContent
    } catch {
        Write-Warning "Failed to convert JSON input. Using existing Prover.toml"
    }
}

if (-not (Test-Path $inputPath)) {
    Write-Warning "No Prover.toml found. Creating sample input..."
    
    # Create sample input based on circuit type
    switch ($CircuitName) {
        "kyb_verification" {
            @"
business_id = "12345"
registration_year = 2020
revenue = 1000000
industry_code = 1001
is_verified = true
"@ | Set-Content "Prover.toml"
        }
        "business_age" {
            @"
registration_timestamp = 1577836800
current_timestamp = 1672531200
min_age_years = 3
"@ | Set-Content "Prover.toml"
        }
        "revenue_proof" {
            @"
revenue = 1000000
min_revenue_threshold = 500000
max_revenue_threshold = 10000000
"@ | Set-Content "Prover.toml"
        }
        default {
            @"
# Add your circuit inputs here
# Example:
# input_value = 42
# secret_key = "your_secret_here"
"@ | Set-Content "Prover.toml"
        }
    }
    Write-Info "Created sample Prover.toml - please edit with actual values"
}

Write-Info "Generating proof..."
try {
    $output = nargo prove 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Proof generated successfully!"
        
        if (Test-Path "proofs\${CircuitName}.proof") {
            $proofSize = (Get-Item "proofs\${CircuitName}.proof").Length
            Write-Info "Proof file: proofs\${CircuitName}.proof ($proofSize bytes)"
        }
        
        Write-Info "Verifying proof..."
        $verifyOutput = nargo verify 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Proof verification successful!"
        } else {
            Write-Warning "Proof verification failed:"
            Write-Host $verifyOutput
        }
    } else {
        Write-Error-Custom "Proof generation failed:"
        Write-Host $output
        Pop-Location
        exit 1
    }
} catch {
    Write-Error-Custom "Error during proof generation: $($_.Exception.Message)"
    Pop-Location
    exit 1
}

Pop-Location

Write-Success "Proof generation completed for $CircuitName"
Write-Info "Proof files available in: $circuitPath\proofs\"