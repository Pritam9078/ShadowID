//! Simple lib.rs for testing Stylus SDK compilation
#![cfg_attr(not(feature = "export-abi"), no_main)]
extern crate alloc;

pub mod simple_test;
pub use simple_test::SimpleTest;