use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::*;

/// Node claims a job from the queue (dual queue matching)
/// If jobs are queued: pop job and start work
/// If no jobs: add node to queue and wait
#[derive(Accounts)]
pub struct WorkJob<'info> {
    #[account(mut)]
    pub job: Account<'info, JobAccount>,

    #[account(
        mut,
        constraint = job.market == market.key() @ MarketError::MarketMismatch
    )]
    pub market: Account<'info, MarketAccount>,

    /// Node claiming the job
    /// Must have sufficient xHYPER stake (verified off-chain or via CPI to staking program)
    pub node: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<WorkJob>) -> Result<()> {
    let market = &mut ctx.accounts.market;
    let job = &mut ctx.accounts.job;
    let node = &ctx.accounts.node;
    let clock = Clock::get()?;

    // Verify job is in queued state
    require!(job.is_queued(), MarketError::JobNotQueued);

    // Verify job hasn't timed out (shouldn't happen for queued jobs, but check anyway)
    require!(
        !job.check_timeout(clock.unix_timestamp),
        MarketError::JobTimedOut
    );

    // TODO: Verify node has sufficient xHYPER stake
    // This would be a CPI call to hypernode-staking program
    // For now, we assume node is eligible

    // Dual Queue Logic
    match market.queue_type {
        // Jobs are waiting - pop from queue and assign to node
        MarketAccount::QUEUE_TYPE_JOBS => {
            // Remove job from queue
            let popped_job = market
                .queue_pop()
                .ok_or(MarketError::QueueEmpty)?;

            // Verify popped job matches current job
            require!(
                popped_job == job.key(),
                MarketError::MarketMismatch
            );

            // Update queue type if empty
            if market.queue_is_empty() {
                market.queue_type = MarketAccount::QUEUE_TYPE_EMPTY;
            }

            msg!("Job {} assigned to node {}", job.key(), node.key());
        }
        // No jobs waiting, or nodes waiting - shouldn't reach here in normal flow
        _ => {
            return Err(MarketError::InvalidQueueType.into());
        }
    }

    // Assign job to node
    job.node = Some(node.key());
    job.state = JobState::Running;
    job.time_start = clock.unix_timestamp;

    msg!("Job started: {}", job.key());
    msg!("Node: {}", node.key());
    msg!("Start time: {}", job.time_start);

    Ok(())
}
