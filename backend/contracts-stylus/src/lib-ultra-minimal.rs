//! Ultra-minimal Stylus contract for Windows compilation testing
#![cfg_attr(not(feature = "export-abi"), no_main)]
#![no_std]
extern crate alloc;

use alloc::vec::Vec;
use stylus_sdk::{prelude::*, storage::StorageU256};

/// Ultra-simple contract that should compile on Windows
#[entrypoint]
#[storage]
pub struct SimpleCounter {
    count: StorageU256,
}

#[external]
impl SimpleCounter {
    /// Initialize counter
    pub fn init(&mut self) {
        self.count.set(0);
    }

    /// Increment counter
    pub fn increment(&mut self) {
        let current = self.count.get();
        self.count.set(current + 1);
    }

    /// Get current count
    pub fn get_count(&self) -> u64 {
        self.count.get()
    }

    /// Reset counter
    pub fn reset(&mut self) {
        self.count.set(0);
    }
}