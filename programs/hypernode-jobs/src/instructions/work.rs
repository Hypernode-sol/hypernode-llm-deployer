use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::JobError;

/// Node enters work queue or claims available job
///
/// Dynamic queue behavior:
/// - If jobs are waiting (QueueType::Job), assigns immediately
/// - Otherwise, adds node to queue (QueueType::Node)
pub fn work(ctx: Context<Work>) -> Result<()> {
    let market = &mut ctx.accounts.market;
    let node_pubkey = ctx.accounts.node_authority.key();
    let clock = Clock::get()?;

    // Validation: queue not full
    require!(
        market.queue.len() < Market::MAX_QUEUE_SIZE,
        JobError::QueueFull
    );

    // Validation: node not already in queue
    require!(
        !market.queue.contains(&node_pubkey),
        JobError::NodeAlreadyInQueue
    );

    // Update market stats
    if market.total_nodes == 0 || !market.queue.contains(&node_pubkey) {
        market.total_nodes = market.total_nodes.checked_add(1).unwrap();
    }

    // Dynamic queue logic (Nosana pattern - opposite of submit_job)
    match market.queue_type {
        QueueType::Job => {
            // Job is waiting! Claim immediately (trustless matching)
            require!(!market.queue.is_empty(), JobError::QueueEmpty);

            let job_pubkey = market.queue.remove(0);

            // Note: The actual job assignment happens in the client
            // The job account will be updated via a separate instruction
            // This keeps the work() instruction simple and gas-efficient

            // Update queue type if empty
            if market.queue.is_empty() {
                market.queue_type = QueueType::Empty;
            }

            msg!(
                "Node {} claimed job {} immediately",
                node_pubkey,
                job_pubkey
            );

            // Emit event for off-chain tracking
            emit!(JobAssignedEvent {
                job: job_pubkey,
                node: node_pubkey,
                timestamp: clock.unix_timestamp,
            });
        }
        _ => {
            // No jobs available, enter node queue
            market.queue.push(node_pubkey);
            market.queue_type = QueueType::Node;

            msg!(
                "Node {} entered queue (position {})",
                node_pubkey,
                market.queue.len()
            );
        }
    }

    Ok(())
}

#[derive(Accounts)]
pub struct Work<'info> {
    /// Market to work on
    #[account(
        mut,
        seeds = [b"market", market.market_id.as_bytes()],
        bump = market.bump
    )]
    pub market: Account<'info, Market>,

    /// Node authority (from hypernode-nodes program)
    /// We don't load the full Node account here to save CU
    /// Validation happens in hypernode-nodes program
    pub node_authority: Signer<'info>,
}

/// Event emitted when job is assigned to node
#[event]
pub struct JobAssignedEvent {
    pub job: Pubkey,
    pub node: Pubkey,
    pub timestamp: i64,
}
