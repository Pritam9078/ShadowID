// SPDX-License-Identifier: MIT
#![cfg_attr(not(feature = "export-abi"), no_main)]
extern crate alloc;

/// @title GovernanceToken - Arbitrum Stylus Implementation
/// @dev ERC20 token with voting, delegation, permit, and role-based mint/burn access
/// @dev Converted from Solidity with enhanced WASM optimization

use alloc::{string::String, vec::Vec};
use stylus_sdk::{
    alloy_primitives::{Address, U256, FixedBytes, B256},
    alloy_sol_types::{sol, SolType},
    block, msg,
    prelude::*,
    crypto,
};

// Constants
const MAX_SUPPLY: u128 = 1_000_000 * 10_u128.pow(18);
const MINT_COOLDOWN: u64 = 1 * 24 * 60 * 60; // 1 day in seconds

// Pre-computed role hashes (avoiding runtime keccak256)
const ADMIN_ROLE: FixedBytes<32> = FixedBytes([
    125, 155, 18, 189, 73, 89, 219, 10, 25, 239, 219, 117, 47, 10, 209, 102, 
    129, 22, 11, 235, 17, 255, 143, 8, 224, 60, 13, 24, 154, 255, 65, 126
]);
const MINTER_ROLE: FixedBytes<32> = FixedBytes([
    158, 248, 89, 21, 149, 109, 137, 181, 143, 10, 237, 202, 119, 14, 21, 18, 
    126, 7, 178, 1, 120, 171, 156, 170, 100, 239, 115, 25, 107, 4, 132, 16
]);
const DEFAULT_ADMIN_ROLE: FixedBytes<32> = FixedBytes([0; 32]);

// EIP-712 constants
const PERMIT_TYPEHASH: FixedBytes<32> = FixedBytes([
    108, 198, 195, 14, 83, 176, 167, 138, 83, 25, 35, 245, 11, 126, 211, 180,
    244, 176, 102, 232, 185, 178, 148, 94, 16, 188, 156, 215, 4, 140, 34, 126
]);
const DELEGATION_TYPEHASH: FixedBytes<32> = FixedBytes([
    227, 208, 13, 199, 254, 146, 84, 225, 47, 107, 63, 4, 160, 37, 146, 108,
    40, 76, 235, 56, 227, 75, 195, 88, 169, 247, 58, 43, 40, 187, 239, 134
]);

// Events using sol! macro
sol! {
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event TokensMinted(address indexed to, uint256 amount, uint256 timestamp);
    event AutoDelegationToggled(bool enabled);
    event DelegationAssisted(address indexed delegator, address indexed delegatee);
    event RoleGranted(bytes32 indexed role, address indexed account, address indexed sender);
    event RoleRevoked(bytes32 indexed role, address indexed account, address indexed sender);
    event DelegateChanged(address indexed delegator, address indexed fromDelegate, address indexed toDelegate);
    event DelegateVotesChanged(address indexed delegate, uint256 previousBalance, uint256 newBalance);
    
    // Additional EIP-712 and role events
    event RoleAdminChanged(bytes32 indexed role, bytes32 indexed previousAdminRole, bytes32 indexed newAdminRole);
    event EIP712DomainChanged();
}

// Checkpoint structure for voting history
#[derive(SolType, Default, Clone, Debug)]
pub struct Checkpoint {
    from_block: U256,
    votes: U256,
}

// EIP712 Domain structure
#[derive(SolType, Default, Clone, Debug)]
pub struct EIP712Domain {
    name: String,
    version: String,
    chain_id: U256,
    verifying_contract: Address,
}

// Main contract storage
#[solidity_storage]
#[entrypoint]
pub struct GovernanceToken {
    // ERC20 Basic State
    name: sol_storage::Value<String>,
    symbol: sol_storage::Value<String>,
    decimals: sol_storage::Value<u8>,
    total_supply: sol_storage::Value<U256>,
    balances: sol_storage::Mapping<Address, U256>,
    allowances: sol_storage::Mapping<Address, sol_storage::Mapping<Address, U256>>,

    // Access Control State
    roles: sol_storage::Mapping<FixedBytes<32>, sol_storage::Mapping<Address, bool>>,
    role_admins: sol_storage::Mapping<FixedBytes<32>, FixedBytes<32>>,

    // ERC20Votes State
    delegates_mapping: sol_storage::Mapping<Address, Address>,
    checkpoints: sol_storage::Mapping<Address, sol_storage::StorageVec<Checkpoint>>,
    total_supply_checkpoints: sol_storage::StorageVec<Checkpoint>,

    // ERC20Permit State
    nonces: sol_storage::Mapping<Address, U256>,
    domain_separator: sol_storage::Value<B256>,
    cached_chain_id: sol_storage::Value<U256>,
    cached_domain_separator: sol_storage::Value<B256>,

    // GovernanceToken Custom State
    last_mint_time: sol_storage::Value<U256>,
    auto_delegation_enabled: sol_storage::Value<bool>,

    // Additional state for advanced features
    paused: sol_storage::Value<bool>,
    version: sol_storage::Value<String>,
}

// External interface implementation
#[external]
impl GovernanceToken {
    /// Initialize the governance token
    pub fn init(
        &mut self,
        token_name: String,
        token_symbol: String,
        admin: Address,
        initial_mint: U256,
    ) -> Result<(), Vec<u8>> {
        if admin == Address::ZERO {
            return Err(b"Invalid admin address".to_vec());
        }

        // Initialize ERC20 basics
        self.name.set(token_name.clone());
        self.symbol.set(token_symbol.clone());
        self.decimals.set(18);
        self.total_supply.set(U256::ZERO);
        self.version.set("1".to_string());

        // Setup access control roles
        self._grant_role(DEFAULT_ADMIN_ROLE, admin);
        self._grant_role(ADMIN_ROLE, admin);
        self._grant_role(MINTER_ROLE, admin);
        self._set_role_admin(ADMIN_ROLE, DEFAULT_ADMIN_ROLE);
        self._set_role_admin(MINTER_ROLE, DEFAULT_ADMIN_ROLE);

        // Initialize domain separator for EIP-712
        self._initialize_domain_separator();

        // Mint initial supply if specified
        if initial_mint > U256::ZERO {
            self._mint(admin, initial_mint)?;
            self._delegate(admin, admin)?;
            evm::log(TokensMinted {
                to: admin,
                amount: initial_mint,
                timestamp: block::timestamp(),
            });
        }

        self.last_mint_time.set(block::timestamp());
        self.auto_delegation_enabled.set(true);

        Ok(())
    }

    /// Mint new tokens (MINTER_ROLE required)
    pub fn mint(&mut self, to: Address, amount: U256) -> Result<(), Vec<u8>> {
        self._check_role(MINTER_ROLE, msg::sender())?;
        self._check_not_paused()?;

        if to == Address::ZERO {
            return Err(b"Cannot mint to zero address".to_vec());
        }
        if amount == U256::ZERO {
            return Err(b"Amount must be > 0".to_vec());
        }

        let current_supply = self.total_supply.get();
        if current_supply + amount > U256::from(MAX_SUPPLY) {
            return Err(b"Cap exceeded".to_vec());
        }

        if block::timestamp() < self.last_mint_time.get() + U256::from(MINT_COOLDOWN) {
            return Err(b"Mint cooldown active".to_vec());
        }

        self._mint(to, amount)?;
        self.last_mint_time.set(block::timestamp());

        // Auto-delegate if enabled and user has no delegate
        if self.auto_delegation_enabled.get() && self.delegates_mapping.get(to) == Address::ZERO {
            self._delegate(to, to)?;
        }

        evm::log(TokensMinted {
            to,
            amount,
            timestamp: block::timestamp(),
        });
        Ok(())
    }

    /// Burn tokens from caller's balance
    pub fn burn(&mut self, amount: U256) -> Result<(), Vec<u8>> {
        self._burn(msg::sender(), amount)?;
        Ok(())
    }

    /// Burn tokens from an address with allowance
    pub fn burn_from(&mut self, from: Address, amount: U256) -> Result<(), Vec<u8>> {
        let current_allowance = self.allowances.get(from).get(msg::sender());
        if current_allowance != U256::MAX {
            if current_allowance < amount {
                return Err(b"Insufficient allowance".to_vec());
            }
            self._approve(from, msg::sender(), current_allowance - amount)?;
        }
        self._burn(from, amount)?;
        Ok(())
    }

    /// Admin burn tokens from an address (ADMIN_ROLE required)
    pub fn admin_burn(&mut self, from: Address, amount: U256) -> Result<(), Vec<u8>> {
        self._check_role(ADMIN_ROLE, msg::sender())?;
        self._burn(from, amount)?;
        Ok(())
    }

    /// Set auto-delegation behavior (ADMIN_ROLE required)
    pub fn set_auto_delegation(&mut self, enabled: bool) -> Result<(), Vec<u8>> {
        self._check_role(ADMIN_ROLE, msg::sender())?;
        self.auto_delegation_enabled.set(enabled);
        evm::log(AutoDelegationToggled { enabled });
        Ok(())
    }

    /// Pause contract (ADMIN_ROLE required)
    pub fn pause(&mut self) -> Result<(), Vec<u8>> {
        self._check_role(ADMIN_ROLE, msg::sender())?;
        self.paused.set(true);
        Ok(())
    }

    /// Unpause contract (ADMIN_ROLE required)
    pub fn unpause(&mut self) -> Result<(), Vec<u8>> {
        self._check_role(ADMIN_ROLE, msg::sender())?;
        self.paused.set(false);
        Ok(())
    }

    /// Standard delegate function
    pub fn delegate(&mut self, delegatee: Address) -> Result<(), Vec<u8>> {
        if delegatee == Address::ZERO {
            return Err(b"Cannot delegate to zero address".to_vec());
        }
        self._delegate(msg::sender(), delegatee)?;
        Ok(())
    }

    /// Delegate voting power to another address (alternative name for compatibility)
    pub fn delegate_votes(&mut self, delegatee: Address) -> Result<(), Vec<u8>> {
        self.delegate(delegatee)
    }

    /// Delegate by signature
    pub fn delegate_by_sig(
        &mut self,
        delegatee: Address,
        nonce: U256,
        expiry: U256,
        v: u8,
        r: B256,
        s: B256,
    ) -> Result<(), Vec<u8>> {
        if block::timestamp() > expiry {
            return Err(b"Signature expired".to_vec());
        }

        let delegator = self._recover_delegation_signer(delegatee, nonce, expiry, v, r, s)?;
        
        if self.nonces.get(delegator) != nonce {
            return Err(b"Invalid nonce".to_vec());
        }

        self.nonces.setter(delegator).set(nonce + U256::from(1));
        self._delegate(delegator, delegatee)?;
        
        evm::log(DelegationAssisted { delegator, delegatee });
        Ok(())
    }

    /// EIP-2612 Permit function for gasless approvals
    pub fn permit(
        &mut self,
        owner: Address,
        spender: Address,
        value: U256,
        deadline: U256,
        v: u8,
        r: B256,
        s: B256,
    ) -> Result<(), Vec<u8>> {
        if block::timestamp() > deadline {
            return Err(b"Permit expired".to_vec());
        }

        let nonce = self.nonces.get(owner);
        let digest = self._build_permit_digest(owner, spender, value, nonce, deadline)?;

        // Recover signer from signature
        let signer = self._recover_permit_signer(digest, v, r, s)?;
        if signer != owner {
            return Err(b"Invalid signature".to_vec());
        }

        self.nonces.setter(owner).set(nonce + U256::from(1));
        self._approve(owner, spender, value)?;
        Ok(())
    }

    /// Grant role to an address (role admin required)
    pub fn grant_role(&mut self, role: FixedBytes<32>, account: Address) -> Result<(), Vec<u8>> {
        let admin_role = self.get_role_admin(role);
        self._check_role(admin_role, msg::sender())?;
        self._grant_role(role, account);
        Ok(())
    }

    /// Revoke role from an address (role admin required)
    pub fn revoke_role(&mut self, role: FixedBytes<32>, account: Address) -> Result<(), Vec<u8>> {
        let admin_role = self.get_role_admin(role);
        self._check_role(admin_role, msg::sender())?;
        self._revoke_role(role, account);
        Ok(())
    }

    /// Renounce role (can only renounce your own role)
    pub fn renounce_role(&mut self, role: FixedBytes<32>, caller_confirmation: Address) -> Result<(), Vec<u8>> {
        if caller_confirmation != msg::sender() {
            return Err(b"Can only renounce roles for self".to_vec());
        }
        self._revoke_role(role, msg::sender());
        Ok(())
    }

    // ========================================================================
    // ERC20 VIEW FUNCTIONS
    // ========================================================================

    pub fn name(&self) -> String {
        self.name.get()
    }

    pub fn symbol(&self) -> String {
        self.symbol.get()
    }

    pub fn decimals(&self) -> u8 {
        self.decimals.get()
    }

    pub fn total_supply(&self) -> U256 {
        self.total_supply.get()
    }

    pub fn balance_of(&self, owner: Address) -> U256 {
        self.balances.get(owner)
    }

    pub fn allowance(&self, owner: Address, spender: Address) -> U256 {
        self.allowances.get(owner).get(spender)
    }

    // ========================================================================
    // ERC20VOTES VIEW FUNCTIONS
    // ========================================================================

    pub fn get_past_votes(&self, account: Address, timepoint: U256) -> Result<U256, Vec<u8>> {
        if timepoint >= block::timestamp() {
            return Err(b"Timepoint must be in the past".to_vec());
        }

        let checkpoints_vec = self.checkpoints.get(account);
        self._binary_search_checkpoints(&checkpoints_vec, timepoint)
    }

    pub fn get_past_total_supply(&self, timepoint: U256) -> Result<U256, Vec<u8>> {
        if timepoint >= block::timestamp() {
            return Err(b"Timepoint must be in the past".to_vec());
        }

        self._binary_search_checkpoints(&self.total_supply_checkpoints, timepoint)
    }

    pub fn delegates(&self, account: Address) -> Address {
        self.delegates_mapping.get(account)
    }

    pub fn get_votes(&self, account: Address) -> U256 {
        let checkpoints_vec = self.checkpoints.get(account);
        if let Some(checkpoint) = checkpoints_vec.last() {
            checkpoint.votes
        } else {
            U256::ZERO
        }
    }

    pub fn num_checkpoints(&self, account: Address) -> u32 {
        self.checkpoints.get(account).len() as u32
    }

    pub fn checkpoints(&self, account: Address, pos: u32) -> Checkpoint {
        let checkpoints_vec = self.checkpoints.get(account);
        if let Some(checkpoint) = checkpoints_vec.get(pos as usize) {
            checkpoint
        } else {
            Checkpoint::default()
        }
    }

    // ========================================================================
    // ERC20PERMIT VIEW FUNCTIONS
    // ========================================================================

    pub fn nonces(&self, owner: Address) -> U256 {
        self.nonces.get(owner)
    }

    pub fn domain_separator(&self) -> B256 {
        self._domain_separator_v4()
    }

    /// EIP-5267 implementation
    pub fn eip712_domain(&self) -> (
        FixedBytes<1>, // fields
        String,        // name
        String,        // version
        U256,          // chainId
        Address,       // verifyingContract
        B256,          // salt
        Vec<U256>,     // extensions
    ) {
        (
            FixedBytes([0x0f]), // fields bitmap: name, version, chainId, verifyingContract
            self.name.get(),
            self.version.get(),
            self._get_chain_id(),
            contract::address(),
            B256::ZERO, // no salt
            Vec::new(), // no extensions
        )
    }

    // ========================================================================
    // ACCESS CONTROL VIEW FUNCTIONS
    // ========================================================================

    pub fn has_role(&self, role: FixedBytes<32>, account: Address) -> bool {
        self.roles.get(role).get(account)
    }

    pub fn get_role_admin(&self, role: FixedBytes<32>) -> FixedBytes<32> {
        self.role_admins.get(role)
    }

    // ========================================================================
    // CONSTANT VIEW FUNCTIONS
    // ========================================================================

    pub fn admin_role() -> FixedBytes<32> {
        ADMIN_ROLE
    }

    pub fn minter_role() -> FixedBytes<32> {
        MINTER_ROLE
    }

    pub fn default_admin_role() -> FixedBytes<32> {
        DEFAULT_ADMIN_ROLE
    }

    pub fn max_supply() -> U256 {
        U256::from(MAX_SUPPLY)
    }

    pub fn mint_cooldown() -> U256 {
        U256::from(MINT_COOLDOWN)
    }

    pub fn clock_mode() -> String {
        "mode=timestamp".to_string()
    }

    // ========================================================================
    // UTILITY VIEW FUNCTIONS
    // ========================================================================

    pub fn get_token_info(&self) -> (String, String, u8, U256, U256) {
        (
            self.name.get(),
            self.symbol.get(),
            self.decimals.get(),
            self.total_supply.get(),
            U256::from(MAX_SUPPLY),
        )
    }

    pub fn can_mint(&self) -> bool {
        block::timestamp() >= self.last_mint_time.get() + U256::from(MINT_COOLDOWN)
    }

    pub fn remaining_mintable_supply(&self) -> U256 {
        U256::from(MAX_SUPPLY) - self.total_supply.get()
    }

    pub fn clock(&self) -> U256 {
        block::timestamp()
    }

    pub fn last_mint_time(&self) -> U256 {
        self.last_mint_time.get()
    }

    pub fn auto_delegation_enabled(&self) -> bool {
        self.auto_delegation_enabled.get()
    }

    pub fn paused(&self) -> bool {
        self.paused.get()
    }

    /// Support for interface detection
    pub fn supports_interface(&self, interface_id: FixedBytes<4>) -> bool {
        // ERC165, ERC20, ERC20Permit, AccessControl interface IDs
        let erc165_id = FixedBytes([0x01, 0xff, 0xc9, 0xa7]);
        let erc20_id = FixedBytes([0x36, 0x37, 0x2b, 0x07]);
        let access_control_id = FixedBytes([0x7b, 0xd6, 0xc8, 0x1e]);
        
        interface_id == erc165_id || interface_id == erc20_id || interface_id == access_control_id
    }

    // ========================================================================
    // ERC20 MUTABLE FUNCTIONS
    // ========================================================================

    pub fn transfer(&mut self, to: Address, amount: U256) -> Result<bool, Vec<u8>> {
        self._transfer(msg::sender(), to, amount)?;
        Ok(true)
    }

    pub fn approve(&mut self, spender: Address, amount: U256) -> Result<bool, Vec<u8>> {
        self._approve(msg::sender(), spender, amount)?;
        Ok(true)
    }

    pub fn transfer_from(&mut self, from: Address, to: Address, amount: U256) -> Result<bool, Vec<u8>> {
        let current_allowance = self.allowances.get(from).get(msg::sender());
        if current_allowance != U256::MAX {
            if current_allowance < amount {
                return Err(b"Insufficient allowance".to_vec());
            }
            self._approve(from, msg::sender(), current_allowance - amount)?;
        }
        self._transfer(from, to, amount)?;
        Ok(true)
    }

    pub fn increase_allowance(&mut self, spender: Address, added_value: U256) -> Result<bool, Vec<u8>> {
        let current_allowance = self.allowances.get(msg::sender()).get(spender);
        self._approve(msg::sender(), spender, current_allowance + added_value)?;
        Ok(true)
    }

    pub fn decrease_allowance(&mut self, spender: Address, subtracted_value: U256) -> Result<bool, Vec<u8>> {
        let current_allowance = self.allowances.get(msg::sender()).get(spender);
        if current_allowance < subtracted_value {
            return Err(b"Decreased allowance below zero".to_vec());
        }
        self._approve(msg::sender(), spender, current_allowance - subtracted_value)?;
        Ok(true)
    }
}

// Internal implementation
impl GovernanceToken {
    /// Internal transfer function with voting power updates
    fn _transfer(&mut self, from: Address, to: Address, amount: U256) -> Result<(), Vec<u8>> {
        self._check_not_paused()?;
        
        if from == Address::ZERO {
            return Err(b"Transfer from zero address".to_vec());
        }
        if to == Address::ZERO {
            return Err(b"Transfer to zero address".to_vec());
        }

        let from_balance = self.balances.get(from);
        if from_balance < amount {
            return Err(b"Insufficient balance".to_vec());
        }

        self.balances.setter(from).set(from_balance - amount);
        let to_balance = self.balances.get(to);
        self.balances.setter(to).set(to_balance + amount);

        // Update voting power
        self._move_voting_power(
            self.delegates_mapping.get(from),
            self.delegates_mapping.get(to),
            amount,
        )?;

        // Auto-delegate on first token receipt
        if self.auto_delegation_enabled.get()
            && to != Address::ZERO
            && self.delegates_mapping.get(to) == Address::ZERO
            && self.balances.get(to) > U256::ZERO
        {
            self._delegate(to, to)?;
        }

        evm::log(Transfer { from, to, value: amount });
        Ok(())
    }

    /// Internal approve function
    fn _approve(&mut self, owner: Address, spender: Address, amount: U256) -> Result<(), Vec<u8>> {
        if owner == Address::ZERO {
            return Err(b"Approve from zero address".to_vec());
        }
        if spender == Address::ZERO {
            return Err(b"Approve to zero address".to_vec());
        }

        self.allowances.setter(owner).setter(spender).set(amount);
        evm::log(Approval {
            owner,
            spender,
            value: amount,
        });
        Ok(())
    }

    /// Internal mint function
    fn _mint(&mut self, to: Address, amount: U256) -> Result<(), Vec<u8>> {
        if to == Address::ZERO {
            return Err(b"Mint to zero address".to_vec());
        }

        let new_supply = self.total_supply.get() + amount;
        self.total_supply.set(new_supply);

        let to_balance = self.balances.get(to);
        self.balances.setter(to).set(to_balance + amount);

        // Update total supply checkpoints
        self._write_checkpoint(&mut self.total_supply_checkpoints, new_supply)?;

        // Update voting power for the recipient's delegate
        let delegate = self.delegates_mapping.get(to);
        if delegate != Address::ZERO {
            self._move_voting_power(Address::ZERO, delegate, amount)?;
        }

        evm::log(Transfer {
            from: Address::ZERO,
            to,
            value: amount,
        });
        Ok(())
    }

    /// Internal burn function
    fn _burn(&mut self, from: Address, amount: U256) -> Result<(), Vec<u8>> {
        if from == Address::ZERO {
            return Err(b"Burn from zero address".to_vec());
        }

        let from_balance = self.balances.get(from);
        if from_balance < amount {
            return Err(b"Insufficient balance to burn".to_vec());
        }

        self.balances.setter(from).set(from_balance - amount);
        let new_supply = self.total_supply.get() - amount;
        self.total_supply.set(new_supply);

        // Update total supply checkpoints
        self._write_checkpoint(&mut self.total_supply_checkpoints, new_supply)?;

        // Update voting power for the sender's delegate
        let delegate = self.delegates_mapping.get(from);
        if delegate != Address::ZERO {
            self._move_voting_power(delegate, Address::ZERO, amount)?;
        }

        evm::log(Transfer {
            from,
            to: Address::ZERO,
            value: amount,
        });
        Ok(())
    }

    /// Internal delegation function
    fn _delegate(&mut self, delegator: Address, delegatee: Address) -> Result<(), Vec<u8>> {
        let current_delegate = self.delegates_mapping.get(delegator);
        self.delegates_mapping.setter(delegator).set(delegatee);

        let delegator_balance = self.balances.get(delegator);
        self._move_voting_power(current_delegate, delegatee, delegator_balance)?;

        evm::log(DelegateChanged {
            delegator,
            fromDelegate: current_delegate,
            toDelegate: delegatee,
        });
        Ok(())
    }

    /// Move voting power between delegates
    fn _move_voting_power(
        &mut self,
        from: Address,
        to: Address,
        amount: U256,
    ) -> Result<(), Vec<u8>> {
        if from != to && amount > U256::ZERO {
            if from != Address::ZERO {
                let mut from_checkpoints = self.checkpoints.setter(from);
                let old_votes = self._get_current_votes(&from_checkpoints);
                let new_votes = old_votes - amount;
                self._write_checkpoint(&mut from_checkpoints, new_votes)?;

                evm::log(DelegateVotesChanged {
                    delegate: from,
                    previousBalance: old_votes,
                    newBalance: new_votes,
                });
            }

            if to != Address::ZERO {
                let mut to_checkpoints = self.checkpoints.setter(to);
                let old_votes = self._get_current_votes(&to_checkpoints);
                let new_votes = old_votes + amount;
                self._write_checkpoint(&mut to_checkpoints, new_votes)?;

                evm::log(DelegateVotesChanged {
                    delegate: to,
                    previousBalance: old_votes,
                    newBalance: new_votes,
                });
            }
        }
        Ok(())
    }

    /// Write a new checkpoint
    fn _write_checkpoint(
        &self,
        checkpoints: &mut sol_storage::StorageVec<Checkpoint>,
        votes: U256,
    ) -> Result<(), Vec<u8>> {
        let current_time = block::timestamp();

        // If the last checkpoint was at the same timestamp, update it
        if let Some(mut last) = checkpoints.last_mut() {
            if last.from_block == current_time {
                last.votes = votes;
                return Ok(());
            }
        }

        // Otherwise, add a new checkpoint
        checkpoints.push(Checkpoint {
            from_block: current_time,
            votes,
        });
        Ok(())
    }

    /// Get current votes from checkpoints
    fn _get_current_votes(&self, checkpoints: &sol_storage::StorageVec<Checkpoint>) -> U256 {
        if let Some(last) = checkpoints.last() {
            last.votes
        } else {
            U256::ZERO
        }
    }

    /// Binary search through checkpoints to find votes at a timepoint
    fn _binary_search_checkpoints(
        &self,
        checkpoints: &sol_storage::StorageVec<Checkpoint>,
        timepoint: U256,
    ) -> Result<U256, Vec<u8>> {
        let len = checkpoints.len();
        if len == 0 {
            return Ok(U256::ZERO);
        }

        // Linear search for simplicity (can be optimized to binary search)
        for i in (0..len).rev() {
            if let Some(checkpoint) = checkpoints.get(i) {
                if checkpoint.from_block <= timepoint {
                    return Ok(checkpoint.votes);
                }
            }
        }
        Ok(U256::ZERO)
    }

    /// Access control: grant role
    fn _grant_role(&mut self, role: FixedBytes<32>, account: Address) {
        let had_role = self.roles.get(role).get(account);
        self.roles.setter(role).setter(account).set(true);
        
        if !had_role {
            evm::log(RoleGranted {
                role: B256::from(role.0),
                account,
                sender: msg::sender(),
            });
        }
    }

    /// Access control: revoke role
    fn _revoke_role(&mut self, role: FixedBytes<32>, account: Address) {
        let had_role = self.roles.get(role).get(account);
        self.roles.setter(role).setter(account).set(false);
        
        if had_role {
            evm::log(RoleRevoked {
                role: B256::from(role.0),
                account,
                sender: msg::sender(),
            });
        }
    }

    /// Access control: check role
    fn _check_role(&self, role: FixedBytes<32>, account: Address) -> Result<(), Vec<u8>> {
        if !self.roles.get(role).get(account) {
            return Err(b"AccessControl: missing role".to_vec());
        }
        Ok(())
    }

    /// Set role admin
    fn _set_role_admin(&mut self, role: FixedBytes<32>, admin_role: FixedBytes<32>) {
        let previous_admin = self.role_admins.get(role);
        self.role_admins.setter(role).set(admin_role);
        
        evm::log(RoleAdminChanged {
            role: B256::from(role.0),
            previousAdminRole: B256::from(previous_admin.0),
            newAdminRole: B256::from(admin_role.0),
        });
    }

    /// Check if contract is not paused
    fn _check_not_paused(&self) -> Result<(), Vec<u8>> {
        if self.paused.get() {
            return Err(b"Contract is paused".to_vec());
        }
        Ok(())
    }

    /// Initialize EIP-712 domain separator
    fn _initialize_domain_separator(&mut self) {
        let domain_separator = self._domain_separator_v4();
        self.domain_separator.set(domain_separator);
        self.cached_domain_separator.set(domain_separator);
        self.cached_chain_id.set(self._get_chain_id());
    }

    /// Build EIP-712 domain separator
    fn _domain_separator_v4(&self) -> B256 {
        let chain_id = self._get_chain_id();
        if chain_id == self.cached_chain_id.get() {
            self.cached_domain_separator.get()
        } else {
            self._build_domain_separator()
        }
    }

    /// Build domain separator
    fn _build_domain_separator(&self) -> B256 {
        // Simplified domain separator computation
        // In production, you'd compute the full EIP-712 hash
        crypto::keccak(
            format!(
                "{}{}{}{}",
                self.name.get(),
                self.version.get(),
                self._get_chain_id(),
                contract::address()
            ).as_bytes()
        )
    }

    /// Get current chain ID
    fn _get_chain_id(&self) -> U256 {
        // In Stylus, you'd get this from the environment
        U256::from(42161) // Arbitrum One chain ID
    }

    /// Build permit digest for EIP-712
    fn _build_permit_digest(
        &self,
        owner: Address,
        spender: Address,
        value: U256,
        nonce: U256,
        deadline: U256,
    ) -> Result<B256, Vec<u8>> {
        let domain_separator = self._domain_separator_v4();
        let struct_hash = crypto::keccak(
            format!(
                "{:?}{:?}{:?}{:?}{:?}{}",
                PERMIT_TYPEHASH, owner, spender, value, nonce, deadline
            ).as_bytes()
        );
        
        Ok(crypto::keccak(
            format!("\x19\x01{:?}{:?}", domain_separator, struct_hash).as_bytes()
        ))
    }

    /// Recover permit signer
    fn _recover_permit_signer(
        &self,
        digest: B256,
        v: u8,
        r: B256,
        s: B256,
    ) -> Result<Address, Vec<u8>> {
        // Simplified signature recovery
        // In production, you'd use proper ECDSA recovery
        Ok(Address::ZERO) // Placeholder
    }

    /// Recover delegation signer
    fn _recover_delegation_signer(
        &self,
        delegatee: Address,
        nonce: U256,
        expiry: U256,
        v: u8,
        r: B256,
        s: B256,
    ) -> Result<Address, Vec<u8>> {
        let domain_separator = self._domain_separator_v4();
        let struct_hash = crypto::keccak(
            format!(
                "{:?}{:?}{:?}{}",
                DELEGATION_TYPEHASH, delegatee, nonce, expiry
            ).as_bytes()
        );
        
        let digest = crypto::keccak(
            format!("\x19\x01{:?}{:?}", domain_separator, struct_hash).as_bytes()
        );
        
        // Simplified signature recovery
        // In production, you'd use proper ECDSA recovery
        Ok(Address::ZERO) // Placeholder
    }
}