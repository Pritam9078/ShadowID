/**
 * Stylus WASM Contract Deployment Script
 * 
 * This script deploys a Rust-compiled WASM contract to Arbitrum networks using Stylus.
 * Supports both local Stylus nodes and Arbitrum Sepolia testnet.
 * 
 * Usage: node deploy.js
 * 
 * Requirements:
 * - .env file with PRIVATE_KEY and RPC_URL
 * - Compiled WASM file at ./build/contract.wasm
 * - ethers.js v6
 */

import { ethers } from 'ethers';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// ES Module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

/**
 * Configuration and Constants
 */
const CONFIG = {
    // Environment variables
    PRIVATE_KEY: process.env.PRIVATE_KEY,
    RPC_URL: process.env.RPC_URL || 'http://localhost:8547',
    
    // File paths
    WASM_PATH: path.join(__dirname, 'build', 'contract.wasm'),
    
    // Network configurations
    NETWORKS: {
        LOCAL: 'http://localhost:8547',
        ARBITRUM_SEPOLIA: 'https://arb-sepolia.g.alchemy.com/v2/',
        ARBITRUM_MAINNET: 'https://arb1.arbitrum.io/rpc'
    },
    
    // Stylus specific constants
    STYLUS_METHODS: {
        DEPLOY: 'arbWasm:deploy',
        ACTIVATE: 'arbWasm:activate',
        CHECK: 'arbWasm:check'
    },
    
    // Gas settings
    GAS_LIMIT: 32000000, // 32M gas limit for deployment
    GAS_PRICE_MULTIPLIER: 1.1 // 10% buffer on gas price
};

/**
 * Utility Functions
 */
class Logger {
    static info(message, ...args) {
        console.log(`\u001b[36m[INFO]\u001b[0m ${message}`, ...args);
    }
    
    static success(message, ...args) {
        console.log(`\u001b[32m[SUCCESS]\u001b[0m ${message}`, ...args);
    }
    
    static error(message, ...args) {
        console.error(`\u001b[31m[ERROR]\u001b[0m ${message}`, ...args);
    }
    
    static warn(message, ...args) {
        console.warn(`\u001b[33m[WARN]\u001b[0m ${message}`, ...args);
    }
    
    static debug(message, ...args) {
        if (process.env.DEBUG) {
            console.log(`\u001b[35m[DEBUG]\u001b[0m ${message}`, ...args);
        }
    }
}

/**
 * Deployment Class
 */
class StylusDeployer {
    constructor() {
        this.provider = null;
        this.wallet = null;
        this.wasmBytecode = null;
        this.networkInfo = null;
    }

    /**
     * Initialize the deployment environment
     */
    async initialize() {
        Logger.info('🚀 Initializing Stylus deployment...');
        
        // Validate environment variables
        await this.validateEnvironment();
        
        // Setup provider and wallet
        await this.setupProvider();
        
        // Load WASM bytecode
        await this.loadWasmBytecode();
        
        // Get network information
        await this.getNetworkInfo();
        
        Logger.success('✅ Deployment environment initialized');
    }

    /**
     * Validate required environment variables
     */
    async validateEnvironment() {
        Logger.info('🔍 Validating environment variables...');
        
        const requiredVars = ['PRIVATE_KEY', 'RPC_URL'];
        const missing = [];
        
        if (!CONFIG.PRIVATE_KEY) {
            missing.push('PRIVATE_KEY');
        }
        
        if (!CONFIG.RPC_URL) {
            missing.push('RPC_URL (will use default: http://localhost:8547)');
            CONFIG.RPC_URL = CONFIG.NETWORKS.LOCAL;
        }
        
        if (missing.length > 0) {
            throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
        }
        
        // Validate private key format
        if (!CONFIG.PRIVATE_KEY.startsWith('0x') && CONFIG.PRIVATE_KEY.length !== 66) {
            if (CONFIG.PRIVATE_KEY.length === 64) {
                CONFIG.PRIVATE_KEY = '0x' + CONFIG.PRIVATE_KEY;
            } else {
                throw new Error('Invalid private key format. Expected 64 hex characters (with or without 0x prefix)');
            }
        }
        
        Logger.success('✅ Environment variables validated');
    }

    /**
     * Setup provider and wallet
     */
    async setupProvider() {
        Logger.info(`🌐 Connecting to RPC: ${CONFIG.RPC_URL}`);
        
        try {
            // Create provider
            this.provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
            
            // Test connection
            const blockNumber = await this.provider.getBlockNumber();
            Logger.info(`📦 Connected to network, current block: ${blockNumber}`);
            
            // Create wallet
            this.wallet = new ethers.Wallet(CONFIG.PRIVATE_KEY, this.provider);
            Logger.info(`👤 Wallet address: ${this.wallet.address}`);
            
            // Check balance
            const balance = await this.provider.getBalance(this.wallet.address);
            const balanceEth = ethers.formatEther(balance);
            Logger.info(`💰 Wallet balance: ${balanceEth} ETH`);
            
            if (parseFloat(balanceEth) < 0.001) {
                Logger.warn('⚠️ Low balance detected. Ensure sufficient funds for deployment.');
            }
            
        } catch (error) {
            throw new Error(`Failed to connect to RPC: ${error.message}`);
        }
    }

    /**
     * Load WASM bytecode from file
     */
    async loadWasmBytecode() {
        Logger.info(`📂 Loading WASM bytecode from: ${CONFIG.WASM_PATH}`);
        
        try {
            // Check if file exists
            const fileStats = await fs.stat(CONFIG.WASM_PATH);
            Logger.info(`📊 WASM file size: ${(fileStats.size / 1024).toFixed(2)} KB`);
            
            // Load bytecode
            this.wasmBytecode = await fs.readFile(CONFIG.WASM_PATH);
            
            // Validate WASM header
            const wasmHeader = this.wasmBytecode.slice(0, 4);
            const expectedHeader = Buffer.from([0x00, 0x61, 0x73, 0x6D]); // WASM magic number
            
            if (!wasmHeader.equals(expectedHeader)) {
                throw new Error('Invalid WASM file: missing magic number');
            }
            
            Logger.success(`✅ WASM bytecode loaded (${this.wasmBytecode.length} bytes)`);
            
        } catch (error) {
            if (error.code === 'ENOENT') {
                throw new Error(`WASM file not found: ${CONFIG.WASM_PATH}. Please compile your Rust contract first.`);
            }
            throw new Error(`Failed to load WASM bytecode: ${error.message}`);
        }
    }

    /**
     * Get network information
     */
    async getNetworkInfo() {
        try {
            const network = await this.provider.getNetwork();
            this.networkInfo = {
                name: network.name,
                chainId: network.chainId.toString(),
                isLocal: CONFIG.RPC_URL.includes('localhost') || CONFIG.RPC_URL.includes('127.0.0.1')
            };
            
            Logger.info(`🌐 Network: ${this.networkInfo.name} (Chain ID: ${this.networkInfo.chainId})`);
            
        } catch (error) {
            Logger.warn('⚠️ Could not determine network info:', error.message);
            this.networkInfo = { name: 'Unknown', chainId: '0', isLocal: false };
        }
    }

    /**
     * Deploy the WASM contract using Stylus
     */
    async deployContract() {
        Logger.info('🚀 Starting Stylus contract deployment...');
        
        try {
            // Step 1: Deploy WASM bytecode
            Logger.info('📤 Deploying WASM bytecode to Stylus...');
            const deploymentTx = await this.deployWasm();
            
            Logger.info(`⏳ Waiting for deployment confirmation...`);
            Logger.info(`🔗 Transaction hash: ${deploymentTx.hash}`);
            
            // Step 2: Wait for confirmation
            const receipt = await deploymentTx.wait();
            
            if (receipt.status !== 1) {
                throw new Error('Deployment transaction failed');
            }
            
            // Step 3: Extract contract address
            const contractAddress = this.extractContractAddress(receipt);
            
            // Step 4: Display deployment results
            this.displayResults(deploymentTx, receipt, contractAddress);
            
            // Step 5: Verify deployment
            await this.verifyDeployment(contractAddress);
            
            return {
                contractAddress,
                transactionHash: deploymentTx.hash,
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed.toString()
            };
            
        } catch (error) {
            throw new Error(`Deployment failed: ${error.message}`);
        }
    }

    /**
     * Deploy WASM bytecode using Stylus JSON-RPC method
     */
    async deployWasm() {
        try {
            // Prepare deployment data
            const wasmHex = '0x' + this.wasmBytecode.toString('hex');
            
            Logger.debug(`WASM bytecode length: ${wasmHex.length} characters`);
            
            // Get current gas price with buffer
            const gasPrice = await this.provider.getFeeData();
            const adjustedGasPrice = gasPrice.gasPrice ? 
                (gasPrice.gasPrice * BigInt(Math.floor(CONFIG.GAS_PRICE_MULTIPLIER * 100))) / 100n :
                ethers.parseUnits('1', 'gwei'); // Fallback gas price
            
            Logger.info(`⛽ Gas price: ${ethers.formatUnits(adjustedGasPrice, 'gwei')} Gwei`);
            
            // Method 1: Try Stylus-specific deployment
            try {
                return await this.deployStylusMethod(wasmHex, adjustedGasPrice);
            } catch (stylusError) {
                Logger.warn('Stylus method failed, trying standard deployment:', stylusError.message);
                
                // Method 2: Fallback to standard contract creation
                return await this.deployStandardMethod(wasmHex, adjustedGasPrice);
            }
            
        } catch (error) {
            throw new Error(`WASM deployment failed: ${error.message}`);
        }
    }

    /**
     * Deploy using Stylus-specific JSON-RPC method
     */
    async deployStylusMethod(wasmHex, gasPrice) {
        Logger.info('🎯 Using Stylus-specific deployment method...');
        
        // Prepare Stylus deployment transaction
        const deploymentParams = {
            from: this.wallet.address,
            data: wasmHex,
            gasLimit: `0x${CONFIG.GAS_LIMIT.toString(16)}`,
            gasPrice: `0x${gasPrice.toString(16)}`
        };
        
        // Send via Stylus JSON-RPC method
        const result = await this.provider.send(CONFIG.STYLUS_METHODS.DEPLOY, [deploymentParams]);
        
        // Convert result to transaction format
        return await this.provider.getTransaction(result);
    }

    /**
     * Deploy using standard contract creation
     */
    async deployStandardMethod(wasmHex, gasPrice) {
        Logger.info('🔄 Using standard contract deployment method...');
        
        // Create deployment transaction
        const deploymentTx = {
            data: wasmHex,
            gasLimit: CONFIG.GAS_LIMIT,
            gasPrice: gasPrice
        };
        
        Logger.debug('Sending deployment transaction...');
        return await this.wallet.sendTransaction(deploymentTx);
    }

    /**
     * Extract contract address from deployment receipt
     */
    extractContractAddress(receipt) {
        if (receipt.contractAddress) {
            return receipt.contractAddress;
        }
        
        // Fallback: calculate CREATE address
        const nonce = receipt.nonce || 0;
        return ethers.getCreateAddress({
            from: this.wallet.address,
            nonce: nonce
        });
    }

    /**
     * Display deployment results
     */
    displayResults(transaction, receipt, contractAddress) {
        Logger.success('\n🎉 Deployment Successful! 🎉\n');
        
        console.log('📊 Deployment Results:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`🏠 Contract Address:    ${contractAddress}`);
        console.log(`🔗 Transaction Hash:    ${transaction.hash}`);
        console.log(`📦 Block Number:        ${receipt.blockNumber}`);
        console.log(`⛽ Gas Used:            ${receipt.gasUsed.toString()} / ${CONFIG.GAS_LIMIT}`);
        console.log(`💰 Gas Price:           ${ethers.formatUnits(receipt.gasPrice || transaction.gasPrice, 'gwei')} Gwei`);
        console.log(`💸 Total Cost:          ${ethers.formatEther((receipt.gasUsed * (receipt.gasPrice || transaction.gasPrice)).toString())} ETH`);
        
        if (this.networkInfo.chainId === '421614') {
            console.log(`🔍 Arbiscan:            https://sepolia.arbiscan.io/address/${contractAddress}`);
        } else if (this.networkInfo.chainId === '42161') {
            console.log(`🔍 Arbiscan:            https://arbiscan.io/address/${contractAddress}`);
        }
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }

    /**
     * Verify deployment by checking contract code
     */
    async verifyDeployment(contractAddress) {
        Logger.info('🔍 Verifying deployment...');
        
        try {
            const code = await this.provider.getCode(contractAddress);
            
            if (code === '0x') {
                throw new Error('No contract code found at deployment address');
            }
            
            Logger.success(`✅ Contract verified at ${contractAddress}`);
            Logger.info(`📏 Deployed code size: ${(code.length - 2) / 2} bytes`);
            
        } catch (error) {
            Logger.warn(`⚠️ Verification warning: ${error.message}`);
        }
    }
}

/**
 * Main deployment function
 */
async function main() {
    const startTime = Date.now();
    
    try {
        console.log('\n' + '='.repeat(60));
        console.log('🦀 STYLUS WASM CONTRACT DEPLOYMENT 🦀');
        console.log('='.repeat(60) + '\n');
        
        // Create deployer instance
        const deployer = new StylusDeployer();
        
        // Initialize deployment environment
        await deployer.initialize();
        
        // Deploy contract
        const result = await deployer.deployContract();
        
        // Calculate deployment time
        const deploymentTime = ((Date.now() - startTime) / 1000).toFixed(2);
        
        Logger.success(`🚀 Deployment completed in ${deploymentTime} seconds`);
        Logger.info('\n💡 Next steps:');
        Logger.info('   1. Save the contract address for your frontend');
        Logger.info('   2. Test contract functionality');
        Logger.info('   3. Update your deployment configuration\n');
        
        // Return result for programmatic use
        return result;
        
    } catch (error) {
        Logger.error('❌ Deployment failed:', error.message);
        
        if (error.code === 'INSUFFICIENT_FUNDS') {
            Logger.error('💸 Insufficient funds for deployment. Please add more ETH to your wallet.');
        } else if (error.code === 'NETWORK_ERROR') {
            Logger.error('🌐 Network connection issue. Please check your RPC URL.');
        } else if (error.message.includes('WASM')) {
            Logger.error('📂 WASM file issue. Please ensure your Rust contract is properly compiled.');
        }
        
        Logger.info('\n🔧 Troubleshooting:');
        Logger.info('   1. Check your .env file has PRIVATE_KEY and RPC_URL');
        Logger.info('   2. Ensure WASM file exists at ./build/contract.wasm');
        Logger.info('   3. Verify sufficient ETH balance in wallet');
        Logger.info('   4. Confirm RPC endpoint is accessible\n');
        
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    Logger.info('\n👋 Deployment interrupted by user');
    process.exit(0);
});

process.on('unhandledRejection', (error) => {
    Logger.error('💥 Unhandled error:', error.message);
    process.exit(1);
});

// Run deployment if called directly
if (import.meta.url === `file://${process.argv[1]}` || import.meta.url.endsWith(process.argv[1])) {
    main().catch(console.error);
} else {
    // Fallback: always run main if this appears to be the entry point
    if (process.argv[1] && process.argv[1].includes('deploy.js')) {
        main().catch(console.error);
    }
}

export default StylusDeployer;