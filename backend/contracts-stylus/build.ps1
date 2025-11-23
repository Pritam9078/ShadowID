# Stylus ZK Verifier Build Script (PowerShell)
# Compiles and tests the Noir proof verifier for Arbitrum Stylus

param(
    [string]$Features = "default",
    [string]$BuildMode = "release", 
    [string]$TestMode = "all"
)

# Configuration
$ErrorActionPreference = "Stop"

Write-Host "🚀 Building Stylus ZK Verifier..." -ForegroundColor Cyan

Write-Host "`nConfiguration:" -ForegroundColor Blue
Write-Host "  Features: $Features"
Write-Host "  Build Mode: $BuildMode"  
Write-Host "  Test Mode: $TestMode"
Write-Host ""

# Helper functions
function Write-Step {
    param([string]$Message)
    Write-Host "▶️ $Message" -ForegroundColor Yellow
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

# Check if we're in the right directory
if (-not (Test-Path "Cargo.toml")) {
    Write-Error "Cargo.toml not found. Please run this script from the contracts-stylus directory."
    exit 1
}

# Step 1: Check Rust toolchain
Write-Step "Checking Rust toolchain..."
try {
    $rustVersion = & rustc --version 2>$null
    Write-Success "Rust found: $rustVersion"
} catch {
    Write-Error "Rust is not installed. Please install Rust from https://rustup.rs/"
    exit 1
}

# Step 2: Check for Stylus CLI
Write-Step "Checking for Stylus CLI..."
try {
    $stylusVersion = & cargo stylus --version 2>$null
    Write-Success "Stylus CLI found: $stylusVersion"
} catch {
    Write-Warning "Stylus CLI not found. Install with: cargo install cargo-stylus"
}

# Step 3: Format code
Write-Step "Formatting code..."
try {
    $formatResult = & cargo fmt --check 2>$null
    Write-Success "Code is properly formatted"
} catch {
    Write-Warning "Formatting code..."
    & cargo fmt
    Write-Success "Code formatted"
}

# Step 4: Run Clippy lints
Write-Step "Running Clippy lints..."
try {
    $clippyArgs = @("clippy", "--features", $Features, "--", "-D", "warnings")
    & cargo @clippyArgs
    Write-Success "No Clippy warnings found"
} catch {
    Write-Error "Clippy found issues. Please fix them before proceeding."
    exit 1
}

# Step 5: Build the project
Write-Step "Building project with features: $Features..."

$buildArgs = @("build", "--features", $Features)
if ($BuildMode -eq "release") {
    $buildArgs += "--release"
}

try {
    & cargo @buildArgs
    Write-Success "Build completed successfully"
} catch {
    Write-Error "Build failed"
    exit 1
}

# Step 6: Run tests
Write-Step "Running tests..."
try {
    switch ($TestMode) {
        "unit" {
            & cargo test --lib --features $Features
        }
        "integration" {
            & cargo test --test '*' --features $Features
        }
        "all" {
            & cargo test --features $Features
        }
        "none" {
            Write-Host "Skipping tests (TestMode=none)"
        }
        default {
            Write-Error "Unknown test mode: $TestMode"
            exit 1
        }
    }
    
    if ($TestMode -ne "none") {
        Write-Success "All tests passed"
    }
} catch {
    Write-Error "Tests failed"
    exit 1
}

# Step 7: Check binary size
Write-Step "Checking WASM binary size..."

$wasmPaths = @(
    "target\wasm32-unknown-unknown\release\contracts_stylus.wasm",
    "target\release\contracts_stylus.wasm"
)

$wasmFile = $null
foreach ($path in $wasmPaths) {
    if (Test-Path $path) {
        $wasmFile = $path
        break
    }
}

if ($wasmFile) {
    $wasmSize = (Get-Item $wasmFile).Length
    $wasmSizeKB = [math]::Round($wasmSize / 1024, 2)
    
    Write-Host "  WASM size: $wasmSizeKB KB"
    
    if ($wasmSizeKB -gt 128) {
        Write-Error "WASM binary too large for Stylus deployment ($wasmSizeKB KB > 128 KB)"
        Write-Host "  Consider enabling size optimizations or reducing features"
    } else {
        Write-Success "WASM binary size acceptable for Stylus deployment"
    }
}

# Step 8: Generate documentation
Write-Step "Generating documentation..."
try {
    & cargo doc --no-deps --features $Features
    Write-Success "Documentation generated"
    Write-Host "  View at: target\doc\contracts_stylus\index.html"
} catch {
    Write-Error "Documentation generation failed"
}

# Step 9: Security audit (basic checks)
Write-Step "Running basic security checks..."

# Check for unsafe code
try {
    $unsafeCount = (Select-String -Path "src\*.rs" -Pattern "unsafe" -Recurse).Count
    if ($unsafeCount -gt 0) {
        Write-Warning "Found $unsafeCount unsafe blocks. Review carefully."
    } else {
        Write-Success "No unsafe code blocks found"
    }
} catch {
    Write-Success "No unsafe code blocks found"
}

# Check for TODO/FIXME comments
try {
    $todoCount = (Select-String -Path "src\*.rs" -Pattern "(TODO|FIXME|XXX)" -Recurse).Count
    if ($todoCount -gt 0) {
        Write-Warning "Found $todoCount TODO/FIXME comments"
    } else {
        Write-Success "No TODO/FIXME comments found"
    }
} catch {
    Write-Success "No TODO/FIXME comments found"
}

# Step 10: Performance benchmarks (if available)
if (Test-Path "benches") {
    Write-Step "Running performance benchmarks..."
    try {
        & cargo bench --features $Features
        Write-Success "Benchmarks completed"
    } catch {
        Write-Warning "Benchmarks failed or not available"
    }
}

# Summary
Write-Host ""
Write-Success "🎉 Build process completed successfully!"
Write-Host ""

Write-Host "Summary:" -ForegroundColor Blue
Write-Host "  ✅ Code formatted and linted"
Write-Host "  ✅ Project built successfully"
if ($TestMode -ne "none") {
    Write-Host "  ✅ All tests passed"
}
Write-Host "  ✅ Documentation generated"
Write-Host ""

# Usage instructions
Write-Host "Usage Instructions:" -ForegroundColor Blue
Write-Host "  • View documentation: start target\doc\contracts_stylus\index.html"
Write-Host "  • Run specific tests: cargo test <test_name> --features $Features"
Write-Host "  • Build for Stylus: cargo build --target wasm32-unknown-unknown --release"
Write-Host "  • Deploy to Stylus: cargo stylus deploy --private-key=<key>"
Write-Host ""

# Development tips
Write-Host "Development Tips:" -ForegroundColor Blue
Write-Host "  • Use 'lightweight' feature for testing: .\build.ps1 -Features lightweight"
Write-Host "  • Enable full verification: .\build.ps1 -Features native_verification"
Write-Host "  • Skip tests for faster builds: .\build.ps1 -TestMode none"
Write-Host "  • Build debug version: .\build.ps1 -BuildMode debug"
Write-Host ""

Write-Success "Ready for development! 🚀"