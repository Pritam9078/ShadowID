# Revenue Threshold Circuit Testing Utility (PowerShell)
# Interactive testing for various revenue compliance scenarios

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

function Write-Header {
    param($Message)
    Write-Host "=== $Message ===" -ForegroundColor Magenta
}

# Function to convert dollars to cents
function Convert-DollarsToCents {
    param($Dollars)
    return [int]($Dollars * 100)
}

# Function to convert cents to dollars for display
function Convert-CentsToDollars {
    param($Cents)
    return [decimal]($Cents / 100)
}

# Function to run revenue test
function Test-RevenueScenario {
    param($ScenarioName, $RevenueAmount, $ThresholdAmount, $ExpectedResult, $Description)
    
    Write-Header "Testing: $ScenarioName"
    Write-Info "Description: $Description"
    Write-Info "Revenue: $$(Convert-CentsToDollars $RevenueAmount)"
    Write-Info "Threshold: $$(Convert-CentsToDollars $ThresholdAmount)" 
    Write-Info "Expected result: $ExpectedResult"
    
    # Create test commitment (simplified for demo)
    $testCommitment = "0x" + [System.Convert]::ToHexString([System.Text.Encoding]::UTF8.GetBytes("test$RevenueAmount")).PadLeft(64, '0')
    
    # Create Prover.toml content
    $proverContent = @"
commitment = "$testCommitment"
threshold_value = "$ThresholdAmount"
unit_scale = "100"
revenue_value = "$RevenueAmount"
salt = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
"@
    
    # Write to Prover.toml
    $proverContent | Out-File "Prover.toml" -Encoding UTF8
    
    # Generate and verify proof
    try {
        Write-Info "Generating proof..."
        $output = nargo prove 2>&1
        if ($LASTEXITCODE -eq 0) {
            if ($ExpectedResult -eq "pass") {
                Write-Success "✓ Proof generated successfully"
                
                Write-Info "Verifying proof..."
                $verifyOutput = nargo verify 2>&1
                if ($LASTEXITCODE -eq 0) {
                    Write-Success "✓ Proof verification successful"
                    Write-Success "✓ Test PASSED - Revenue meets threshold requirement"
                } else {
                    Write-Error-Custom "✗ Proof verification failed"
                    return $false
                }
            } else {
                Write-Error-Custom "✗ Test FAILED - Expected failure but proof generated"
                Write-Warning "Revenue $$(Convert-CentsToDollars $RevenueAmount) should not pass threshold $$(Convert-CentsToDollars $ThresholdAmount)"
                return $false
            }
        } else {
            if ($ExpectedResult -eq "fail") {
                Write-Success "✓ Test PASSED - Proof correctly rejected" 
                Write-Info "Revenue validation failed as expected"
            } else {
                Write-Error-Custom "✗ Test FAILED - Expected success but proof generation failed"
                Write-Host $output
                return $false
            }
        }
    } catch {
        Write-Error-Custom "✗ Error during test: $($_.Exception.Message)"
        return $false
    }
    
    Write-Host ""
    return $true
}

# Function to run custom revenue test
function Test-CustomRevenue {
    Write-Header "Custom Revenue Test"
    
    do {
        $revenueInput = Read-Host "Enter business revenue in dollars (e.g., 1250000 for $1.25M)"
        $revenue = 0
    } while (-not [int]::TryParse($revenueInput, [ref]$revenue) -or $revenue -le 0)
    
    do {
        $thresholdInput = Read-Host "Enter threshold in dollars (e.g., 1000000 for $1M)" 
        $threshold = 0
    } while (-not [int]::TryParse($thresholdInput, [ref]$threshold) -or $threshold -le 0)
    
    $revenueCents = Convert-DollarsToCents $revenue
    $thresholdCents = Convert-DollarsToCents $threshold
    
    $expected = if ($revenueCents -ge $thresholdCents) { "pass" } else { "fail" }
    
    Test-RevenueScenario "Custom Test" $revenueCents $thresholdCents $expected "User-defined revenue vs threshold test"
}

# Change to circuit directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$circuitPath = Join-Path $scriptDir "..\noir-circuits\revenue_threshold"

if (-not (Test-Path $circuitPath)) {
    Write-Error-Custom "Could not find revenue_threshold circuit directory"
    exit 1
}

Set-Location $circuitPath

# Check if circuit is compiled
if (-not (Test-Path "target\revenue_threshold.json")) {
    Write-Warning "Circuit not compiled. Compiling now..."
    try {
        nargo compile
        if ($LASTEXITCODE -ne 0) {
            Write-Error-Custom "Failed to compile circuit"
            exit 1
        }
        Write-Success "Circuit compiled successfully"
    } catch {
        Write-Error-Custom "Compilation failed: $($_.Exception.Message)"
        exit 1
    }
}

# Main menu loop
while ($true) {
    Write-Host ""
    Write-Header "Revenue Threshold Circuit Test Menu"
    Write-Host "1. DAO Governance Test ($1M threshold)"
    Write-Host "2. Investment Qualification Test ($10M threshold)"  
    Write-Host "3. Partnership Qualification Test ($500K threshold)"
    Write-Host "4. Small Business Test ($100 threshold)"
    Write-Host "5. Edge Case: Exactly at Threshold"
    Write-Host "6. Edge Case: $1 Below Threshold"
    Write-Host "7. Invalid Case: Zero Revenue"
    Write-Host "8. Invalid Case: Excessive Revenue"
    Write-Host "9. High Precision Mills Test"
    Write-Host "10. Custom Revenue Test"
    Write-Host "11. Run Predefined Test Scenarios"
    Write-Host "12. Load Scenario Files"
    Write-Host "0. Exit"
    Write-Host ""
    
    $choice = Read-Host "Select an option (0-12)"
    
    switch ($choice) {
        "1" {
            $revenue = Convert-DollarsToCents 2500000    # $2.5M
            $threshold = Convert-DollarsToCents 1000000  # $1M
            Test-RevenueScenario "DAO Governance" $revenue $threshold "pass" "Business with $2.5M revenue meets $1M minimum for governance voting"
        }
        
        "2" {
            $revenue = Convert-DollarsToCents 15750000   # $15.75M
            $threshold = Convert-DollarsToCents 10000000 # $10M
            Test-RevenueScenario "Investment Qualification" $revenue $threshold "pass" "Company qualifies for institutional investment tier"
        }
        
        "3" {
            $revenue = Convert-DollarsToCents 750000     # $750K
            $threshold = Convert-DollarsToCents 500000   # $500K
            Test-RevenueScenario "Partnership Qualification" $revenue $threshold "pass" "Mid-size business meets partnership requirements"
        }
        
        "4" {
            $revenue = Convert-DollarsToCents 5000       # $5K
            $threshold = Convert-DollarsToCents 100      # $100
            Test-RevenueScenario "Small Business" $revenue $threshold "pass" "Small business exceeds minimum threshold"
        }
        
        "5" {
            $revenue = Convert-DollarsToCents 1000000    # $1M
            $threshold = Convert-DollarsToCents 1000000  # $1M (exactly equal)
            Test-RevenueScenario "Exact Threshold" $revenue $threshold "pass" "Revenue exactly at threshold boundary"
        }
        
        "6" {
            $revenue = Convert-DollarsToCents 999999     # $999,999 ($1 below $1M)
            $threshold = Convert-DollarsToCents 1000000  # $1M
            Test-RevenueScenario "Below Threshold" $revenue $threshold "fail" "Revenue $1 below minimum requirement"
        }
        
        "7" {
            $revenue = 0                                 # $0
            $threshold = Convert-DollarsToCents 100      # $100
            Test-RevenueScenario "Zero Revenue" $revenue $threshold "fail" "Invalid zero revenue should be rejected"
        }
        
        "8" {
            $revenue = 20000000000000                    # $200 trillion (excessive)
            $threshold = Convert-DollarsToCents 1000000  # $1M
            Test-RevenueScenario "Excessive Revenue" $revenue $threshold "fail" "Revenue exceeding maximum bounds should fail"
        }
        
        "9" {
            Write-Info "Testing high precision mills scenario..."
            if (Test-Path "Prover_mills.toml") {
                Copy-Item "Prover_mills.toml" "Prover.toml"
                Write-Success "Loaded mills precision test"
                
                try {
                    nargo prove 2>&1 | Out-Null
                    if ($LASTEXITCODE -eq 0) {
                        nargo verify 2>&1 | Out-Null
                        if ($LASTEXITCODE -eq 0) {
                            Write-Success "✓ Mills precision test passed"
                        } else {
                            Write-Error-Custom "✗ Mills verification failed"
                        }
                    } else {
                        Write-Error-Custom "✗ Mills proof generation failed"
                    }
                } catch {
                    Write-Error-Custom "✗ Mills test error: $($_.Exception.Message)"
                }
            } else {
                Write-Warning "Prover_mills.toml not found"
            }
        }
        
        "10" {
            Test-CustomRevenue
        }
        
        "11" {
            Write-Info "Running predefined test scenarios..."
            $testCount = 0
            $passCount = 0
            
            # DAO scenarios
            $testCount++
            if (Test-RevenueScenario "DAO Pass" (Convert-DollarsToCents 2500000) (Convert-DollarsToCents 1000000) "pass" "DAO governance qualification") { $passCount++ }
            
            $testCount++  
            if (Test-RevenueScenario "DAO Fail" (Convert-DollarsToCents 750000) (Convert-DollarsToCents 1000000) "fail" "Below DAO minimum") { $passCount++ }
            
            # Investment scenarios
            $testCount++
            if (Test-RevenueScenario "Investment Pass" (Convert-DollarsToCents 15000000) (Convert-DollarsToCents 10000000) "pass" "Investment qualification") { $passCount++ }
            
            # Edge cases
            $testCount++
            if (Test-RevenueScenario "Edge Pass" (Convert-DollarsToCents 1000000) (Convert-DollarsToCents 1000000) "pass" "Exact threshold boundary") { $passCount++ }
            
            $testCount++
            if (Test-RevenueScenario "Edge Fail" (Convert-DollarsToCents 999999) (Convert-DollarsToCents 1000000) "fail" "One dollar below threshold") { $passCount++ }
            
            Write-Host ""
            Write-Header "Test Results Summary"
            Write-Success "Passed: $passCount/$testCount tests"
            if ($passCount -eq $testCount) {
                Write-Success "🎉 All predefined tests passed!"
            } else {
                Write-Warning "⚠️  Some tests failed. Review the output above."
            }
        }
        
        "12" {
            Write-Info "Loading scenario files..."
            
            $scenarios = @(
                @{ File = "Prover.toml"; Name = "Default DAO Governance" }
                @{ File = "Prover_investment.toml"; Name = "Investment Qualification" }
                @{ File = "Prover_partnership.toml"; Name = "Partnership Scenario" }
                @{ File = "Prover_mills.toml"; Name = "High Precision Mills" }
            )
            
            foreach ($scenario in $scenarios) {
                if (Test-Path $scenario.File) {
                    Write-Info "Testing $($scenario.Name)..."
                    Copy-Item $scenario.File "Prover.toml"
                    
                    try {
                        nargo prove 2>&1 | Out-Null
                        if ($LASTEXITCODE -eq 0) {
                            nargo verify 2>&1 | Out-Null
                            if ($LASTEXITCODE -eq 0) {
                                Write-Success "✓ $($scenario.Name) passed"
                            } else {
                                Write-Error-Custom "✗ $($scenario.Name) verification failed"
                            }
                        } else {
                            Write-Error-Custom "✗ $($scenario.Name) proof generation failed"
                        }
                    } catch {
                        Write-Error-Custom "✗ $($scenario.Name) error: $($_.Exception.Message)"
                    }
                } else {
                    Write-Warning "$($scenario.File) not found"
                }
            }
        }
        
        "0" {
            Write-Info "Exiting revenue threshold test utility..."
            exit 0
        }
        
        default {
            Write-Error-Custom "Invalid option. Please select 0-12."
        }
    }
}