# Quick Docker commands for Stylus development

Write-Host "🐳 DVote Stylus - Quick Commands" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

# Check if Docker is running
try {
    docker version | Out-Null
    Write-Host "✅ Docker is running" -ForegroundColor Green
} catch {
    Write-Error "❌ Docker is not running. Please start Docker Desktop."
    exit 1
}

# Function to run Docker commands
function Invoke-StylusCommand {
    param([string[]]$Args)
    docker run --rm -v "${PWD}:/workspace" dvote-stylus @Args
}

# Menu
Write-Host "`nAvailable commands:" -ForegroundColor Yellow
Write-Host "1. Check compilation (quick)" -ForegroundColor White
Write-Host "2. Build debug version" -ForegroundColor White  
Write-Host "3. Build release version" -ForegroundColor White
Write-Host "4. Build with ABI export" -ForegroundColor White
Write-Host "5. Run tests" -ForegroundColor White
Write-Host "6. Interactive shell" -ForegroundColor White
Write-Host "7. Build Docker image" -ForegroundColor White

$choice = Read-Host "`nEnter your choice (1-7)"

switch ($choice) {
    "1" { 
        Write-Host "🔧 Checking compilation..." -ForegroundColor Green
        Invoke-StylusCommand @("cargo", "check", "--target", "wasm32-unknown-unknown")
    }
    "2" { 
        Write-Host "🔨 Building debug version..." -ForegroundColor Green
        Invoke-StylusCommand @("cargo", "build", "--target", "wasm32-unknown-unknown")
    }
    "3" { 
        Write-Host "🚀 Building release version..." -ForegroundColor Green
        Invoke-StylusCommand @("cargo", "build", "--target", "wasm32-unknown-unknown", "--release")
    }
    "4" { 
        Write-Host "📋 Building with ABI export..." -ForegroundColor Green
        Invoke-StylusCommand @("cargo", "build", "--target", "wasm32-unknown-unknown", "--release", "--features", "export-abi")
    }
    "5" { 
        Write-Host "🧪 Running tests..." -ForegroundColor Green
        Invoke-StylusCommand @("cargo", "test")
    }
    "6" { 
        Write-Host "🐚 Starting interactive shell..." -ForegroundColor Green
        docker run -it --rm -v "${PWD}:/workspace" dvote-stylus bash
    }
    "7" { 
        Write-Host "📦 Building Docker image..." -ForegroundColor Green
        docker build -t dvote-stylus .
    }
    default { 
        Write-Host "❌ Invalid choice" -ForegroundColor Red
    }
}