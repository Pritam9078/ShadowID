# Compile All ZK Circuits - PowerShell
# Cross-platform circuit compilation with error handling

param(
    [switch]$Verbose = $false,
    [switch]$Parallel = $false,
    [switch]$Clean = $false,
    [switch]$Help = $false
)

# Configuration
$CIRCUITS_DIR = Join-Path $PSScriptRoot "..\noir-circuits"
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
        
        $timestamp = Get-Date -Format "yyyy-MM-ddTHH:mm:ss.fffZ"
        Write-Host "[$timestamp] $Level`: $Message" -ForegroundColor $colors[$Level]
    }
}

function Test-NargoInstalled {
    try {
        $null = & nargo --version 2>$null
        return $true
    }
    catch {
        return $false
    }
}

function Invoke-CompileCircuit {
    param([string]$CircuitName)
    
    $circuitPath = Join-Path $CIRCUITS_DIR $CircuitName
    $manifestPath = Join-Path $circuitPath "Nargo.toml"
    
    if (-not (Test-Path $manifestPath)) {
        throw "Circuit manifest not found: $manifestPath"
    }
    
    Write-Log "Compiling circuit: $CircuitName"
    
    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    
    try {
        # Clean if requested
        if ($Clean) {
            $targetDir = Join-Path $circuitPath "target"
            if (Test-Path $targetDir) {
                Remove-Item $targetDir -Recurse -Force
                Write-Log "Cleaned target directory for $CircuitName"
            }
        }
        
        # Compile circuit
        Push-Location $circuitPath
        try {
            $result = & nargo compile --manifest-path "$manifestPath" 2>&1
            if ($LASTEXITCODE -ne 0) {
                throw "Compilation failed with exit code $LASTEXITCODE`: $result"
            }
        }
        finally {
            Pop-Location
        }
        
        $stopwatch.Stop()
        
        Write-Log "⏱️ $CircuitName`: $($stopwatch.ElapsedMilliseconds)ms" "PERF"
        
        return @{
            Circuit = $CircuitName
            Success = $true
            Duration = $stopwatch.ElapsedMilliseconds
            Output = $result -join "`n"
        }
        
    }
    catch {
        $stopwatch.Stop()
        
        Write-Log "Failed to compile $CircuitName`: $($_.Exception.Message)" "ERROR"
        
        return @{
            Circuit = $CircuitName
            Success = $false
            Duration = $stopwatch.ElapsedMilliseconds
            Error = $_.Exception.Message
        }
    }
}

function Invoke-CompileCircuitParallel {
    param([string[]]$CircuitNames)
    
    Write-Log "Starting parallel compilation..."
    
    $jobs = @()
    
    foreach ($circuit in $CircuitNames) {
        $scriptBlock = {
            param($CircuitName, $CircuitsDir, $Clean, $Verbose)
            
            $circuitPath = Join-Path $CircuitsDir $CircuitName
            $manifestPath = Join-Path $circuitPath "Nargo.toml"
            
            if (-not (Test-Path $manifestPath)) {
                return @{
                    Circuit = $CircuitName
                    Success = $false
                    Error = "Circuit manifest not found: $manifestPath"
                }
            }
            
            $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
            
            try {
                # Clean if requested
                if ($Clean) {
                    $targetDir = Join-Path $circuitPath "target"
                    if (Test-Path $targetDir) {
                        Remove-Item $targetDir -Recurse -Force
                    }
                }
                
                # Compile circuit
                Push-Location $circuitPath
                try {
                    $result = & nargo compile --manifest-path "$manifestPath" 2>&1
                    if ($LASTEXITCODE -ne 0) {
                        throw "Compilation failed: $result"
                    }
                }
                finally {
                    Pop-Location
                }
                
                $stopwatch.Stop()
                
                return @{
                    Circuit = $CircuitName
                    Success = $true
                    Duration = $stopwatch.ElapsedMilliseconds
                    Output = $result -join "`n"
                }
                
            }
            catch {
                $stopwatch.Stop()
                
                return @{
                    Circuit = $CircuitName
                    Success = $false
                    Duration = $stopwatch.ElapsedMilliseconds
                    Error = $_.Exception.Message
                }
            }
        }
        
        $job = Start-Job -ScriptBlock $scriptBlock -ArgumentList $circuit, $CIRCUITS_DIR, $Clean, $Verbose
        $jobs += $job
    }
    
    # Wait for all jobs to complete
    $results = @()
    foreach ($job in $jobs) {
        $result = Receive-Job -Job $job -Wait
        $results += $result
        Remove-Job -Job $job
    }
    
    return $results
}

function Start-CircuitCompilation {
    Write-Log "🔧 Starting ZK circuit compilation...`n"
    
    # Check prerequisites
    if (-not (Test-NargoInstalled)) {
        Write-Log "❌ Nargo not found. Please install Noir toolchain:" "ERROR"
        Write-Log "   curl -L https://install.aztec.network | bash" "ERROR"
        exit 1
    }
    
    # Verify circuits directory
    if (-not (Test-Path $CIRCUITS_DIR)) {
        Write-Log "❌ Circuits directory not found: $CIRCUITS_DIR" "ERROR"
        exit 1
    }
    
    $startTime = Get-Date
    $results = @()
    
    try {
        if ($Parallel) {
            Write-Log "Using parallel compilation mode"
            $results = Invoke-CompileCircuitParallel $CIRCUITS
        }
        else {
            Write-Log "Using sequential compilation mode"
            
            foreach ($circuit in $CIRCUITS) {
                $result = Invoke-CompileCircuit $circuit
                $results += $result
            }
        }
        
        $endTime = Get-Date
        $totalDuration = ($endTime - $startTime).TotalMilliseconds
        
        # Summary
        $successful = $results | Where-Object { $_.Success }
        $failed = $results | Where-Object { -not $_.Success }
        
        Write-Log "`n📊 Compilation Results:"
        Write-Log "═══════════════════════════════════════"
        
        if ($successful.Count -gt 0) {
            Write-Log "✅ Successfully compiled: $($successful.Count)/$($CIRCUITS.Count) circuits" "SUCCESS"
            foreach ($result in $successful) {
                Write-Log "   ✓ $($result.Circuit) ($($result.Duration)ms)"
            }
        }
        
        if ($failed.Count -gt 0) {
            Write-Log "❌ Failed compilation: $($failed.Count)/$($CIRCUITS.Count) circuits" "ERROR"
            foreach ($result in $failed) {
                Write-Log "   ✗ $($result.Circuit): $($result.Error)" "ERROR"
            }
        }
        
        Write-Log "`n⏱️ Total compilation time: $([math]::Round($totalDuration, 2))ms" "PERF"
        
        # Check workspace compilation
        Write-Log "`n🔍 Verifying workspace compilation..."
        try {
            Push-Location $CIRCUITS_DIR
            try {
                $workspaceResult = & nargo compile 2>&1
                if ($LASTEXITCODE -ne 0) {
                    throw "Workspace compilation failed: $workspaceResult"
                }
                Write-Log "✅ Workspace compilation successful" "SUCCESS"
            }
            finally {
                Pop-Location
            }
        }
        catch {
            Write-Log "❌ Workspace compilation failed: $($_.Exception.Message)" "ERROR"
            $failed += @{ Circuit = "workspace"; Error = $_.Exception.Message }
        }
        
        # Exit with appropriate code
        if ($failed.Count -eq 0) {
            Write-Log "`n🎉 All circuits compiled successfully!" "SUCCESS"
            exit 0
        }
        else {
            Write-Log "`n💥 $($failed.Count) circuit(s) failed compilation" "ERROR"
            exit 1
        }
        
    }
    catch {
        Write-Log "❌ Compilation process failed: $($_.Exception.Message)" "ERROR"
        exit 1
    }
}

function Show-Help {
    Write-Host @"

ZK Circuit Compilation Tool (PowerShell)

Usage: .\compile-all.ps1 [options]

Options:
  -Verbose          Enable verbose logging
  -Parallel         Compile circuits in parallel
  -Clean            Clean target directories before compilation
  -Help             Show this help message

Examples:
  .\compile-all.ps1                    # Compile all circuits sequentially
  .\compile-all.ps1 -Parallel -Clean  # Clean and compile in parallel
  .\compile-all.ps1 -Verbose          # Compile with detailed output

Circuits:
  - business_registration
  - ubo_proof
  - revenue_threshold
  - document_hash_proof
  - composite_business_proof

"@
}

# Main execution
if ($Help) {
    Show-Help
    exit 0
}

Start-CircuitCompilation