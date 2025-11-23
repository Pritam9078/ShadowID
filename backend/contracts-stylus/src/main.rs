//! ABI Export utility for DVote DAO Stylus contract

use dvote_dao_stylus::DvoteDAO;

#[cfg(feature = "export-abi")]
fn main() {
    stylus_sdk::abi::export::print_abi::<DvoteDAO>();
}

#[cfg(not(feature = "export-abi"))]
fn main() {
    panic!("ABI export feature not enabled");
}