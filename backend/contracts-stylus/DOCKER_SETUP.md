# Docker Commands for Stylus Development

## Build the Docker image
```powershell
docker build -t stylus-dev .
```

## Run compilation in Docker container
```powershell
# Mount current directory and run cargo check
docker run --rm -v ${PWD}:/workspace stylus-dev cargo check --target wasm32-unknown-unknown

# Run cargo build
docker run --rm -v ${PWD}:/workspace stylus-dev cargo build --target wasm32-unknown-unknown --release

# Interactive shell for development
docker run -it --rm -v ${PWD}:/workspace stylus-dev bash
```

## Docker Compose (Optional)
```yaml
version: '3.8'
services:
  stylus-dev:
    build: .
    volumes:
      - .:/workspace
    working_dir: /workspace
    command: tail -f /dev/null
```

## Benefits
- ✅ Consistent environment across platforms
- ✅ Isolated from host system
- ✅ Easy to share and reproduce
- ✅ No need to modify host system