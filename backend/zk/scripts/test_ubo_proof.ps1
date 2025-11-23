# UBO Proof Circuit Testing Utility (PowerShell)
# Helps test different proof modes and scenarios

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

# Function to run a test case
function Run-TestCase {
    param($TestName, $ExpectedResult, $Description)
    
    Write-Header "Testing: $TestName"
    Write-Info "Description: $Description"
    Write-Info "Expected result: $ExpectedResult"
    
    # Generate proof
    Write-Info "Generating proof..."
    try {
        $output = nargo prove 2>&1
        if ($LASTEXITCODE -eq 0) {
            if ($ExpectedResult -eq "pass") {
                Write-Success "✓ Test passed - Proof generated successfully"
                
                # Verify the proof
                Write-Info "Verifying proof..."
                $verifyOutput = nargo verify 2>&1
                if ($LASTEXITCODE -eq 0) {
                    Write-Success "✓ Proof verification successful"
                    return $true
                } else {
                    Write-Error-Custom "✗ Proof verification failed"
                    return $false
                }
            } else {
                Write-Error-Custom "✗ Test failed - Expected failure but proof generated"
                return $false
            }
        } else {
            if ($ExpectedResult -eq "fail") {
                Write-Success "✓ Test passed - Proof correctly rejected"
                return $true
            } else {
                Write-Error-Custom "✗ Test failed - Expected success but proof generation failed"
                Write-Host $output
                return $false
            }
        }
    } catch {
        Write-Error-Custom "✗ Error during test execution: $($_.Exception.Message)"
        return $false
    }
}

# Function to extract test case from test_cases.toml
function Extract-TestCase {
    param($TestCase)
    
    if (-not (Test-Path "test_cases.toml")) {
        Write-Error-Custom "test_cases.toml not found"
        return $null
    }
    
    $content = Get-Content "test_cases.toml" -Raw
    $pattern = "(?s)\[$TestCase\].*?(?=\[|\z)"
    
    if ($content -match $pattern) {
        $section = $matches[0]
        
        # Extract key-value pairs (excluding metadata)
        $lines = $section -split "`n"
        $proverkontent = @()
        $expected = ""
        $description = ""
        
        foreach ($line in $lines) {
            if ($line -match '^expected_result = "([^"]*)"') {
                $expected = $matches[1]
            } elseif ($line -match '^description = "([^"]*)"') {
                $description = $matches[1]
            } elseif ($line -match '^\w+\s*=' -and $line -notmatch '(expected_result|description)') {
                $proverkontent += $line
            }
        }
        
        # Write to Prover.toml
        $proverkontent | Out-File "Prover.toml" -Encoding UTF8
        
        return @{
            Expected = $expected
            Description = $description
        }
    } else {
        Write-Error-Custom "Test case '$TestCase' not found"
        return $null
    }
}

# Change to circuit directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$circuitPath = Join-Path $scriptDir "..\noir-circuits\ubo_proof"

if (-not (Test-Path $circuitPath)) {
    Write-Error-Custom "Could not find ubo_proof circuit directory at: $circuitPath"
    exit 1
}

Set-Location $circuitPath

# Check if circuit is compiled
if (-not (Test-Path "target\ubo_proof.json")) {
    Write-Warning "Circuit not compiled. Compiling now..."
    try {
        nargo compile
        if ($LASTEXITCODE -ne 0) {
            Write-Error-Custom "Failed to compile circuit"
            exit 1
        }
    } catch {
        Write-Error-Custom "Failed to compile circuit: $($_.Exception.Message)"
        exit 1
    }
}

# Main testing loop
while ($true) {
    Write-Host ""
    Write-Header "UBO Proof Circuit Test Menu"
    Write-Host "1. Test Mode 1 (Merkle Inclusion) - Valid case"
    Write-Host "2. Test Mode 1 (Merkle Inclusion) - Invalid case (below threshold)"
    Write-Host "3. Test Mode 2 (Aggregate Count) - Valid case"
    Write-Host "4. Test Mode 2 (Aggregate Count) - Invalid case (wrong count)"
    Write-Host "5. Test Edge Cases (boundary conditions)"
    Write-Host "6. Test Input Validation (zero values, invalid modes)"
    Write-Host "7. Run All Test Cases"
    Write-Host "8. Manual Test (use current Prover.toml)"
    Write-Host "9. Switch to Mode 1 example"
    Write-Host "10. Switch to Mode 2 example"
    Write-Host "0. Exit"
    Write-Host ""
    
    $choice = Read-Host "Select an option (0-10)"
    
    switch ($choice) {
        "1" {
            Write-Info "Testing Mode 1 - Valid Merkle inclusion..."
            $testData = Extract-TestCase "test_case_1.valid_merkle_inclusion"
            if ($testData) {
                Run-TestCase "Mode 1 Valid" $testData.Expected $testData.Description
            }
        }
        
        "2" {
            Write-Info "Testing Mode 1 - Below threshold..."
            $testData = Extract-TestCase "test_case_3.invalid_below_threshold"
            if ($testData) {
                Run-TestCase "Mode 1 Below Threshold" $testData.Expected $testData.Description
            }
        }
        
        "3" {
            Write-Info "Testing Mode 2 - Valid aggregate count..."
            $testData = Extract-TestCase "test_case_2.valid_aggregate_count"
            if ($testData) {
                Run-TestCase "Mode 2 Valid" $testData.Expected $testData.Description
            }
        }
        
        "4" {
            Write-Info "Testing Mode 2 - Wrong count..."
            $testData = Extract-TestCase "test_case_4.invalid_wrong_count"
            if ($testData) {
                Run-TestCase "Mode 2 Wrong Count" $testData.Expected $testData.Description
            }
        }
        
        "5" {
            Write-Info "Testing edge cases..."
            $testData = Extract-TestCase "test_case_8.edge_case_exactly_threshold"
            if ($testData) {
                Run-TestCase "Edge Case - Exact Threshold" $testData.Expected $testData.Description
            }
        }
        
        "6" {
            Write-Info "Testing input validation..."
            
            # Test zero owner ID
            $testData = Extract-TestCase "test_case_5.invalid_zero_owner_id"
            if ($testData) {
                Run-TestCase "Zero Owner ID" $testData.Expected $testData.Description
            }
            
            # Test invalid mode
            $testData = Extract-TestCase "test_case_9.invalid_mode"
            if ($testData) {
                Run-TestCase "Invalid Mode" $testData.Expected $testData.Description
            }
        }
        
        "7" {
            Write-Info "Running all test cases..."
            $totalTests = 0
            $passedTests = 0
            
            $testCases = @(
                "test_case_1.valid_merkle_inclusion",
                "test_case_2.valid_aggregate_count", 
                "test_case_3.invalid_below_threshold",
                "test_case_4.invalid_wrong_count",
                "test_case_5.invalid_zero_owner_id",
                "test_case_6.invalid_zero_salt",
                "test_case_7.invalid_over_100_percent",
                "test_case_8.edge_case_exactly_threshold",
                "test_case_9.invalid_mode"
            )
            
            foreach ($test in $testCases) {
                $totalTests++
                $testData = Extract-TestCase $test
                if ($testData) {
                    if (Run-TestCase $test $testData.Expected $testData.Description) {
                        $passedTests++
                    }
                }
                Write-Host "---"
            }
            
            Write-Host ""
            Write-Header "Test Results Summary"
            Write-Success "Passed: $passedTests/$totalTests"
            if ($passedTests -eq $totalTests) {
                Write-Success "🎉 All tests passed!"
            } else {
                Write-Warning "⚠️  Some tests failed. Review the output above."
            }
        }
        
        "8" {
            Write-Info "Running manual test with current Prover.toml..."
            if (Test-Path "Prover.toml") {
                Run-TestCase "Manual Test" "unknown" "Using current Prover.toml configuration"
            } else {
                Write-Error-Custom "No Prover.toml file found"
            }
        }
        
        "9" {
            Write-Info "Switching to Mode 1 example..."
            if (Test-Path "Prover_mode1.toml") {
                Copy-Item "Prover_mode1.toml" "Prover.toml"
                Write-Success "Switched to Mode 1 (Merkle inclusion) example"
                Write-Info "You can now run option 8 for manual testing"
            } else {
                Write-Error-Custom "Prover_mode1.toml not found"
            }
        }
        
        "10" {
            Write-Info "Switching to Mode 2 example..."
            if (Test-Path "Prover_mode2.toml") {
                Copy-Item "Prover_mode2.toml" "Prover.toml"
                Write-Success "Switched to Mode 2 (Aggregate count) example"
                Write-Info "You can now run option 8 for manual testing"
            } else {
                Write-Error-Custom "Prover_mode2.toml not found"
            }
        }
        
        "0" {
            Write-Info "Exiting test utility..."
            exit 0
        }
        
        default {
            Write-Error-Custom "Invalid option. Please select 0-10."
        }
    }
}