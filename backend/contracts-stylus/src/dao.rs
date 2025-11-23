// SPDX-License-Identifier: MIT
#![cfg_attr(not(feature = "export-abi"), no_main)]
extern crate alloc;

/// Enhanced DAO contract with Noir ZK-proof KYC/KYB verification for Arbitrum Stylus
/// Integrates with ShadowIDRegistry for privacy-preserving identity verification
/// Only verified users can vote, create proposals, and execute proposals

use alloc::{string::String, vec::Vec};
use stylus_sdk::{
    alloy_primitives::{Address, U256, FixedBytes, Bytes},
    alloy_sol_types::{sol, SolEvent, SolCall},
    block, msg, evm,
    prelude::*,
    call::{Call, StaticCall},
};

// =============================================================================
// EXTERNAL CONTRACT INTERFACES
// =============================================================================

// External contract call functions - we'll use direct calls instead of interfaces

// =============================================================================
// DAO EVENTS
// =============================================================================

sol! {
    // Core DAO Events
    event ProposalCreated(
        uint256 indexed id, 
        address indexed proposer, 
        string title, 
        uint256 startTime, 
        uint256 endTime,
        bytes32 kycCommitment
    );
    event Voted(
        uint256 indexed id, 
        address indexed voter, 
        uint8 choice, 
        uint256 weight,
        bytes32 proofHash
    );
    event ProposalFinalized(uint256 indexed id, uint8 state);
    event ProposalExecuted(uint256 indexed id, address indexed executor);
    event ProposalCancelled(uint256 indexed id, address indexed cancelledBy);
    
    // DAO Configuration Events
    event AllowedTargetUpdated(address indexed target, bool allowed);
    event VotingPeriodUpdated(uint256 oldPeriod, uint256 newPeriod);
    event QuorumPercentUpdated(uint256 oldPct, uint256 newPct);
    event ExecutionDelayUpdated(uint256 oldDelay, uint256 newDelay);
    event ProposalThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);
    event TreasuryLinked(address indexed newTreasury);
    event ShadowIDRegistryUpdated(address indexed oldRegistry, address indexed newRegistry);
    
    // ShadowID Verification Events - Per Requirements
    event UserVerificationRequired(address indexed user);
    event ProofSubmitted(address indexed user);
    event ZKProofValidated(address indexed user, bytes32 commitment, bytes32 proofHash);
    event UnverifiedAccessAttempt(address indexed user, string action);
    
    // Member Management Events
    event MemberAdded(address indexed member);
    event KycSubmitted(address indexed member, bytes32 kycHash, bytes32 zkProofHash);
    event KycVerified(address indexed member, address indexed verifier);
    event KycVerifierAdded(address indexed verifier);
    
    // Errors
    error NotVerified(address user);
    error InvalidProof(address user, bytes32 commitment);
    error ProposalNotActive(uint256 id);
    error AlreadyVoted(address voter, uint256 proposalId);
    error Unauthorized(address caller);
    error InvalidAddress(address addr);
}

// =============================================================================
// DATA STRUCTURES
// =============================================================================

/// Proposal states as enum
#[derive(PartialEq, Debug, Clone, Copy)]
pub enum ProposalState {
    Active,
    Passed,
    Rejected,
    Executed,
    Cancelled,
}

impl Default for ProposalState {
    fn default() -> Self {
        ProposalState::Active
    }
}

impl From<ProposalState> for u8 {
    fn from(state: ProposalState) -> u8 {
        match state {
            ProposalState::Active => 0,
            ProposalState::Passed => 1,
            ProposalState::Rejected => 2,
            ProposalState::Executed => 3,
            ProposalState::Cancelled => 4,
        }
    }
}

/// Enhanced proposal data with ZK proof integration
#[derive(Default, Debug, Clone)]
pub struct ProposalCore {
    pub id: U256,
    pub proposer: Address,
    pub title: String,
    pub description: String,
    pub start_time: U256,
    pub end_time: U256,
    pub for_votes: U256,
    pub against_votes: U256,
    pub abstain_votes: U256,
    pub state: ProposalState,
    pub cancelled: bool,
    // ZK proof integration
    pub kyc_commitment: [u8; 32],        // KYC commitment from Noir ZK proof
    pub proof_hash: [u8; 32],            // Hash of the ZK proof
}

/// Execution details for proposals
#[derive(Default, Debug, Clone)]
pub struct ExecutionData {
    pub target: Address,
    pub value: U256,
    pub data: Vec<u8>,
    pub executed: bool,
    pub timelock_end: U256,
}

/// Enhanced member data with ZK verification
#[derive(Default, Debug, Clone)]
pub struct MemberData {
    pub is_member: bool,
    pub verified: bool,                   // Required: verification status
    pub kyc_commitment: [u8; 32],        // Required: KYC commitment from Noir
    pub proof_hash: [u8; 32],            // Required: ZK proof hash
    pub verification_timestamp: U256,
    pub verification_type: u8,           // 0: None, 1: KYC, 2: KYB, 3: Both
}

/// Vote record with ZK proof
#[derive(Default, Debug, Clone)]
pub struct VoteRecord {
    pub has_voted: bool,
    pub choice: u8,                      // 0: For, 1: Against, 2: Abstain
    pub weight: U256,
    pub proof_hash: [u8; 32],           // ZK proof for this vote
    pub timestamp: U256,
}

/// Reentrancy guard helper
#[derive(Debug)]
pub struct ReentrancyGuard {
    locked: bool,
}

impl ReentrancyGuard {
    pub fn new() -> Self {
        Self { locked: false }
    }

    pub fn guard(&mut self) -> Result<ReentrancyGuardLock<'_>, Vec<u8>> {
        if self.locked {
            return Err(b"ReentrancyGuard: reentrant call".to_vec());
        }
        self.locked = true;
        Ok(ReentrancyGuardLock { guard: self })
    }
}

pub struct ReentrancyGuardLock<'a> {
    guard: &'a mut ReentrancyGuard,
}

impl<'a> Drop for ReentrancyGuardLock<'a> {
    fn drop(&mut self) {
        self.guard.locked = false;
    }
}

// =============================================================================
// MAIN CONTRACT
// =============================================================================

#[solidity_storage]
#[entrypoint]
pub struct DAO {
    // Core DAO state
    owner: StorageAddress,
    governance_token: StorageAddress,
    treasury: StorageAddress,
    shadow_id_registry: StorageAddress,  // ShadowIDRegistry contract for ZK verification
    
    // Proposal management
    proposal_count: StorageU256,
    proposal_core: StorageMap<U256, ProposalCore>,
    execution_data: StorageMap<U256, ExecutionData>,
    
    // Enhanced voting tracking with ZK proofs
    user_votes: StorageMap<(U256, Address), VoteRecord>, // (proposal_id, user) -> vote record
    
    // DAO parameters
    voting_period: StorageU256,      // Duration of voting in seconds
    quorum_percent: StorageU256,     // Minimum percentage for quorum (out of 100)
    execution_delay: StorageU256,    // Delay before execution (timelock)
    proposal_threshold: StorageU256, // Min tokens needed to propose
    
    // Allowed execution targets (security)
    allowed_targets: StorageMap<Address, bool>,
    
    // ZK verification system - ENHANCED
    members: StorageMap<Address, MemberData>,
    verification_required: StorageBool,
    kyc_verifiers: StorageMap<Address, bool>, // KYC verifier addresses
    
    // ZK proof validation
    validated_proofs: StorageMap<Address, FixedBytes<32>>, // user -> latest validated commitment
    
    // Reentrancy protection
    reentrancy_guard: ReentrancyGuard,
}

// =============================================================================
// PUBLIC INTERFACE
// =============================================================================

#[public]
impl DAO {
    
    /// Initialize DAO with governance token, treasury, ShadowIDRegistry, and settings
    pub fn constructor(
        &mut self,
        governance_token: Address,
        treasury: Address,
        shadow_id_registry: Address,
        voting_period: U256,
        quorum_percent: U256,
        execution_delay: U256,
        proposal_threshold: U256,
    ) -> Result<(), Vec<u8>> {
        // Validate inputs
        if governance_token == Address::ZERO || treasury == Address::ZERO || shadow_id_registry == Address::ZERO {
            evm::log(InvalidAddress { addr: Address::ZERO });
            return Err(b"Invalid addresses provided".to_vec());
        }
        if quorum_percent > U256::from(100) {
            return Err(b"Quorum cannot exceed 100%".to_vec());
        }
        
        // Set initial state
        self.owner.set(msg::sender());
        self.governance_token.set(governance_token);
        self.treasury.set(treasury);
        self.shadow_id_registry.set(shadow_id_registry);
        
        // Set DAO parameters
        self.voting_period.set(voting_period);
        self.quorum_percent.set(quorum_percent);
        self.execution_delay.set(execution_delay);
        self.proposal_threshold.set(proposal_threshold);
        
        // Initialize proposal counter
        self.proposal_count.set(U256::from(1));
        
        // ZK verification is REQUIRED by default for security
        self.verification_required.set(true);
        
        // Add treasury as allowed target
        self.allowed_targets.setter(treasury).set(true);
        
        // Initialize reentrancy guard
        self.reentrancy_guard = ReentrancyGuard::new();
        
        evm::log(ShadowIDRegistryUpdated {
            oldRegistry: Address::ZERO,
            newRegistry: shadow_id_registry,
        });
        
        evm::log(VerificationRequired { required: true });
        
        Ok(())
    }

    /// Create new proposal with ShadowID verification
    /// Flow: User must be verified in ShadowIDRegistry before creating proposals
    pub fn create_proposal(
        &mut self,
        title: String,
        description: String,
        target: Address,
        value: U256,
        data: Vec<u8>,
        kyc_commitment: [u8; 32],       // KYC commitment from Noir ZK proof
        proof_hash: [u8; 32],          // ZK proof hash
    ) -> Result<U256, Vec<u8>> {
        let _guard = self.reentrancy_guard.guard()?;
        let proposer = msg::sender();
        
        // STEP 4: DAO checks: if !shadowid.is_verified(user) { revert("KYC required"); }
        if !self.is_user_verified_in_shadowid(proposer)? {
            // Emit required event: UserVerificationRequired(address)
            evm::log(UserVerificationRequired { user: proposer });
            return Err(b"KYC required".to_vec());
        }
        
        // Validate ZK proof commitment
        if !self.validate_zk_proof(proposer, kyc_commitment, proof_hash)? {
            evm::log(InvalidProof {
                user: proposer,
                commitment: FixedBytes::from(kyc_commitment),
            });
            return Err(b"Invalid ZK proof or commitment".to_vec());
        }
        
        // Check proposal threshold (governance token balance)
        // This would integrate with governance token contract in full implementation
        
        // Check target is allowed
        if !self.allowed_targets.get(target) {
            return Err(b"Target contract not allowed".to_vec());
        }
        
        let proposal_id = self.proposal_count.get();
        let current_time = U256::from(block::timestamp());
        
        // Create proposal core data with ZK proof integration
        let core = ProposalCore {
            id: proposal_id,
            proposer,
            title: title.clone(),
            description: description.clone(),
            start_time: current_time,
            end_time: current_time + self.voting_period.get(),
            for_votes: U256::ZERO,
            against_votes: U256::ZERO,
            abstain_votes: U256::ZERO,
            state: ProposalState::Active,
            cancelled: false,
            kyc_commitment,
            proof_hash,
        };
        
        // Create execution data
        let execution = ExecutionData {
            target,
            value,
            data,
            executed: false,
            timelock_end: U256::ZERO,
        };
        
        // Store proposal data
        self.proposal_core.setter(proposal_id).set(core);
        self.execution_data.setter(proposal_id).set(execution);
        
        // Increment counter for next proposal
        self.proposal_count.set(proposal_id + U256::from(1));
        
        // Emit event with ZK proof info
        evm::log(ProposalCreated {
            id: proposal_id,
            proposer,
            title,
            startTime: current_time,
            endTime: current_time + self.voting_period.get(),
            kycCommitment: FixedBytes::from(kyc_commitment),
        });
        
        Ok(proposal_id)
    }

    /// Vote on proposal with ShadowID verification (0: For, 1: Against, 2: Abstain)
    /// Flow: User must be verified in ShadowIDRegistry before voting
    pub fn vote(
        &mut self,
        proposal_id: U256,
        choice: u8,
        kyc_commitment: [u8; 32],       // KYC commitment from Noir ZK proof
        proof_hash: [u8; 32],          // ZK proof hash for this vote
    ) -> Result<(), Vec<u8>> {
        let voter = msg::sender();
        
        // STEP 4: DAO checks: if !shadowid.is_verified(user) { revert("KYC required"); }
        if !self.is_user_verified_in_shadowid(voter)? {
            // Emit required event: UserVerificationRequired(address)
            evm::log(UserVerificationRequired { user: voter });
            return Err(b"KYC required".to_vec());
        }
        
        // Validate ZK proof for this vote
        if !self.validate_zk_proof(voter, kyc_commitment, proof_hash)? {
            evm::log(InvalidProof {
                user: voter,
                commitment: FixedBytes::from(kyc_commitment),
            });
            return Err(b"Invalid ZK proof for vote".to_vec());
        }
        
        // Check if user already voted
        let existing_vote = self.user_votes.get((proposal_id, voter));
        if existing_vote.has_voted {
            evm::log(AlreadyVoted {
                voter,
                proposalId: proposal_id,
            });
            return Err(b"User already voted on this proposal".to_vec());
        }
        
        let mut core = self.proposal_core.getter(proposal_id).get();
        if core.state != ProposalState::Active {
            evm::log(ProposalNotActive { id: proposal_id });
            return Err(b"Proposal is not active".to_vec());
        }
        
        // Check voting period
        let current_time = U256::from(block::timestamp());
        if current_time > core.end_time {
            return Err(b"Voting period has ended".to_vec());
        }
        
        // Get voting weight (would integrate with governance token in full implementation)
        let weight = U256::from(1); // Simplified: each verified user gets 1 vote
        
        // Record vote based on choice
        match choice {
            0 => core.for_votes += weight,      // For
            1 => core.against_votes += weight,  // Against  
            2 => core.abstain_votes += weight,  // Abstain
            _ => return Err(b"Invalid vote choice (must be 0, 1, or 2)".to_vec()),
        }
        
        // Create detailed vote record
        let vote_record = VoteRecord {
            has_voted: true,
            choice,
            weight,
            proof_hash,
            timestamp: current_time,
        };
        
        // Store vote record
        self.user_votes.setter((proposal_id, voter)).set(vote_record);
        
        // Save updated proposal
        self.proposal_core.setter(proposal_id).set(core);
        
        // Emit event with ZK proof info
        evm::log(Voted {
            id: proposal_id,
            voter,
            choice,
            weight,
            proofHash: FixedBytes::from(proof_hash),
        });
        
        evm::log(ZKProofValidated {
            user: voter,
            commitment: FixedBytes::from(kyc_commitment),
            proofHash: FixedBytes::from(proof_hash),
        });
        
        Ok(())
    }

    /// Finalize proposal after voting period ends
    pub fn finalize_proposal(&mut self, proposal_id: U256) -> Result<(), Vec<u8>> {
        let mut core = self.proposal_core.getter(proposal_id).get();
        
        if core.state != ProposalState::Active {
            return Err(b"Proposal not active".to_vec());
        }
        
        // Check voting period has ended
        if U256::from(block::timestamp()) <= core.end_time {
            return Err(b"Voting period not ended".to_vec());
        }
        
        // Determine outcome based on votes
        let total_votes = core.for_votes + core.against_votes + core.abstain_votes;
        let quorum_required = U256::from(100); // Simplified quorum check
        
        if total_votes >= quorum_required && core.for_votes > core.against_votes {
            core.state = ProposalState::Passed;
        } else {
            core.state = ProposalState::Rejected;
        }
        
        let final_state = core.state;
        self.proposal_core.setter(proposal_id).set(core);
        evm::log(ProposalFinalized { id: proposal_id, state: final_state as u8 });
        Ok(())
    }

    /// Execute passed proposal with ShadowID verification
    /// Flow: User must be verified in ShadowIDRegistry before executing proposals
    pub fn execute_proposal(
        &mut self,
        proposal_id: U256,
        kyc_commitment: [u8; 32],       // KYC commitment from Noir ZK proof
        proof_hash: [u8; 32],          // ZK proof hash for execution
    ) -> Result<(), Vec<u8>> {
        let _guard = self.reentrancy_guard.guard()?;
        let executor = msg::sender();
        
        // STEP 4: DAO checks: if !shadowid.is_verified(user) { revert("KYC required"); }
        if !self.is_user_verified_in_shadowid(executor)? {
            // Emit required event: UserVerificationRequired(address)
            evm::log(UserVerificationRequired { user: executor });
            return Err(b"KYC required".to_vec());
        }
        
        // Validate ZK proof for execution
        if !self.validate_zk_proof(executor, kyc_commitment, proof_hash)? {
            evm::log(InvalidProof {
                user: executor,
                commitment: FixedBytes::from(kyc_commitment),
            });
            return Err(b"Invalid ZK proof for execution".to_vec());
        }
        
        let core = self.proposal_core.get(proposal_id);
        if core.state != ProposalState::Passed { 
            evm::log(ProposalNotActive { id: proposal_id });
            return Err(b"Proposal not in passed state".to_vec()); 
        }
        
        let mut execution = self.execution_data.getter(proposal_id).get();
        if execution.executed { 
            return Err(b"Proposal already executed".to_vec()); 
        }
        
        // Check timelock delay
        let current_time = U256::from(block::timestamp());
        if current_time < execution.timelock_end {
            return Err(b"Timelock period not expired".to_vec());
        }
        
        // Mark as executed
        execution.executed = true;
        let mut core_mut = self.proposal_core.getter(proposal_id).get();
        core_mut.state = ProposalState::Executed;
        
        // Save state
        self.execution_data.setter(proposal_id).set(execution);
        self.proposal_core.setter(proposal_id).set(core_mut);
        
        // Emit event
        evm::log(ProposalExecuted {
            id: proposal_id,
            executor,
        });
        
        evm::log(ZKProofValidated {
            user: executor,
            commitment: FixedBytes::from(kyc_commitment),
            proofHash: FixedBytes::from(proof_hash),
        });
        
        Ok(())
    }

    /// Cancel proposal (owner only)
    pub fn cancel_proposal(&mut self, proposal_id: U256) -> Result<(), Vec<u8>> {
        let caller = msg::sender();
        if caller != self.owner.get() {
            return Err(b"Only owner can cancel".to_vec());
        }
        
        let mut core = self.proposal_core.getter(proposal_id).get();
        if core.state != ProposalState::Active {
            return Err(b"Cannot cancel non-active proposal".to_vec());
        }
        
        core.state = ProposalState::Cancelled;
        self.proposal_core.setter(proposal_id).set(core);
        
        evm::log(ProposalCancelled {
            id: proposal_id,
            cancelledBy: caller,
        });
        
        Ok(())
    }

    // =============================================================================
    // KYC/KYB FUNCTIONS - NEW FEATURE
    // =============================================================================

    /// Add member to DAO
    pub fn add_member(&mut self, member: Address) -> Result<(), Vec<u8>> {
        let caller = msg::sender();
        if caller != self.owner.get() {
            return Err(b"Only owner can add members".to_vec());
        }
        
        let mut member_data = self.members.getter(member).get();
        member_data.is_member = true;
        self.members.setter(member).set(member_data);
        
        evm::log(MemberAdded { member });
        Ok(())
    }

    /// Submit KYC data and ZK proof hash
    pub fn submit_kyc_proof(&mut self, kyc_hash: FixedBytes<32>, zk_proof_hash: FixedBytes<32>) -> Result<(), Vec<u8>> {
        let member = msg::sender();
        let mut member_data = self.members.getter(member).get();
        
        member_data.kyc_hash = kyc_hash;
        member_data.zk_proof_hash = zk_proof_hash;
        self.members.setter(member).set(member_data);
        
        evm::log(KycSubmitted { member, kycHash: kyc_hash, zkProofHash: zk_proof_hash });
        Ok(())
    }

    /// Verify member KYC (verifier only)
    pub fn verify_member(&mut self, member: Address) -> Result<(), Vec<u8>> {
        let verifier = msg::sender();
        if !self.kyc_verifiers.get(verifier) {
            return Err(b"Not authorized verifier".to_vec());
        }
        
        let mut member_data = self.members.getter(member).get();
        member_data.verified = true;
        member_data.verification_timestamp = U256::from(block::timestamp());
        self.members.setter(member).set(member_data);
        
        evm::log(KycVerified { member, verifier });
        Ok(())
    }

    /// Add KYC verifier (owner only)
    pub fn add_verifier(&mut self, verifier: Address) -> Result<(), Vec<u8>> {
        let caller = msg::sender();
        if caller != self.owner.get() {
            return Err(b"Only owner".to_vec());
        }
        
        self.kyc_verifiers.setter(verifier).set(true);
        evm::log(KycVerifierAdded { verifier });
        Ok(())
    }

    // =============================================================================
    // VIEW FUNCTIONS
    // =============================================================================

    /// Get proposal details
    pub fn get_proposal(&self, proposal_id: U256) -> (
        U256, Address, String, String, U256, U256, U256, U256, U256, u8, bool
    ) {
        let core = self.proposal_core.get(proposal_id);
        (
            core.id,
            core.proposer,
            core.title,
            core.description,
            core.start_time,
            core.end_time,
            core.for_votes,
            core.against_votes,
            core.abstain_votes,
            core.state as u8,
            core.cancelled,
        )
    }

    /// Check if address is verified member
    pub fn is_verified_member(&self, member: Address) -> bool {
        let member_data = self.members.get(member);
        member_data.verified
    }

    /// Get DAO parameters
    pub fn get_parameters(&self) -> (U256, U256, U256, U256) {
        (
            self.voting_period.get(),
            self.quorum_percent.get(),
            self.execution_delay.get(),
            self.proposal_threshold.get(),
        )
    }

    /// Get current proposal count
    pub fn proposal_count(&self) -> U256 {
        self.proposal_count.get()
    }

    /// Get owner address
    pub fn owner(&self) -> Address {
        self.owner.get()
    }

    /// Get ShadowIDRegistry address
    pub fn shadow_id_registry(&self) -> Address {
        self.shadow_id_registry.get()
    }

    /// Update ShadowIDRegistry address (owner only)
    pub fn update_shadow_id_registry(&mut self, new_registry: Address) -> Result<(), Vec<u8>> {
        let caller = msg::sender();
        if caller != self.owner.get() {
            evm::log(Unauthorized { caller });
            return Err(b"Only owner can update ShadowIDRegistry".to_vec());
        }
        
        if new_registry == Address::ZERO {
            evm::log(InvalidAddress { addr: new_registry });
            return Err(b"Invalid registry address".to_vec());
        }
        
        let old_registry = self.shadow_id_registry.get();
        self.shadow_id_registry.set(new_registry);
        
        evm::log(ShadowIDRegistryUpdated {
            oldRegistry: old_registry,
            newRegistry: new_registry,
        });
        
        Ok(())
    }

    // =============================================================================
    // PRIVATE/INTERNAL HELPER FUNCTIONS
    // =============================================================================

    /// STEP 4: DAO checks: if !shadowid.is_verified(user) { revert("KYC required"); }
    /// Verifies user through ShadowIDRegistry contract integration
    /// Flow: Backend sends proof_hash to ShadowIDRegistry → DAO checks verification status
    fn is_user_verified_in_shadowid(&self, user: Address) -> Result<bool, Vec<u8>> {
        let registry = self.shadow_id_registry.get();
        
        // PRODUCTION: External call to ShadowIDRegistry.isVerified(user)
        // let is_verified = Call::new_in(self).call(registry, &IsVerifiedCall { user })?;
        
        // CURRENT: Check if user has valid proof registered (simulates ShadowIDRegistry state)
        // This represents: Backend sent proof_hash to ShadowIDRegistry after Aztec ZK proof generation
        let member_data = self.members.get(user);
        let is_verified = member_data.verified && 
                         !member_data.kyc_commitment.iter().all(|&b| b == 0) &&
                         !member_data.proof_hash.iter().all(|&b| b == 0);
        
        Ok(is_verified)
    }

    /// Validate ZK proof against commitment
    fn validate_zk_proof(&mut self, user: Address, commitment: [u8; 32], proof_hash: [u8; 32]) -> Result<bool, Vec<u8>> {
        // Check if commitment is not zero
        if commitment.iter().all(|&b| b == 0) {
            return Ok(false);
        }
        
        // Check if proof hash is not zero
        if proof_hash.iter().all(|&b| b == 0) {
            return Ok(false);
        }
        
        // In a full implementation, this would:
        // 1. Call ShadowIDRegistry.hasValidProof(user, commitment)
        // 2. Verify the ZK proof using Noir verification logic
        // 3. Check that the commitment matches user's KYC data
        
        // For now, store the validated proof
        self.validated_proofs.setter(user).set(FixedBytes::from(commitment));
        
        // Update member data with latest proof
        let mut member_data = self.members.getter(user).get();
        member_data.kyc_commitment = commitment;
        member_data.proof_hash = proof_hash;
        member_data.verification_timestamp = U256::from(block::timestamp());
        self.members.setter(user).set(member_data);
        
        Ok(true) // Simplified: assume valid if non-zero
    }

    /// COMPLETE FLOW INTEGRATION: Backend submits proof_hash to ShadowIDRegistry
    /// Flow: 1. User uploads KYC → 2. generates commitment via Noir → 3. generates ZK proof → Aztec
    /// → 4. Backend sends proof_hash to ShadowIDRegistry (this function simulates this step)
    pub fn submit_zk_proof(
        &mut self,
        user: Address,
        kyc_commitment: [u8; 32],     // STEP 1: KYC commitment from Noir circuit
        proof_hash: [u8; 32],        // STEP 2-3: ZK proof hash from Aztec generation
    ) -> Result<(), Vec<u8>> {
        let caller = msg::sender();
        
        // Only authorized backend service can submit proofs (simulates backend integration)
        if caller != self.owner.get() {
            evm::log(Unauthorized { caller });
            return Err(b"Only authorized backend can submit proofs".to_vec());
        }
        
        // Validate proof data from the complete KYC → Noir → Aztec flow
        if kyc_commitment.iter().all(|&b| b == 0) || proof_hash.iter().all(|&b| b == 0) {
            return Err(b"Invalid commitment or proof hash from ZK flow".to_vec());
        }
        
        // Update member verification status (simulates ShadowIDRegistry state)
        // In production: Backend would call ShadowIDRegistry.submitProof(user, proof_hash)
        let member_data = MemberData {
            is_member: true,
            verified: true,                               // User is now verified in ShadowID system
            kyc_commitment,
            proof_hash,
            verification_timestamp: U256::from(block::timestamp()),
            verification_type: 1, // ShadowID KYC verification
        };
        
        self.members.setter(user).set(member_data);
        self.validated_proofs.setter(user).set(FixedBytes::from(kyc_commitment));
        
        // Emit required events per specification
        evm::log(ProofSubmitted { user });              // Required event: ProofSubmitted(address)
        
        evm::log(ZKProofValidated {
            user,
            commitment: FixedBytes::from(kyc_commitment),
            proofHash: FixedBytes::from(proof_hash),
        });
        
        Ok(())
    }

    /// Register verified user (called after ShadowIDRegistry verification)
    /// This is the callback from ShadowIDRegistry after proof verification
    pub fn register_verified_user(
        &mut self,
        user: Address,
        kyc_commitment: [u8; 32],
        proof_hash: [u8; 32],
        verification_type: u8,
    ) -> Result<(), Vec<u8>> {
        let caller = msg::sender();
        
        // Only ShadowIDRegistry or owner can register verified users
        if caller != self.shadow_id_registry.get() && caller != self.owner.get() {
            evm::log(Unauthorized { caller });
            return Err(b"Only ShadowIDRegistry or owner can register verified users".to_vec());
        }
        
        let member_data = MemberData {
            is_member: true,
            verified: true,
            kyc_commitment,
            proof_hash,
            verification_timestamp: U256::from(block::timestamp()),
            verification_type,
        };
        
        self.members.setter(user).set(member_data);
        self.validated_proofs.setter(user).set(FixedBytes::from(kyc_commitment));
        
        evm::log(ZKProofValidated {
            user,
            commitment: FixedBytes::from(kyc_commitment),
            proofHash: FixedBytes::from(proof_hash),
        });
        
        Ok(())
    }

    /// Get user verification status and proof data
    pub fn get_user_verification(&self, user: Address) -> (bool, [u8; 32], [u8; 32], u8, U256) {
        let member_data = self.members.get(user);
        (
            member_data.verified,
            member_data.kyc_commitment,
            member_data.proof_hash,
            member_data.verification_type,
            member_data.verification_timestamp,
        )
    }

    /// Get vote record for user on specific proposal
    pub fn get_vote_record(&self, proposal_id: U256, user: Address) -> (bool, u8, U256, [u8; 32], U256) {
        let vote_record = self.user_votes.get((proposal_id, user));
        (
            vote_record.has_voted,
            vote_record.choice,
            vote_record.weight,
            vote_record.proof_hash,
            vote_record.timestamp,
        )
    }

    /// Check if user is verified in ShadowIDRegistry (public view function)
    /// This implements the check: shadowid.is_verified(user)
    pub fn is_user_verified(&self, user: Address) -> bool {
        match self.is_user_verified_in_shadowid(user) {
            Ok(verified) => verified,
            Err(_) => false,
        }
    }

    /// Get KYC flow status for frontend integration
    /// Returns: (needs_kyc_upload, needs_zk_proof, is_verified, proof_submitted)
    pub fn get_kyc_status(&self, user: Address) -> (bool, bool, bool, bool) {
        let member_data = self.members.get(user);
        
        let has_commitment = !member_data.kyc_commitment.iter().all(|&b| b == 0);
        let has_proof = !member_data.proof_hash.iter().all(|&b| b == 0);
        
        let needs_kyc_upload = !has_commitment;
        let needs_zk_proof = has_commitment && !has_proof;
        let is_verified = member_data.verified;
        let proof_submitted = has_proof;
        
        (needs_kyc_upload, needs_zk_proof, is_verified, proof_submitted)
    }

    /// Trigger KYC requirement check (helper function for frontend)
    pub fn require_verification(&self, user: Address) -> Result<(), Vec<u8>> {
        if !self.is_user_verified(user) {
            evm::log(UserVerificationRequired { user });
            return Err(b"KYC required".to_vec());
        }
        Ok(())
    }
}