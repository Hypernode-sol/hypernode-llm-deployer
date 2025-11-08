use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::*;
use crate::errors::*;

/// Withdraw staked tokens after cooldown period
/// Can only be called after cooldown has passed
#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(
        mut,
        seeds = [b"stake", authority.key().as_ref()],
        bump = stake_account.bump,
        constraint = stake_account.authority == authority.key() @ StakingError::Unauthorized,
        constraint = stake_account.time_unstake != 0 @ StakingError::NotUnstaking,
        close = authority
    )]
    pub stake_account: Account<'info, StakeAccount>,

    /// User's authority
    #[account(mut)]
    pub authority: Signer<'info>,

    /// User's token account (destination)
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

    /// Vault authority PDA
    /// CHECK: PDA signer
    #[account(
        seeds = [b"vault_authority"],
        bump
    )]
    pub vault_authority: AccountInfo<'info>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<Withdraw>) -> Result<()> {
    let stake_account = &ctx.accounts.stake_account;
    let clock = Clock::get()?;

    // Verify cooldown has passed
    require!(
        stake_account.can_withdraw(clock.unix_timestamp),
        StakingError::CooldownNotPassed
    );

    // Transfer tokens from vault to user
    let vault_authority_bump = ctx.bumps.vault_authority;
    let seeds: &[&[u8]] = &[b"vault_authority", &[vault_authority_bump]];
    let signer_seeds = &[seeds];

    let cpi_accounts = Transfer {
        from: ctx.accounts.vault.to_account_info(),
        to: ctx.accounts.user_token_account.to_account_info(),
        authority: ctx.accounts.vault_authority.to_account_info(),
    };

    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        cpi_accounts,
        signer_seeds,
    );

    token::transfer(cpi_ctx, stake_account.amount)?;

    msg!("Withdrawal completed");
    msg!("Amount: {}", stake_account.amount);
    msg!("Stake account closed");

    Ok(())
}
