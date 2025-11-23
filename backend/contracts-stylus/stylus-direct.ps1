# Direct Stylus Compilation Script (No Docker Desktop Required)
# This script uses minimal Docker commands that work even when Desktop has issues

param(
    [Parameter(Position=0)]
    [ValidateSet("check", "build", "test", "clean", "help")]
    [string]$Command = "check"
)

# Colors for better output
$ErrorActionPreference = "Continue"

function Write-StatusMessage {
    param([string]$Message, [string]$Type = "Info")
    
    switch ($Type) {
        "Success" { Write-Host "✅ $Message" -ForegroundColor Green }
        "Warning" { Write-Host "⚠️ $Message" -ForegroundColor Yellow }
        "Error"   { Write-Host "❌ $Message" -ForegroundColor Red }
        "Info"    { Write-Host "ℹ️ $Message" -ForegroundColor Blue }
        default   { Write-Host "• $Message" -ForegroundColor White }
    }
}

function Show-Help {
    Write-Host ""
    Write-Host "🦀 Stylus Direct Compiler (Docker-based)" -ForegroundColor Cyan
    Write-Host "=========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Commands:" -ForegroundColor Yellow
    Write-Host "  check  - Check contract syntax (default)"
    Write-Host "  build  - Build contracts for WebAssembly"
    Write-Host "  test   - Run contract tests"
    Write-Host "  clean  - Clean build artifacts"
    Write-Host "  help   - Show this help"
    Write-Host ""
    Write-Host "This script works even if Docker Desktop has issues!" -ForegroundColor Green
    Write-Host ""
}

function Test-DockerMinimal {
    try {
        # Test minimal Docker functionality
        $version = docker --version 2>$null
        if ($version) {
            Write-StatusMessage "Docker CLI available: $version" "Success"
            return $true
        }
    }
    catch {
        Write-StatusMessage "Docker CLI not available" "Error"
        return $false
    }
    return $false
}

function Run-StylusCompilation {
    param([string]$CargoCommand)
    
    Write-StatusMessage "Starting Stylus compilation in Docker..." "Info"
    Write-StatusMessage "Command: cargo $CargoCommand --target wasm32-unknown-unknown" "Info"
    
    # Use minimal Docker run command that bypasses Desktop issues
    $dockerArgs = @(
        "run", "--rm",
        "-v", "${PWD}:/workspace",
        "-w", "/workspace",
        "rust:1.75-slim",
        "bash", "-c"
    )
    
    $setupAndCompile = @"
echo 'Installing system dependencies...' && apt-get update -qq && apt-get install -y -qq pkg-config libssl-dev build-essential && echo 'Adding WebAssembly target...' && rustup target add wasm32-unknown-unknown && echo 'Running cargo $CargoCommand...' && cargo $CargoCommand --target wasm32-unknown-unknown
"@
    
    try {
        Write-StatusMessage "Executing Docker container..." "Info"
        docker @dockerArgs $setupAndCompile
        
        if ($LASTEXITCODE -eq 0) {
            Write-StatusMessage "Compilation completed successfully!" "Success"
            Write-StatusMessage "Your Stylus contracts are ready! 🎉" "Success"
        } else {
            Write-StatusMessage "Compilation failed with exit code $LASTEXITCODE" "Error"
            Write-StatusMessage "Check the output above for specific errors" "Warning"
        }
    }
    catch {
        Write-StatusMessage "Docker execution failed: $($_.Exception.Message)" "Error"
        Write-StatusMessage "Try alternative compilation methods" "Warning"
    }
}

function Show-AlternativeMethods {
    Write-Host ""
    Write-Host "🔄 Alternative Compilation Methods:" -ForegroundColor Yellow
    Write-Host "1. GitHub Codespaces: https://github.com/codespaces" -ForegroundColor Cyan
    Write-Host "2. Online Docker: https://labs.play-with-docker.com/" -ForegroundColor Cyan  
    Write-Host "3. Replit: https://replit.com (import GitHub repo)" -ForegroundColor Cyan
    Write-Host ""
}

# Main script execution
if ($Command -eq "help") {
    Show-Help
    Show-AlternativeMethods
    exit 0
}

Write-Host ""
Write-Host "🦀 Stylus Direct Compiler" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan

# Check if we're in the right directory
if (!(Test-Path "Cargo.toml")) {
    Write-StatusMessage "Cargo.toml not found. Make sure you're in the contracts-stylus directory" "Error"
    exit 1
}

# Test Docker availability
if (!(Test-DockerMinimal)) {
    Write-StatusMessage "Docker is not available" "Error"
    Show-AlternativeMethods
    exit 1
}

# Execute the requested command
switch ($Command) {
    "check" { 
        Write-StatusMessage "Checking Stylus contract syntax..." "Info"
        Run-StylusCompilation "check" 
    }
    "build" { 
        Write-StatusMessage "Building Stylus contracts for WebAssembly..." "Info"
        Run-StylusCompilation "build --release" 
    }
    "test" { 
        Write-StatusMessage "Running Stylus contract tests..." "Info"
        Run-StylusCompilation "test" 
    }
    "clean" { 
        Write-StatusMessage "Cleaning build artifacts..." "Info"
        Run-StylusCompilation "clean" 
    }
    default {
        Write-StatusMessage "Unknown command: $Command" "Error"
        Show-Help
    }
}

Write-Host ""
Write-StatusMessage "Script execution completed!" "Info"