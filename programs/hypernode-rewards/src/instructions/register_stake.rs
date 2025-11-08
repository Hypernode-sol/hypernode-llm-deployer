use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::*;

/// Register user's stake in rewards system
/// Called after user stakes in Staking Program
#[derive(Accounts)]
pub struct RegisterStake<'info> {
    #[account(
        mut,
        seeds = [b"reflection"],
        bump = reflection_account.bump
    )]
    pub reflection_account: Account<'info, ReflectionAccount>,

    #[account(
        init,
        payer = authority,
        space = UserRewardsAccount::LEN,
        seeds = [b"user_rewards", authority.key().as_ref()],
        bump
    )]
    pub user_rewards_account: Account<'info, UserRewardsAccount>,

    /// User's authority
    #[account(mut)]
    pub authority: Signer<'info>,

    /// User's stake account from Staking Program
    /// CHECK: We read this account to get xHYPER balance
    pub stake_account: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<RegisterStake>, xhyper: u128) -> Result<()> {
    let reflection = &mut ctx.accounts.reflection_account;
    let user_rewards = &mut ctx.accounts.user_rewards_account;
    let clock = Clock::get()?;

    // Validate xHYPER amount
    require!(xhyper > 0, RewardsError::InvalidXhyperAmount);

    // Register in reflection system
    let initial_reflection = reflection.add_staker(xhyper);

    // Initialize user rewards account
    user_rewards.authority = ctx.accounts.authority.key();
    user_rewards.initial_reflection = initial_reflection;
    user_rewards.xhyper = xhyper;
    user_rewards.total_claimed = 0;
    user_rewards.last_claim = clock.unix_timestamp;
    user_rewards.bump = ctx.bumps.user_rewards_account;

    msg!("User registered in rewards system");
    msg!("xHYPER: {}", xhyper);
    msg!("Initial reflection: {}", initial_reflection);
    msg!("Current rate: {}", reflection.rate);

    Ok(())
}
