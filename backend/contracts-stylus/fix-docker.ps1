# Quick Docker Desktop Fix
# Run these commands in Administrator PowerShell

Write-Host "Fixing Docker Desktop..." -ForegroundColor Yellow

# Method 1: Restart Docker Service
Stop-Service "com.docker.service" -ErrorAction SilentlyContinue
Stop-Service "Docker Desktop Service" -ErrorAction SilentlyContinue
Start-Sleep 3
Start-Service "Docker Desktop Service"
Start-Service "com.docker.service"

# Method 2: Kill and restart Docker Desktop
Get-Process "*Docker*" | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep 5
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"

Write-Host "Waiting 30 seconds for Docker to start..." -ForegroundColor Blue
Start-Sleep 30

# Test Docker
docker version
if ($LASTEXITCODE -eq 0) {
    Write-Host "Docker is now working!" -ForegroundColor Green
} else {
    Write-Host "Docker still has issues - use alternative methods" -ForegroundColor Red
}