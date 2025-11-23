//! Minimal DVote DAO Stylus Contract
//! Working version that compiles and deploys properly

#![no_main]
#![cfg_attr(not(feature = "export-abi"), no_std)]
extern crate alloc;

use stylus_sdk::prelude::*;
use stylus_sdk::alloy_primitives::{Address, U256};
use stylus_sdk::storage::{StorageAddress, StorageMap, StorageU256};

// Import the global allocator
#[global_allocator]
static ALLOC: mini_alloc::MiniAlloc = mini_alloc::MiniAlloc::INIT;

// Solidity events
sol_interface! {
    event ProposalCreated(uint256 indexed proposalId, address indexed proposer);
    event VoteCast(address indexed voter, uint256 indexed proposalId, uint256 weight);
    event MemberAdded(address indexed member);
}

/// Custom error types
#[derive(SolidityError)]
pub enum DAOError {
    NotMember,
    AlreadyVoted,
    InvalidProposal,
    Unauthorized,
}

/// Main DAO storage
#[solidity_storage]
pub struct DvoteDAO {
    /// Owner of the contract
    owner: StorageAddress,
    /// Total number of proposals
    proposal_count: StorageU256,
    /// Members mapping
    members: StorageMap<Address, StorageU256>, // address -> member_since_timestamp
    /// Vote counts for proposals
    vote_counts: StorageMap<U256, StorageU256>, // proposal_id -> vote_count
    /// User votes tracking
    user_votes: StorageMap<U256, StorageMap<Address, StorageU256>>, // proposal_id -> user -> vote_weight
}

/// External contract methods
#[external]
impl DvoteDAO {
    /// Initialize the DAO contract
    pub fn init(&mut self) -> Result<(), DAOError> {
        let sender = msg::sender();
        
        // Set owner if not already set
        if self.owner.get().is_zero() {
            self.owner.set(sender);
            // Add owner as first member
            self.members.insert(sender, StorageU256::new(block::timestamp()));
            evm::log(MemberAdded { member: sender });
        }
        
        Ok(())
    }

    /// Join the DAO as a member
    pub fn join_dao(&mut self) -> Result<(), DAOError> {
        let sender = msg::sender();
        let timestamp = block::timestamp();
        
        // Add member with timestamp
        self.members.insert(sender, StorageU256::new(timestamp));
        
        evm::log(MemberAdded { member: sender });
        Ok(())
    }

    /// Create a new proposal (members only)
    pub fn create_proposal(&mut self) -> Result<U256, DAOError> {
        let sender = msg::sender();
        
        // Check if sender is a member
        if self.members.get(sender).is_zero() {
            return Err(DAOError::NotMember);
        }

        // Increment proposal count
        let current_count = self.proposal_count.get();
        let new_proposal_id = current_count + U256::from(1);
        self.proposal_count.set(new_proposal_id);
        
        // Initialize vote count for this proposal
        self.vote_counts.insert(new_proposal_id, StorageU256::new(U256::ZERO));

        evm::log(ProposalCreated {
            proposalId: new_proposal_id,
            proposer: sender,
        });

        Ok(new_proposal_id)
    }

    /// Vote on a proposal
    pub fn vote(&mut self, proposal_id: U256) -> Result<(), DAOError> {
        let sender = msg::sender();
        
        // Check if sender is a member
        if self.members.get(sender).is_zero() {
            return Err(DAOError::NotMember);
        }

        // Check if proposal exists
        if proposal_id == U256::ZERO || proposal_id > self.proposal_count.get() {
            return Err(DAOError::InvalidProposal);
        }

        // Check if user already voted
        if !self.user_votes.get(proposal_id).get(sender).is_zero() {
            return Err(DAOError::AlreadyVoted);
        }

        let vote_weight = U256::from(1); // Simple: 1 vote per member
        
        // Record the vote
        self.user_votes.get_mut(proposal_id).insert(sender, StorageU256::new(vote_weight));
        
        // Update vote count
        let current_votes = self.vote_counts.get(proposal_id);
        self.vote_counts.insert(proposal_id, StorageU256::new(current_votes + vote_weight));

        evm::log(VoteCast {
            voter: sender,
            proposalId: proposal_id,
            weight: vote_weight,
        });

        Ok(())
    }

    /// Add a member (owner only)
    pub fn add_member(&mut self, new_member: Address) -> Result<(), DAOError> {
        let sender = msg::sender();
        
        // Only owner can add members
        if sender != self.owner.get() {
            return Err(DAOError::Unauthorized);
        }

        let timestamp = block::timestamp();
        self.members.insert(new_member, StorageU256::new(timestamp));

        evm::log(MemberAdded { member: new_member });
        Ok(())
    }

    // View functions (read-only)

    /// Get the contract owner
    pub fn get_owner(&self) -> Address {
        self.owner.get()
    }

    /// Check if an address is a member
    pub fn is_member(&self, user: Address) -> bool {
        !self.members.get(user).is_zero()
    }

    /// Get member join timestamp
    pub fn get_member_since(&self, user: Address) -> U256 {
        self.members.get(user)
    }

    /// Get total proposal count
    pub fn get_proposal_count(&self) -> U256 {
        self.proposal_count.get()
    }

    /// Get vote count for a proposal
    pub fn get_vote_count(&self, proposal_id: U256) -> U256 {
        self.vote_counts.get(proposal_id)
    }

    /// Check if user voted on a proposal
    pub fn has_voted(&self, proposal_id: U256, user: Address) -> bool {
        !self.user_votes.get(proposal_id).get(user).is_zero()
    }

    /// Get user's vote weight on a proposal
    pub fn get_user_vote(&self, proposal_id: U256, user: Address) -> U256 {
        self.user_votes.get(proposal_id).get(user)
    }

    /// Get current block timestamp
    pub fn get_timestamp(&self) -> U256 {
        block::timestamp()
    }

    /// Simple health check
    pub fn ping(&self) -> U256 {
        U256::from(42) // Return a constant to verify contract is working
    }
}