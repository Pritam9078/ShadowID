//! Stylus Integration Module for ZK Proof Verification
//! 
//! This module integrates the ZK verifier with Arbitrum Stylus contracts,
//! providing ABI-compatible functions for on-chain verification.

use stylus_sdk::{
    alloy_primitives::{Address, Bytes, U256},
    call::RawCall,
    prelude::*,
    storage::{StorageMap, StorageBool, StorageU256, StorageAddress},
};

use crate::zk_verifier::{verify_noir_proof, verify_noir_proof_with_result, VerificationResult};

/// Storage layout for ZK verification state
#[storage]
pub struct ZkVerificationStorage {
    /// Mapping of proof hash to verification status
    pub verified_proofs: StorageMap<[u8; 32], StorageBool>,
    
    /// Mapping of circuit name to verification key hash
    pub circuit_vk_hashes: StorageMap<String, [u8; 32]>,
    
    /// Total number of proofs verified
    pub total_verifications: StorageU256,
    
    /// Admin address that can manage verification keys
    pub admin: StorageAddress<Address>,
}

/// Events emitted by the ZK verifier
sol_interface! {
    /// Emitted when a proof is successfully verified
    event ProofVerified(
        bytes32 indexed proofHash,
        string indexed circuitName,
        address indexed verifier,
        bytes32 publicInputsHash,
        uint256 gasUsed
    );
    
    /// Emitted when proof verification fails
    event ProofVerificationFailed(
        bytes32 indexed proofHash,
        string indexed circuitName,
        address indexed verifier,
        string reason
    );
    
    /// Emitted when a new verification key is registered
    event VerificationKeyRegistered(
        string indexed circuitName,
        bytes32 indexed vkHash,
        address indexed admin
    );
}

/// Stylus contract for ZK proof verification
#[public]
impl ZkVerificationStorage {
    /// Initialize the contract with admin address
    pub fn initialize(&mut self, admin: Address) -> Result<(), Vec<u8>> {
        if self.admin.get() != Address::ZERO {
            return Err(b"Already initialized".to_vec());
        }
        
        self.admin.set(admin);
        Ok(())
    }

    /// Verify a Noir ZK proof on-chain
    /// 
    /// # Arguments
    /// * `proof_json` - JSON-encoded proof from Noir circuits
    /// * `vk_json` - JSON-encoded verification key
    /// 
    /// # Returns
    /// * `bool` - true if proof is valid and verified
    pub fn verify_zk_proof(&mut self, proof_json: Bytes, vk_json: Bytes) -> Result<bool, Vec<u8>> {
        // Convert Bytes to &[u8] for verification
        let proof_bytes = proof_json.as_ref();
        let vk_bytes = vk_json.as_ref();
        
        // Perform detailed verification
        match verify_noir_proof_with_result(proof_bytes, vk_bytes) {
            Ok(result) => {
                let proof_hash = self.compute_proof_hash(proof_bytes);
                
                if result.valid {
                    // Store verification result
                    self.verified_proofs.setter(proof_hash).set(true);
                    self.total_verifications.set(self.total_verifications.get() + U256::from(1));
                    
                    // Emit success event
                    evm::log(ProofVerified {
                        proofHash: proof_hash,
                        circuitName: result.circuit_name,
                        verifier: msg::sender(),
                        publicInputsHash: self.hex_to_bytes32(&result.public_inputs_hash)?,
                        gasUsed: U256::from(result.gas_used.unwrap_or(0)),
                    });
                    
                    Ok(true)
                } else {
                    // Emit failure event
                    evm::log(ProofVerificationFailed {
                        proofHash: proof_hash,
                        circuitName: result.circuit_name,
                        verifier: msg::sender(),
                        reason: result.error.unwrap_or("Verification failed".to_string()),
                    });
                    
                    Ok(false)
                }
            }
            Err(error_msg) => {
                let proof_hash = self.compute_proof_hash(proof_bytes);
                
                // Emit failure event
                evm::log(ProofVerificationFailed {
                    proofHash: proof_hash,
                    circuitName: "unknown".to_string(),
                    verifier: msg::sender(),
                    reason: error_msg,
                });
                
                Ok(false)
            }
        }
    }

    /// Batch verify multiple proofs for gas efficiency
    pub fn batch_verify_proofs(
        &mut self, 
        proofs: Vec<Bytes>, 
        verification_keys: Vec<Bytes>
    ) -> Result<Vec<bool>, Vec<u8>> {
        if proofs.len() != verification_keys.len() {
            return Err(b"Mismatched proof and VK arrays".to_vec());
        }
        
        let mut results = Vec::new();
        
        for (proof, vk) in proofs.iter().zip(verification_keys.iter()) {
            let result = self.verify_zk_proof(proof.clone(), vk.clone())?;
            results.push(result);
        }
        
        Ok(results)
    }

    /// Register a verification key for a specific circuit
    pub fn register_verification_key(
        &mut self, 
        circuit_name: String, 
        vk_json: Bytes
    ) -> Result<(), Vec<u8>> {
        // Only admin can register verification keys
        if msg::sender() != self.admin.get() {
            return Err(b"Only admin can register verification keys".to_vec());
        }
        
        let vk_hash = self.compute_vk_hash(vk_json.as_ref());
        self.circuit_vk_hashes.setter(circuit_name.clone()).set(vk_hash);
        
        // Emit registration event
        evm::log(VerificationKeyRegistered {
            circuitName: circuit_name,
            vkHash: vk_hash,
            admin: msg::sender(),
        });
        
        Ok(())
    }

    /// Check if a proof has been previously verified
    pub fn is_proof_verified(&self, proof_json: Bytes) -> bool {
        let proof_hash = self.compute_proof_hash(proof_json.as_ref());
        self.verified_proofs.get(proof_hash)
    }

    /// Get the verification key hash for a circuit
    pub fn get_circuit_vk_hash(&self, circuit_name: String) -> [u8; 32] {
        self.circuit_vk_hashes.get(circuit_name)
    }

    /// Get total number of successful verifications
    pub fn get_total_verifications(&self) -> U256 {
        self.total_verifications.get()
    }

    /// Verify a DVote-specific circuit with additional validation
    pub fn verify_dvote_circuit(
        &mut self, 
        circuit_type: String,
        proof_json: Bytes, 
        vk_json: Bytes,
        expected_public_inputs: Vec<String>
    ) -> Result<bool, Vec<u8>> {
        // Validate circuit type is supported
        match circuit_type.as_str() {
            "age_proof" | "citizenship_proof" | "attribute_proof" => {},
            _ => return Err(b"Unsupported circuit type".to_vec()),
        }
        
        // Parse proof to validate circuit name matches
        let proof_str = std::str::from_utf8(proof_json.as_ref())
            .map_err(|_| b"Invalid proof JSON".to_vec())?;
        
        if !proof_str.contains(&format!("\"circuit_name\":\"{circuit_type}\"")) {
            return Err(b"Circuit type mismatch".to_vec());
        }
        
        // Use standard verification
        self.verify_zk_proof(proof_json, vk_json)
    }

    /// Emergency pause function (admin only)
    pub fn set_admin(&mut self, new_admin: Address) -> Result<(), Vec<u8>> {
        if msg::sender() != self.admin.get() {
            return Err(b"Only current admin can change admin".to_vec());
        }
        
        self.admin.set(new_admin);
        Ok(())
    }

    /// Compute SHA256 hash of proof data
    fn compute_proof_hash(&self, proof_data: &[u8]) -> [u8; 32] {
        use stylus_sdk::crypto::keccak;
        keccak(proof_data)
    }

    /// Compute SHA256 hash of verification key data
    fn compute_vk_hash(&self, vk_data: &[u8]) -> [u8; 32] {
        use stylus_sdk::crypto::keccak;
        keccak(vk_data)
    }

    /// Convert hex string to bytes32
    fn hex_to_bytes32(&self, hex_str: &str) -> Result<[u8; 32], Vec<u8>> {
        let hex_clean = if hex_str.starts_with("0x") {
            &hex_str[2..]
        } else {
            hex_str
        };
        
        if hex_clean.len() != 64 {
            return Err(b"Invalid hex length".to_vec());
        }
        
        let bytes = hex::decode(hex_clean)
            .map_err(|_| b"Invalid hex string".to_vec())?;
        
        let mut result = [0u8; 32];
        result.copy_from_slice(&bytes);
        Ok(result)
    }
}

/// Gas-optimized verification for specific use cases
#[public]
impl ZkVerificationStorage {
    /// Quick verification without storage (gas optimized)
    pub fn verify_proof_readonly(proof_json: Bytes, vk_json: Bytes) -> bool {
        verify_noir_proof(proof_json.as_ref(), vk_json.as_ref())
    }

    /// Get estimated gas cost for verification
    pub fn estimate_verification_gas(proof_json: Bytes, vk_json: Bytes) -> U256 {
        // Rough estimate based on proof size and complexity
        let base_cost = 50000; // Base verification cost
        let proof_size_cost = proof_json.len() * 10; // Per-byte cost
        let vk_size_cost = vk_json.len() * 5; // VK processing cost
        
        U256::from(base_cost + proof_size_cost + vk_size_cost)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_proof_hash_computation() {
        // Test proof hash computation
        let storage = ZkVerificationStorage::default();
        let proof_data = b"test proof data";
        let hash1 = storage.compute_proof_hash(proof_data);
        let hash2 = storage.compute_proof_hash(proof_data);
        
        assert_eq!(hash1, hash2); // Should be deterministic
    }
}