use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::*;
use crate::errors::*;

/// Claim accumulated rewards
/// Rewards are proportional to xHYPER held
#[derive(Accounts)]
pub struct ClaimRewards<'info> {
    #[account(
        seeds = [b"reflection"],
        bump = reflection_account.bump
    )]
    pub reflection_account: Account<'info, ReflectionAccount>,

    #[account(
        mut,
        seeds = [b"user_rewards", authority.key().as_ref()],
        bump = user_rewards_account.bump,
        constraint = user_rewards_account.authority == authority.key() @ RewardsError::Unauthorized
    )]
    pub user_rewards_account: Account<'info, UserRewardsAccount>,

    /// User's authority
    pub authority: Signer<'info>,

    /// User's token account (destination for rewards)
    #[account(
        mut,
        constraint = user_token_account.owner == authority.key() @ RewardsError::Unauthorized
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    /// Rewards vault
    #[account(
        mut,
        seeds = [b"rewards_vault"],
        bump
    )]
    pub rewards_vault: Account<'info, TokenAccount>,

    /// Vault authority PDA
    /// CHECK: PDA signer
    #[account(
        seeds = [b"vault_authority"],
        bump
    )]
    pub vault_authority: AccountInfo<'info>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<ClaimRewards>) -> Result<()> {
    let reflection = &ctx.accounts.reflection_account;
    let user_rewards = &mut ctx.accounts.user_rewards_account;

    // Calculate claimable rewards
    let claimable = user_rewards.calculate_claimable(reflection.rate);

    // Validate there are rewards to claim
    require!(claimable > 0, RewardsError::NoRewardsToClaim);

    // Validate vault has sufficient balance
    require!(
        ctx.accounts.rewards_vault.amount >= claimable,
        RewardsError::InsufficientVaultBalance
    );

    // Transfer rewards from vault to user
    let vault_authority_bump = ctx.bumps.vault_authority;
    let seeds: &[&[u8]] = &[b"vault_authority", &[vault_authority_bump]];
    let signer_seeds = &[seeds];

    let cpi_accounts = Transfer {
        from: ctx.accounts.rewards_vault.to_account_info(),
        to: ctx.accounts.user_token_account.to_account_info(),
        authority: ctx.accounts.vault_authority.to_account_info(),
    };

    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        cpi_accounts,
        signer_seeds,
    );

    token::transfer(cpi_ctx, claimable)?;

    // Update user rewards account
    user_rewards.update_after_claim(claimable, reflection.rate);

    msg!("Rewards claimed: {}", claimable);
    msg!("Total claimed: {}", user_rewards.total_claimed);

    Ok(())
}
