use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};
use crate::state::*;

/// Create a new GPU marketplace
/// Authority can update market parameters later
#[derive(Accounts)]
pub struct CreateMarket<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 8 + 8 + 16 + 1 + 1 + 8 + 8 + 32 + 4
    )]
    pub market: Account<'info, MarketAccount>,

    /// Market authority (can update parameters)
    #[account(mut)]
    pub authority: Signer<'info>,

    /// Vault PDA for escrow payments
    /// Seeds: ["vault", market.key()]
    #[account(
        seeds = [b"vault", market.key().as_ref()],
        bump
    )]
    pub vault: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<CreateMarket>,
    job_price: u64,
    job_timeout: i64,
    node_xhyper_minimum: u128,
) -> Result<()> {
    let market = &mut ctx.accounts.market;

    // Get vault bump from the PDA derivation
    let vault_bump = ctx.bumps.vault;

    // Initialize market account
    market.authority = ctx.accounts.authority.key();
    market.job_price = job_price;
    market.job_timeout = job_timeout;
    market.node_xhyper_minimum = node_xhyper_minimum;
    market.queue_type = MarketAccount::QUEUE_TYPE_EMPTY;
    market.vault_bump = vault_bump;
    market.total_jobs = 0;
    market.total_nodes = 0;
    market.vault = ctx.accounts.vault.key();
    market.queue = Vec::new();

    msg!("Market created successfully");
    msg!("Job price: {} lamports | Timeout: {} sec | Min xHYPER: {}", job_price, job_timeout, node_xhyper_minimum);

    Ok(())
}
