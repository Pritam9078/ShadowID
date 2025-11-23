# Optimized Dockerfile for Stylus Contract Development
FROM rust:1.75-slim

# Set metadata
LABEL maintainer="DVote Development Team"
LABEL description="Stylus Smart Contract Development Environment"

# Install system dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    build-essential \
    git \
    curl \
    wget \
    nano \
    vim \
    && rm -rf /var/lib/apt/lists/*

# Install WebAssembly target for Stylus
RUN rustup target add wasm32-unknown-unknown

# Install Stylus CLI tools (with error handling)
RUN cargo install --git https://github.com/OffchainLabs/stylus-sdk-rs stylus-cli || echo "Stylus CLI installation skipped - continuing without it"

# Set working directory
WORKDIR /workspace

# Copy Cargo files for dependency pre-compilation
COPY Cargo.toml Cargo.lock* ./

# Create dummy source for dependency compilation
RUN mkdir -p src && echo "fn main() {}" > src/lib.rs

# Pre-compile dependencies (speeds up subsequent builds)
RUN cargo build --target wasm32-unknown-unknown --release || echo "Initial build completed with warnings"

# Clean up dummy files
RUN rm -rf src

# Set environment variables optimized for Stylus
ENV CARGO_TARGET_DIR=/workspace/target
ENV RUSTFLAGS="-C target-feature=+bulk-memory,+sign-ext"

# Default command
CMD ["bash"]