# Stylus Docker Compiler - Fixed Version
param([string]$Command = "check")

Write-Host "Stylus Docker Compiler" -ForegroundColor Cyan
Write-Host "======================" -ForegroundColor Cyan

# Check Docker
try {
    $version = docker --version 2>$null
    Write-Host "Docker found: $version" -ForegroundColor Green
}
catch {
    Write-Host "Docker not available" -ForegroundColor Red
    exit 1
}

# Check Cargo.toml
if (!(Test-Path "Cargo.toml")) {
    Write-Host "Cargo.toml not found - run from contracts-stylus directory" -ForegroundColor Red
    exit 1
}

Write-Host "Starting Docker compilation..." -ForegroundColor Blue

# Create the bash command as a single line
$bashCmd = "apt-get update -qq; apt-get install -y -qq pkg-config libssl-dev build-essential; rustup target add wasm32-unknown-unknown; cargo $Command --target wasm32-unknown-unknown"

# Run Docker
try {
    docker run --rm -v "${PWD}:/workspace" -w /workspace rust:1.75-slim bash -c $bashCmd
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Compilation successful!" -ForegroundColor Green
    } else {
        Write-Host "Compilation failed" -ForegroundColor Red
    }
}
catch {
    Write-Host "Docker execution failed" -ForegroundColor Red
    Write-Host "Try: GitHub Codespaces or Play with Docker" -ForegroundColor Yellow
}