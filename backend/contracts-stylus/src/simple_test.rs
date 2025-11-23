//! Simple Stylus contract to test basic compilation
#![cfg_attr(not(feature = "export-abi"), no_main)]
extern crate alloc;

use stylus_sdk::{
    alloy_primitives::{Address, U256},
    prelude::*,
};

#[derive(SolidityError)]
pub enum SimpleTestError {
    #[error("Test error")]
    TestError,
}

#[storage]
pub struct SimpleTest {
    value: U256,
}

#[external]
impl SimpleTest {
    pub fn get_value(&self) -> U256 {
        self.value.get()
    }

    pub fn set_value(&mut self, new_value: U256) -> Result<(), SimpleTestError> {
        self.value.set(new_value);
        Ok(())
    }
}