# Enhanced PowerShell script for Docker-based Stylus development
# Usage: .\build-stylus.ps1 [command] [options]

param(
    [Parameter(Position=0)]
    [ValidateSet("check", "build", "test", "clean", "fmt", "clippy", "release", "shell", "help")]
    [string]$Command = "help",
    [switch]$Release,
    [switch]$Features,
    [switch]$Interactive,
    [switch]$Verbose
)

function Show-Help {
    Write-Host "🐳 DVote Stylus Docker Builder" -ForegroundColor Cyan
    Write-Host "===============================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Commands:" -ForegroundColor Yellow
    Write-Host "  check    - Check contract syntax (default)"
    Write-Host "  build    - Build contracts"
    Write-Host "  test     - Run tests"
    Write-Host "  clean    - Clean build artifacts"
    Write-Host "  fmt      - Format code"
    Write-Host "  clippy   - Run linter"
    Write-Host "  release  - Build optimized release"
    Write-Host "  shell    - Interactive shell"
    Write-Host "  help     - Show this help"
    Write-Host ""
    Write-Host "Switches:" -ForegroundColor Yellow
    Write-Host "  -Release     - Build in release mode"
    Write-Host "  -Features    - Enable export-abi feature"
    Write-Host "  -Interactive - Open interactive shell"
    Write-Host "  -Verbose     - Verbose output"
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor Green
    Write-Host "  .\build-stylus.ps1 check"
    Write-Host "  .\build-stylus.ps1 build -Release"
    Write-Host "  .\build-stylus.ps1 shell -Interactive"
    return
}

if ($Command -eq "help") {
    Show-Help
    exit 0
}

Write-Host "🐳 DVote Stylus Docker Builder" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

# Check if Docker is running
try {
    docker version | Out-Null
    Write-Host "✅ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not running. Please start Docker Desktop." -ForegroundColor Red
    exit 1
}

# Build Docker image if it doesn't exist
$imageName = "dvote-stylus"
$imageExists = docker images -q $imageName

if (-not $imageExists) {
    Write-Host "📦 Building Docker image..." -ForegroundColor Yellow
    docker build -t $imageName .
    if ($LASTEXITCODE -ne 0) {
        Write-Error "❌ Failed to build Docker image"
        exit 1
    }
}

# Prepare command arguments
$cargoArgs = @("cargo", $Command, "--target", "wasm32-unknown-unknown")

if ($Release) {
    $cargoArgs += "--release"
}

if ($Features) {
    $cargoArgs += "--features", "export-abi"
}

# Execute command
if ($Interactive) {
    Write-Host "🚀 Starting interactive shell..." -ForegroundColor Green
    docker run -it --rm -v "${PWD}:/workspace" $imageName bash
} else {
    Write-Host "🔧 Running: $($cargoArgs -join ' ')" -ForegroundColor Green
    docker run --rm -v "${PWD}:/workspace" $imageName @cargoArgs
}

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Command completed successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Command failed with exit code $LASTEXITCODE" -ForegroundColor Red
}