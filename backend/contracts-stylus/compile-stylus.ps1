# Simple Stylus Compilation Script
param([string]$Command = "check")

Write-Host "🦀 Stylus Docker Compiler" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan

# Check if Docker is available
try {
    $dockerVersion = docker --version 2>$null
    if ($dockerVersion) {
        Write-Host "✅ Docker found: $dockerVersion" -ForegroundColor Green
    } else {
        throw "Docker not found"
    }
}
catch {
    Write-Host "❌ Docker is not available" -ForegroundColor Red
    Write-Host "Please install Docker Desktop or use GitHub Codespaces" -ForegroundColor Yellow
    exit 1
}

# Check if we're in the right directory
if (!(Test-Path "Cargo.toml")) {
    Write-Host "❌ Cargo.toml not found" -ForegroundColor Red
    Write-Host "Make sure you're in the contracts-stylus directory" -ForegroundColor Yellow
    exit 1
}

Write-Host "🔧 Starting compilation in Docker..." -ForegroundColor Blue

# Build the Docker command
$dockerCmd = @(
    "run", "--rm", 
    "-v", "${PWD}:/workspace",
    "-w", "/workspace",
    "rust:1.75-slim",
    "bash", "-c",
    "apt-get update -qq; apt-get install -y -qq pkg-config libssl-dev build-essential; rustup target add wasm32-unknown-unknown; cargo $Command --target wasm32-unknown-unknown"
)

# Execute the command
try {
    & docker @dockerCmd
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Compilation successful!" -ForegroundColor Green
        Write-Host "🎉 Your Stylus contracts are ready!" -ForegroundColor Green
    } else {
        Write-Host "❌ Compilation failed" -ForegroundColor Red
    }
}
catch {
    Write-Host "❌ Docker execution failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Alternative methods if Docker issues persist:" -ForegroundColor Yellow
Write-Host "• GitHub Codespaces: https://github.com/codespaces" -ForegroundColor Cyan
Write-Host "• Online Docker: https://labs.play-with-docker.com/" -ForegroundColor Cyan