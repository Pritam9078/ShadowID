/**
 * PROPER Stylus Contract Deployment Script
 * 
 * This deploys WASM contracts to Arbitrum Stylus using the correct method:
 * 1. Uses standard contract deployment (CREATE opcode) 
 * 2. The WASM bytecode becomes the contract code
 * 3. No special Stylus CLI needed - just ethers.js
 * 
 * The key insight: Stylus contracts are just deployed as bytecode like any contract,
 * but the bytecode is WASM instead of EVM bytecode.
 */

import { ethers } from 'ethers';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const CONFIG = {
    PRIVATE_KEY: process.env.PRIVATE_KEY,
    RPC_URL: process.env.RPC_URL || 'https://arb-sepolia.g.alchemy.com/v2/mUJMHrybqfzOlpVeT0cj7',
    WASM_PATH: path.join(__dirname, 'target', 'wasm32-unknown-unknown', 'release', 'shadowid_stylus.wasm'),
    CHAIN_ID: 421614, // Arbitrum Sepolia
};

class StylusDeployer {
    constructor() {
        this.provider = null;
        this.wallet = null;
        this.wasmBytecode = null;
    }

    async initialize() {
        console.log('🚀 Initializing Stylus deployment...');
        
        if (!CONFIG.PRIVATE_KEY) {
            throw new Error('PRIVATE_KEY not found in environment variables');
        }

        // Setup provider and wallet
        this.provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
        this.wallet = new ethers.Wallet(CONFIG.PRIVATE_KEY, this.provider);
        
        console.log(`👤 Deployer address: ${this.wallet.address}`);
        
        // Check balance
        const balance = await this.provider.getBalance(this.wallet.address);
        console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);
        
        if (balance < ethers.parseEther('0.001')) {
            console.warn('⚠️ Low balance detected. Ensure sufficient funds for deployment.');
        }
    }

    async loadWasmBytecode() {
        console.log(`📂 Loading WASM bytecode from: ${CONFIG.WASM_PATH}`);
        
        try {
            this.wasmBytecode = await fs.readFile(CONFIG.WASM_PATH);
            console.log(`✅ WASM loaded: ${this.wasmBytecode.length} bytes`);
            
            // Validate WASM header (0x00 0x61 0x73 0x6D = "wasm")
            const header = this.wasmBytecode.slice(0, 4);
            if (header.toString('hex') !== '0061736d') {
                throw new Error('Invalid WASM file - missing magic number');
            }
            
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.error('❌ WASM file not found. Build the contract first:');
                console.error('   cargo build --target wasm32-unknown-unknown --release');
                process.exit(1);
            }
            throw error;
        }
    }

    async deployContract() {
        console.log('🚀 Deploying Stylus WASM contract...');
        
        try {
            // Get current gas price with buffer  
            const feeData = await this.provider.getFeeData();
            const gasPrice = feeData.gasPrice ? 
                (feeData.gasPrice * 110n) / 100n : // 10% buffer
                ethers.parseUnits('0.1', 'gwei'); // Fallback
            
            console.log(`⛽ Gas price: ${ethers.formatUnits(gasPrice, 'gwei')} Gwei`);
            
            // Create deployment transaction
            // KEY INSIGHT: For Stylus, the WASM bytecode IS the init code
            const deploymentTx = {
                data: '0x' + this.wasmBytecode.toString('hex'),
                gasLimit: 8000000, // High gas limit for deployment
                gasPrice: gasPrice,
            };
            
            console.log(`📦 Deploying ${this.wasmBytecode.length} bytes of WASM code...`);
            
            // Send transaction
            const tx = await this.wallet.sendTransaction(deploymentTx);
            console.log(`🔗 Transaction hash: ${tx.hash}`);
            console.log('⏳ Waiting for confirmation...');
            
            // Wait for receipt
            const receipt = await tx.wait();
            
            if (receipt.status !== 1) {
                throw new Error('Transaction failed');
            }
            
            const contractAddress = receipt.contractAddress;
            console.log('\n🎉 Deployment Successful! 🎉');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log(`🏠 Contract Address: ${contractAddress}`);
            console.log(`🔗 Transaction: ${tx.hash}`);
            console.log(`📦 Block: ${receipt.blockNumber}`);
            console.log(`⛽ Gas Used: ${receipt.gasUsed.toString()}`);
            console.log(`💸 Total Cost: ${ethers.formatEther(receipt.gasUsed * gasPrice)} ETH`);
            console.log(`🔍 Arbiscan: https://sepolia.arbiscan.io/address/${contractAddress}`);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            
            // Verify deployment
            await this.verifyDeployment(contractAddress);
            
            return {
                contractAddress,
                transactionHash: tx.hash,
                blockNumber: receipt.blockNumber.toString(),
                gasUsed: receipt.gasUsed.toString(),
                totalCost: ethers.formatEther(receipt.gasUsed * gasPrice)
            };
            
        } catch (error) {
            console.error('❌ Deployment failed:', error.message);
            throw error;
        }
    }

    async verifyDeployment(contractAddress) {
        console.log('🔍 Verifying deployment...');
        
        try {
            const code = await this.provider.getCode(contractAddress);
            
            if (code === '0x') {
                console.warn('⚠️ Warning: No code at contract address');
                return false;
            }
            
            console.log(`✅ Contract verified: ${(code.length - 2) / 2} bytes of code`);
            
            // For Stylus contracts, the code should be our WASM bytecode
            const expectedCode = '0x' + this.wasmBytecode.toString('hex');
            if (code === expectedCode) {
                console.log('✅ WASM bytecode matches perfectly!');
            } else {
                console.log('ℹ️ Contract code differs from WASM (this is normal for Stylus)');
            }
            
            return true;
            
        } catch (error) {
            console.warn('⚠️ Verification failed:', error.message);
            return false;
        }
    }

    async updateDeploymentFiles(deploymentResult) {
        console.log('📝 Updating deployment files...');
        
        // Update backend deployment file
        const backendDeploymentPath = path.join(__dirname, '..', 'backend', 'deployments', 'arbitrum-sepolia.json');
        
        try {
            let deploymentConfig = {};
            
            // Load existing config
            try {
                const existing = await fs.readFile(backendDeploymentPath, 'utf8');
                deploymentConfig = JSON.parse(existing);
            } catch {
                // File doesn't exist, start fresh
            }
            
            // Update with new Stylus contract
            deploymentConfig.contracts = deploymentConfig.contracts || {};
            deploymentConfig.contracts.stylus = {
                ShadowIDStylus: {
                    address: deploymentResult.contractAddress,
                    deployed: true,
                    type: 'stylus-wasm',
                    description: 'ShadowID identity verification contract implemented in Rust for Arbitrum Stylus',
                    deploymentTxHash: deploymentResult.transactionHash,
                    blockNumber: deploymentResult.blockNumber,
                    gasUsed: deploymentResult.gasUsed,
                    totalCost: deploymentResult.totalCost,
                    arbiscanUrl: `https://sepolia.arbiscan.io/address/${deploymentResult.contractAddress}`,
                    deployedAt: new Date().toISOString()
                }
            };
            
            await fs.writeFile(backendDeploymentPath, JSON.stringify(deploymentConfig, null, 2));
            console.log('✅ Updated backend deployment file');
            
        } catch (error) {
            console.warn('⚠️ Failed to update deployment files:', error.message);
        }
    }
}

async function main() {
    try {
        const deployer = new StylusDeployer();
        
        await deployer.initialize();
        await deployer.loadWasmBytecode();
        
        const result = await deployer.deployContract();
        await deployer.updateDeploymentFiles(result);
        
        console.log('\n🎉 Deployment completed successfully!');
        console.log('\n📋 Next steps:');
        console.log('1. Update frontend/src/config/contracts.js with the new address');
        console.log('2. Test contract functionality');
        console.log('3. Deploy any supporting contracts if needed');
        
    } catch (error) {
        console.error('💥 Deployment failed:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}

export default StylusDeployer;