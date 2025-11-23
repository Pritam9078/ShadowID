# WSL2 Setup for Stylus Development on Windows

## Step 1: Install WSL2
```powershell
# Run as Administrator
wsl --install Ubuntu
# Restart your computer when prompted
```

## Step 2: Setup Development Environment in WSL2
```bash
# After restart, open WSL2 terminal
# Update system
sudo apt update && sudo apt upgrade -y

# Install essential tools
sudo apt install -y curl build-essential git

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# Add WebAssembly target
rustup target add wasm32-unknown-unknown

# Install Node.js (for full development)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

## Step 3: Access Your Windows Files
```bash
# Your Windows files are accessible at /mnt/c/
cd /mnt/c/Users/HP/Downloads/DVote-main/DVote-main/contracts-stylus

# Compile successfully
cargo check --target wasm32-unknown-unknown
cargo build --target wasm32-unknown-unknown --release
```

## Step 4: VS Code Integration
```bash
# Install VS Code Server in WSL2
code .
# This will install VS Code server and open your project
```

## Benefits
- ✅ Full Linux environment on Windows
- ✅ Access to Windows filesystem
- ✅ VS Code integration
- ✅ Native Docker support
- ✅ Best performance for local development