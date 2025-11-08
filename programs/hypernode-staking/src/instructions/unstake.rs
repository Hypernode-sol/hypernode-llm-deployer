use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::*;

/// Initiate unstake process
/// Starts cooldown period equal to staking duration
/// xHYPER balance goes to 0 immediately
#[derive(Accounts)]
pub struct Unstake<'info> {
    #[account(
        mut,
        seeds = [b"stake", authority.key().as_ref()],
        bump = stake_account.bump,
        constraint = stake_account.authority == authority.key() @ StakingError::Unauthorized
    )]
    pub stake_account: Account<'info, StakeAccount>,

    /// User's authority
    pub authority: Signer<'info>,
}

pub fn handler(ctx: Context<Unstake>) -> Result<()> {
    let stake_account = &mut ctx.accounts.stake_account;
    let clock = Clock::get()?;

    // Verify stake is active
    require!(
        stake_account.is_active(),
        StakingError::AlreadyUnstaking
    );

    // Mark unstake time
    stake_account.time_unstake = clock.unix_timestamp;

    // Update xHYPER (will be 0 now)
    stake_account.update_xhyper();

    msg!("Unstake initiated");
    msg!("Cooldown: {} seconds", stake_account.duration);
    msg!("Withdraw available at: {}", stake_account.time_unstake + stake_account.duration);
    msg!("xHYPER balance: 0 (burned)");

    Ok(())
}
