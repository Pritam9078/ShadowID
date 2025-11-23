# Quick Nitro Devnode Test Script
# Run this first to verify your setup

Write-Host "🧪 ShadowID Nitro Devnode Quick Test" -ForegroundColor Magenta

# Environment
$env:NITRO_L2_RPC = "http://localhost:8547"
$env:NITRO_PRIVATE_KEY = "0xb6b15c8cb491557369f3c7d2c287b053eb229daa9c22138887752191c9520659"

# Test 1: Check if tools are installed
Write-Host "1️⃣ Checking tools..." -ForegroundColor Cyan

$tools = @(
    @{Name="Docker"; Command="docker --version"},
    @{Name="Rust"; Command="rustc --version"},
    @{Name="Cargo Stylus"; Command="cargo stylus --version"},
    @{Name="WASM Target"; Command="rustup target list --installed | Select-String wasm32"}
)

foreach ($tool in $tools) {
    try {
        $result = Invoke-Expression $tool.Command
        if ($result) {
            Write-Host "  [OK] $($tool.Name): OK" -ForegroundColor Green
        } else {
            Write-Host "  [ERROR] $($tool.Name): Not found" -ForegroundColor Red
        }
    } catch {
        Write-Host "  [ERROR] $($tool.Name): Error" -ForegroundColor Red
    }
}

# Test 2: Check Docker status
Write-Host "`n2️⃣ Checking Docker..." -ForegroundColor Cyan
try {
    docker info >$null 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [OK] Docker is running" -ForegroundColor Green
    } else {
        Write-Host "  [ERROR] Docker is not running" -ForegroundColor Red
        Write-Host "  Please start Docker Desktop and try again" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  [ERROR] Docker not available" -ForegroundColor Red
}

# Test 3: Check if Nitro devnode is running
Write-Host "`n3️⃣ Checking Nitro devnode..." -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri $env:NITRO_L2_RPC -Method POST -Body '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' -ContentType "application/json" -TimeoutSec 3
    if ($response.result) {
        Write-Host "  [OK] Nitro devnode is running (Chain ID: $($response.result))" -ForegroundColor Green
    } else {
        Write-Host "  [ERROR] Nitro devnode not responding" -ForegroundColor Red
    }
} catch {
    Write-Host "  [ERROR] Nitro devnode not reachable" -ForegroundColor Red
    Write-Host "  Run the deployment script to start it" -ForegroundColor Yellow
}

# Test 4: Check contract directory
Write-Host "`n4️⃣ Checking contract setup..." -ForegroundColor Cyan
if (Test-Path "Cargo.toml") {
    Write-Host "  ✅ Cargo.toml found" -ForegroundColor Green
} else {
    Write-Host "  ❌ Cargo.toml not found" -ForegroundColor Red
}

if (Test-Path "src\lib.rs") {
    Write-Host "  ✅ Source code found" -ForegroundColor Green
} else {
    Write-Host "  ❌ Source code not found" -ForegroundColor Red
}

# Test 5: Quick compilation test
Write-Host "`n5️⃣ Testing compilation..." -ForegroundColor Cyan
if (Test-Path "Cargo.toml") {
    try {
        cargo check >$null 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✅ Contract compiles successfully" -ForegroundColor Green
        } else {
            Write-Host "  ❌ Compilation errors detected" -ForegroundColor Red
        }
    } catch {
        Write-Host "  ❌ Compilation test failed" -ForegroundColor Red
    }
} else {
    Write-Host "  ⏭️  Skipped (no Cargo.toml)" -ForegroundColor Yellow
}

Write-Host "`nTest Results Summary:" -ForegroundColor Magenta
Write-Host "If all tests show OK, you're ready to deploy!" -ForegroundColor Green
Write-Host "If you see errors, please fix those issues first." -ForegroundColor Yellow
Write-Host "`nTo deploy, run: .\deploy-nitro-complete.ps1" -ForegroundColor Cyan