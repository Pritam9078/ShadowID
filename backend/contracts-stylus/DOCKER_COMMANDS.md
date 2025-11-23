# Docker Development Scripts for Stylus

## 🚀 Quick Start Commands

### Build the Docker Image
```powershell
docker build -t dvote-stylus .
```

### Run One-Time Compilation
```powershell
# Check compilation (fastest)
docker run --rm -v ${PWD}:/workspace dvote-stylus cargo check --target wasm32-unknown-unknown

# Build debug version
docker run --rm -v ${PWD}:/workspace dvote-stylus cargo build --target wasm32-unknown-unknown

# Build release version (optimized)
docker run --rm -v ${PWD}:/workspace dvote-stylus cargo build --target wasm32-unknown-unknown --release

# Build with ABI export
docker run --rm -v ${PWD}:/workspace dvote-stylus cargo build --target wasm32-unknown-unknown --release --features export-abi
```

### Interactive Development Shell
```powershell
# Start interactive container
docker run -it --rm -v ${PWD}:/workspace dvote-stylus bash

# Inside the container, you can run:
cargo check --target wasm32-unknown-unknown
cargo build --target wasm32-unknown-unknown --release
cargo test
```

### Using Docker Compose (Recommended)
```powershell
# Start the development environment
docker-compose up -d stylus-dev

# Execute commands in the running container
docker-compose exec stylus-dev cargo check --target wasm32-unknown-unknown
docker-compose exec stylus-dev cargo build --target wasm32-unknown-unknown --release

# Get a shell in the running container
docker-compose exec stylus-dev bash

# Stop the environment
docker-compose down
```

## 🔧 Development Workflow

### 1. Start Development Environment
```powershell
docker-compose up -d stylus-dev
```

### 2. Compile Contracts
```powershell
docker-compose exec stylus-dev cargo build --target wasm32-unknown-unknown --release
```

### 3. Run Tests
```powershell
docker-compose exec stylus-dev cargo test
```

### 4. Format Code
```powershell
docker-compose exec stylus-dev cargo fmt
```

### 5. Lint Code
```powershell
docker-compose exec stylus-dev cargo clippy --target wasm32-unknown-unknown
```

## 🎯 Deployment Commands

### Build for Production
```powershell
docker-compose exec stylus-dev cargo build --target wasm32-unknown-unknown --release --features export-abi
```

### Deploy to Stylus (if stylus CLI is available)
```powershell
docker-compose exec stylus-dev stylus deploy --private-key=YOUR_PRIVATE_KEY target/wasm32-unknown-unknown/release/contracts_stylus.wasm
```

## 📊 Useful Commands

### Check Contract Sizes
```powershell
docker-compose exec stylus-dev ls -la target/wasm32-unknown-unknown/release/*.wasm
```

### Clean Build Cache
```powershell
docker-compose exec stylus-dev cargo clean
```

### Update Dependencies
```powershell
docker-compose exec stylus-dev cargo update
```