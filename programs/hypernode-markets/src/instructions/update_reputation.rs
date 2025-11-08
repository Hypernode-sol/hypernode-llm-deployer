use anchor_lang::prelude::*;
use crate::state::*;

/// Initialize or update node reputation
#[derive(Accounts)]
pub struct UpdateReputation<'info> {
    #[account(
        init,
        payer = authority,
        space = NodeReputation::LEN,
        seeds = [b"reputation", node.key().as_ref()],
        bump
    )]
    pub reputation: Account<'info, NodeReputation>,

    /// Node account (the one being rated)
    pub node: Signer<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<UpdateReputation>) -> Result<()> {
    let reputation = &mut ctx.accounts.reputation;
    let clock = Clock::get()?;

    // Initialize new reputation account
    reputation.authority = ctx.accounts.node.key();
    reputation.total_jobs = 0;
    reputation.failed_jobs = 0;
    reputation.timeout_jobs = 0;
    reputation.avg_response_time = 0;
    reputation.total_uptime = 0;
    reputation.last_active = clock.unix_timestamp;
    reputation.reputation_score = 1000; // Start with perfect score
    reputation.tier = 4; // Start as Diamond (will adjust after first job)
    reputation.total_revenue = 0;
    reputation.bump = ctx.bumps.reputation;

    msg!("Reputation account initialized for node: {}", ctx.accounts.node.key());
    msg!("Reputation score: {}", reputation.reputation_score);
    msg!("Tier: {}", reputation.tier);

    Ok(())
}
