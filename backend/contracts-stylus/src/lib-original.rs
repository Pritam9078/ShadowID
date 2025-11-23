// Entry point for the complete Stylus DAO ecosystem contracts with ZK verification
#![cfg_attr(not(feature = "export-abi"), no_main)]
extern crate alloc;

// Export all contracts for complete DAO ecosystem
pub use dao::DAO;
pub use governance_token::GovernanceToken;
pub use treasury::Treasury;
pub use shadowid_registry::ShadowIDRegistry;
pub use zk_integration::ZkVerificationStorage;
pub use zk_enhanced_dao::ZkEnhancedDAO;

// Module declarations
pub mod dao;
pub mod governance_token;
pub mod treasury;
pub mod shadowid_registry;
pub mod zk_integration;
pub mod zk_enhanced_dao;

// ZK verifier module (referenced by zk_integration)
#[path = "../zk_verifier.rs"]
pub mod zk_verifier;