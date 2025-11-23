# GitHub Codespaces Setup for Stylus Development

## Quick Setup
1. Go to your GitHub repository
2. Click "Code" → "Codespaces" → "Create codespace on master"
3. Wait for the environment to load (Linux-based)
4. Run compilation commands:

```bash
# Install Rust and required targets
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env
rustup target add wasm32-unknown-unknown

# Navigate to contracts directory
cd contracts-stylus

# Compile successfully on Linux
cargo check --target wasm32-unknown-unknown
cargo build --target wasm32-unknown-unknown --release
```

## Benefits
- ✅ No local setup required
- ✅ Linux environment (Stylus SDK works perfectly)
- ✅ VS Code interface in browser
- ✅ Free for personal use (60 hours/month)
- ✅ Integrated with GitHub