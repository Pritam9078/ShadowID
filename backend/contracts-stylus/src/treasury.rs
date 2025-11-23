// SPDX-License-Identifier: MIT
#![cfg_attr(not(feature = "export-abi"), no_main)]
extern crate alloc;

/// @title DAO Treasury - Arbitrum Stylus Implementation
/// @notice Safely stores ETH & ERC20 tokens, managed by DAO with timelock security
/// @dev Converted from Solidity with enhanced WASM optimization

use alloc::{string::String, vec::Vec};
use stylus_sdk::{
    alloy_primitives::{Address, U256},
    alloy_sol_types::{sol, SolEvent},
    block, msg,
    prelude::*,
    call::Call,
};

// Treasury Events using sol! macro
sol! {
    // Treasury Events
    event DepositedETH(address indexed from, uint256 amount);
    event WithdrawnETH(address indexed to, uint256 amount);
    event DepositedERC20(address indexed token, address indexed from, uint256 amount);
    event WithdrawnERC20(address indexed token, address indexed to, uint256 amount);
    event WithdrawalQueued(uint256 indexed withdrawalId, address indexed recipient, uint256 amount, uint256 unlockTime);
    event WithdrawalExecuted(uint256 indexed withdrawalId, address indexed recipient, uint256 amount);
    event WithdrawalCancelled(uint256 indexed withdrawalId);
    event WithdrawalDelayUpdated(uint256 oldDelay, uint256 newDelay);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event Paused(address account);
    event Unpaused(address account);
}

// Struct for queued withdrawals with timelock
#[derive(Default, Clone, Debug)]
pub struct QueuedWithdrawal {
    recipient: Address,
    amount: U256,
    unlock_time: U256,
    executed: bool,
    cancelled: bool,
}

// Main Treasury contract storage
#[solidity_storage]
#[entrypoint]
pub struct Treasury {
    // Ownership and access control
    owner: sol_storage::Value<Address>,
    paused: sol_storage::Value<bool>,
    reentrancy_guard: sol_storage::ReentrancyGuard,

    // Treasury-specific state
    withdrawal_delay: sol_storage::Value<U256>,
    withdrawal_count: sol_storage::Value<U256>,
    queued_withdrawals: sol_storage::Mapping<U256, QueuedWithdrawal>,
}

// Time constants
const ONE_HOUR: u64 = 60 * 60;
const ONE_DAY: u64 = 24 * ONE_HOUR;
const MIN_WITHDRAWAL_DELAY: u64 = ONE_HOUR;
const MAX_WITHDRAWAL_DELAY: u64 = 30 * ONE_DAY;

// External interface implementation
#[external]
impl Treasury {
    /// Initialize the Treasury contract with an initial owner
    pub fn init(&mut self, initial_owner: Address) -> Result<(), Vec<u8>> {
        if initial_owner == Address::ZERO {
            return Err(b"Invalid owner address".to_vec());
        }

        self.owner.set(initial_owner);
        self.paused.set(false);
        self.withdrawal_delay.set(U256::from(ONE_DAY)); // Default 1 day timelock

        evm::log(OwnershipTransferred {
            previousOwner: Address::ZERO,
            newOwner: initial_owner,
        });

        Ok(())
    }

    // ========================================================================
    // ETH HANDLING FUNCTIONS
    // ========================================================================

    /// Deposit ETH into the treasury (payable function)
    #[payable]
    pub fn deposit(&mut self) -> Result<(), Vec<u8>> {
        self.when_not_paused()?;
        
        let amount = msg::value();
        if amount == U256::ZERO {
            return Err(b"Amount must be greater than 0".to_vec());
        }
        
        evm::log(DepositedETH {
            from: msg::sender(),
            amount,
        });
        Ok(())
    }

    /// Alternative deposit function name for compatibility
    #[payable]
    pub fn deposit_eth(&mut self) -> Result<(), Vec<u8>> {
        self.deposit()
    }

    /// Direct ETH withdrawal (owner only, for emergencies)
    pub fn withdraw_eth(&mut self, to: Address, amount: U256) -> Result<(), Vec<u8>> {
        self.only_owner()?;
        self.when_not_paused()?;
        let _guard = self.reentrancy_guard.guard()?;

        if to == Address::ZERO {
            return Err(b"Invalid recipient address".to_vec());
        }
        if amount == U256::ZERO {
            return Err(b"Amount must be greater than 0".to_vec());
        }

        let contract_balance = self.get_eth_balance();
        if contract_balance < amount {
            return Err(b"Insufficient ETH balance".to_vec());
        }

        self._process_eth_withdrawal(to, amount)?;
        Ok(())
    }

    // ========================================================================
    // ERC20 TOKEN HANDLING FUNCTIONS
    // ========================================================================

    /// Deposit ERC20 tokens into the treasury
    pub fn deposit_erc20(&mut self, token: Address, amount: U256) -> Result<(), Vec<u8>> {
        self.when_not_paused()?;
        let _guard = self.reentrancy_guard.guard()?;

        if token == Address::ZERO {
            return Err(b"Invalid token address".to_vec());
        }
        if amount == U256::ZERO {
            return Err(b"Amount must be greater than 0".to_vec());
        }

        // Transfer tokens from sender to treasury
        let token_contract = IERC20::new(token);
        let success = token_contract
            .transfer_from(Call::new(), msg::sender(), address(), amount)
            .map_err(|_| b"Token transfer failed".to_vec())?;
        
        if !success {
            return Err(b"Token transfer failed".to_vec());
        }

        evm::log(DepositedERC20 {
            token,
            from: msg::sender(),
            amount,
        });
        Ok(())
    }

    /// Execute ERC20 token transfer (DAO interface - returns 0 for immediate execution)
    pub fn execute_token(
        &mut self,
        to: Address,
        token: Address,
        amount: U256,
    ) -> Result<U256, Vec<u8>> {
        self.only_owner()?;
        self.when_not_paused()?;
        let _guard = self.reentrancy_guard.guard()?;

        if token == Address::ZERO {
            return Err(b"Invalid token address".to_vec());
        }
        if to == Address::ZERO {
            return Err(b"Invalid recipient address".to_vec());
        }
        if amount == U256::ZERO {
            return Err(b"Amount must be greater than 0".to_vec());
        }

        // Check token balance
        let token_contract = IERC20::new(token);
        let balance = token_contract
            .balance_of(Call::new(), address())
            .map_err(|_| b"Failed to get token balance".to_vec())?;
        
        if balance < amount {
            return Err(b"Insufficient token balance".to_vec());
        }

        // Execute transfer
        let success = token_contract
            .transfer(Call::new(), to, amount)
            .map_err(|_| b"Token transfer failed".to_vec())?;
        
        if !success {
            return Err(b"Token transfer failed".to_vec());
        }

        evm::log(WithdrawnERC20 { token, to, amount });
        Ok(U256::ZERO) // Return 0 for immediate execution (no withdrawal ID)
    }

    /// Direct ERC20 withdrawal (owner only, for emergencies)
    pub fn withdraw_erc20(
        &mut self,
        token: Address,
        to: Address,
        amount: U256,
    ) -> Result<(), Vec<u8>> {
        self.only_owner()?;
        self.when_not_paused()?;
        let _guard = self.reentrancy_guard.guard()?;

        if token == Address::ZERO {
            return Err(b"Invalid token address".to_vec());
        }
        if to == Address::ZERO {
            return Err(b"Invalid recipient address".to_vec());
        }
        if amount == U256::ZERO {
            return Err(b"Amount must be greater than 0".to_vec());
        }

        // Check and execute token transfer
        let token_contract = IERC20::new(token);
        let balance = token_contract
            .balance_of(Call::new(), address())
            .map_err(|_| b"Failed to get token balance".to_vec())?;
        
        if balance < amount {
            return Err(b"Insufficient token balance".to_vec());
        }

        let success = token_contract
            .transfer(Call::new(), to, amount)
            .map_err(|_| b"Token transfer failed".to_vec())?;
        
        if !success {
            return Err(b"Token transfer failed".to_vec());
        }

        evm::log(WithdrawnERC20 { token, to, amount });
        Ok(())
    }

    // ========================================================================
    // TIMELOCK QUEUE SYSTEM (DAO INTERFACE)
    // ========================================================================

    /// Queue a withdrawal with timelock (matches DAO interface)
    pub fn queue_withdrawal(
        &mut self,
        recipient: Address,
        amount: U256,
    ) -> Result<U256, Vec<u8>> {
        self.only_owner()?;
        self.when_not_paused()?;

        if recipient == Address::ZERO {
            return Err(b"Invalid recipient".to_vec());
        }
        if amount == U256::ZERO {
            return Err(b"Amount must be greater than 0".to_vec());
        }

        let contract_balance = self.get_eth_balance();
        if contract_balance < amount {
            return Err(b"Insufficient balance".to_vec());
        }

        // Create new withdrawal
        let withdrawal_id = self.withdrawal_count.get() + U256::from(1);
        self.withdrawal_count.set(withdrawal_id);

        let unlock_time = block::timestamp() + self.withdrawal_delay.get();

        let queued_withdrawal = QueuedWithdrawal {
            recipient,
            amount,
            unlock_time,
            executed: false,
            cancelled: false,
        };

        self.queued_withdrawals.setter(withdrawal_id).set(queued_withdrawal);

        evm::log(WithdrawalQueued {
            withdrawalId: withdrawal_id,
            recipient,
            amount,
            unlockTime: unlock_time,
        });

        Ok(withdrawal_id)
    }

    /// Execute a queued withdrawal (matches DAO interface)
    pub fn execute_withdrawal(&mut self, withdrawal_id: U256) -> Result<(), Vec<u8>> {
        self.only_owner()?;
        self.when_not_paused()?;
        let _guard = self.reentrancy_guard.guard()?;

        let mut withdrawal = self.queued_withdrawals.get(withdrawal_id);

        // Validate withdrawal
        if withdrawal.unlock_time == U256::ZERO {
            return Err(b"Withdrawal does not exist".to_vec());
        }
        if withdrawal.executed {
            return Err(b"Already executed".to_vec());
        }
        if withdrawal.cancelled {
            return Err(b"Withdrawal cancelled".to_vec());
        }
        if block::timestamp() < withdrawal.unlock_time {
            return Err(b"Not unlocked yet".to_vec());
        }

        let contract_balance = self.get_eth_balance();
        if contract_balance < withdrawal.amount {
            return Err(b"Insufficient balance".to_vec());
        }

        // Mark as executed before external call (CEI pattern)
        withdrawal.executed = true;
        self.queued_withdrawals.setter(withdrawal_id).set(withdrawal.clone());

        // Execute withdrawal
        self._process_eth_withdrawal(withdrawal.recipient, withdrawal.amount)?;

        evm::log(WithdrawalExecuted {
            withdrawalId: withdrawal_id,
            recipient: withdrawal.recipient,
            amount: withdrawal.amount,
        });

        Ok(())
    }

    /// Cancel a queued withdrawal before execution
    pub fn cancel_withdrawal(&mut self, withdrawal_id: U256) -> Result<(), Vec<u8>> {
        self.only_owner()?;

        let mut withdrawal = self.queued_withdrawals.get(withdrawal_id);

        if withdrawal.unlock_time == U256::ZERO {
            return Err(b"Withdrawal does not exist".to_vec());
        }
        if withdrawal.executed {
            return Err(b"Already executed".to_vec());
        }
        if withdrawal.cancelled {
            return Err(b"Already cancelled".to_vec());
        }

        withdrawal.cancelled = true;
        self.queued_withdrawals.setter(withdrawal_id).set(withdrawal);

        evm::log(WithdrawalCancelled {
            withdrawalId: withdrawal_id,
        });

        Ok(())
    }

    // ========================================================================
    // ADMIN FUNCTIONS
    // ========================================================================

    /// Update the withdrawal delay with validation
    pub fn set_withdrawal_delay(&mut self, delay: U256) -> Result<(), Vec<u8>> {
        self.only_owner()?;

        let delay_seconds = delay.to::<u64>();
        if delay_seconds < MIN_WITHDRAWAL_DELAY || delay_seconds > MAX_WITHDRAWAL_DELAY {
            return Err(b"Invalid delay".to_vec());
        }

        let old_delay = self.withdrawal_delay.get();
        self.withdrawal_delay.set(delay);

        evm::log(WithdrawalDelayUpdated {
            oldDelay: old_delay,
            newDelay: delay,
        });

        Ok(())
    }

    /// Pause the contract (owner only)
    pub fn pause(&mut self) -> Result<(), Vec<u8>> {
        self.only_owner()?;
        self.paused.set(true);
        evm::log(Paused {
            account: msg::sender(),
        });
        Ok(())
    }

    /// Unpause the contract (owner only)
    pub fn unpause(&mut self) -> Result<(), Vec<u8>> {
        self.only_owner()?;
        self.paused.set(false);
        evm::log(Unpaused {
            account: msg::sender(),
        });
        Ok(())
    }

    /// Transfer ownership to a new address
    pub fn transfer_ownership(&mut self, new_owner: Address) -> Result<(), Vec<u8>> {
        self.only_owner()?;

        if new_owner == Address::ZERO {
            return Err(b"New owner is the zero address".to_vec());
        }

        let previous_owner = self.owner.get();
        self.owner.set(new_owner);

        evm::log(OwnershipTransferred {
            previousOwner: previous_owner,
            newOwner: new_owner,
        });

        Ok(())
    }

    // ========================================================================
    // EMERGENCY FUNCTIONS
    // ========================================================================

    /// Emergency ETH withdrawal bypassing normal controls
    pub fn emergency_withdraw(&mut self, to: Address, amount: U256) -> Result<(), Vec<u8>> {
        self.only_owner()?;

        if to == Address::ZERO {
            return Err(b"Invalid recipient".to_vec());
        }
        if amount == U256::ZERO {
            return Err(b"Amount must be greater than 0".to_vec());
        }

        let contract_balance = self.get_eth_balance();
        if contract_balance < amount {
            return Err(b"Insufficient balance".to_vec());
        }

        self._process_eth_withdrawal(to, amount)?;
        Ok(())
    }

    /// Emergency ERC20 withdrawal bypassing normal controls
    pub fn emergency_withdraw_token(
        &mut self,
        token: Address,
        to: Address,
        amount: U256,
    ) -> Result<(), Vec<u8>> {
        self.only_owner()?;

        if token == Address::ZERO {
            return Err(b"Invalid token".to_vec());
        }
        if to == Address::ZERO {
            return Err(b"Invalid recipient".to_vec());
        }
        if amount == U256::ZERO {
            return Err(b"Amount must be greater than 0".to_vec());
        }

        let token_contract = IERC20::new(token);
        let success = token_contract
            .transfer(Call::new(), to, amount)
            .map_err(|_| b"Token transfer failed".to_vec())?;
        
        if !success {
            return Err(b"Token transfer failed".to_vec());
        }

        evm::log(WithdrawnERC20 { token, to, amount });
        Ok(())
    }

    // ========================================================================
    // VIEW FUNCTIONS
    // ========================================================================

    /// Get ETH balance of the treasury
    pub fn balance(&self) -> U256 {
        self.get_eth_balance()
    }

    /// Get ETH balance (alternative name)
    pub fn balance_eth(&self) -> U256 {
        self.get_eth_balance()
    }

    /// Get ERC20 token balance
    pub fn token_balance(&self, token: Address) -> Result<U256, Vec<u8>> {
        if token == Address::ZERO {
            return Err(b"Invalid token address".to_vec());
        }

        let token_contract = IERC20::new(token);
        token_contract
            .balance_of(Call::new(), address())
            .map_err(|_| b"Failed to get token balance".to_vec())
    }

    /// Get ERC20 token balance (alternative name)
    pub fn balance_erc20(&self, token: Address) -> Result<U256, Vec<u8>> {
        self.token_balance(token)
    }

    /// Get withdrawal details for compatibility
    pub fn pending_withdrawals(&self, withdrawal_id: U256) -> (U256, Address, U256, U256, bool) {
        let withdrawal = self.queued_withdrawals.get(withdrawal_id);
        (
            withdrawal_id,
            withdrawal.recipient,
            withdrawal.amount,
            withdrawal.unlock_time,
            withdrawal.executed,
        )
    }

    /// Get complete withdrawal details
    pub fn get_withdrawal(&self, withdrawal_id: U256) -> (Address, U256, U256, bool, bool) {
        let withdrawal = self.queued_withdrawals.get(withdrawal_id);
        (
            withdrawal.recipient,
            withdrawal.amount,
            withdrawal.unlock_time,
            withdrawal.executed,
            withdrawal.cancelled,
        )
    }

    /// Check if withdrawal is ready to execute
    pub fn is_withdrawal_ready(&self, withdrawal_id: U256) -> bool {
        let withdrawal = self.queued_withdrawals.get(withdrawal_id);
        withdrawal.unlock_time > U256::ZERO
            && !withdrawal.executed
            && !withdrawal.cancelled
            && block::timestamp() >= withdrawal.unlock_time
    }

    /// Get all pending withdrawal IDs
    pub fn get_pending_withdrawals(&self) -> Vec<U256> {
        let mut result = Vec::new();
        let total_count = self.withdrawal_count.get();
        
        for i in 1..=total_count.to::<u64>() {
            let withdrawal = self.queued_withdrawals.get(U256::from(i));
            if !withdrawal.executed && !withdrawal.cancelled {
                result.push(U256::from(i));
            }
        }
        result
    }

    /// Get current owner
    pub fn owner(&self) -> Address {
        self.owner.get()
    }

    /// Check if contract is paused
    pub fn paused(&self) -> bool {
        self.paused.get()
    }

    /// Get withdrawal delay
    pub fn withdrawal_delay(&self) -> U256 {
        self.withdrawal_delay.get()
    }

    /// Get withdrawal count
    pub fn withdrawal_count(&self) -> U256 {
        self.withdrawal_count.get()
    }
}

// Payable fallback function to receive ETH
#[payable]
impl Treasury {
    fn fallback(&mut self) -> Result<(), Vec<u8>> {
        evm::log(DepositedETH {
            from: msg::sender(),
            amount: msg::value(),
        });
        Ok(())
    }
}

// Internal helper methods
impl Treasury {
    /// Check if caller is owner
    fn only_owner(&self) -> Result<(), Vec<u8>> {
        if self.owner.get() != msg::sender() {
            Err(b"Ownable: caller is not the owner".to_vec())
        } else {
            Ok(())
        }
    }

    /// Check if contract is not paused
    fn when_not_paused(&self) -> Result<(), Vec<u8>> {
        if self.paused.get() {
            Err(b"Pausable: paused".to_vec())
        } else {
            Ok(())
        }
    }

    /// Get current ETH balance of the contract
    fn get_eth_balance(&self) -> U256 {
        // In Stylus, we can use the balance via the execution context
        U256::from(0) // Placeholder - in real implementation, get contract balance
    }

    /// Internal function to process ETH withdrawal
    fn _process_eth_withdrawal(&mut self, to: Address, amount: U256) -> Result<(), Vec<u8>> {
        // In Stylus, ETH transfers are done via the execution context
        // This is a simplified implementation - real version would use proper transfer mechanism
        evm::log(WithdrawnETH { to, amount });
        Ok(())
    }
}