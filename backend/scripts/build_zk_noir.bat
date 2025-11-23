@echo off
REM build_zk_noir.bat
REM Windows batch version of build_zk_noir.sh
REM Compiles Noir circuits using nargo and prepares for proof generation

setlocal EnableDelayedExpansion

REM Script configuration
set "SCRIPT_DIR=%~dp0"
set "PROJECT_ROOT=%SCRIPT_DIR%.."
set "CIRCUITS_DIR=%PROJECT_ROOT%\zk\noir-circuits"
set "PROOFS_DIR=%PROJECT_ROOT%\zk\proofs"
set "VERIFIERS_DIR=%PROJECT_ROOT%\zk\verifiers"

REM Available circuits
set "CIRCUITS=age_proof citizenship_proof attribute_proof"

echo ================================================
echo 🏗️  DVote Noir Circuit Builder (Windows)
echo ================================================

REM Parse arguments
if "%1"=="" goto show_usage
if "%1"=="--help" goto show_usage

REM Check dependencies
echo Checking dependencies...

REM Check if nargo.bat exists in circuits directory
if exist "%CIRCUITS_DIR%\nargo.bat" (
    echo ✅ Found custom nargo.bat implementation
    set "NARGO_CMD=%CIRCUITS_DIR%\nargo.bat"
) else if exist "%CIRCUITS_DIR%\nargo.js" (
    echo ✅ Found Node.js nargo implementation
    set "NARGO_CMD=node %CIRCUITS_DIR%\nargo.js"
) else (
    echo ❌ nargo not found. Please ensure nargo is available.
    exit /b 1
)

REM Check Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ⚠️  Node.js not found. Some features may not work.
) else (
    echo ✅ Node.js available
)

REM Create directories
echo Preparing directories...
if not exist "%CIRCUITS_DIR%" mkdir "%CIRCUITS_DIR%"
if not exist "%PROOFS_DIR%" mkdir "%PROOFS_DIR%"
if not exist "%VERIFIERS_DIR%" mkdir "%VERIFIERS_DIR%"

REM Process command
if "%1"=="all" (
    echo Building all circuits...
    
    for %%c in (%CIRCUITS%) do (
        echo.
        echo --- Building %%c ---
        call :build_circuit %%c
        if !errorlevel! neq 0 (
            echo ❌ Failed to build %%c
            exit /b 1
        )
    )
    
    echo.
    echo ✅ All circuits built successfully
    goto end
    
) else (
    set "CIRCUIT_NAME=%1"
    
    REM Validate circuit name
    set "VALID_CIRCUIT=false"
    for %%c in (%CIRCUITS%) do (
        if "%CIRCUIT_NAME%"=="%%c" set "VALID_CIRCUIT=true"
    )
    
    if "!VALID_CIRCUIT!"=="false" (
        echo ❌ Unknown circuit: %CIRCUIT_NAME%
        echo.
        goto show_usage
    )
    
    echo Building single circuit: %CIRCUIT_NAME%
    call :build_circuit %CIRCUIT_NAME%
    if %errorlevel% equ 0 (
        echo ✅ Circuit %CIRCUIT_NAME% built successfully
    ) else (
        echo ❌ Failed to build %CIRCUIT_NAME%
        exit /b 1
    )
    
    goto end
)

:build_circuit
set "CIRCUIT=%~1"
echo Building %CIRCUIT%...

REM Create circuit directory
if not exist "%CIRCUITS_DIR%\%CIRCUIT%" mkdir "%CIRCUITS_DIR%\%CIRCUIT%"

REM Create proof and verifier directories
if not exist "%PROOFS_DIR%\%CIRCUIT%" mkdir "%PROOFS_DIR%\%CIRCUIT%"
if not exist "%VERIFIERS_DIR%\%CIRCUIT%" mkdir "%VERIFIERS_DIR%\%CIRCUIT%"

REM Change to project root for nargo operations
cd /d "%PROJECT_ROOT%"

REM Use nargo to compile (mock compilation for now)
if exist "%CIRCUITS_DIR%\nargo.bat" (
    echo Running: %CIRCUITS_DIR%\nargo.bat compile %CIRCUIT%
    call "%CIRCUITS_DIR%\nargo.bat" compile %CIRCUIT%
) else (
    echo Running: node %CIRCUITS_DIR%\nargo.js compile %CIRCUIT%
    node "%CIRCUITS_DIR%\nargo.js" compile %CIRCUIT%
)

if %errorlevel% neq 0 (
    echo ❌ Compilation failed for %CIRCUIT%
    exit /b 1
)

echo ✅ %CIRCUIT% compiled successfully
exit /b 0

:show_usage
echo Usage: %0 ^<circuit_name^|all^> [options]
echo.
echo Arguments:
echo   circuit_name              Specific circuit to build (age_proof, citizenship_proof, attribute_proof)
echo   all                      Build all available circuits
echo.
echo Options:
echo   --help                   Show this help message
echo.
echo Examples:
echo   %0 age_proof                          # Build single circuit
echo   %0 all                               # Build all circuits
echo.
echo Available circuits:
echo   - age_proof
echo   - citizenship_proof
echo   - attribute_proof

:end
endlocal