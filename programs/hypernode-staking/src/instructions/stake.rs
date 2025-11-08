use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::*;
use crate::errors::*;
use hypernode_rewards::program::HypernodeRewards;
use hypernode_rewards::{ReflectionAccount, UserRewardsAccount, cpi::accounts::RegisterStake as RewardsRegisterStake};

/// Stake HYPER tokens to receive xHYPER
/// Longer durations give higher multipliers (1x to 4x)
#[derive(Accounts)]
pub struct Stake<'info> {
    #[account(
        init,
        payer = authority,
        space = StakeAccount::LEN,
        seeds = [b"stake", authority.key().as_ref()],
        bump
    )]
    pub stake_account: Account<'info, StakeAccount>,

    /// User's authority
    #[account(mut)]
    pub authority: Signer<'info>,

    /// User's token account (source)
    #[account(
        mut,
        constraint = user_token_account.owner == authority.key() @ StakingError::Unauthorized
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    /// Staking vault (holds staked tokens)
    #[account(
        mut,
        seeds = [b"vault"],
        bump
    )]
    pub vault: Account<'info, TokenAccount>,

    /// Reflection account from Rewards Program (optional)
    pub reflection_account: Option<Account<'info, ReflectionAccount>>,

    /// User rewards account (optional, will be created)
    pub user_rewards_account: Option<AccountInfo<'info>>,

    /// Rewards program (optional)
    pub rewards_program: Option<Program<'info, HypernodeRewards>>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<Stake>,
    amount: u64,
    duration: i64,
) -> Result<()> {
    let stake_account = &mut ctx.accounts.stake_account;
    let clock = Clock::get()?;

    // Validate user has sufficient balance
    require!(
        ctx.accounts.user_token_account.amount >= amount,
        StakingError::InsufficientBalance
    );

    // Validate duration
    require!(
        duration >= DURATION_MIN,
        StakingError::DurationTooShort
    );

    // Initialize stake account
    stake_account.authority = ctx.accounts.authority.key();
    stake_account.amount = amount;
    stake_account.time_stake = clock.unix_timestamp;
    stake_account.time_unstake = 0;
    stake_account.duration = duration;
    stake_account.bump = ctx.bumps.stake_account;

    // Calculate xHYPER
    stake_account.update_xhyper();

    // Transfer tokens to vault
    let cpi_accounts = Transfer {
        from: ctx.accounts.user_token_account.to_account_info(),
        to: ctx.accounts.vault.to_account_info(),
        authority: ctx.accounts.authority.to_account_info(),
    };

    let cpi_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        cpi_accounts,
    );

    token::transfer(cpi_ctx, amount)?;

    msg!("Stake created");
    msg!("Amount: {}", amount);
    msg!("Duration: {} seconds", duration);
    msg!("xHYPER: {}", stake_account.xhyper);
    msg!("Multiplier: {}x", stake_account.get_multiplier_bps() as f64 / 100.0);

    // Register in Rewards Program if provided
    if let (Some(_reflection), Some(_user_rewards), Some(_rewards_program)) = (
        &ctx.accounts.reflection_account,
        &ctx.accounts.user_rewards_account,
        &ctx.accounts.rewards_program,
    ) {
        msg!("Registering in Rewards Program with xHYPER: {}", stake_account.xhyper);

        // TODO: Implement full CPI to register_stake
        // Requires proper account setup and initialization
        // let cpi_accounts = RewardsRegisterStake {
        //     reflection_account: ctx.accounts.reflection_account.as_ref().unwrap().to_account_info(),
        //     user_rewards_account: ctx.accounts.user_rewards_account.as_ref().unwrap().to_account_info(),
        //     authority: ctx.accounts.authority.to_account_info(),
        //     stake_account: ctx.accounts.stake_account.to_account_info(),
        //     system_program: ctx.accounts.system_program.to_account_info(),
        // };
        // let cpi_ctx = CpiContext::new(rewards_program.to_account_info(), cpi_accounts);
        // hypernode_rewards::cpi::register_stake(cpi_ctx, stake_account.xhyper)?;
    }

    Ok(())
}
