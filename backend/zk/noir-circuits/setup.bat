@echo off
REM DVote Noir Circuits Setup Script for Windows
REM This script helps set up and test the Noir ZK circuits on Windows

echo 🚀 DVote Noir Circuits Setup Script (Windows)
echo ============================================

REM Check if we're in the right directory
if not exist "age_proof" (
    if not exist "citizenship_proof" (
        if not exist "attribute_proof" (
            echo [ERROR] Please run this script from the zk/noir-circuits directory
            exit /b 1
        )
    )
)

REM Check if nargo is installed
where nargo >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] Nargo is not installed. Please install manually:
    echo 1. Visit: https://noir-lang.org/docs/getting_started/installation/
    echo 2. Download the latest release for Windows
    echo 3. Add nargo to your PATH
    echo 4. Re-run this script
    pause
    exit /b 1
) else (
    echo [SUCCESS] Nargo is installed
    nargo --version
)

echo.
echo [INFO] Building and testing all circuits...
echo.

REM Function to build and test a circuit
call :build_and_test_circuit "age_proof"
if %errorlevel% neq 0 exit /b 1

call :build_and_test_circuit "citizenship_proof" 
if %errorlevel% neq 0 exit /b 1

call :build_and_test_circuit "attribute_proof"
if %errorlevel% neq 0 exit /b 1

echo.
echo [SUCCESS] All circuits have been built and tested successfully!
echo.
echo Next steps:
echo 1. Review the Prover.toml files in each circuit directory for example inputs
echo 2. Modify the inputs with your actual data
echo 3. Run 'nargo prove' in each circuit directory to generate proofs
echo 4. Use the generated proofs with your ShadowIDRegistry smart contract
echo.
echo For more information, see the NOIR_CIRCUITS_README.md file
echo.
echo [SUCCESS] Setup complete! 🎉
pause
exit /b 0

:build_and_test_circuit
set circuit_name=%~1
echo [INFO] Building and testing %circuit_name% circuit...

cd "%circuit_name%"

if not exist "Nargo.toml" (
    echo [ERROR] Nargo.toml not found in %circuit_name%
    cd ..
    exit /b 1
)

echo [INFO] Building %circuit_name%...
nargo build
if %errorlevel% neq 0 (
    echo [ERROR] Failed to build %circuit_name%
    cd ..
    exit /b 1
)
echo [SUCCESS] %circuit_name% built successfully

if exist "src\test.nr" (
    echo [INFO] Running tests for %circuit_name%...
    nargo test
    if %errorlevel% neq 0 (
        echo [ERROR] %circuit_name% tests failed
        cd ..
        exit /b 1
    )
    echo [SUCCESS] %circuit_name% tests passed
) else (
    echo [WARNING] No tests found for %circuit_name%
)

echo [INFO] Circuit info for %circuit_name%:
nargo info

cd ..
echo.
exit /b 0