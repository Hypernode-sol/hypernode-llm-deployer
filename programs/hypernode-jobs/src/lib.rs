use anchor_lang::prelude::*;

pub mod state;
pub mod instructions;
pub mod errors;

use instructions::*;

declare_id!("HYPRjobs11111111111111111111111111111111111");

/// Hypernode Jobs Program
///
/// Manages job submission, node matching, and payment settlement.
/// Implements Nosana-style dynamic queue for trustless job-to-node matching.
///
/// Core Instructions:
/// - initialize_market: Create new job market with parameters
/// - submit_job: Client submits job with payment to escrow
/// - work: Node enters queue or claims available job
/// - finish: Node submits result and receives payment
/// - recover: Refund expired jobs (anti-DoS)
///
/// Architecture Principles:
/// - Trustless: Queue-based matching on-chain
/// - Modular: Independent from nodes/staking programs
/// - Safe: Extensive validations and escrow
/// - Clear: One instruction per file, well documented
#[program]
pub mod hypernode_jobs {
    use super::*;

    /// Initialize a new job market
    ///
    /// Creates market account and vault for escrow.
    /// Markets can have custom parameters (price, timeout, stake requirements).
    pub fn initialize_market(
        ctx: Context<InitializeMarket>,
        market_id: String,
        job_price: u64,
        job_timeout: i64,
        node_stake_minimum: u64,
    ) -> Result<()> {
        instructions::initialize_market(ctx, market_id, job_price, job_timeout, node_stake_minimum)
    }

    /// Submit a new job to the market
    ///
    /// Client calls this with:
    /// - job_id: Unique identifier
    /// - ipfs_job: IPFS hash of job definition (content-addressed)
    /// - price: Payment amount (transferred to escrow)
    /// - timeout: Maximum execution time in seconds
    ///
    /// Dynamic behavior:
    /// - If nodes waiting → assigns immediately
    /// - Otherwise → adds to job queue
    pub fn submit_job(
        ctx: Context<SubmitJob>,
        job_id: String,
        ipfs_job: [u8; 32],
        price: u64,
        timeout: i64,
    ) -> Result<()> {
        instructions::submit_job(ctx, job_id, ipfs_job, price, timeout)
    }

    /// Node enters work queue or claims job
    ///
    /// Node calls this to indicate availability.
    ///
    /// Dynamic behavior:
    /// - If jobs waiting → claims immediately
    /// - Otherwise → enters node queue
    pub fn work(ctx: Context<Work>) -> Result<()> {
        instructions::work(ctx)
    }

    /// Finish job and release payment
    ///
    /// Node calls this after completing execution:
    /// - ipfs_result: IPFS hash of execution result
    /// - success: true = pay node, false = refund client
    ///
    /// Payment settlement:
    /// - Success → escrow transfers to node
    /// - Failure → escrow refunds client
    pub fn finish(
        ctx: Context<Finish>,
        ipfs_result: [u8; 32],
        success: bool,
    ) -> Result<()> {
        instructions::finish(ctx, ipfs_result, success)
    }

    /// Recover funds from expired jobs
    ///
    /// Permissionless instruction that refunds clients for:
    /// - Jobs that exceeded timeout while running
    /// - Jobs stuck in queue for too long
    ///
    /// Prevents DoS attacks and keeps market healthy.
    pub fn recover(ctx: Context<Recover>) -> Result<()> {
        instructions::recover(ctx)
    }
}
