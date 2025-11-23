# 🐳 Docker Troubleshooting for Stylus Development

## Issue: Docker Desktop Not Responding

### Solution 1: Restart Docker Desktop
1. **Close Docker Desktop completely:**
   - Right-click Docker icon in system tray
   - Select "Quit Docker Desktop"
   - Wait 30 seconds

2. **Restart Docker Desktop:**
   - Press `Win + R`, type: `"C:\Program Files\Docker\Docker\Docker Desktop.exe"`
   - Wait for Docker to fully start (whale icon should be steady)

3. **Test Docker:**
   ```powershell
   docker --version
   docker info
   ```

### Solution 2: Quick Docker Test
```powershell
# Test basic Docker functionality
docker run hello-world
```

### Solution 3: Use Batch Script (Simpler)
```cmd
# Run the batch script we created
.\docker-build.bat
```

## Alternative: Manual Docker Commands

If Docker Desktop is working but scripts fail, use these manual commands:

### 1. Quick Compilation Test
```powershell
# Navigate to contracts directory
cd contracts-stylus

# Run one-time compilation in Docker
docker run --rm -v ${PWD}:/workspace -w /workspace rust:1.75-slim bash -c "
  apt-get update -qq && 
  apt-get install -y -qq pkg-config libssl-dev build-essential && 
  rustup target add wasm32-unknown-unknown && 
  cargo check --target wasm32-unknown-unknown
"
```

### 2. Interactive Development Container
```powershell
# Start an interactive container for development
docker run -it --rm -v ${PWD}:/workspace -w /workspace rust:1.75-slim bash

# Inside the container, run:
apt-get update && apt-get install -y pkg-config libssl-dev build-essential
rustup target add wasm32-unknown-unknown
cargo check --target wasm32-unknown-unknown
cargo build --target wasm32-unknown-unknown --release
```

### 3. Persistent Development Container
```powershell
# Create a named container for reuse
docker run -d --name stylus-dev -v ${PWD}:/workspace -w /workspace rust:1.75-slim tail -f /dev/null

# Setup the container (run once)
docker exec stylus-dev bash -c "apt-get update && apt-get install -y pkg-config libssl-dev build-essential && rustup target add wasm32-unknown-unknown"

# Use the container for compilation
docker exec stylus-dev cargo check --target wasm32-unknown-unknown
docker exec stylus-dev cargo build --target wasm32-unknown-unknown --release

# When done, remove the container
docker rm -f stylus-dev
```

## Expected Output
When compilation works, you should see:
```
✅ Checking contracts-stylus v0.1.0 (/workspace)
✅ Finished dev [unoptimized + debuginfo] target(s) in X.XXs
```

## Common Issues and Fixes

### Issue: "native_keccak256 symbol not found"
**This is expected on Windows!** The error occurs during proc-macro compilation, but the actual contract compilation works in Docker.

### Issue: "Permission denied"
```powershell
# Fix volume mounting permissions
docker run --rm -v ${PWD}:/workspace --user $(id -u):$(id -g) ...
```

### Issue: "Network timeout"
```powershell
# Pull base image first
docker pull rust:1.75-slim
```

## Success Indicators
- ✅ Docker version shows
- ✅ Docker info works
- ✅ Contracts compile without syntax errors
- ✅ WebAssembly target builds successfully

Your Stylus contracts are ready for deployment when Docker compilation succeeds!