use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;
pub use state::{ReflectionAccount, UserRewardsAccount};

declare_id!("EqBzwuXKmDZbAMf2WTogQhzABsrG6dYbbKXW1adsLhbb");

/// Hypernode Rewards Program
/// Distributes rewards to stakers using reflection algorithm
/// O(1) distribution - no iteration over users required
#[program]
pub mod hypernode_rewards {
    use super::*;

    /// Initialize reflection account
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        instructions::initialize::handler(ctx)
    }

    /// Register user's stake in rewards system
    pub fn register_stake(ctx: Context<RegisterStake>, xhyper: u128) -> Result<()> {
        instructions::register_stake::handler(ctx, xhyper)
    }

    /// Unregister user's stake (on unstake)
    pub fn unregister_stake(ctx: Context<UnregisterStake>) -> Result<()> {
        instructions::unregister_stake::handler(ctx)
    }

    /// Add rewards to the pool
    pub fn add_rewards(ctx: Context<AddRewards>, amount: u64) -> Result<()> {
        instructions::add_rewards::handler(ctx, amount)
    }

    /// Claim accumulated rewards
    pub fn claim_rewards(ctx: Context<ClaimRewards>) -> Result<()> {
        instructions::claim_rewards::handler(ctx)
    }
}
