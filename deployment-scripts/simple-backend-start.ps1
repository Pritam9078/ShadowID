# Simple Backend Startup Script for ShadowID DAO
param(
    [string]$BackendPath = "C:\Users\HP\Downloads\DVote-main\DVote-main\backend",
    [int]$Port = 3001,
    [int]$MaxRetries = 15
)

Write-Host "ShadowID DAO Backend Startup Script" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green

# Kill existing processes
Write-Host "Stopping existing Node.js processes..."
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep 2

# Check port availability
Write-Host "Checking port $Port..."
$portInUse = netstat -ano | Select-String ":$Port"
if ($portInUse) {
    Write-Host "WARNING: Port $Port appears to be in use" -ForegroundColor Yellow
    # Try to free the port
    $portInUse | ForEach-Object {
        $pid = ($_.ToString().Split() | Where-Object {$_})[-1]
        if ($pid -match '^\d+$') {
            Write-Host "Attempting to stop process $pid"
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        }
    }
    Start-Sleep 2
}

# Navigate to backend directory
if (-not (Test-Path $BackendPath)) {
    Write-Host "ERROR: Backend path not found: $BackendPath" -ForegroundColor Red
    exit 1
}

Set-Location $BackendPath
Write-Host "Working directory: $(Get-Location)"

# Check for server.js
if (-not (Test-Path "server.js")) {
    Write-Host "ERROR: server.js not found" -ForegroundColor Red
    exit 1
}

# Install dependencies if needed
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..."
    npm install
}

# Generate Prisma client
Write-Host "Generating Prisma client..."
npx prisma generate 2>&1 | Out-Null

# Start the backend server
Write-Host "Starting backend server on port $Port..."
$serverProcess = Start-Process -FilePath "node" -ArgumentList "server.js" -PassThru

# Wait for server to start and test connectivity
Write-Host "Waiting for server to respond..."
$attempt = 0
$connected = $false

while ($attempt -lt $MaxRetries -and -not $connected) {
    $attempt++
    Start-Sleep 3
    
    Write-Host "Testing connection... (attempt $attempt of $MaxRetries)"
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$Port/health" -UseBasicParsing -TimeoutSec 5
        if ($response.StatusCode -eq 200) {
            $connected = $true
            Write-Host "SUCCESS! Backend is responding" -ForegroundColor Green
            Write-Host "Health endpoint response:" -ForegroundColor Green
            Write-Host $response.Content -ForegroundColor Cyan
        }
    } catch {
        Write-Host "Connection failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

if ($connected) {
    Write-Host ""
    Write-Host "BACKEND IS NOW RUNNING!" -ForegroundColor Green
    Write-Host "========================" -ForegroundColor Green
    Write-Host "Health endpoint: http://localhost:$Port/health"
    Write-Host "Backend process ID: $($serverProcess.Id)"
    Write-Host ""
    
    # Test additional endpoints
    Write-Host "Testing additional endpoints..."
    
    try {
        $crowdfundingTest = Invoke-RestMethod -Uri "http://localhost:$Port/api/crowdfunding/list" -TimeoutSec 5
        Write-Host "Crowdfunding API: WORKING (found $($crowdfundingTest.campaigns.Count) campaigns)" -ForegroundColor Green
    } catch {
        Write-Host "Crowdfunding API: FAILED - $($_.Exception.Message)" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "To stop the backend: Stop-Process -Id $($serverProcess.Id) -Force"
    
} else {
    Write-Host ""
    Write-Host "FAILED TO START BACKEND" -ForegroundColor Red
    Write-Host "========================" -ForegroundColor Red
    
    if ($serverProcess -and -not $serverProcess.HasExited) {
        Write-Host "Server process is running but not responding. Stopping it..."
        Stop-Process -Id $serverProcess.Id -Force
    }
    
    Write-Host "Troubleshooting info:"
    $currentPortUsage = netstat -ano | Select-String ":$Port"
    if ($currentPortUsage) {
        Write-Host "Current port usage:"
        $currentPortUsage | ForEach-Object { Write-Host "  $_" }
    } else {
        Write-Host "No processes found using port $Port"
    }
    
    exit 1
}