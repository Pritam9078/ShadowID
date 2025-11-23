//! Minimal Stylus DAO contract without problematic dependencies
#![cfg_attr(not(feature = "export-abi"), no_main)]
extern crate alloc;

use stylus_sdk::{prelude::*, storage::{StorageAddress, StorageU256, StorageBool}};
use alloy_primitives::{Address, U256};

/// Simple DAO contract for testing Stylus compilation
#[entrypoint]
#[storage]
pub struct SimpleDAO {
    /// Contract owner
    owner: StorageAddress,
    
    /// Member registry
    members: StorageU256, // Count of members for simplicity
    
    /// Contract initialization status
    initialized: StorageBool,
}

#[external]
impl SimpleDAO {
    /// Initialize the DAO
    pub fn initialize(&mut self, owner: Address) -> Result<(), Vec<u8>> {
        if self.initialized.get() {
            return Err(b"Already initialized".to_vec());
        }
        
        self.owner.set(owner);
        self.members.set(U256::ZERO);
        self.initialized.set(true);
        
        Ok(())
    }

    /// Add a member (owner only)
    pub fn add_member(&mut self) -> Result<(), Vec<u8>> {
        if !self.initialized.get() {
            return Err(b"Not initialized".to_vec());
        }
        
        if msg::sender() != self.owner.get() {
            return Err(b"Not owner".to_vec());
        }
        
        let current_count = self.members.get();
        self.members.set(current_count + U256::from(1));
        
        Ok(())
    }

    /// Get member count
    pub fn member_count(&self) -> U256 {
        self.members.get()
    }

    /// Check if initialized
    pub fn is_initialized(&self) -> bool {
        self.initialized.get()
    }

    /// Get owner address
    pub fn owner(&self) -> Address {
        self.owner.get()
    }
}