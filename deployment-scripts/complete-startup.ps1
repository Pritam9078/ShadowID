<#
.SYNOPSIS
    Complete ShadowID DAO Startup Script
    
.DESCRIPTION
    Starts Backend Server, Nitro Devnode, and deploys Stylus Contracts
    Handles all dependencies and provides comprehensive error handling
    
.PARAMETER BackendPath
    Path to the backend directory (default: current\backend)
    
.PARAMETER ContractsPath
    Path to the Stylus contracts directory (default: current\contracts-stylus)
    
.PARAMETER NitroPath
    Path where Nitro devnode should be installed/run (default: C:\Users\HP\arbitrum-nitro)
    
.PARAMETER BackendPort
    Port for backend server (default: 3001)
    
.PARAMETER NitroPort
    Port for Nitro devnode (default: 8547)
    
.PARAMETER MaxRetries
    Maximum retry attempts for service startup (default: 20)
    
.EXAMPLE
    .\complete-startup.ps1
    
.EXAMPLE
    .\complete-startup.ps1 -BackendPort 3002 -MaxRetries 30
#>

param(
    [string]$BackendPath = "C:\Users\HP\Downloads\DVote-main\DVote-main\backend",
    [string]$ContractsPath = "C:\Users\HP\Downloads\DVote-main\DVote-main\contracts-stylus",
    [string]$NitroPath = "C:\Users\HP\arbitrum-nitro",
    [int]$BackendPort = 3001,
    [int]$NitroPort = 8547,
    [int]$MaxRetries = 20
)

# Script validation
if ($BackendPort -lt 1 -or $BackendPort -gt 65535) {
    Write-Host "ERROR: Invalid BackendPort. Must be between 1 and 65535." -ForegroundColor Red
    exit 1
}

if ($NitroPort -lt 1 -or $NitroPort -gt 65535) {
    Write-Host "ERROR: Invalid NitroPort. Must be between 1 and 65535." -ForegroundColor Red
    exit 1
}

if ($MaxRetries -lt 1) {
    Write-Host "ERROR: MaxRetries must be at least 1." -ForegroundColor Red
    exit 1
}

Write-Host "ShadowID DAO Complete Startup Script v2.0" -ForegroundColor Magenta
Write-Host "=========================================" -ForegroundColor Magenta
Write-Host "Backend Port: $BackendPort | Nitro Port: $NitroPort | Max Retries: $MaxRetries" -ForegroundColor Cyan

# Function to test if a service is responding
function Test-ServiceHealth {
    param($Url, $TimeoutSec = 5)
    try {
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec $TimeoutSec -ErrorAction Stop
        return $response.StatusCode -eq 200
    } catch {
        return $false
    }
}

function Test-NitroRPC {
    param($Port = 8547)
    try {
        $body = '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'
        $response = Invoke-WebRequest -Uri "http://localhost:$Port" -Method POST -Body $body -ContentType "application/json" -TimeoutSec 5 -UseBasicParsing
        return $response.StatusCode -eq 200
    } catch {
        return $false
    }
}

# STEP 1: CLEANUP AND BACKEND STARTUP
Write-Host ""
Write-Host "STEP 1: Starting Backend Server" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green

# Kill existing processes
Write-Host "Cleaning up existing processes..."
try {
    Get-Process -Name "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Get-Process | Where-Object {$_.ProcessName -like "nitro*"} -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    taskkill /F /IM node.exe 2>$null
    Start-Sleep 3
} catch {
    Write-Host "  Some processes may already be stopped" -ForegroundColor Yellow
}

# Check backend path
if (-not (Test-Path $BackendPath)) {
    Write-Host "ERROR: Backend path not found: $BackendPath" -ForegroundColor Red
    exit 1
}

Set-Location $BackendPath
Write-Host "Backend directory: $(Get-Location)"

# Install dependencies and generate Prisma client
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing backend dependencies..."
    npm install | Out-Null
}

Write-Host "Generating Prisma client..."
npx prisma generate 2>&1 | Out-Null

# Start backend
Write-Host "Starting backend on port $BackendPort..."
try {
    $backendProcess = Start-Process -FilePath "node" -ArgumentList "server.js" -PassThru -WindowStyle Hidden -WorkingDirectory $BackendPath
    Write-Host "  Backend process started with PID: $($backendProcess.Id)" -ForegroundColor Cyan
} catch {
    Write-Host "  ERROR: Failed to start backend process: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Wait for backend
$attempt = 0
$backendReady = $false
Write-Host "Waiting for backend to start..."

while ($attempt -lt $MaxRetries -and -not $backendReady) {
    $attempt++
    Start-Sleep 2
    Write-Host "  Testing backend... (attempt $attempt/$MaxRetries)"
    
    # Check if process is still running
    if ($backendProcess.HasExited) {
        Write-Host "  ERROR: Backend process has exited unexpectedly" -ForegroundColor Red
        break
    }
    
    if (Test-ServiceHealth "http://localhost:$BackendPort/health") {
        $backendReady = $true
        Write-Host "  SUCCESS: Backend is responding!" -ForegroundColor Green
    }
}

if (-not $backendReady) {
    Write-Host "  FAILED: Backend did not start" -ForegroundColor Red
    if ($backendProcess -and -not $backendProcess.HasExited) {
        Write-Host "  Stopping non-responsive backend process..." -ForegroundColor Yellow
        Stop-Process -Id $backendProcess.Id -Force -ErrorAction SilentlyContinue
    }
    Write-Host "  Check if port $BackendPort is already in use or if there are dependency issues" -ForegroundColor Yellow
    exit 1
}

# STEP 2: NITRO DEVNODE STARTUP
Write-Host ""
Write-Host "STEP 2: Starting Nitro Devnode" -ForegroundColor Green
Write-Host "===============================" -ForegroundColor Green

# Check if Nitro is already running
if (Test-NitroRPC $NitroPort) {
    Write-Host "Nitro Devnode is already running on port $NitroPort" -ForegroundColor Green
} else {
    Write-Host "Starting Nitro Devnode..."
    
    # Check if Nitro repository exists
    if (-not (Test-Path $NitroPath)) {
        Write-Host "Nitro repository not found. Cloning..."
        $parentDir = Split-Path $NitroPath -Parent
        if (-not (Test-Path $parentDir)) {
            New-Item -ItemType Directory -Path $parentDir -Force | Out-Null
        }
        
        Push-Location $parentDir
        try {
            git clone --depth 1 https://github.com/OffchainLabs/nitro.git arbitrum-nitro
            if (-not (Test-Path $NitroPath)) {
                Write-Host "ERROR: Failed to clone Nitro repository" -ForegroundColor Red
                Pop-Location
                Write-Host "Continuing without Nitro Devnode..." -ForegroundColor Yellow
                return
            }
        } catch {
            Write-Host "ERROR: Git clone failed: $($_.Exception.Message)" -ForegroundColor Red
            Pop-Location
            Write-Host "Continuing without Nitro Devnode..." -ForegroundColor Yellow
            return
        }
        Pop-Location
    }
    
    Set-Location $NitroPath
    
    # Check if test-node.bash exists
    if (-not (Test-Path "test-node.bash")) {
        Write-Host "WARNING: test-node.bash not found in Nitro directory" -ForegroundColor Yellow
        Write-Host "Skipping Nitro Devnode startup..." -ForegroundColor Yellow
    } else {
        Write-Host "Starting Nitro Devnode (this may take several minutes)..."
        
        # Start Nitro in background
        $nitroJob = Start-Job -ScriptBlock {
            param($nitroPath)
            Set-Location $nitroPath
            bash ./test-node.bash --init
        } -ArgumentList $NitroPath
        
        # Wait for Nitro to start
        $nitroAttempt = 0
        $nitroReady = $false
        
        Write-Host "Waiting for Nitro Devnode..."
        while ($nitroAttempt -lt ($MaxRetries * 2) -and -not $nitroReady) {
            $nitroAttempt++
            Start-Sleep 5
            Write-Host "  Testing Nitro RPC... (attempt $nitroAttempt/$($MaxRetries * 2))"
            
            if (Test-NitroRPC $NitroPort) {
                $nitroReady = $true
                Write-Host "  SUCCESS: Nitro Devnode is responding!" -ForegroundColor Green
            }
        }
        
        if (-not $nitroReady) {
            Write-Host "  WARNING: Nitro Devnode may not be fully ready" -ForegroundColor Yellow
        }
    }
}

# STEP 3: STYLUS CONTRACTS
Write-Host ""
Write-Host "STEP 3: Stylus Contracts Setup" -ForegroundColor Green
Write-Host "===============================" -ForegroundColor Green

if (-not (Test-Path $ContractsPath)) {
    Write-Host "WARNING: Contracts path not found: $ContractsPath" -ForegroundColor Yellow
    Write-Host "Skipping Stylus contracts..." -ForegroundColor Yellow
} else {
    Set-Location $ContractsPath
    Write-Host "Contracts directory: $(Get-Location)"
    
    # Check for Rust and cargo-stylus
    try {
        $rustVersion = rustc --version 2>$null
        Write-Host "Rust version: $rustVersion"
        
        $cargoStylus = cargo stylus --version 2>$null
        if (-not $cargoStylus) {
            Write-Host "Installing cargo-stylus..."
            cargo install cargo-stylus --force
        }
        Write-Host "cargo-stylus available"
        
        # Build contracts
        Write-Host "Building Stylus contracts..."
        $buildResult = cargo build --release 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-Host "WARNING: Contract build failed: $buildResult" -ForegroundColor Yellow
            return
        }
        Write-Host "  Contracts built successfully" -ForegroundColor Green
        
        if (Test-NitroRPC $NitroPort) {
            Write-Host "Attempting to deploy contracts to Nitro Devnode..."
            
            # Set environment variables for deployment
            $env:RPC_URL = "http://localhost:$NitroPort"
            $env:PRIVATE_KEY = "0xb6b15c8cb491557369f3c7d2c287b053eb229daa9c22138887752191c9520659"
            
            try {
                $deployResult = cargo stylus deploy --endpoint "http://localhost:$NitroPort" --private-key $env:PRIVATE_KEY 2>&1
                
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "SUCCESS: Stylus contracts deployed!" -ForegroundColor Green
                    
                    # Try to extract contract address
                    if ($deployResult -match "(0x[a-fA-F0-9]{40})") {
                        $contractAddress = $matches[1]
                        Write-Host "Contract address: $contractAddress" -ForegroundColor Cyan
                        
                        # Save to backend deployments
                        $deploymentFile = "$BackendPath\deployments\nitro-local.json"
                        $deploymentDir = Split-Path $deploymentFile -Parent
                        if (-not (Test-Path $deploymentDir)) {
                            New-Item -ItemType Directory -Path $deploymentDir -Force | Out-Null
                        }
                        
                        $deploymentData = @{
                            contractAddress = $contractAddress
                            deployedAt = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ssZ")
                            network = "nitro-local"
                            rpcUrl = "http://localhost:$NitroPort"
                        }
                        
                        $deploymentData | ConvertTo-Json | Set-Content $deploymentFile
                        Write-Host "Deployment info saved to: $deploymentFile" -ForegroundColor Cyan
                    }
                } else {
                    Write-Host "WARNING: Contract deployment may have failed" -ForegroundColor Yellow
                }
            } catch {
                Write-Host "WARNING: Contract deployment encountered issues: $($_.Exception.Message)" -ForegroundColor Yellow
            }
        } else {
            Write-Host "WARNING: Nitro Devnode not available, skipping deployment" -ForegroundColor Yellow
        }
        
    } catch {
        Write-Host "WARNING: Rust/cargo-stylus not available: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

# STEP 4: FRONTEND STARTUP (OPTIONAL)
Write-Host ""
Write-Host "STEP 4: Starting Frontend (Optional)" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green

$startFrontend = Read-Host "Do you want to start the frontend? (y/N)"
$frontendProcess = $null

if ($startFrontend -eq 'y' -or $startFrontend -eq 'Y') {
    $frontendPath = Join-Path (Split-Path $BackendPath -Parent) "frontend"
    
    if (-not (Test-Path $frontendPath)) {
        Write-Host "WARNING: Frontend path not found: $frontendPath" -ForegroundColor Yellow
    } else {
        Push-Location $frontendPath
        Write-Host "Frontend directory: $(Get-Location)"
        
        # Check and install frontend dependencies
        if (-not (Test-Path "node_modules")) {
            Write-Host "Installing frontend dependencies..."
            npm install | Out-Null
        }
        
        Write-Host "Starting frontend on port 3000..."
        try {
            $frontendProcess = Start-Process -FilePath "npm" -ArgumentList "run", "dev" -PassThru -WindowStyle Hidden -WorkingDirectory $frontendPath
            Write-Host "  Frontend process started with PID: $($frontendProcess.Id)" -ForegroundColor Cyan
            
            # Wait a moment for frontend to start
            Start-Sleep 5
            
            # Test frontend
            if (Test-ServiceHealth "http://localhost:3000") {
                Write-Host "  SUCCESS: Frontend is responding on http://localhost:3000" -ForegroundColor Green
            } else {
                Write-Host "  WARNING: Frontend may still be starting up..." -ForegroundColor Yellow
            }
        } catch {
            Write-Host "  ERROR: Failed to start frontend: $($_.Exception.Message)" -ForegroundColor Red
        }
        
        Pop-Location
    }
} else {
    Write-Host "Skipping frontend startup. You can start it manually later." -ForegroundColor Yellow
}

# STEP 5: FINAL TESTING AND SUMMARY
Write-Host ""
Write-Host "STEP 5: Final Testing" -ForegroundColor Green
Write-Host "=====================" -ForegroundColor Green

Set-Location $BackendPath

# Test all endpoints
Write-Host "Testing backend endpoints..."

$healthTest = Test-ServiceHealth "http://localhost:$BackendPort/health"
Write-Host "  Health endpoint: $(if($healthTest) {'WORKING'} else {'FAILED'})" -ForegroundColor $(if($healthTest) {'Green'} else {'Red'})

try {
    $crowdfundingTest = Invoke-RestMethod -Uri "http://localhost:$BackendPort/api/crowdfunding/list" -TimeoutSec 5
    Write-Host "  Crowdfunding API: WORKING (found $($crowdfundingTest.campaigns.Count) campaigns)" -ForegroundColor Green
} catch {
    Write-Host "  Crowdfunding API: FAILED" -ForegroundColor Red
}

$nitroTest = Test-NitroRPC $NitroPort
Write-Host "  Nitro Devnode RPC: $(if($nitroTest) {'WORKING'} else {'NOT AVAILABLE'})" -ForegroundColor $(if($nitroTest) {'Green'} else {'Yellow'})

# Final summary
Write-Host ""
Write-Host "STARTUP COMPLETE!" -ForegroundColor Magenta
Write-Host "=================" -ForegroundColor Magenta
Write-Host "Backend Server: http://localhost:$BackendPort" -ForegroundColor Green
Write-Host "Health Endpoint: http://localhost:$BackendPort/health" -ForegroundColor Green
Write-Host "Crowdfunding API: http://localhost:$BackendPort/api/crowdfunding/list" -ForegroundColor Green

if ($nitroTest) {
    Write-Host "Nitro Devnode RPC: http://localhost:$NitroPort" -ForegroundColor Green
}

if ($frontendProcess) {
    Write-Host "Frontend Server: http://localhost:3000" -ForegroundColor Green
    Write-Host "Frontend API Proxy: http://localhost:3000/api/" -ForegroundColor Green
}

Write-Host ""
Write-Host "Process Information:" -ForegroundColor Cyan
if ($backendProcess) {
    $backendStatus = if ($backendProcess.HasExited) {"EXITED"} else {"RUNNING"}
    Write-Host "  Backend PID: $($backendProcess.Id) [$backendStatus]" -ForegroundColor Cyan
}
if ($frontendProcess) {
    $frontendStatus = if ($frontendProcess.HasExited) {"EXITED"} else {"RUNNING"}
    Write-Host "  Frontend PID: $($frontendProcess.Id) [$frontendStatus]" -ForegroundColor Cyan
}
if ($nitroJob) {
    $nitroStatus = if ($nitroJob.State) {$nitroJob.State} else {"UNKNOWN"}
    Write-Host "  Nitro Job ID: $($nitroJob.Id) [$nitroStatus]" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "Quick Tests:" -ForegroundColor Magenta
Write-Host "  Backend Health: Invoke-RestMethod -Uri 'http://localhost:$BackendPort/health'" -ForegroundColor Cyan
Write-Host "  Crowdfunding API: Invoke-RestMethod -Uri 'http://localhost:$BackendPort/api/crowdfunding/list'" -ForegroundColor Cyan
if ($frontendProcess) {
    Write-Host "  Frontend: Open browser to http://localhost:3000" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "Management Commands:" -ForegroundColor Yellow
Write-Host "  Stop Backend: Stop-Process -Id $($backendProcess.Id) -Force" -ForegroundColor Yellow
if ($frontendProcess) {
    Write-Host "  Stop Frontend: Stop-Process -Id $($frontendProcess.Id) -Force" -ForegroundColor Yellow
}
Write-Host "  Stop All: Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force" -ForegroundColor Yellow

Write-Host ""
Write-Host "You can now test the health endpoint:" -ForegroundColor Green
Write-Host "  Invoke-RestMethod -Uri 'http://localhost:$BackendPort/health' -Method GET" -ForegroundColor Cyan