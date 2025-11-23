#![no_main]

use stylus_sdk::{entrypoint, prelude::*};

// Simple global counters for MVP
static mut MEMBER_COUNT: u32 = 0;
static mut PROPOSAL_COUNT: u32 = 0;

/// DVote DAO Simple Stylus Contract
/// This is a minimal implementation to avoid Windows linking issues
/// 
/// Commands:
/// - "add_member" - Add a member (increments counter)
/// - "get_member_count" - Get total members
/// - "create_proposal" - Create proposal (increments counter) 
/// - "get_proposal_count" - Get total proposals
/// - "info" - Get contract info
#[entrypoint]
fn user_main(input: Vec<u8>) -> Result<Vec<u8>, Vec<u8>> {
    // Parse input as string
    let input_str = core::str::from_utf8(&input)
        .map_err(|_| b"Invalid UTF-8 input".to_vec())?;
    
    // Simple command parsing
    match input_str {
        "add_member" => {
            unsafe {
                MEMBER_COUNT += 1;
                let result = format!("Member added. Total members: {}", MEMBER_COUNT);
                Ok(result.into_bytes())
            }
        }
        
        "get_member_count" => {
            unsafe {
                Ok(MEMBER_COUNT.to_string().into_bytes())
            }
        }
        
        "create_proposal" => {
            unsafe {
                PROPOSAL_COUNT += 1;
                let result = format!("Proposal created. ID: {}", PROPOSAL_COUNT - 1);
                Ok(result.into_bytes())
            }
        }
        
        "get_proposal_count" => {
            unsafe {
                Ok(PROPOSAL_COUNT.to_string().into_bytes())
            }
        }
        
        "info" => {
            unsafe {
                let info = format!(
                    "DVote DAO Simple v1.0 | Members: {} | Proposals: {}", 
                    MEMBER_COUNT, 
                    PROPOSAL_COUNT
                );
                Ok(info.into_bytes())
            }
        }
        
        _ => {
            Err(b"Unknown command. Available: add_member, get_member_count, create_proposal, get_proposal_count, info".to_vec())
        }
    }
}