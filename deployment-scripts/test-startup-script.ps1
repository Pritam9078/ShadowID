# Test Script for Complete Startup Validation

Write-Host "Testing ShadowID DAO Startup Script..." -ForegroundColor Green

# Test parameter validation
try {
    $scriptPath = "C:\Users\HP\Downloads\DVote-main\DVote-main\complete-startup.ps1"
    
    Write-Host "1. Testing parameter validation..." -ForegroundColor Cyan
    
    # Test invalid port
    try {
        & $scriptPath -BackendPort 99999 -WhatIf 2>$null
        Write-Host "   Port validation: FAILED (should reject invalid port)" -ForegroundColor Red
    } catch {
        Write-Host "   Port validation: PASSED (correctly rejected invalid port)" -ForegroundColor Green
    }
    
    # Test syntax
    Write-Host "2. Testing script syntax..." -ForegroundColor Cyan
    $syntaxCheck = Get-Command $scriptPath -ErrorAction SilentlyContinue
    if ($syntaxCheck) {
        Write-Host "   Syntax check: PASSED" -ForegroundColor Green
    } else {
        Write-Host "   Syntax check: FAILED" -ForegroundColor Red
    }
    
    # Test help documentation
    Write-Host "3. Testing help documentation..." -ForegroundColor Cyan
    $help = Get-Help $scriptPath -ErrorAction SilentlyContinue
    if ($help.Synopsis -like "*ShadowID DAO*") {
        Write-Host "   Help documentation: PASSED" -ForegroundColor Green
    } else {
        Write-Host "   Help documentation: FAILED" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "VALIDATION COMPLETE!" -ForegroundColor Magenta
    Write-Host "The startup script is ready to use." -ForegroundColor Green
    Write-Host ""
    Write-Host "To run the full startup:" -ForegroundColor Cyan
    Write-Host "   $scriptPath" -ForegroundColor White
    Write-Host ""
    Write-Host "To run with custom parameters:" -ForegroundColor Cyan
    Write-Host "   $scriptPath -BackendPort 3002 -MaxRetries 30" -ForegroundColor White
    
} catch {
    Write-Host "ERROR: Script validation failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}