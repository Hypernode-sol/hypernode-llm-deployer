use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::*;
use crate::errors::*;

/// Add rewards to the pool
/// Called when job completes - percentage of payment goes to rewards
#[derive(Accounts)]
pub struct AddRewards<'info> {
    #[account(
        mut,
        seeds = [b"reflection"],
        bump = reflection_account.bump
    )]
    pub reflection_account: Account<'info, ReflectionAccount>,

    /// Source token account (usually from Markets Program)
    #[account(mut)]
    pub source_token_account: Account<'info, TokenAccount>,

    /// Rewards vault (holds accumulated rewards)
    #[account(
        mut,
        seeds = [b"rewards_vault"],
        bump
    )]
    pub rewards_vault: Account<'info, TokenAccount>,

    /// Authority sending rewards (usually Markets Program)
    pub authority: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<AddRewards>, amount: u64) -> Result<()> {
    let reflection = &mut ctx.accounts.reflection_account;

    // Validate amount
    require!(amount > 0, RewardsError::InvalidAmount);

    // Transfer tokens to rewards vault
    let cpi_accounts = Transfer {
        from: ctx.accounts.source_token_account.to_account_info(),
        to: ctx.accounts.rewards_vault.to_account_info(),
        authority: ctx.accounts.authority.to_account_info(),
    };

    let cpi_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        cpi_accounts,
    );

    token::transfer(cpi_ctx, amount)?;

    // Update reflection accounting
    reflection.add_rewards(amount);

    msg!("Rewards added: {}", amount);
    msg!("New rate: {}", reflection.rate);
    msg!("Total rewards: {}", reflection.total_rewards_distributed);

    Ok(())
}
