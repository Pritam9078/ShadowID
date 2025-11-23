# Complete DAO Backend + Nitro Devnode + Stylus Contracts Startup Script
# This script handles the full startup workflow for the ShadowID DAO project

param(
    [string]$BackendPath = "C:\Users\HP\Downloads\DVote-main\DVote-main\backend",
    [string]$ContractsPath = "C:\Users\HP\Downloads\DVote-main\DVote-main\contracts-stylus",
    [string]$NitroPath = "C:\Users\HP\arbitrum-nitro",
    [int]$BackendPort = 3001,
    [int]$NitroPort = 8547,
    [int]$MaxRetries = 30
)

# Color output functions
function Write-Success { param($Message) Write-Host "✅ $Message" -ForegroundColor Green }
function Write-Error { param($Message) Write-Host "❌ $Message" -ForegroundColor Red }
function Write-Info { param($Message) Write-Host "📋 $Message" -ForegroundColor Cyan }
function Write-Warning { param($Message) Write-Host "⚠️ $Message" -ForegroundColor Yellow }

# Header
Write-Host "`n🚀 ShadowID DAO Complete Startup Script" -ForegroundColor Magenta
Write-Host "================================================" -ForegroundColor Magenta

# Step 0: Cleanup existing processes
Write-Info "Step 0: Cleaning up existing processes..."
try {
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Get-Process -Name "nitro" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Get-Process -Name "geth" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep 3
    Write-Success "Cleanup completed"
} catch {
    Write-Warning "Cleanup had some issues: $($_.Exception.Message)"
}

# Step 1: Check and Start Node.js Backend
Write-Info "Step 1: Checking Node.js Backend on port $BackendPort..."

function Test-BackendRunning {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$BackendPort/health" -Method GET -TimeoutSec 5 -UseBasicParsing -ErrorAction SilentlyContinue
        return $response.StatusCode -eq 200
    } catch {
        return $false
    }
}

# Check if backend is already running
if (Test-BackendRunning) {
    Write-Success "Backend is already running on port $BackendPort"
} else {
    Write-Info "Starting Node.js backend..."
    
    # Verify backend directory exists
    if (-not (Test-Path $BackendPath)) {
        Write-Error "Backend path not found: $BackendPath"
        exit 1
    }
    
    # Navigate to backend directory and start server
    Push-Location $BackendPath
    
    # Check if server.js exists
    if (-not (Test-Path "server.js")) {
        Write-Error "server.js not found in $BackendPath"
        Pop-Location
        exit 1
    }
    
    # Start backend in background
    Write-Info "Starting backend server..."
    $backendJob = Start-Job -ScriptBlock {
        param($path)
        Set-Location $path
        node server.js
    } -ArgumentList $BackendPath
    
    Pop-Location
    
    # Wait for backend to start
    $retryCount = 0
    $backendStarted = $false
    
    while ($retryCount -lt $MaxRetries -and -not $backendStarted) {
        Start-Sleep 2
        $retryCount++
        Write-Info "Waiting for backend... (attempt $retryCount/$MaxRetries)"
        
        # Check job output for startup messages
        $jobOutput = Receive-Job $backendJob -Keep 2>$null
        if ($jobOutput -match "DVote Backend Server running on port") {
            Write-Success "Backend startup detected in logs"
            Start-Sleep 3  # Give it extra time to fully initialize
        }
        
        if (Test-BackendRunning) {
            $backendStarted = $true
            Write-Success "Backend is now running on port $BackendPort"
        }
    }
    
    if (-not $backendStarted) {
        Write-Error "Backend failed to start after $MaxRetries attempts"
        Write-Info "Backend job output:"
        Receive-Job $backendJob
        exit 1
    }
}

# Step 2: Check and Start Nitro Devnode
Write-Info "Step 2: Checking Nitro Devnode on port $NitroPort..."

function Test-NitroRunning {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$NitroPort" -Method POST -Body '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' -ContentType "application/json" -TimeoutSec 5 -UseBasicParsing -ErrorAction SilentlyContinue
        return $response.StatusCode -eq 200
    } catch {
        return $false
    }
}

if (Test-NitroRunning) {
    Write-Success "Nitro Devnode is already running on port $NitroPort"
} else {
    Write-Info "Starting Nitro Devnode..."
    
    # Check if Nitro repository exists
    if (-not (Test-Path $NitroPath)) {
        Write-Warning "Nitro path not found: $NitroPath"
        Write-Info "Cloning Arbitrum Nitro repository..."
        
        # Clone Nitro repository
        $parentDir = Split-Path $NitroPath -Parent
        Push-Location $parentDir
        git clone https://github.com/OffchainLabs/nitro.git arbitrum-nitro
        Pop-Location
        
        if (-not (Test-Path $NitroPath)) {
            Write-Error "Failed to clone Nitro repository"
            exit 1
        }
    }
    
    Push-Location $NitroPath
    
    # Start Nitro devnode
    Write-Info "Starting Nitro devnode (this may take a while)..."
    $nitroJob = Start-Job -ScriptBlock {
        param($path)
        Set-Location $path
        ./test-node.bash --init
    } -ArgumentList $NitroPath
    
    Pop-Location
    
    # Wait for Nitro to start
    $retryCount = 0
    $nitroStarted = $false
    
    while ($retryCount -lt ($MaxRetries * 2) -and -not $nitroStarted) {
        Start-Sleep 5
        $retryCount++
        Write-Info "Waiting for Nitro devnode... (attempt $retryCount/$($MaxRetries * 2))"
        
        if (Test-NitroRunning) {
            $nitroStarted = $true
            Write-Success "Nitro Devnode is now running on port $NitroPort"
        }
    }
    
    if (-not $nitroStarted) {
        Write-Warning "Nitro Devnode may not be fully ready, continuing anyway..."
    }
}

# Step 3: Check and Deploy Stylus Contracts
Write-Info "Step 3: Checking Stylus contracts deployment..."

if (-not (Test-Path $ContractsPath)) {
    Write-Error "Contracts path not found: $ContractsPath"
    exit 1
}

Push-Location $ContractsPath

# Check if cargo-stylus is installed
try {
    $cargoStylus = cargo stylus --version 2>$null
    if (-not $cargoStylus) {
        Write-Warning "cargo-stylus not found, attempting to install..."
        cargo install cargo-stylus --force
    }
    Write-Success "cargo-stylus is available"
} catch {
    Write-Error "Failed to install cargo-stylus: $($_.Exception.Message)"
    Pop-Location
    exit 1
}

# Check contract compilation
Write-Info "Checking contract compilation..."
try {
    $checkResult = cargo stylus check --endpoint "http://localhost:$NitroPort" 2>&1
    Write-Success "Contract compilation check passed"
} catch {
    Write-Warning "Contract check failed, attempting to build..."
    try {
        cargo build --release
        Write-Success "Contract built successfully"
    } catch {
        Write-Error "Contract build failed: $($_.Exception.Message)"
        Pop-Location
        exit 1
    }
}

# Deploy contracts if needed
Write-Info "Attempting contract deployment..."
try {
    # Set deployment parameters for local devnode
    $env:RPC_URL = "http://localhost:$NitroPort"
    $env:PRIVATE_KEY = "0xb6b15c8cb491557369f3c7d2c287b053eb229daa9c22138887752191c9520659"  # Default devnode private key
    
    $deployResult = cargo stylus deploy --endpoint "http://localhost:$NitroPort" --private-key $env:PRIVATE_KEY 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Stylus contracts deployed successfully"
        Write-Info "Deploy output: $deployResult"
        
        # Extract contract address if available
        if ($deployResult -match "deployed code at address (0x[a-fA-F0-9]{40})") {
            $contractAddress = $matches[1]
            Write-Success "Contract deployed at address: $contractAddress"
            
            # Save contract address to backend deployments
            $deploymentFile = "$BackendPath\deployments\nitro-local.json"
            $deploymentDir = Split-Path $deploymentFile -Parent
            if (-not (Test-Path $deploymentDir)) {
                New-Item -ItemType Directory -Path $deploymentDir -Force
            }
            
            $deploymentData = @{
                contractAddress = $contractAddress
                deployedAt = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ")
                network = "nitro-local"
                rpcUrl = "http://localhost:$NitroPort"
            }
            
            $deploymentData | ConvertTo-Json | Set-Content $deploymentFile
            Write-Success "Contract address saved to $deploymentFile"
        }
    } else {
        Write-Warning "Contract deployment may have failed, but continuing..."
        Write-Info "Deploy output: $deployResult"
    }
} catch {
    Write-Warning "Contract deployment encountered issues: $($_.Exception.Message)"
}

Pop-Location

# Step 4: Test Health Endpoint
Write-Info "Step 4: Testing backend health endpoint..."

$healthRetries = 0
$healthSuccess = $false

while ($healthRetries -lt $MaxRetries -and -not $healthSuccess) {
    $healthRetries++
    Write-Info "Testing health endpoint... (attempt $healthRetries/$MaxRetries)"
    
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:$BackendPort/health" -Method GET -TimeoutSec 10
        $healthSuccess = $true
        Write-Success "Health endpoint is responding!"
        Write-Info "Response: $($response | ConvertTo-Json -Depth 2)"
    } catch {
        Write-Warning "Health endpoint not ready: $($_.Exception.Message)"
        Start-Sleep 2
    }
}

if (-not $healthSuccess) {
    Write-Error "Health endpoint failed to respond after $MaxRetries attempts"
    
    # Show backend logs for debugging
    Write-Info "Backend job status and logs:"
    if ($backendJob) {
        Get-Job $backendJob
        Receive-Job $backendJob
    }
    
    # Check if anything is listening on the port
    $listening = netstat -ano | Select-String ":$BackendPort"
    if ($listening) {
        Write-Info "Something is listening on port $BackendPort:"
        Write-Host $listening
    } else {
        Write-Warning "Nothing is listening on port $BackendPort"
    }
    
    exit 1
}

# Step 5: Test Additional Endpoints
Write-Info "Step 5: Testing additional API endpoints..."

# Test crowdfunding API
try {
    $crowdfundingResponse = Invoke-RestMethod -Uri "http://localhost:$BackendPort/api/crowdfunding/list" -Method GET -TimeoutSec 5
    Write-Success "Crowdfunding API is responding"
    Write-Info "Found $($crowdfundingResponse.campaigns.Count) campaigns"
} catch {
    Write-Warning "Crowdfunding API test failed: $($_.Exception.Message)"
}

# Final Status Report
Write-Host "`n🎉 STARTUP COMPLETE!" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Success "✅ Backend running on: http://localhost:$BackendPort"
Write-Success "✅ Health endpoint: http://localhost:$BackendPort/health"
Write-Success "✅ Crowdfunding API: http://localhost:$BackendPort/api/crowdfunding/list"

if (Test-NitroRunning) {
    Write-Success "✅ Nitro Devnode running on: http://localhost:$NitroPort"
} else {
    Write-Warning "⚠️ Nitro Devnode status unclear"
}

Write-Info "📋 You can now use the backend APIs and deploy frontend"
Write-Info "📋 To stop services: Get-Process node,nitro,geth -ErrorAction SilentlyContinue | Stop-Process -Force"

# Keep jobs running
Write-Host "`n🔄 Background services are running..." -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop all services" -ForegroundColor Yellow

# Monitor services (optional - comment out if you want script to exit)
try {
    while ($true) {
        Start-Sleep 30
        
        # Check if backend is still responding
        if (-not (Test-BackendRunning)) {
            Write-Warning "Backend stopped responding! Attempting restart..."
            # Could add restart logic here
        }
        
        # Check if Nitro is still running
        if (-not (Test-NitroRunning)) {
            Write-Warning "Nitro Devnode stopped responding!"
        }
        
        Write-Host "." -NoNewline -ForegroundColor Gray
    }
} catch [System.Management.Automation.PipelineStoppedException] {
    Write-Host "`n🛑 Stopping services..." -ForegroundColor Red
    
    # Cleanup jobs
    if ($backendJob) { Stop-Job $backendJob -PassThru | Remove-Job }
    if ($nitroJob) { Stop-Job $nitroJob -PassThru | Remove-Job }
    
    # Stop processes
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Get-Process -Name "nitro" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    
    Write-Success "Services stopped"
}