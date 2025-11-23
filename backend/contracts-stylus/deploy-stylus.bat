@echo off
echo ====================================
echo   STYLUS CONTRACT DEPLOYMENT
echo ====================================

:: Check if Node.js dependencies are installed
if not exist node_modules (
    echo 📦 Installing Node.js dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ Failed to install Node.js dependencies
        pause
        exit /b 1
    )
)

:: Load environment variables
if not exist .env (
    echo ❌ .env file not found
    echo Please create .env with PRIVATE_KEY and RPC_URL
    pause
    exit /b 1
)

:: Parse environment variables from .env
for /f "usebackq tokens=1,2 delims==" %%a in (`.env`) do (
    if "%%a"=="PRIVATE_KEY" set PRIVATE_KEY=%%b
    if "%%a"=="RPC_URL" set RPC_URL=%%b
)

if "%PRIVATE_KEY%"=="" (
    echo ❌ PRIVATE_KEY not found in .env
    pause
    exit /b 1
)

if "%RPC_URL%"=="" (
    echo ❌ RPC_URL not found in .env
    pause
    exit /b 1
)

echo 🔧 Building Rust contract...
cargo build --target wasm32-unknown-unknown --release

if %errorlevel% neq 0 (
    echo ❌ Cargo build failed
    echo Make sure you have Rust and wasm32 target installed:
    echo rustup target add wasm32-unknown-unknown
    pause
    exit /b 1
)

echo ✅ Contract built successfully

:: Check if WASM file exists
set WASM_FILE=target\wasm32-unknown-unknown\release\dvote_dao_stylus.wasm
if not exist "%WASM_FILE%" (
    echo ❌ WASM file not found: %WASM_FILE%
    echo Available files:
    dir target\wasm32-unknown-unknown\release\*.wasm
    pause
    exit /b 1
)

echo 📦 WASM file found: %WASM_FILE%

echo 🚀 Deploying to Arbitrum Sepolia...
node deploy-proper.js

if %errorlevel% neq 0 (
    echo ❌ Deployment failed
    pause
    exit /b 1
)

echo ✅ Deployment completed successfully!
echo 📝 Update your backend/.env and frontend/src/config/contracts.js with the new contract address

pause