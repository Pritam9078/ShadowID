@echo off
REM Enhanced nargo command using Node.js implementation
REM This provides functional nargo capabilities using @noir-lang/noir_js

REM Check if Node.js is available
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: Node.js is required but not found in PATH
    echo Please install Node.js from https://nodejs.org/
    exit /b 1
)

REM Check if nargo.js exists
if not exist "%~dp0nargo.js" (
    echo Error: nargo.js not found in %~dp0
    exit /b 1
)

REM Forward all arguments to the Node.js implementation
node "%~dp0nargo.js" %*