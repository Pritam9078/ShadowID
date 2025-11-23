# Document Hash Proof Integration Test - PowerShell
# Comprehensive testing of the document hash proof circuit

param(
    [switch]$Verbose = $true,
    [switch]$Cleanup = $true,
    [switch]$Benchmark = $true,
    [string]$CircuitDir = "",
    [string]$TestDoc = ""
)

# Setup paths
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $CircuitDir) {
    $CircuitDir = Join-Path $ScriptDir "..\zk\noir-circuits\document_hash_proof"
}

# Test configuration
$Config = @{
    Verbose = $Verbose
    Cleanup = $Cleanup
    Benchmarking = $Benchmark
    CircuitDir = $CircuitDir
}

# Test documents
$TestDocuments = @(
    @{
        Name = "incorporation_cert.txt"
        Content = @"
CERTIFICATE OF INCORPORATION

Company Name: TechCorp Inc.
Registration Number: 123456789
Date of Incorporation: January 15, 2024
State: Delaware
Business Purpose: Technology Services
Share Capital: 1,000,000 authorized shares

This certifies that TechCorp Inc. has been duly incorporated
under the laws of Delaware.

Secretary of State
Corporate Division
"@
        DocType = 1
        Description = "Sample incorporation certificate"
    },
    @{
        Name = "business_license.json"
        Content = @"
{
  "license_number": "BL2024-7891",
  "business_name": "Green Energy Solutions LLC",
  "license_type": "General Business License",
  "issued_date": "2024-02-01",
  "expiry_date": "2025-01-31",
  "issuing_authority": "City Business Department",
  "business_category": "Renewable Energy Services",
  "address": "123 Solar Street, Green City, GC 12345",
  "status": "Active"
}
"@
        DocType = 2
        Description = "Sample business license in JSON format"
    },
    @{
        Name = "audit_report.txt"
        Content = @"
INDEPENDENT AUDITOR'S REPORT

To the Board of Directors
DataCorp Technologies Inc.

Opinion
We have audited the financial statements of DataCorp Technologies Inc.
as of December 31, 2023, and for the year then ended.

In our opinion, the financial statements present fairly, in all
material respects, the financial position of DataCorp Technologies Inc.
as of December 31, 2023.

Basis for Opinion
We conducted our audit in accordance with Generally Accepted Auditing
Standards. Our responsibilities under those standards are described
in the Auditor's Responsibilities section.

Key Audit Matters
- Revenue Recognition for Software Licenses
- Valuation of Intangible Assets
- Assessment of Going Concern

Certified Public Accountants
March 15, 2024
"@
        DocType = 4
        Description = "Sample audit report"
    },
    @{
        Name = "financial_statement.txt"
        Content = @"
CONSOLIDATED BALANCE SHEET
As of December 31, 2023
(Amounts in thousands)

ASSETS
Current Assets:
  Cash and cash equivalents         `$2,150
  Accounts receivable, net          `$1,890
  Inventory                         `$3,245
  Prepaid expenses                   `$456
Total Current Assets               `$7,741

Non-Current Assets:
  Property, plant & equipment, net  `$8,923
  Intangible assets, net           `$4,567
  Goodwill                         `$2,134
Total Non-Current Assets          `$15,624

TOTAL ASSETS                      `$23,365

LIABILITIES AND EQUITY
Current Liabilities:
  Accounts payable                 `$1,234
  Accrued liabilities               `$987
  Short-term debt                  `$1,500
Total Current Liabilities         `$3,721

Long-term debt                     `$5,000
Total Liabilities                 `$8,721

Shareholders' Equity              `$14,644

TOTAL LIABILITIES AND EQUITY      `$23,365
"@
        DocType = 5
        Description = "Sample financial statement"
    },
    @{
        Name = "compliance_cert.txt"
        Content = @"
REGULATORY COMPLIANCE CERTIFICATE

Certificate Number: RC-2024-0892
Company: SecureTech Solutions Inc.
Regulation: SOC 2 Type II
Compliance Period: January 1, 2024 - December 31, 2024

This certificate confirms that SecureTech Solutions Inc.
has demonstrated compliance with SOC 2 security controls
for the period specified above.

Areas of Compliance:
- Security
- Availability  
- Processing Integrity
- Confidentiality
- Privacy

Issued by: CyberSec Assurance LLC
Date: March 1, 2024
Valid Until: February 28, 2025

Authorized Signature: Digital Certificate Authority
"@
        DocType = 6
        Description = "Sample compliance certificate"
    }
)

# Helper functions
function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    
    if ($Config.Verbose) {
        $timestamp = Get-Date -Format "yyyy-MM-ddTHH:mm:ss.fffZ"
        Write-Host "[$timestamp] $Level`: $Message" -ForegroundColor $(
            switch ($Level) {
                "ERROR" { "Red" }
                "WARN" { "Yellow" }
                "PERF" { "Cyan" }
                default { "White" }
            }
        )
    }
}

function New-TestDocument {
    param($Document, $TempDir)
    
    $filePath = Join-Path $TempDir $Document.Name
    $Document.Content | Out-File -FilePath $filePath -Encoding UTF8
    Write-Log "Created test document: $($Document.Name) ($($Document.Content.Length) bytes)"
    return $filePath
}

function Invoke-DocumentHash {
    param($FilePath, $DocType, [bool]$Normalize = $true)
    
    try {
        $scriptPath = Join-Path $ScriptDir "compute_document_hash.js"
        $normalizeFlag = if ($Normalize) { "" } else { " --no-normalize" }
        $cmd = "node `"$scriptPath`" `"$FilePath`" --type $DocType$normalizeFlag"
        
        Write-Log "Computing hash: $cmd"
        
        Push-Location $Config.CircuitDir
        try {
            $result = Invoke-Expression $cmd 2>&1
            
            if (Test-Path "Prover.toml") {
                $proverContent = Get-Content "Prover.toml" -Raw
                return @{
                    Success = $true
                    ProverContent = $proverContent
                    Output = $result -join "`n"
                }
            } else {
                throw "Prover.toml not generated"
            }
        } finally {
            Pop-Location
        }
    }
    catch {
        Write-Log "Hash computation failed: $($_.Exception.Message)" "ERROR"
        return @{
            Success = $false
            Error = $_.Exception.Message
        }
    }
}

function Invoke-Circuit {
    try {
        Write-Log "Compiling circuit..."
        Push-Location $Config.CircuitDir
        
        try {
            $compileResult = & nargo compile 2>&1
            if ($LASTEXITCODE -ne 0) {
                throw "Compilation failed: $($compileResult -join "`n")"
            }
            
            Write-Log "Generating proof..."
            $proveResult = & nargo prove 2>&1
            if ($LASTEXITCODE -ne 0) {
                throw "Proof generation failed: $($proveResult -join "`n")"
            }
            
            Write-Log "Verifying proof..."
            $verifyResult = & nargo verify 2>&1
            if ($LASTEXITCODE -ne 0) {
                throw "Proof verification failed: $($verifyResult -join "`n")"
            }
            
            return @{
                Success = $true
                ProveOutput = $proveResult -join "`n"
                VerifyOutput = $verifyResult -join "`n"
            }
        } finally {
            Pop-Location
        }
    }
    catch {
        Write-Log "Circuit execution failed: $($_.Exception.Message)" "ERROR"
        return @{
            Success = $false
            Error = $_.Exception.Message
        }
    }
}

function Measure-TestExecution {
    param($ScriptBlock, $Description)
    
    if (-not $Config.Benchmarking) {
        return & $ScriptBlock
    }
    
    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    $result = & $ScriptBlock
    $stopwatch.Stop()
    
    Write-Log "⏱️ $Description`: $($stopwatch.ElapsedMilliseconds)ms" "PERF"
    return $result
}

function Test-DocumentScenario {
    param($Document, $TempDir)
    
    Write-Log "`n🧪 Testing $($Document.Description)..."
    
    $testResult = @{
        Document = $Document.Name
        DocType = $Document.DocType
        Success = $false
        Stages = @{}
    }
    
    try {
        # Stage 1: Create test document
        $filePath = Measure-TestExecution {
            New-TestDocument $Document $TempDir
        } "Document creation"
        $testResult.Stages.Creation = $true
        
        # Stage 2: Compute document hash
        $hashResult = Measure-TestExecution {
            Invoke-DocumentHash $filePath $Document.DocType $true
        } "Hash computation"
        
        if (-not $hashResult.Success) {
            $testResult.Stages.Hashing = $false
            $testResult.Error = $hashResult.Error
            return $testResult
        }
        $testResult.Stages.Hashing = $true
        
        # Stage 3: Run circuit proof and verification
        $circuitResult = Measure-TestExecution {
            Invoke-Circuit
        } "Circuit execution"
        
        if (-not $circuitResult.Success) {
            $testResult.Stages.Circuit = $false
            $testResult.Error = $circuitResult.Error
            return $testResult
        }
        $testResult.Stages.Circuit = $true
        
        $testResult.Success = $true
        Write-Log "✅ $($Document.Description) test passed"
        
    } catch {
        Write-Log "❌ $($Document.Description) test failed: $($_.Exception.Message)" "ERROR"
        $testResult.Error = $_.Exception.Message
    }
    
    return $testResult
}

function Test-ErrorCases {
    Write-Log "`n🚨 Testing Error Cases..."
    
    $errorTests = @(
        @{
            Name = "Invalid Document Type"
            ProverContent = @"
doc_commitment = "0x1234567890123456789012345678901234567890123456789012345678901234"
doc_type_code = "150"
enable_type_check = "1"
doc_hash_raw = "0x1234567890123456789012345678901234567890123456789012345678901234"
salt = "0x9876543210987654321098765432109876543210987654321098765432109876"
expected_doc_type = "1"
"@
            ExpectFailure = $true
        },
        @{
            Name = "Zero Salt"
            ProverContent = @"
doc_commitment = "0x1234567890123456789012345678901234567890123456789012345678901234"
doc_type_code = "1"
enable_type_check = "1"
doc_hash_raw = "0x1234567890123456789012345678901234567890123456789012345678901234"
salt = "0x0000000000000000000000000000000000000000000000000000000000000000"
expected_doc_type = "1"
"@
            ExpectFailure = $true
        },
        @{
            Name = "Type Mismatch"
            ProverContent = @"
doc_commitment = "0x1234567890123456789012345678901234567890123456789012345678901234"
doc_type_code = "1"
enable_type_check = "1"
doc_hash_raw = "0x1234567890123456789012345678901234567890123456789012345678901234"
salt = "0x9876543210987654321098765432109876543210987654321098765432109876"
expected_doc_type = "2"
"@
            ExpectFailure = $true
        }
    )
    
    $errorResults = @()
    
    foreach ($test in $errorTests) {
        Write-Log "Testing: $($test.Name)"
        
        try {
            # Write invalid Prover.toml
            $proverPath = Join-Path $Config.CircuitDir "Prover.toml"
            $test.ProverContent | Out-File -FilePath $proverPath -Encoding UTF8
            
            # Try to prove (should fail)
            $result = Invoke-Circuit
            
            if ($test.ExpectFailure -and $result.Success) {
                Write-Log "❌ $($test.Name): Expected failure but test passed" "ERROR"
                $errorResults += @{ Test = $test.Name; Success = $false; Reason = "Unexpected success" }
            } elseif ($test.ExpectFailure -and -not $result.Success) {
                Write-Log "✅ $($test.Name): Correctly failed as expected"
                $errorResults += @{ Test = $test.Name; Success = $true }
            } else {
                Write-Log "❌ $($test.Name): Unexpected result" "ERROR"
                $errorResults += @{ Test = $test.Name; Success = $false; Reason = "Unexpected result" }
            }
            
        } catch {
            if ($test.ExpectFailure) {
                Write-Log "✅ $($test.Name): Correctly failed with error"
                $errorResults += @{ Test = $test.Name; Success = $true }
            } else {
                Write-Log "❌ $($test.Name): Unexpected error: $($_.Exception.Message)" "ERROR"
                $errorResults += @{ Test = $test.Name; Success = $false; Reason = $_.Exception.Message }
            }
        }
    }
    
    return $errorResults
}

function Start-IntegrationTests {
    Write-Log "🚀 Starting Document Hash Proof Integration Tests`n"
    
    # Setup
    $tempDir = Join-Path $env:TEMP "test_docs_$(Get-Random)"
    if (-not (Test-Path $tempDir)) {
        New-Item -Path $tempDir -ItemType Directory -Force | Out-Null
    }
    
    # Backup original Prover.toml if it exists
    $originalProver = Join-Path $Config.CircuitDir "Prover.toml"
    $backupProver = Join-Path $Config.CircuitDir "Prover.toml.backup"
    if (Test-Path $originalProver) {
        Copy-Item $originalProver $backupProver -Force
    }
    
    $testResults = @{
        StartTime = Get-Date
        DocumentTests = @()
        ErrorTests = @()
        Summary = @{}
    }
    
    try {
        # Test specific document if provided
        $documentsToTest = if ($TestDoc) {
            $TestDocuments | Where-Object { $_.Name -like "*$TestDoc*" -or $_.Description -like "*$TestDoc*" }
        } else {
            $TestDocuments
        }
        
        # Test each document type
        foreach ($doc in $documentsToTest) {
            $result = Test-DocumentScenario $doc $tempDir
            $testResults.DocumentTests += $result
        }
        
        # Test error cases (unless testing specific document)
        if (-not $TestDoc) {
            $errorResults = Test-ErrorCases
            $testResults.ErrorTests = $errorResults
        }
        
        # Generate summary
        $successful = ($testResults.DocumentTests | Where-Object { $_.Success }).Count
        $total = $testResults.DocumentTests.Count
        $errorSuccessful = ($testResults.ErrorTests | Where-Object { $_.Success }).Count
        $errorTotal = $testResults.ErrorTests.Count
        
        $testResults.Summary = @{
            DocumentTests = @{
                Successful = $successful
                Total = $total
                Rate = if ($total -gt 0) { [math]::Round($successful / $total * 100, 1) } else { 0 }
            }
            ErrorTests = @{
                Successful = $errorSuccessful
                Total = $errorTotal
                Rate = if ($errorTotal -gt 0) { [math]::Round($errorSuccessful / $errorTotal * 100, 1) } else { 0 }
            }
        }
        
        $testResults.Summary.OverallSuccess = ($successful -eq $total) -and ($errorSuccessful -eq $errorTotal)
        
    } finally {
        # Cleanup
        if ($Config.Cleanup) {
            if (Test-Path $tempDir) {
                Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue
            }
            
            # Restore original Prover.toml
            if (Test-Path $backupProver) {
                Copy-Item $backupProver $originalProver -Force
                Remove-Item $backupProver -Force
            }
        }
        
        $testResults.EndTime = Get-Date
        $testResults.Duration = ($testResults.EndTime - $testResults.StartTime).TotalMilliseconds
    }
    
    # Print results
    Write-Log "`n📊 Test Results Summary"
    Write-Log "═══════════════════════════════════════"
    Write-Log "Document Tests: $($testResults.Summary.DocumentTests.Successful)/$($testResults.Summary.DocumentTests.Total) ($($testResults.Summary.DocumentTests.Rate)%)"
    
    if ($testResults.Summary.ErrorTests.Total -gt 0) {
        Write-Log "Error Tests: $($testResults.Summary.ErrorTests.Successful)/$($testResults.Summary.ErrorTests.Total) ($($testResults.Summary.ErrorTests.Rate)%)"
    }
    
    Write-Log "Total Duration: $([math]::Round($testResults.Duration, 2))ms"
    Write-Log "Overall Success: $(if ($testResults.Summary.OverallSuccess) { '✅ PASS' } else { '❌ FAIL' })"
    
    # Detailed results
    if (-not $testResults.Summary.OverallSuccess) {
        Write-Log "`n❌ Failed Tests:"
        $testResults.DocumentTests | Where-Object { -not $_.Success } | ForEach-Object {
            Write-Log "  - $($_.Document): $($_.Error -or 'Unknown error')"
        }
        $testResults.ErrorTests | Where-Object { -not $_.Success } | ForEach-Object {
            Write-Log "  - $($_.Test): $($_.Reason -or 'Unknown error')"
        }
    }
    
    Write-Log "`n🏁 Integration tests completed"
    return $testResults
}

# Run tests
$results = Start-IntegrationTests

# Exit with appropriate code
if ($results.Summary.OverallSuccess) {
    exit 0
} else {
    exit 1
}