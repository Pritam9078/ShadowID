@echo off
REM prove_noir.bat
REM Windows batch version of prove_noir.sh
REM Generates ZK proofs using Noir circuits with Aztec backend

setlocal EnableDelayedExpansion

REM Script configuration
set "SCRIPT_DIR=%~dp0"
set "PROJECT_ROOT=%SCRIPT_DIR%.."
set "CIRCUITS_DIR=%PROJECT_ROOT%\zk\noir-circuits"
set "PROOFS_DIR=%PROJECT_ROOT%\zk\proofs"
set "VERIFIERS_DIR=%PROJECT_ROOT%\zk\verifiers"

echo ================================================
echo 🔐 DVote Noir Proof Generator (Windows)
echo ================================================

REM Parse arguments
if "%1"=="" goto show_usage
if "%1"=="--help" goto show_usage

set "CIRCUIT_NAME=%1"
set "INPUT_FILE="
set "USE_WITNESS=false"

REM Parse additional options
shift
:parse_options
if "%1"=="" goto options_done
if "%1"=="--input-file" (
    set "INPUT_FILE=%2"
    shift
    shift
    goto parse_options
)
if "%1"=="--witness" (
    set "USE_WITNESS=true"
    shift
    goto parse_options
)
shift
goto parse_options
:options_done

REM Validate circuit name
set "VALID_CIRCUIT=false"
for %%c in (age_proof citizenship_proof attribute_proof) do (
    if "%CIRCUIT_NAME%"=="%%c" set "VALID_CIRCUIT=true"
)

if "%VALID_CIRCUIT%"=="false" (
    echo ❌ Unknown circuit: %CIRCUIT_NAME%
    echo.
    goto show_usage
)

echo Checking dependencies...

REM Check if nargo is available
if exist "%CIRCUITS_DIR%\nargo.bat" (
    echo ✅ Found nargo.bat
) else if exist "%CIRCUITS_DIR%\nargo.js" (
    echo ✅ Found nargo.js
) else (
    echo ❌ nargo not found. Please build circuits first.
    exit /b 1
)

REM Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js is required for proof generation
    exit /b 1
) else (
    echo ✅ Node.js found
)

REM Check if node_modules exists
if not exist "node_modules" (
    echo ⚠️  node_modules not found. Running npm install...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ npm install failed
        exit /b 1
    )
)

echo Starting proof generation for %CIRCUIT_NAME%...

REM Determine input strategy
if "%INPUT_FILE%" neq "" (
    if exist "%INPUT_FILE%" (
        echo Using input file: %INPUT_FILE%
    ) else (
        echo ❌ Input file not found: %INPUT_FILE%
        exit /b 1
    )
) else (
    echo Using default inputs for %CIRCUIT_NAME%
)

echo ✅ Input data prepared

REM Create proofs directory
if not exist "%PROOFS_DIR%\%CIRCUIT_NAME%" mkdir "%PROOFS_DIR%\%CIRCUIT_NAME%"

echo Creating proof generation script...

REM Use the proof helper script
cd /d "%PROJECT_ROOT%"
echo Running proof generation...

REM Run the helper with proper arguments
if "%INPUT_FILE%" neq "" (
    node "%SCRIPT_DIR%\proof_helper.js" "%CIRCUIT_NAME%" "%INPUT_FILE%"
) else (
    node "%SCRIPT_DIR%\proof_helper.js" "%CIRCUIT_NAME%"
)

if %errorlevel% equ 0 (
    echo ✅ Proof generation completed successfully
    echo ✅ proof.json created
    echo ✅ public_inputs.json created
    echo.
    echo ✅ Proof generation process completed
    echo Proof files saved to: %PROOFS_DIR%\%CIRCUIT_NAME%\
    echo Use verify_noir.bat to verify the generated proof
) else (
    echo ❌ Proof generation failed
    exit /b 1
)

goto end

:show_usage
echo Usage: %0 ^<circuit_name^> [options]
echo.
echo Arguments:
echo   circuit_name              Circuit to generate proof for (age_proof, citizenship_proof, attribute_proof)
echo.
echo Options:
echo   --input-file ^<file^>       Use custom input file (default: use built-in inputs)
echo   --witness                 Generate witness file (advanced)
echo   --help                   Show this help message
echo.
echo Examples:
echo   %0 age_proof                          # Generate proof with default inputs
echo   %0 age_proof --input-file my_inputs.json
echo   %0 citizenship_proof --witness
echo.
echo Available circuits:
echo   - age_proof
echo   - citizenship_proof  
echo   - attribute_proof

:end
endlocal