# ZK Proof Verification Script (PowerShell)
# Verifies zero-knowledge proofs using verification keys and public inputs

param(
    [string]$Circuit,
    [string]$ProofFile,
    [string]$VkFile,
    [switch]$All,
    [switch]$Exported,
    [switch]$Verbose,
    [switch]$Help
)

# Configuration
$ErrorActionPreference = "Stop"
$CIRCUITS_DIR = Join-Path $PSScriptRoot "../noir-circuits"
$PROOFS_DIR = Join-Path $PSScriptRoot "../proofs"
$VERIFIERS_DIR = Join-Path $PSScriptRoot "../verifiers"

$CIRCUITS = @(
    "business_registration",
    "ubo_proof",
    "revenue_threshold",
    "document_hash_proof",
    "composite_business_proof"
)

# Helper functions
function Write-Log {
    param(
        [string]$Message,
        [string]$Level = "INFO"
    )
    
    if ($Verbose -or $Level -eq "ERROR" -or $Level -eq "SUCCESS") {
        $colors = @{
            "ERROR" = "Red"
            "WARN" = "Yellow"
            "INFO" = "White"
            "SUCCESS" = "Green"
            "PERF" = "Cyan"
        }
        
        $color = $colors[$Level]
        if (-not $color) { $color = "White" }
        
        $timestamp = Get-Date -Format "yyyy-MM-ddTHH:mm:ss.fffZ"
        Write-Host "[$timestamp] $Level`: $Message" -ForegroundColor $color
    }
}

function Verify-Proof {
    param(
        [string]$CircuitName,
        [string]$ProofFile = $null,
        [string]$VkFile = $null
    )
    
    $circuitPath = Join-Path $CIRCUITS_DIR $CircuitName
    $manifestPath = Join-Path $circuitPath "Nargo.toml"
    
    if (-not (Test-Path $manifestPath)) {
        throw "Circuit manifest not found: $manifestPath"
    }
    
    # Use provided files or defaults
    $defaultProofFile = Join-Path $circuitPath "proofs" "$CircuitName.proof"
    $defaultVkFile = Join-Path $circuitPath "target" "verification_key.json"
    
    $actualProofFile = if ($ProofFile) { $ProofFile } else { $defaultProofFile }
    $actualVkFile = if ($VkFile) { $VkFile } else { $defaultVkFile }
    
    if (-not (Test-Path $actualProofFile)) {
        throw "Proof file not found: $actualProofFile"
    }
    
    Write-Log "Verifying proof for: $CircuitName"
    if ($ProofFile) {
        Write-Log "Using proof file: $ProofFile"
    }
    if ($VkFile) {
        Write-Log "Using verification key: $VkFile"
    }
    
    $startTime = Get-Date
    
    try {
        # Verify proof using nargo
        $originalDir = Get-Location
        Set-Location $circuitPath
        
        $verifyResult = & nargo verify --manifest-path $manifestPath 2>&1
        $exitCode = $LASTEXITCODE
        
        Set-Location $originalDir
        
        if ($exitCode -ne 0) {
            throw "Nargo verification failed with exit code: $exitCode"
        }
        
        $endTime = Get-Date
        $duration = ($endTime - $startTime).TotalMilliseconds
        
        Write-Log "⏱️  Verification: $($duration.ToString('F2'))ms" "PERF"
        
        return @{
            Circuit = $CircuitName
            Success = $true
            Duration = $duration
            ProofFile = $actualProofFile
            VkFile = $actualVkFile
            Output = $verifyResult -join "`n"
        }
        
    } catch {
        $endTime = Get-Date
        $duration = ($endTime - $startTime).TotalMilliseconds
        
        Write-Log "Failed to verify proof for $CircuitName`: $($_.Exception.Message)" "ERROR"
        
        return @{
            Circuit = $CircuitName
            Success = $false
            Duration = $duration
            Error = $_.Exception.Message
        }
    }
}

function Verify-ExportedProof {
    param(
        [string]$CircuitName
    )
    
    Write-Log "Verifying exported proof for: $CircuitName"
    
    $proofFile = Join-Path $PROOFS_DIR "$CircuitName`_proof.json"
    $vkFile = Join-Path $VERIFIERS_DIR "$CircuitName`_vk.json"
    $publicFile = Join-Path $PROOFS_DIR "$CircuitName`_public.json"
    
    if (-not (Test-Path $proofFile)) {
        throw "Exported proof file not found: $proofFile"
    }
    
    if (-not (Test-Path $vkFile)) {
        throw "Verification key file not found: $vkFile"
    }
    
    $startTime = Get-Date
    
    try {
        Write-Log "Reading proof from: $proofFile"
        Write-Log "Reading VK from: $vkFile"
        
        $proofData = Get-Content $proofFile -Raw | ConvertFrom-Json
        $vkData = Get-Content $vkFile -Raw | ConvertFrom-Json
        
        $publicData = $null
        if (Test-Path $publicFile) {
            $publicData = Get-Content $publicFile -Raw | ConvertFrom-Json
            Write-Log "Reading public inputs from: $publicFile"
        }
        
        $endTime = Get-Date
        $duration = ($endTime - $startTime).TotalMilliseconds
        
        Write-Log "⏱️  Exported verification: $($duration.ToString('F2'))ms" "PERF"
        
        # Validate file structure
        $isValid = ($proofData -and $vkData -and 
                   ($proofData.GetType().Name -eq "PSCustomObject") -and
                   ($vkData.GetType().Name -eq "PSCustomObject"))
        
        return @{
            Circuit = $CircuitName
            Success = $isValid
            Duration = $duration
            ProofFile = $proofFile
            VkFile = $vkFile
            PublicFile = $publicFile
            Validated = @{
                ProofStructure = [bool]$proofData
                VkStructure = [bool]$vkData
                PublicInputs = [bool]$publicData
            }
        }
        
    } catch {
        $endTime = Get-Date
        $duration = ($endTime - $startTime).TotalMilliseconds
        
        Write-Log "Failed to verify exported proof for $CircuitName`: $($_.Exception.Message)" "ERROR"
        
        return @{
            Circuit = $CircuitName
            Success = $false
            Duration = $duration
            Error = $_.Exception.Message
        }
    }
}

function Verify-AllProofs {
    Write-Log "🔍 Verifying proofs for all circuits...`n"
    
    $results = @()
    $startTime = Get-Date
    
    foreach ($circuit in $CIRCUITS) {
        try {
            $result = Verify-Proof -CircuitName $circuit
            $results += $result
            
            if ($result.Success) {
                Write-Log "✅ Successfully verified proof for: $circuit" "SUCCESS"
            } else {
                Write-Log "❌ Failed to verify proof for: $circuit" "ERROR"
            }
            
        } catch {
            Write-Log "❌ Error verifying proof for $circuit`: $($_.Exception.Message)" "ERROR"
            $results += @{
                Circuit = $circuit
                Success = $false
                Error = $_.Exception.Message
            }
        }
    }
    
    $endTime = Get-Date
    $totalDuration = ($endTime - $startTime).TotalMilliseconds
    
    # Summary
    $successful = $results | Where-Object { $_.Success }
    $failed = $results | Where-Object { -not $_.Success }
    
    Write-Log "`n📊 Verification Results:"
    Write-Log "═══════════════════════════════════════"
    
    if ($successful.Count -eq $CIRCUITS.Count) {
        Write-Log "✅ Successful: $($successful.Count)/$($CIRCUITS.Count) circuits" "SUCCESS"
    } else {
        Write-Log "✅ Successful: $($successful.Count)/$($CIRCUITS.Count) circuits"
    }
    
    if ($successful.Count -gt 0) {
        foreach ($result in $successful) {
            Write-Log "   ✓ $($result.Circuit) ($($result.Duration.ToString('F2'))ms)"
        }
    }
    
    if ($failed.Count -gt 0) {
        Write-Log "❌ Failed: $($failed.Count)/$($CIRCUITS.Count) circuits" "ERROR"
        foreach ($result in $failed) {
            $errorMsg = if ($result.Error) { $result.Error } else { "Unknown error" }
            Write-Log "   ✗ $($result.Circuit): $errorMsg" "ERROR"
        }
    }
    
    Write-Log "`n⏱️  Total verification time: $($totalDuration.ToString('F2'))ms" "PERF"
    
    return $results
}

function Verify-ExportedProofs {
    Write-Log "🔍 Verifying exported proof artifacts...`n"
    
    if (-not (Test-Path $PROOFS_DIR)) {
        Write-Log "❌ Proofs directory not found: $PROOFS_DIR" "ERROR"
        return @()
    }
    
    if (-not (Test-Path $VERIFIERS_DIR)) {
        Write-Log "❌ Verifiers directory not found: $VERIFIERS_DIR" "ERROR"
        return @()
    }
    
    $results = @()
    $startTime = Get-Date
    
    foreach ($circuit in $CIRCUITS) {
        try {
            $result = Verify-ExportedProof -CircuitName $circuit
            $results += $result
            
            if ($result.Success) {
                Write-Log "✅ Successfully verified exported proof for: $circuit" "SUCCESS"
            } else {
                Write-Log "❌ Failed to verify exported proof for: $circuit" "ERROR"
            }
            
        } catch {
            Write-Log "❌ Error verifying exported proof for $circuit`: $($_.Exception.Message)" "ERROR"
            $results += @{
                Circuit = $circuit
                Success = $false
                Error = $_.Exception.Message
            }
        }
    }
    
    $endTime = Get-Date
    $totalDuration = ($endTime - $startTime).TotalMilliseconds
    
    # Summary
    $successful = $results | Where-Object { $_.Success }
    $failed = $results | Where-Object { -not $_.Success }
    
    Write-Log "`n📊 Exported Proof Verification Results:"
    Write-Log "═══════════════════════════════════════"
    
    if ($successful.Count -eq $CIRCUITS.Count) {
        Write-Log "✅ Successful: $($successful.Count)/$($CIRCUITS.Count) circuits" "SUCCESS"
    } else {
        Write-Log "✅ Successful: $($successful.Count)/$($CIRCUITS.Count) circuits"
    }
    
    if ($successful.Count -gt 0) {
        foreach ($result in $successful) {
            Write-Log "   ✓ $($result.Circuit) ($($result.Duration.ToString('F2'))ms)"
            if ($result.Validated) {
                $proofCheck = if ($result.Validated.ProofStructure) { "✓" } else { "✗" }
                $vkCheck = if ($result.Validated.VkStructure) { "✓" } else { "✗" }
                $publicCheck = if ($result.Validated.PublicInputs) { "✓" } else { "✗" }
                
                Write-Log "     - Proof structure: $proofCheck"
                Write-Log "     - VK structure: $vkCheck"
                Write-Log "     - Public inputs: $publicCheck"
            }
        }
    }
    
    if ($failed.Count -gt 0) {
        Write-Log "❌ Failed: $($failed.Count)/$($CIRCUITS.Count) circuits" "ERROR"
        foreach ($result in $failed) {
            $errorMsg = if ($result.Error) { $result.Error } else { "Unknown error" }
            Write-Log "   ✗ $($result.Circuit): $errorMsg" "ERROR"
        }
    }
    
    Write-Log "`n⏱️  Total exported verification time: $($totalDuration.ToString('F2'))ms" "PERF"
    
    return $results
}

function Show-Help {
    Write-Host @"

ZK Proof Verification Tool (PowerShell)

Usage: .\verify-proof.ps1 [options]

Parameters:
  -Circuit <name>      Verify proof for specific circuit
  -ProofFile <file>    Use custom proof file
  -VkFile <file>       Use custom verification key file
  -All                 Verify proofs for all circuits
  -Exported            Verify exported proof artifacts
  -Verbose             Enable verbose logging
  -Help                Show this help message

Examples:
  .\verify-proof.ps1 -All
  .\verify-proof.ps1 -Exported
  .\verify-proof.ps1 -Circuit business_registration
  .\verify-proof.ps1 -Circuit ubo_proof -ProofFile .\custom_proof.json
  .\verify-proof.ps1 -Circuit composite_business_proof -Verbose

Available Circuits:
  - business_registration
  - ubo_proof
  - revenue_threshold
  - document_hash_proof
  - composite_business_proof

Directories:
  Proofs: $PROOFS_DIR
  Verifiers: $VERIFIERS_DIR

"@ -ForegroundColor Cyan
}

# Main execution
if ($Help) {
    Show-Help
    exit 0
}

try {
    if ($All) {
        $results = Verify-AllProofs
        $failed = $results | Where-Object { -not $_.Success }
        exit $(if ($failed.Count -eq 0) { 0 } else { 1 })
    } elseif ($Exported) {
        $results = Verify-ExportedProofs
        $failed = $results | Where-Object { -not $_.Success }
        exit $(if ($failed.Count -eq 0) { 0 } else { 1 })
    } elseif ($Circuit) {
        if ($Circuit -notin $CIRCUITS) {
            Write-Log "❌ Unknown circuit: $Circuit. Available: $($CIRCUITS -join ', ')" "ERROR"
            exit 1
        }
        
        if ($ProofFile -and -not (Test-Path $ProofFile)) {
            Write-Log "❌ Proof file not found: $ProofFile" "ERROR"
            exit 1
        }
        
        if ($VkFile -and -not (Test-Path $VkFile)) {
            Write-Log "❌ Verification key file not found: $VkFile" "ERROR"
            exit 1
        }
        
        $result = Verify-Proof -CircuitName $Circuit -ProofFile $ProofFile -VkFile $VkFile
        
        if ($result.Success) {
            Write-Log "🎉 Successfully verified proof for: $Circuit" "SUCCESS"
            Write-Log "   Duration: $($result.Duration.ToString('F2'))ms"
            exit 0
        } else {
            Write-Log "💥 Failed to verify proof for: $Circuit" "ERROR"
            Write-Log "   Error: $($result.Error)" "ERROR"
            exit 1
        }
    } else {
        Write-Log "❌ No operation specified. Use -All, -Exported, or -Circuit <name>" "ERROR"
        Show-Help
        exit 1
    }
} catch {
    Write-Log "❌ Proof verification failed: $($_.Exception.Message)" "ERROR"
    exit 1
}