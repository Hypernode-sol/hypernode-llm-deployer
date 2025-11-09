use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::*;
use crate::errors::JobError;

/// Submit a new job to the market
///
/// This implements the Nosana-style dynamic queue system:
/// - If nodes are waiting (QueueType::Node), assigns immediately
/// - Otherwise, adds job to queue (QueueType::Job)
pub fn submit_job(
    ctx: Context<SubmitJob>,
    job_id: String,
    ipfs_job: [u8; 32],
    price: u64,
    timeout: i64,
) -> Result<()> {
    let market = &mut ctx.accounts.market;
    let job = &mut ctx.accounts.job;
    let clock = Clock::get()?;

    // Validation (Szabo principle: verify everything)
    require!(
        job_id.len() <= Job::MAX_JOB_ID_LEN,
        JobError::JobIdTooLong
    );
    require!(price >= market.job_price, JobError::PriceTooLow);
    require!(timeout > 0, JobError::InvalidTimeout);
    require!(
        market.queue.len() < Market::MAX_QUEUE_SIZE,
        JobError::QueueFull
    );

    // IPFS hash must not be empty (content-addressed storage)
    require!(
        ipfs_job != [0u8; 32],
        JobError::InvalidIpfsHash
    );

    // Transfer payment to vault (escrow)
    let cpi_accounts = Transfer {
        from: ctx.accounts.client_token_account.to_account_info(),
        to: ctx.accounts.vault.to_account_info(),
        authority: ctx.accounts.client.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    token::transfer(cpi_ctx, price)?;

    // Initialize job account
    job.market = market.key();
    job.client = ctx.accounts.client.key();
    job.ipfs_job = ipfs_job;
    job.ipfs_result = [0u8; 32]; // Empty until finished
    job.price = price;
    job.timeout = timeout;
    job.node = None;
    job.created_at = clock.unix_timestamp;
    job.started_at = None;
    job.completed_at = None;
    job.job_id = job_id;
    job.bump = ctx.bumps.job;

    // Dynamic queue logic (Nosana pattern)
    match market.queue_type {
        QueueType::Node => {
            // Node is waiting! Assign immediately (trustless matching)
            require!(!market.queue.is_empty(), JobError::QueueEmpty);

            let node_pubkey = market.queue.remove(0);
            job.node = Some(node_pubkey);
            job.state = JobState::Running;
            job.started_at = Some(clock.unix_timestamp);

            // Update queue type if empty
            if market.queue.is_empty() {
                market.queue_type = QueueType::Empty;
            }

            msg!("Job {} assigned immediately to node {}", job.job_id, node_pubkey);
        }
        _ => {
            // No nodes available, enter job queue
            market.queue.push(job.key());
            market.queue_type = QueueType::Job;
            job.state = JobState::Queued;

            msg!("Job {} added to queue (position {})", job.job_id, market.queue.len());
        }
    }

    // Update stats
    market.total_jobs = market.total_jobs.checked_add(1).unwrap();

    Ok(())
}

#[derive(Accounts)]
#[instruction(job_id: String)]
pub struct SubmitJob<'info> {
    /// Market to submit job to
    #[account(
        mut,
        seeds = [b"market", market.market_id.as_bytes()],
        bump = market.bump
    )]
    pub market: Account<'info, Market>,

    /// Job account (PDA)
    #[account(
        init,
        payer = client,
        space = Job::SPACE,
        seeds = [b"job", market.key().as_ref(), job_id.as_bytes()],
        bump
    )]
    pub job: Account<'info, Job>,

    /// Client submitting the job
    #[account(mut)]
    pub client: Signer<'info>,

    /// Client's token account (payment source)
    #[account(
        mut,
        constraint = client_token_account.owner == client.key()
    )]
    pub client_token_account: Account<'info, TokenAccount>,

    /// Market vault (escrow for payments)
    #[account(
        mut,
        constraint = vault.key() == market.vault
    )]
    pub vault: Account<'info, TokenAccount>,

    /// SPL Token program
    pub token_program: Program<'info, Token>,

    /// System program
    pub system_program: Program<'info, System>,
}
