use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::*;
use crate::errors::JobError;

/// Recover funds from expired jobs
///
/// Refunds clients for jobs that:
/// - Exceeded timeout while in Running state
/// - Were never claimed (stuck in queue)
///
/// This prevents DoS attacks where:
/// - Nodes claim jobs but never finish them
/// - Jobs sit in queue forever
pub fn recover(ctx: Context<Recover>) -> Result<()> {
    let market = &ctx.accounts.market;
    let job = &mut ctx.accounts.job;
    let clock = Clock::get()?;

    // Validation: Job must be in recoverable state
    let is_expired = match job.state {
        JobState::Running => {
            // Job is running but exceeded timeout
            let running_duration = clock
                .unix_timestamp
                .checked_sub(job.started_at.unwrap_or(0))
                .unwrap_or(0);
            running_duration > job.timeout
        }
        JobState::Queued => {
            // Job in queue for too long (2x timeout)
            let queue_duration = clock
                .unix_timestamp
                .checked_sub(job.created_at)
                .unwrap_or(0);
            queue_duration > (job.timeout * 2)
        }
        _ => false, // Completed, Failed, Stopped jobs can't be recovered
    };

    require!(is_expired, JobError::JobNotExpired);

    // Refund client
    let market_id = market.market_id.as_bytes();
    let seeds = &[b"market", market_id, &[market.bump]];
    let signer = &[&seeds[..]];

    let cpi_accounts = Transfer {
        from: ctx.accounts.vault.to_account_info(),
        to: ctx.accounts.client_token_account.to_account_info(),
        authority: ctx.accounts.market.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);

    token::transfer(cpi_ctx, job.price)?;

    // Update job state
    job.state = JobState::Failed;
    job.completed_at = Some(clock.unix_timestamp);

    msg!(
        "Recovered job {} - refunded {} to client {}",
        job.job_id,
        job.price,
        job.client
    );

    // Emit event
    emit!(RecoverEvent {
        job: job.key(),
        client: job.client,
        amount: job.price,
        reason: if matches!(job.state, JobState::Running) {
            "timeout_exceeded"
        } else {
            "stuck_in_queue"
        }
        .to_string(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

#[derive(Accounts)]
pub struct Recover<'info> {
    /// Market the job belongs to
    #[account(
        seeds = [b"market", market.market_id.as_bytes()],
        bump = market.bump
    )]
    pub market: Account<'info, Market>,

    /// Job to recover
    #[account(
        mut,
        seeds = [b"job", market.key().as_ref(), job.job_id.as_bytes()],
        bump = job.bump
    )]
    pub job: Account<'info, Job>,

    /// Client's token account (refund destination)
    #[account(
        mut,
        constraint = client_token_account.owner == job.client
    )]
    pub client_token_account: Account<'info, TokenAccount>,

    /// Market vault (escrow)
    #[account(
        mut,
        constraint = vault.key() == market.vault
    )]
    pub vault: Account<'info, TokenAccount>,

    /// Anyone can call recover (permissionless)
    pub caller: Signer<'info>,

    /// SPL Token program
    pub token_program: Program<'info, Token>,
}

/// Event emitted when job is recovered
#[event]
pub struct RecoverEvent {
    pub job: Pubkey,
    pub client: Pubkey,
    pub amount: u64,
    pub reason: String,
    pub timestamp: i64,
}
