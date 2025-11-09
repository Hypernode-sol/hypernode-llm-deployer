use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};
use crate::state::*;

/// Initialize a new job market
///
/// Creates the market account and associated vault for escrow.
/// Markets can have different parameters (price, timeout, requirements).
pub fn initialize_market(
    ctx: Context<InitializeMarket>,
    market_id: String,
    job_price: u64,
    job_timeout: i64,
    node_stake_minimum: u64,
) -> Result<()> {
    let market = &mut ctx.accounts.market;

    // Validation
    require!(
        market_id.len() <= Market::MAX_MARKET_ID_LEN,
        MarketError::MarketIdTooLong
    );
    require!(job_price > 0, MarketError::InvalidPrice);
    require!(job_timeout > 0, MarketError::InvalidTimeout);

    // Initialize market
    market.authority = ctx.accounts.authority.key();
    market.queue_type = QueueType::Empty;
    market.queue = Vec::new();
    market.job_price = job_price;
    market.job_timeout = job_timeout;
    market.node_stake_minimum = node_stake_minimum;
    market.vault = ctx.accounts.vault.key();
    market.market_id = market_id.clone();
    market.total_jobs = 0;
    market.total_nodes = 0;
    market.bump = ctx.bumps.market;

    msg!("Market '{}' initialized", market_id);
    msg!("Job price: {}", job_price);
    msg!("Job timeout: {} seconds", job_timeout);
    msg!("Node stake minimum: {}", node_stake_minimum);

    Ok(())
}

#[derive(Accounts)]
#[instruction(market_id: String)]
pub struct InitializeMarket<'info> {
    /// Market account (PDA)
    #[account(
        init,
        payer = authority,
        space = Market::SPACE,
        seeds = [b"market", market_id.as_bytes()],
        bump
    )]
    pub market: Account<'info, Market>,

    /// Vault for holding escrowed payments (token account)
    #[account(
        init,
        payer = authority,
        token::mint = token_mint,
        token::authority = market,
        seeds = [b"vault", market_id.as_bytes()],
        bump
    )]
    pub vault: Account<'info, TokenAccount>,

    /// Token mint (HYPER token)
    pub token_mint: Account<'info, Mint>,

    /// Authority creating the market (becomes market authority)
    #[account(mut)]
    pub authority: Signer<'info>,

    /// SPL Token program
    pub token_program: Program<'info, Token>,

    /// System program
    pub system_program: Program<'info, System>,

    /// Rent sysvar
    pub rent: Sysvar<'info, Rent>,
}

#[error_code]
pub enum MarketError {
    #[msg("Market ID exceeds maximum length")]
    MarketIdTooLong,

    #[msg("Job price must be greater than zero")]
    InvalidPrice,

    #[msg("Job timeout must be greater than zero")]
    InvalidTimeout,
}
