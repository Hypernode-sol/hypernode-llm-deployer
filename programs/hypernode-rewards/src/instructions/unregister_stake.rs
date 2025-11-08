use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::*;

/// Unregister user's stake from rewards system
/// Called when user unstakes in Staking Program
#[derive(Accounts)]
pub struct UnregisterStake<'info> {
    #[account(
        mut,
        seeds = [b"reflection"],
        bump = reflection_account.bump
    )]
    pub reflection_account: Account<'info, ReflectionAccount>,

    #[account(
        mut,
        seeds = [b"user_rewards", authority.key().as_ref()],
        bump = user_rewards_account.bump,
        constraint = user_rewards_account.authority == authority.key() @ RewardsError::Unauthorized,
        close = authority
    )]
    pub user_rewards_account: Account<'info, UserRewardsAccount>,

    /// User's authority (receives rent refund)
    #[account(mut)]
    pub authority: Signer<'info>,
}

pub fn handler(ctx: Context<UnregisterStake>) -> Result<()> {
    let reflection = &mut ctx.accounts.reflection_account;
    let user_rewards = &ctx.accounts.user_rewards_account;

    // Remove from reflection system
    reflection.remove_staker(
        user_rewards.xhyper,
        user_rewards.initial_reflection,
    );

    msg!("User unregistered from rewards system");
    msg!("xHYPER removed: {}", user_rewards.xhyper);
    msg!("Total claimed: {}", user_rewards.total_claimed);
    msg!("Account closed");

    Ok(())
}
