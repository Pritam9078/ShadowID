# Stylus WASM Contract Deployment

This directory contains a complete Stylus contract deployment system for deploying Rust-compiled WASM contracts to Arbitrum networks.

## Prerequisites

1. **Node.js** (v18+) with npm
2. **Rust** and **cargo** installed
3. **cargo-stylus** for WASM compilation
4. **ethers.js v6** for blockchain interaction

## Quick Start

### 1. Install Dependencies

```bash
npm install ethers dotenv
```

### 2. Compile Your Rust Contract

```bash
# Build the WASM contract
cargo build --release --target wasm32-unknown-unknown

# Create build directory and copy WASM file
mkdir -p build
cp target/wasm32-unknown-unknown/release/dvote_dao_stylus.wasm build/contract.wasm
```

### 3. Configure Environment

Create a `.env` file in this directory:

```bash
# Required: Your wallet private key (64 hex characters)
PRIVATE_KEY=9b5f44e759a897239d9b9a0320192a7ee2a0df1e91a18f67f04115d9f8f2c174

# Required: RPC endpoint URL
RPC_URL=https://arb-sepolia.g.alchemy.com/v2/mUJMHrybqfzOlpVeT0cj7

# Optional: Enable debug logging
DEBUG=true
```

### 4. Deploy Contract

```bash
# Deploy to configured network
node deploy.js
```

## Supported Networks

- **Local Stylus Node**: `http://localhost:8547`
- **Arbitrum Sepolia**: `https://arb-sepolia.g.alchemy.com/v2/<key>`
- **Arbitrum Mainnet**: `https://arb1.arbitrum.io/rpc`

## Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `PRIVATE_KEY` | ✅ | Wallet private key (64 hex chars) | `9b5f44e759a897...` |
| `RPC_URL` | ✅ | Arbitrum RPC endpoint | `https://arb-sepolia.g.alchemy.com/v2/...` |
| `DEBUG` | ❌ | Enable debug logging | `true` |

## Deployment Output

The script provides detailed deployment information:

```bash
🦀 STYLUS WASM CONTRACT DEPLOYMENT 🦀
============================================================

[INFO] 🚀 Initializing Stylus deployment...
[INFO] 🔍 Validating environment variables...
[SUCCESS] ✅ Environment variables validated
[INFO] 🌐 Connecting to RPC: https://arb-sepolia.g.alchemy.com/v2/...
[INFO] 📦 Connected to network, current block: 12345678
[INFO] 👤 Wallet address: 0xa62463A56EE9D742F810920F56cEbc4B696eBd0a
[INFO] 💰 Wallet balance: 0.1 ETH
[INFO] 📂 Loading WASM bytecode from: ./build/contract.wasm
[INFO] 📊 WASM file size: 45.67 KB
[SUCCESS] ✅ WASM bytecode loaded (46764 bytes)
[INFO] 🌐 Network: arbitrum-sepolia (Chain ID: 421614)
[SUCCESS] ✅ Deployment environment initialized
[INFO] 🚀 Starting Stylus contract deployment...
[INFO] 📤 Deploying WASM bytecode to Stylus...
[INFO] ⛽ Gas price: 1.2 Gwei
[INFO] 🎯 Using Stylus-specific deployment method...
[INFO] ⏳ Waiting for deployment confirmation...
[INFO] 🔗 Transaction hash: 0xabc123...
[INFO] 🔍 Verifying deployment...
[SUCCESS] ✅ Contract verified at 0x1234567890123456789012345678901234567890

🎉 Deployment Successful! 🎉

📊 Deployment Results:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏠 Contract Address:    0x1234567890123456789012345678901234567890
🔗 Transaction Hash:    0xabc123def456789...
📦 Block Number:        12345679
⛽ Gas Used:            2,450,000 / 32,000,000
💰 Gas Price:           1.2 Gwei
💸 Total Cost:          0.00294 ETH
🔍 Arbiscan:            https://sepolia.arbiscan.io/address/0x1234567890123456789012345678901234567890
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[SUCCESS] 🚀 Deployment completed in 15.34 seconds

💡 Next steps:
   1. Save the contract address for your frontend
   2. Test contract functionality
   3. Update your deployment configuration
```

## File Structure

```
contracts-stylus/
├── deploy.js              # Main deployment script
├── .env                   # Environment configuration
├── build/
│   └── contract.wasm      # Compiled WASM contract
├── src/
│   └── lib.rs            # Rust contract source
├── Cargo.toml            # Rust dependencies
└── README.md             # This file
```

## Troubleshooting

### Common Issues

1. **"WASM file not found"**
   ```bash
   # Compile your Rust contract first
   cargo build --release --target wasm32-unknown-unknown
   mkdir -p build
   cp target/wasm32-unknown-unknown/release/*.wasm build/contract.wasm
   ```

2. **"Insufficient funds"**
   - Ensure your wallet has enough ETH for gas fees
   - Deployment typically costs 0.001-0.01 ETH on Arbitrum Sepolia

3. **"Invalid private key format"**
   - Use 64 hex characters (without 0x prefix)
   - Example: `9b5f44e759a897239d9b9a0320192a7ee2a0df1e91a18f67f04115d9f8f2c174`

4. **"Network connection failed"**
   - Verify your RPC_URL is correct
   - Check if the endpoint is accessible
   - Try switching to a different RPC provider

5. **"Invalid WASM file"**
   - Ensure the WASM file has the correct magic number
   - Recompile your Rust contract
   - Verify the file isn't corrupted

### Debug Mode

Enable debug logging for more detailed information:

```bash
DEBUG=true node deploy.js
```

### Manual Testing

Test your deployment script without actual deployment:

```bash
# Check environment and WASM file
node -e "
import('./deploy.js').then(async ({ default: StylusDeployer }) => {
  const deployer = new StylusDeployer();
  await deployer.initialize();
  console.log('✅ All checks passed!');
});
"
```

## Advanced Usage

### Programmatic Deployment

```javascript
import StylusDeployer from './deploy.js';

async function deployContract() {
  const deployer = new StylusDeployer();
  await deployer.initialize();
  
  const result = await deployer.deployContract();
  
  console.log('Contract deployed at:', result.contractAddress);
  return result;
}
```

### Custom Configuration

```javascript
// Override default configuration
process.env.PRIVATE_KEY = 'your-private-key';
process.env.RPC_URL = 'your-rpc-url';

import('./deploy.js');
```

## Security Notes

- **Never commit private keys to version control**
- **Use environment variables for sensitive data**
- **Test deployments on testnets first**
- **Verify contract addresses before sending funds**

## Additional Resources

- [Arbitrum Stylus Documentation](https://docs.arbitrum.io/stylus/stylus-gentle-introduction)
- [Rust WASM Book](https://rustwasm.github.io/docs/book/)
- [ethers.js Documentation](https://docs.ethers.org/v6/)
- [Arbitrum Sepolia Faucet](https://faucet.quicknode.com/arbitrum/sepolia)

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Stylus documentation
3. Ensure all prerequisites are installed
4. Verify environment configuration