# DVote DAO Mock Deployment Script
# Creates mock deployment configuration for development

param(
    [string]$Network = "arbitrum-sepolia"
)

Write-Host "DVote DAO Mock Deployment" -ForegroundColor Cyan
Write-Host "========================"

# Create deployment directory if it doesn't exist
$deploymentDir = "..\backend\deployments"
if (-not (Test-Path $deploymentDir)) {
    New-Item -ItemType Directory -Path $deploymentDir -Force | Out-Null
    Write-Host "Created deployment directory" -ForegroundColor Green
}

# Create mock deployment configuration
$deploymentConfig = @{
    network = "arbitrum-sepolia"
    chainId = 421614
    rpcUrl = "https://arb-sepolia.g.alchemy.com/v2/mUJMHrybqfzOlpVeT0cj7"
    explorer = "https://sepolia.arbiscan.io"
    contracts = @{
        stylus = @{
            DvoteDAOStylus = @{
                address = "0x1234567890123456789012345678901234567890"
                deployed = $true
                type = "stylus"
                description = "Main DAO contract implemented in Rust for Arbitrum Stylus (Mock deployment)"
                deploymentTxHash = "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"
                blockNumber = 12345678
            }
        }
        solidity = @{
            GovernanceToken = @{
                address = "0x2345678901234567890123456789012345678901"
                deployed = $true
                type = "erc20"
                description = "DVT governance token contract (Mock deployment)"
                symbol = "DVT"
                decimals = 18
            }
            Treasury = @{
                address = "0x3456789012345678901234567890123456789012"
                deployed = $true
                type = "treasury"
                description = "DAO treasury management contract (Mock deployment)"
            }
        }
    }
    deployment = @{
        timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        deployer = "0xa62463A56EE9D742F810920F56cEbc4B696eBd0a"
        status = "mock-deployed"
        note = "Mock deployment for development - contracts not yet deployed to network"
    }
}

# Save deployment config
$deploymentPath = "$deploymentDir\arbitrum-sepolia.json"
$deploymentConfig | ConvertTo-Json -Depth 10 | Out-File -FilePath $deploymentPath -Encoding UTF8
Write-Host "Mock deployment config saved: $deploymentPath" -ForegroundColor Green

# Create ABI directory and mock ABI
$abiDir = "..\frontend\src\abi"
if (-not (Test-Path $abiDir)) {
    New-Item -ItemType Directory -Path $abiDir -Force | Out-Null
}

# Create mock Stylus ABI
$stylusABI = @{
    name = "DvoteDAOStylus"
    type = "stylus"
    description = "DVote DAO Stylus Contract Interface"
    methods = @(
        @{
            name = "add_member"
            description = "Add a verified member to the DAO"
            input = "string"
            output = "string"
        },
        @{
            name = "get_member_count" 
            description = "Get total number of members"
            input = ""
            output = "number"
        },
        @{
            name = "create_proposal"
            description = "Create a new proposal"
            input = "string"
            output = "string"
        },
        @{
            name = "get_proposal_count"
            description = "Get total number of proposals"
            input = ""
            output = "number"
        },
        @{
            name = "info"
            description = "Get contract information"
            input = ""
            output = "string"
        }
    )
}

$stylusABI | ConvertTo-Json -Depth 10 | Out-File -FilePath "$abiDir\DaoStylus.json" -Encoding UTF8
Write-Host "Mock Stylus ABI created: $abiDir\DaoStylus.json" -ForegroundColor Green

# Update main deployment info
$mainDeploymentPath = "..\deployment-info.json"
if (Test-Path $mainDeploymentPath) {
    $mainDeployment = Get-Content $mainDeploymentPath | ConvertFrom-Json
    
    # Add Stylus section
    $stylusInfo = @{
        network = "arbitrum-sepolia"
        chainId = 421614
        contractAddress = "0x1234567890123456789012345678901234567890"
        status = "mock-deployed"
        timestamp = $deploymentConfig.deployment.timestamp
    }
    
    $mainDeployment | Add-Member -NotePropertyName "stylus" -NotePropertyValue $stylusInfo -Force
    $mainDeployment | ConvertTo-Json -Depth 10 | Out-File -FilePath $mainDeploymentPath -Encoding UTF8
    Write-Host "Updated main deployment info" -ForegroundColor Green
}

Write-Host ""
Write-Host "Mock deployment completed successfully!" -ForegroundColor Green
Write-Host "Restart the backend server to load new deployment config" -ForegroundColor Yellow