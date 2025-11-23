# Simple Setup Test for ShadowID Stylus Deployment
Write-Host "ShadowID Nitro Devnode Setup Test" -ForegroundColor Cyan

# Test Docker
Write-Host "Checking Docker..." -ForegroundColor Yellow
try {
    $dockerResult = docker --version
    if ($dockerResult) {
        Write-Host "  [OK] Docker found: $dockerResult" -ForegroundColor Green
        
        # Test Docker daemon
        docker info >$null 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  [OK] Docker daemon is running" -ForegroundColor Green
        } else {
            Write-Host "  [ERROR] Docker daemon not running - start Docker Desktop" -ForegroundColor Red
        }
    }
} catch {
    Write-Host "  [ERROR] Docker not found" -ForegroundColor Red
}

# Test Rust
Write-Host "Checking Rust..." -ForegroundColor Yellow
try {
    $rustResult = rustc --version
    if ($rustResult) {
        Write-Host "  [OK] Rust found: $rustResult" -ForegroundColor Green
        
        # Check WASM target
        $wasmCheck = rustup target list --installed | Select-String "wasm32-unknown-unknown"
        if ($wasmCheck) {
            Write-Host "  [OK] WASM target installed" -ForegroundColor Green
        } else {
            Write-Host "  [WARNING] WASM target not found - will install during deployment" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "  [ERROR] Rust not found - install from https://rustup.rs/" -ForegroundColor Red
}

# Test cargo-stylus
Write-Host "Checking cargo-stylus..." -ForegroundColor Yellow
try {
    $stylusResult = cargo stylus --version
    if ($stylusResult) {
        Write-Host "  [OK] cargo-stylus found: $stylusResult" -ForegroundColor Green
    }
} catch {
    Write-Host "  [WARNING] cargo-stylus not found - will install during deployment" -ForegroundColor Yellow
}

# Test project structure
Write-Host "Checking project files..." -ForegroundColor Yellow
if (Test-Path "Cargo.toml") {
    Write-Host "  [OK] Cargo.toml found" -ForegroundColor Green
} else {
    Write-Host "  [ERROR] Cargo.toml not found" -ForegroundColor Red
}

if (Test-Path "src\lib.rs") {
    Write-Host "  [OK] Source code found" -ForegroundColor Green
} else {
    Write-Host "  [ERROR] Source code not found" -ForegroundColor Red
}

# Test Nitro devnode connection
Write-Host "Checking Nitro devnode connection..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:8547" -Method POST -Body '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' -ContentType "application/json" -TimeoutSec 3
    if ($response.result) {
        Write-Host "  [OK] Nitro devnode running (Chain ID: $($response.result))" -ForegroundColor Green
    }
} catch {
    Write-Host "  [INFO] Nitro devnode not running - will start during deployment" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "Setup Test Complete!" -ForegroundColor Magenta
Write-Host "To deploy your contract, run: .\deploy-nitro-complete.ps1" -ForegroundColor Cyan