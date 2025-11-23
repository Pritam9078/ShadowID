//! Windows-Compatible Stylus Contract - No keccak256 dependencies
#![cfg_attr(not(feature = "export-abi"), no_main)]
#![no_std]
extern crate alloc;

use alloc::vec::Vec;
use stylus_sdk::{
    prelude::*,
    storage::{StorageU256, StorageBool},
    msg,
};

// Simple types without alloy-primitives dependency
type Address = [u8; 20];
type U256 = u64; // Simplified for Windows compatibility

/// Windows-compatible DAO contract
#[entrypoint]
#[storage]
pub struct WindowsDAO {
    /// Contract owner (20 bytes)
    owner: [StorageU256; 3], // Store address as 3 u64 values
    
    /// Member count
    members: StorageU256,
    
    /// Initialization status
    initialized: StorageBool,
}

#[external]
impl WindowsDAO {
    /// Initialize the contract
    pub fn initialize(&mut self) -> Result<(), Vec<u8>> {
        if self.initialized.get() {
            return Err(b"Already initialized".to_vec());
        }
        
        // Store caller address in simplified format
        let caller_bytes = msg::sender_bytes(); // This should work without keccak
        self.store_address(caller_bytes);
        
        self.members.set(0);
        self.initialized.set(true);
        
        Ok(())
    }

    /// Add member (simplified)
    pub fn add_member(&mut self) -> Result<(), Vec<u8>> {
        if !self.initialized.get() {
            return Err(b"Not initialized".to_vec());
        }
        
        let current = self.members.get();
        self.members.set(current + 1);
        
        Ok(())
    }

    /// Get member count
    pub fn get_member_count(&self) -> u64 {
        self.members.get()
    }

    /// Check if initialized
    pub fn is_initialized(&self) -> bool {
        self.initialized.get()
    }
}

impl WindowsDAO {
    /// Store address in a way that doesn't require keccak
    fn store_address(&mut self, addr_bytes: [u8; 20]) {
        // Convert 20 bytes to 3 u64 values (simplified)
        let val1 = u64::from_be_bytes([
            addr_bytes[0], addr_bytes[1], addr_bytes[2], addr_bytes[3],
            addr_bytes[4], addr_bytes[5], addr_bytes[6], addr_bytes[7],
        ]);
        let val2 = u64::from_be_bytes([
            addr_bytes[8], addr_bytes[9], addr_bytes[10], addr_bytes[11],
            addr_bytes[12], addr_bytes[13], addr_bytes[14], addr_bytes[15],
        ]);
        let val3 = u64::from_be_bytes([
            addr_bytes[16], addr_bytes[17], addr_bytes[18], addr_bytes[19],
            0, 0, 0, 0, // Pad with zeros
        ]);
        
        self.owner[0].set(val1);
        self.owner[1].set(val2); 
        self.owner[2].set(val3);
    }
}

// Export for ABI generation
stylus_sdk::entrypoint!(WindowsDAO);