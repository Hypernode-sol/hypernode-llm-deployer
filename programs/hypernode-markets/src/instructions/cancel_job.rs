use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::*;

/// Cancel a queued job and refund client
/// Can only be called by the client who created the job
#[derive(Accounts)]
pub struct CancelJob<'info> {
    #[account(mut)]
    pub job: Account<'info, JobAccount>,

    #[account(
        mut,
        constraint = job.market == market.key() @ MarketError::MarketMismatch
    )]
    pub market: Account<'info, MarketAccount>,

    /// Client who created the job
    #[account(
        mut,
        constraint = job.client == client.key() @ MarketError::Unauthorized
    )]
    pub client: Signer<'info>,

    /// Vault PDA for escrow payment
    #[account(
        mut,
        seeds = [b"vault", market.key().as_ref()],
        bump
    )]
    pub vault: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CancelJob>) -> Result<()> {
    let job = &mut ctx.accounts.job;
    let market = &mut ctx.accounts.market;
    let client = &ctx.accounts.client;
    let vault = &ctx.accounts.vault;
    let clock = Clock::get()?;

    // Verify job is queued (can only cancel queued jobs)
    require!(job.is_queued(), MarketError::JobNotQueued);

    // Remove job from market queue
    let job_key = job.key();
    market.queue_remove(job_key);

    // Update queue type if empty
    if market.queue_is_empty() {
        market.queue_type = MarketAccount::QUEUE_TYPE_EMPTY;
    }

    // Update job state
    job.state = JobState::Stopped;
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

    msg!("Job cancelled: {}", job.key());
    msg!("Client: {}", client.key());
    msg!("Refund: {} lamports", job.price);

    Ok(())
}
