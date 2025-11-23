# Quick Backend Fix Script
# This script specifically addresses the backend connectivity issues

param(
    [string]$BackendPath = "C:\Users\HP\Downloads\DVote-main\DVote-main\backend",
    [int]$Port = 3001,
    [int]$MaxRetries = 20
)

Write-Host "Quick Backend Fix for ShadowID DAO" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan

# Step 1: Kill any existing node processes
Write-Host "Stopping existing Node.js processes..."
Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep 3

# Step 2: Check if port is free
Write-Host "Checking port $Port availability..."
$portCheck = netstat -ano | Select-String ":$Port"
if ($portCheck) {
    Write-Host "⚠️ Port $Port is in use:" -ForegroundColor Yellow
    Write-Host $portCheck
    
    # Try to kill the process using the port
    $portCheck | ForEach-Object {
        $pid = ($_ -split '\s+')[-1]
        if ($pid -and $pid -ne "0") {
            Write-Host "🔪 Killing process $pid using port $Port"
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        }
    }
    Start-Sleep 2
}

# Step 3: Navigate to backend and check files
Write-Host "📂 Checking backend directory..."
if (-not (Test-Path $BackendPath)) {
    Write-Host "❌ Backend path not found: $BackendPath" -ForegroundColor Red
    exit 1
}

Push-Location $BackendPath

if (-not (Test-Path "server.js")) {
    Write-Host "❌ server.js not found in $BackendPath" -ForegroundColor Red
    Pop-Location
    exit 1
}

# Step 4: Check and install dependencies
Write-Host "📦 Checking Node.js dependencies..."
if (-not (Test-Path "node_modules")) {
    Write-Host "📥 Installing dependencies..."
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ npm install failed" -ForegroundColor Red
        Pop-Location
        exit 1
    }
}

# Step 5: Generate Prisma client (this was causing crashes)
Write-Host "🗄️ Generating Prisma client..."
try {
    npx prisma generate 2>&1 | Out-Null
    Write-Host "✅ Prisma client generated successfully" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Prisma generation had issues, continuing..." -ForegroundColor Yellow
}

# Step 6: Start backend with explicit error handling
Write-Host "🚀 Starting backend server..."
$backendProcess = Start-Process -FilePath "node" -ArgumentList "server.js" -PassThru -WindowStyle Hidden

# Step 7: Wait and test connectivity
$retryCount = 0
$success = $false

Write-Host "⏳ Waiting for backend to start..."
while ($retryCount -lt $MaxRetries -and -not $success) {
    Start-Sleep 2
    $retryCount++
    
    Write-Host "🔍 Testing connection... (attempt $retryCount/$MaxRetries)" -NoNewline
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$Port/health" -Method GET -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            $success = $true
            Write-Host " ✅ SUCCESS!" -ForegroundColor Green
            Write-Host "📊 Response: $($response.Content)" -ForegroundColor Green
        }
    } catch {
        Write-Host " ❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Pop-Location

if ($success) {
    Write-Host "`n🎉 Backend is now accessible!" -ForegroundColor Green
    Write-Host "🌐 Health endpoint: http://localhost:$Port/health" -ForegroundColor Green
    Write-Host "🌐 Crowdfunding API: http://localhost:$Port/api/crowdfunding/list" -ForegroundColor Green
    
    # Test crowdfunding endpoint
    try {
        $crowdfunding = Invoke-RestMethod -Uri "http://localhost:$Port/api/crowdfunding/list" -Method GET -TimeoutSec 5
        Write-Host "✅ Crowdfunding API also working! Found $($crowdfunding.campaigns.Count) campaigns" -ForegroundColor Green
    } catch {
        Write-Host "⚠️ Crowdfunding API test failed: $($_.Exception.Message)" -ForegroundColor Yellow
    }
    
    Write-Host "`n📋 Backend process ID: $($backendProcess.Id)" -ForegroundColor Cyan
    Write-Host "📋 To stop: Stop-Process -Id $($backendProcess.Id) -Force" -ForegroundColor Cyan
} else {
    Write-Host "`n❌ Backend failed to start or respond after $MaxRetries attempts" -ForegroundColor Red
    
    # Check if process is still running
    if ($backendProcess -and -not $backendProcess.HasExited) {
        Write-Host "🔍 Backend process is running (PID: $($backendProcess.Id)) but not responding" -ForegroundColor Yellow
        Write-Host "🔪 Stopping non-responsive backend process..." -ForegroundColor Yellow
        Stop-Process -Id $backendProcess.Id -Force -ErrorAction SilentlyContinue
    }
    
    # Show what might be using the port
    $portUsage = netstat -ano | Select-String ":$Port"
    if ($portUsage) {
        Write-Host "Current port $Port usage:" -ForegroundColor Yellow
        Write-Host $portUsage
    }
    
    exit 1
}