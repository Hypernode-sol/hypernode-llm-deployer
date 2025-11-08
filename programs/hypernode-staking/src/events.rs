use anchor_lang::prelude::*;

/// Event emitted when user stakes tokens
#[event]
pub struct StakeCreated {
    pub authority: Pubkey,
    pub amount: u64,
    pub duration: i64,
    pub multiplier: u64,
    pub xhyper_amount: u64,
    pub timestamp: i64,
    pub bump: u8,
}

/// Event emitted when stake is unstaked
#[event]
pub struct StakeUnstaked {
    pub authority: Pubkey,
    pub stake_account: Pubkey,
    pub amount: u64,
    pub xhyper_amount: u64,
    pub cooldown_end: i64,
    pub timestamp: i64,
}

/// Event emitted when tokens are withdrawn
#[event]
pub struct StakeWithdrawn {
    pub authority: Pubkey,
    pub stake_account: Pubkey,
    pub amount: u64,
    pub xhyper_burned: u64,
    pub fee: u64,
    pub net_amount: u64,
    pub timestamp: i64,
}

/// Event emitted when stake is slashed for protocol violations
#[event]
pub struct StakeSlashed {
    pub authority: Pubkey,
    pub stake_account: Pubkey,
    pub original_amount: u64,
    pub slash_amount: u64,
    pub remaining_amount: u64,
    pub reason: String,
    pub timestamp: i64,
}

/// Event emitted when rewards are distributed
#[event]
pub struct RewardsDistributed {
    pub authority: Pubkey,
    pub stake_account: Pubkey,
    pub reward_amount: u64,
    pub new_total: u64,
    pub timestamp: i64,
}

/// Event emitted when cooldown period is updated
#[event]
pub struct CooldownUpdated {
    pub authority: Pubkey,
    pub stake_account: Pubkey,
    pub old_cooldown_end: i64,
    pub new_cooldown_end: i64,
    pub timestamp: i64,
}

/// Event emitted for authorization updates
#[event]
pub struct AuthorizationChanged {
    pub stake_account: Pubkey,
    pub new_authority: Pubkey,
    pub old_authority: Pubkey,
    pub timestamp: i64,
}

/// Event emitted when pool statistics change
#[event]
pub struct PoolStatsUpdated {
    pub total_staked: u64,
    pub total_xhyper: u64,
    pub active_stakes: u32,
    pub average_multiplier: u64,
    pub timestamp: i64,
}

/// Event emitted for emergency operations
#[event]
pub struct EmergencyEvent {
    pub event_type: String,
    pub description: String,
    pub affected_account: Option<Pubkey>,
    pub timestamp: i64,
}

/// Event emitted when configuration is updated
#[event]
pub struct ConfigurationUpdated {
    pub parameter: String,
    pub old_value: String,
    pub new_value: String,
    pub authority: Pubkey,
    pub timestamp: i64,
}
