use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::*;
use crate::errors::JobError;

/// Finish a job and release payment to node
///
/// This implements trustless payment settlement:
/// - Validates node authorization
/// - Verifies IPFS result hash
/// - Transfers payment from escrow to node
/// - Updates job state and stats
pub fn finish(
    ctx: Context<Finish>,
    ipfs_result: [u8; 32],
    success: bool,
) -> Result<()> {
    let job = &mut ctx.accounts.job;
    let market = &ctx.accounts.market;
    let clock = Clock::get()?;

    // Validation: Only assigned node can finish
    require!(
        job.node == Some(ctx.accounts.node_authority.key()),
        JobError::UnauthorizedNode
    );

    // Validation: Job must be running
    require!(
        job.state == JobState::Running,
        JobError::JobNotRunning
    );

    // Validation: IPFS result hash must not be empty
    require!(
        ipfs_result != [0u8; 32],
        JobError::InvalidIpfsHash
    );

    // Validation: Check timeout (optional - could allow late submission)
    let elapsed = clock.unix_timestamp - job.started_at.unwrap_or(0);
    require!(
        elapsed <= job.timeout,
        JobError::JobExpired
    );

    // Update job state
    job.ipfs_result = ipfs_result;
    job.completed_at = Some(clock.unix_timestamp);

    if success {
        job.state = JobState::Completed;

        // Transfer payment from vault to node (trustless settlement)
        let market_id = market.market_id.as_bytes();
        let seeds = &[
            b"market",
            market_id,
            &[market.bump],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.node_token_account.to_account_info(),
            authority: ctx.accounts.market.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);

        token::transfer(cpi_ctx, job.price)?;

        msg!(
            "Job {} completed successfully. Paid {} to node {}",
            job.job_id,
            job.price,
            ctx.accounts.node_authority.key()
        );

        // Emit success event
        emit!(JobCompletedEvent {
            job: job.key(),
            node: ctx.accounts.node_authority.key(),
            price: job.price,
            duration: elapsed,
            timestamp: clock.unix_timestamp,
        });
    } else {
        job.state = JobState::Failed;

        // On failure, refund client (trustless refund)
        let market_id = market.market_id.as_bytes();
        let seeds = &[
            b"market",
            market_id,
            &[market.bump],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.client_token_account.to_account_info(),
            authority: ctx.accounts.market.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);

        token::transfer(cpi_ctx, job.price)?;

        msg!(
            "Job {} failed. Refunded {} to client {}",
            job.job_id,
            job.price,
            job.client
        );

        // Emit failure event
        emit!(JobFailedEvent {
            job: job.key(),
            node: ctx.accounts.node_authority.key(),
            duration: elapsed,
            timestamp: clock.unix_timestamp,
        });
    }

    Ok(())
}

#[derive(Accounts)]
pub struct Finish<'info> {
    /// Market this job belongs to
    #[account(
        seeds = [b"market", market.market_id.as_bytes()],
        bump = market.bump
    )]
    pub market: Account<'info, Market>,

    /// Job to finish
    #[account(
        mut,
        seeds = [b"job", market.key().as_ref(), job.job_id.as_bytes()],
        bump = job.bump
    )]
    pub job: Account<'info, Job>,

    /// Node finishing the job
    pub node_authority: Signer<'info>,

    /// Node's token account (payment destination)
    #[account(
        mut,
        constraint = node_token_account.owner == node_authority.key()
    )]
    pub node_token_account: Account<'info, TokenAccount>,

    /// Client's token account (refund destination if failed)
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

    /// SPL Token program
    pub token_program: Program<'info, Token>,
}

/// Event emitted when job completes successfully
#[event]
pub struct JobCompletedEvent {
    pub job: Pubkey,
    pub node: Pubkey,
    pub price: u64,
    pub duration: i64,
    pub timestamp: i64,
}

/// Event emitted when job fails
#[event]
pub struct JobFailedEvent {
    pub job: Pubkey,
    pub node: Pubkey,
    pub duration: i64,
    pub timestamp: i64,
}
