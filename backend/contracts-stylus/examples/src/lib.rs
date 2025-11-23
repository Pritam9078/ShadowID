//! Example Stylus contract demonstrating ZK proof verification
//! 
//! This is a standalone example that shows how to use the ZK verifier
//! in Stylus contracts. To run this example:
//!
//! ```bash
//! cd contracts-stylus/examples
//! cargo check --features export-abi
//! ```

#![cfg_attr(not(feature = "export-abi"), no_main)]
extern crate alloc;

// This would normally import from the main crate
// For this example, we'll use a mock verifier
pub mod mock_zk_verifier;
pub mod verify_noir_proof;

// Re-export the main example
pub use verify_noir_proof::DVoteDAO;