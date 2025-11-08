use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod events;
pub mod instructions;
pub mod math;
pub mod state;
pub mod validation;

use instructions::*;
pub use state::StakeAccount;
pub use constants::*;

declare_id!("3fw9eQN1KHarGcYVETvF7FDt2BYGuDPMjuhoE45RJnTJ");

/// Hypernode Staking Program
/// Stake HYPER tokens to receive xHYPER with time-based multiplier
/// Multiplier ranges from 1x (2 weeks) to 4x (1 year)
#[program]
pub mod hypernode_staking {
    use super::*;

    /// Stake HYPER tokens with specified duration
    /// Longer durations receive higher xHYPER multipliers
    pub fn stake(
        ctx: Context<Stake>,
        amount: u64,
        duration: i64,
    ) -> Result<()> {
        instructions::stake::handler(ctx, amount, duration)
    }

    /// Initiate unstake process
    /// Starts cooldown period equal to staking duration
    pub fn unstake(ctx: Context<Unstake>) -> Result<()> {
        instructions::unstake::handler(ctx)
    }

    /// Withdraw tokens after cooldown period
    /// Closes stake account and returns tokens
    pub fn withdraw(ctx: Context<Withdraw>) -> Result<()> {
        instructions::withdraw::handler(ctx)
    }
}
