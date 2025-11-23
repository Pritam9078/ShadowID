@echo off
echo 🐳 DVote Stylus Docker Quick Builder
echo ==================================

REM Check if Docker is available
docker --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ❌ Docker is not available. Please install Docker Desktop.
    pause
    exit /b 1
)

echo ✅ Docker found

REM Wait for Docker to be ready
echo 🔄 Waiting for Docker to be ready...
:wait_loop
docker info >nul 2>&1
if %ERRORLEVEL% neq 0 (
    timeout /t 2 >nul
    goto wait_loop
)

echo ✅ Docker is ready

REM Navigate to contracts directory
cd contracts-stylus 2>nul
if %ERRORLEVEL% neq 0 (
    echo ❌ Could not find contracts-stylus directory
    pause
    exit /b 1
)

REM Build and run container for quick compilation
echo 🔨 Building Stylus contracts in Docker...

docker run --rm -v "%CD%":/workspace -w /workspace rust:1.75-slim bash -c "
    echo 'Installing dependencies...' &&
    apt-get update -qq &&
    apt-get install -y -qq pkg-config libssl-dev build-essential &&
    rustup target add wasm32-unknown-unknown &&
    echo 'Compiling Stylus contracts...' &&
    cargo check --target wasm32-unknown-unknown
"

if %ERRORLEVEL% equ 0 (
    echo ✅ Compilation successful!
    echo 🎯 Your Stylus contracts compiled without errors!
) else (
    echo ❌ Compilation failed
    echo Check the output above for errors
)

echo.
echo Press any key to continue...
pause >nul