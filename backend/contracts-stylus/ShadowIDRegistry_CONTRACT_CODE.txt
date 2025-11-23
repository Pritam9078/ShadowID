/* 
ShadowIDRegistry Contract - Copy this code into shadowid_registry.rs
=================================================================
*/

//! ShadowIDRegistry - Noir ZK Proof Verification Registry for Arbitrum Stylus
#![cfg_attr(not(feature = "export-abi"), no_main)]
extern crate alloc;

use stylus_sdk::{
    alloy_primitives::{Address, U256, FixedBytes},
    alloy_sol_types::{sol, SolEvent},
    prelude::*,
    block, msg, evm,
};
use alloc::{string::String, vec::Vec};

/// User verification data as per specification
#[derive(Default, Clone, Debug)]
pub struct User {
    pub verified: bool,
    pub kyc_commitment: [u8; 32],
    pub proof_hash: [u8; 32],
}

/// Verified Wallet Badge
#[derive(Default, Clone, Debug)]
pub struct VerifiedBadge {
    pub badge_id: U256,
    pub issued_timestamp: U256,
    pub badge_type: u8,
    pub active: bool,
}

/// Admin data
#[derive(Default, Clone, Debug)]
pub struct AdminData {
    pub is_admin: bool,
    pub can_verify: bool,
    pub added_timestamp: U256,
}

sol! {
    event KycCommitmentSubmitted(address indexed user, bytes32 indexed commitment, uint256 timestamp);
    event ProofHashSubmitted(address indexed user, bytes32 indexed proofHash, uint256 timestamp);
    event UserVerified(address indexed user, address indexed verifier, uint256 badgeId, uint256 timestamp);
    event BadgeIssued(address indexed user, uint256 indexed badgeId, uint8 badgeType, uint256 timestamp);
    
    error AlreadyVerified(address user);
    error NotAuthorized(address caller);
    error InvalidCommitment(bytes32 commitment);
    error InvalidProof(bytes32 proofHash);
    error ZeroAddress();
}

#[solidity_storage]
#[entrypoint]
pub struct ShadowIDRegistry {
    owner: StorageAddress,
    users: StorageMap<Address, User>,
    badges: StorageMap<Address, VerifiedBadge>,
    next_badge_id: StorageU256,
    admins: StorageMap<Address, AdminData>,
    total_verified_users: StorageU256,
}

#[public]
impl ShadowIDRegistry {
    
    pub fn constructor(&mut self) -> Result<(), Vec<u8>> {
        self.owner.set(msg::sender());
        self.next_badge_id.set(U256::from(1));
        self.total_verified_users.set(U256::ZERO);
        
        let admin_data = AdminData {
            is_admin: true,
            can_verify: true,
            added_timestamp: U256::from(block::timestamp()),
        };
        self.admins.setter(msg::sender()).set(admin_data);
        Ok(())
    }

    /// Submit KYC commitment from Noir circuit
    pub fn submit_kyc(&mut self, user: Address, commitment: [u8; 32]) -> Result<(), Vec<u8>> {
        if user == Address::ZERO {
            evm::log(ZeroAddress {});
            return Err(b"Invalid user address".to_vec());
        }
        
        if commitment.iter().all(|&b| b == 0) {
            evm::log(InvalidCommitment { commitment: FixedBytes::from(commitment) });
            return Err(b"Invalid KYC commitment".to_vec());
        }
        
        let mut user_data = self.users.getter(user).get();
        
        if user_data.verified {
            evm::log(AlreadyVerified { user });
            return Err(b"User already verified".to_vec());
        }
        
        user_data.kyc_commitment = commitment;
        self.users.setter(user).set(user_data);
        
        evm::log(KycCommitmentSubmitted {
            user,
            commitment: FixedBytes::from(commitment),
            timestamp: U256::from(block::timestamp()),
        });
        
        Ok(())
    }

    /// Submit Noir ZK proof hash
    pub fn submit_proof(&mut self, user: Address, proof_hash: [u8; 32]) -> Result<(), Vec<u8>> {
        if user == Address::ZERO {
            evm::log(ZeroAddress {});
            return Err(b"Invalid user address".to_vec());
        }
        
        if proof_hash.iter().all(|&b| b == 0) {
            evm::log(InvalidProof { proofHash: FixedBytes::from(proof_hash) });
            return Err(b"Invalid proof hash".to_vec());
        }
        
        let mut user_data = self.users.getter(user).get();
        
        if user_data.verified {
            evm::log(AlreadyVerified { user });
            return Err(b"User already verified".to_vec());
        }
        
        user_data.proof_hash = proof_hash;
        self.users.setter(user).set(user_data);
        
        evm::log(ProofHashSubmitted {
            user,
            proofHash: FixedBytes::from(proof_hash),
            timestamp: U256::from(block::timestamp()),
        });
        
        Ok(())
    }

    /// Verify user and issue Verified Wallet Badge (admin only)
    pub fn verify_user(&mut self, user: Address) -> Result<(), Vec<u8>> {
        let admin = msg::sender();
        let admin_data = self.admins.get(admin);
        if !admin_data.is_admin || !admin_data.can_verify {
            evm::log(NotAuthorized { caller: admin });
            return Err(b"Only admin can verify users".to_vec());
        }
        
        if user == Address::ZERO {
            evm::log(ZeroAddress {});
            return Err(b"Invalid user address".to_vec());
        }
        
        let mut user_data = self.users.getter(user).get();
        
        if user_data.verified {
            evm::log(AlreadyVerified { user });
            return Err(b"User already verified".to_vec());
        }
        
        if user_data.kyc_commitment.iter().all(|&b| b == 0) {
            return Err(b"User must submit KYC commitment first".to_vec());
        }
        
        if user_data.proof_hash.iter().all(|&b| b == 0) {
            return Err(b"User must submit proof hash first".to_vec());
        }
        
        user_data.verified = true;
        self.users.setter(user).set(user_data);
        
        let badge_id = self.next_badge_id.get();
        let current_time = U256::from(block::timestamp());
        
        let badge = VerifiedBadge {
            badge_id,
            issued_timestamp: current_time,
            badge_type: 1,
            active: true,
        };
        
        self.badges.setter(user).set(badge);
        self.next_badge_id.set(badge_id + U256::from(1));
        
        let verified_count = self.total_verified_users.get();
        self.total_verified_users.set(verified_count + U256::from(1));
        
        evm::log(UserVerified {
            user,
            verifier: admin,
            badgeId: badge_id,
            timestamp: current_time,
        });
        
        evm::log(BadgeIssued {
            user,
            badgeId: badge_id,
            badgeType: 1,
            timestamp: current_time,
        });
        
        Ok(())
    }

    /// Check if user is verified
    pub fn is_verified(&self, user: Address) -> bool {
        if user == Address::ZERO {
            return false;
        }
        let user_data = self.users.get(user);
        user_data.verified
    }

    /// Get user verification data
    pub fn get_user(&self, user: Address) -> (bool, [u8; 32], [u8; 32]) {
        let user_data = self.users.get(user);
        (user_data.verified, user_data.kyc_commitment, user_data.proof_hash)
    }

    /// Get user badge information
    pub fn get_badge(&self, user: Address) -> (U256, U256, u8, bool) {
        let badge = self.badges.get(user);
        (badge.badge_id, badge.issued_timestamp, badge.badge_type, badge.active)
    }

    /// Check if address is admin
    pub fn is_admin(&self, addr: Address) -> bool {
        let admin_data = self.admins.get(addr);
        admin_data.is_admin
    }

    /// Get contract owner
    pub fn owner(&self) -> Address {
        self.owner.get()
    }

    /// Get contract statistics
    pub fn get_stats(&self) -> (U256, U256) {
        (
            self.total_verified_users.get(),
            self.next_badge_id.get(),
        )
    }
}

/*
USAGE INSTRUCTIONS:
===================
1. Copy the above code into: contracts-stylus/src/shadowid_registry.rs
2. Uncomment the shadowid_registry lines in lib.rs
3. The DAO contract is already configured to work with this registry
4. Deploy on Linux/WSL environment to avoid Windows crypto linking issues

INTEGRATION:
============
- The DAO contract calls is_verified(address) before allowing restricted actions
- Users submit KYC commitments and ZK proof hashes via submit_kyc() and submit_proof()
- Admins verify users via verify_user() which issues Verified Wallet Badges
- Complete privacy: only commitments and proof hashes stored on-chain
*/