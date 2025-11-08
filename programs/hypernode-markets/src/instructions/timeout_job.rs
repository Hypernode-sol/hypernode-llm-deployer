use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::*;

/// Mark job as timed out and refund client
/// Can be called by anyone if job has exceeded timeout
#[derive(Accounts)]
pub struct TimeoutJob<'info> {
    #[account(mut)]
    pub job: Account<'info, JobAccount>,

    #[account(
        mut,
        constraint = job.market == market.key() @ MarketError::MarketMismatch
    )]
    pub market: Account<'info, MarketAccount>,

    /// Client account to receive refund
    #[account(
        mut,
        constraint = job.client == client.key() @ MarketError::Unauthorized
    )]
    pub client: SystemAccount<'info>,

    /// Vault PDA for escrow payment
    #[account(
        mut,
        seeds = [b"vault", market.key().as_ref()],
        bump
    )]
    pub vault: SystemAccount<'info>,

    /// Caller (anyone can call this)
    pub caller: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<TimeoutJob>) -> Result<()> {
    let job = &mut ctx.accounts.job;
    let market = &ctx.accounts.market;
    let client = &ctx.accounts.client;
    let vault = &ctx.accounts.vault;
    let clock = Clock::get()?;

    // Verify job is running
    require!(job.is_running(), MarketError::JobNotRunning);

    // Verify job has timed out
    require!(
        job.check_timeout(clock.unix_timestamp),
        MarketError::JobNotTimedOut
    );

    // Update job state
    job.state = JobState::TimedOut;
    job.time_end = clock.unix_timestamp;

    // Refund client from vault
    // PDA signer seeds
    let market_key = market.key();
    let seeds = &[
        b"vault",
        market_key.as_ref(),
        &[market.vault_bump],
    ];
    let signer_seeds = &[&seeds[..]];

    // Transfer lamports from vault (PDA) to client
    **vault.to_account_info().try_borrow_mut_lamports()? -= job.price;
    **client.to_account_info().try_borrow_mut_lamports()? += job.price;

    msg!("Job timed out: {}", job.key());
    msg!("Node: {}", job.node.unwrap());
    msg!("Refund: {} lamports", job.price);
    msg!("Duration: {} seconds", job.time_end - job.time_start);

    Ok(())
}
