# Noir Installation Guide for Windows

Since the direct installation of nargo is challenging on Windows, here are alternative approaches:

## Option 1: Install via NPM Global Package (Recommended)

The easiest approach is to use the Node.js packages we already installed:

```bash
npm install -g @aztec/cli
```

This will provide access to Noir circuits through the Aztec toolchain.

## Option 2: Manual Binary Installation

1. Visit: https://github.com/noir-lang/noir/releases
2. Download the latest Windows binary: `nargo-x86_64-pc-windows-msvc.zip`
3. Extract to a folder like `C:\nargo\`
4. Add `C:\nargo\` to your system PATH

## Option 3: Use WSL (Windows Subsystem for Linux)

```bash
# In WSL terminal:
curl -L https://raw.githubusercontent.com/noir-lang/noirup/main/install | bash
source ~/.bashrc
nargo --version
```

## Option 4: Docker Alternative

Use Docker to run Noir in a container:

```dockerfile
FROM ubuntu:latest
RUN apt update && apt install -y curl
RUN curl -L https://raw.githubusercontent.com/noir-lang/noirup/main/install | bash
```

## Temporary Workaround for VS Code

To fix the `nargo.config.path.select` command error temporarily:

1. Open VS Code Settings (Ctrl+,)
2. Search for "noir"
3. Set the Nargo path manually if the extension provides this option
4. Or disable the Noir extension temporarily until nargo is installed

## For Development Without Nargo

You can still develop with our current setup:

1. The TypeScript integration examples work without nargo
2. Use the mock circuits we created
3. The smart contracts (Rust) are independent of nargo
4. Install nargo later for actual proof generation

## Current Status

✅ TypeScript integration working  
✅ Smart contracts ready  
✅ Circuit logic implemented  
⚠️ Need nargo for actual proof compilation  

The system is functional for development and testing without nargo installation.