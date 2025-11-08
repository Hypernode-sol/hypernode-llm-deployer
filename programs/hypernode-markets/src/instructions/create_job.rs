use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::*;
use crate::errors::*;

/// Create a new job and add to market queue
/// Client pays upfront into escrow vault
#[derive(Accounts)]
#[instruction(job_id: Pubkey)]
pub struct CreateJob<'info> {
    #[account(
        init,
        payer = client,
        space = JobAccount::LEN,
        seeds = [b"job", job_id.as_ref()],
        bump
    )]
    pub job: Account<'info, JobAccount>,

    #[account(mut)]
    pub market: Account<'info, MarketAccount>,

    /// Client creating the job
    #[account(mut)]
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

pub fn handler(
    ctx: Context<CreateJob>,
    job_id: Pubkey,
    ipfs_job: [u8; 32],
    min_vram: u8,
    gpu_type: u8,
) -> Result<()> {
    let market = &mut ctx.accounts.market;
    let job = &mut ctx.accounts.job;
    let client = &ctx.accounts.client;
    let vault = &ctx.accounts.vault;
    let clock = Clock::get()?;
    let bump = ctx.bumps.job;

    // Transfer payment to vault (escrow)
    let payment_amount = market.job_price;
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: client.to_account_info(),
                to: vault.to_account_info(),
            },
        ),
        payment_amount,
    )?;

    // Initialize job account
    job.id = job_id;
    job.market = market.key();
    job.client = client.key();
    job.node = None;
    job.ipfs_job = ipfs_job;
    job.ipfs_result = [0u8; 32];
    job.price = payment_amount;
    job.timeout = market.job_timeout;
    job.state = JobState::Queued;
    job.time_created = clock.unix_timestamp;
    job.time_start = 0;
    job.time_end = 0;
    job.min_vram = min_vram;
    job.gpu_type = gpu_type;
    job.bump = bump;

    // Add to market queue
    // If queue has nodes waiting, match immediately (handled in dual queue logic)
    if market.queue_type == MarketAccount::QUEUE_TYPE_NODES {
        // Nodes are waiting - will be matched in work_job instruction
        msg!("Nodes available, job can be matched immediately");
    } else {
        // Add job to queue
        market.queue_push(job.key())?;
        market.queue_type = MarketAccount::QUEUE_TYPE_JOBS;
    }

    market.total_jobs += 1;

    msg!("Job created: {}", job.key());
    msg!("Client: {}", client.key());
    msg!("Price: {} lamports", payment_amount);
    msg!("IPFS: {:?}", ipfs_job);
    msg!("Min VRAM: {} GB", min_vram);

    Ok(())
}
