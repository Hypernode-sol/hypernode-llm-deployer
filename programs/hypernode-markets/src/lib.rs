use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("67UE2LconF9QU5Vobsaf5sXnW9yUisebLj8VmgGWLSdb");

/// Hypernode Markets Program
/// GPU marketplace with dual queue matching and escrow payments
/// Based on Nosana's proven architecture
#[program]
pub mod hypernode_markets {
    use super::*;

    /// Create a new GPU marketplace
    pub fn create_market(
        ctx: Context<CreateMarket>,
        job_price: u64,
        job_timeout: i64,
        node_xhyper_minimum: u128,
    ) -> Result<()> {
        instructions::create_market::handler(ctx, job_price, job_timeout, node_xhyper_minimum)
    }

    /// Create a new job and add to queue
    pub fn create_job(
        ctx: Context<CreateJob>,
        job_id: Pubkey,
        ipfs_job: [u8; 32],
        min_vram: u8,
        gpu_type: u8,
    ) -> Result<()> {
        instructions::create_job::handler(ctx, job_id, ipfs_job, min_vram, gpu_type)
    }

    /// Node claims a job from the queue
    pub fn work_job(ctx: Context<WorkJob>) -> Result<()> {
        instructions::work_job::handler(ctx)
    }

    /// Node finishes job and receives payment
    pub fn finish_job(
        ctx: Context<FinishJob>,
        ipfs_result: [u8; 32],
    ) -> Result<()> {
        instructions::finish_job::handler(ctx, ipfs_result)
    }

    /// Node registers in queue to wait for jobs
    pub fn list_node(ctx: Context<ListNode>) -> Result<()> {
        instructions::list_node::handler(ctx)
    }

    /// Mark job as timed out and refund client
    pub fn timeout_job(ctx: Context<TimeoutJob>) -> Result<()> {
        instructions::timeout_job::handler(ctx)
    }

    /// Cancel a queued job and refund client
    pub fn cancel_job(ctx: Context<CancelJob>) -> Result<()> {
        instructions::cancel_job::handler(ctx)
    }

    /// Initialize or update node reputation
    pub fn update_reputation(ctx: Context<UpdateReputation>) -> Result<()> {
        instructions::update_reputation::handler(ctx)
    }
}
