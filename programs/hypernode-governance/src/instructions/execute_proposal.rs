use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::*;

/// Execute a passed proposal
#[derive(Accounts)]
pub struct ExecuteProposal<'info> {
    #[account(
        mut,
        constraint = proposal.status == ProposalStatus::Passed @ GovernanceError::ProposalNotPassed
    )]
    pub proposal: Account<'info, Proposal>,

    /// Anyone can execute a passed proposal
    #[account(mut)]
    pub executor: Signer<'info>,
}

pub fn handler(ctx: Context<ExecuteProposal>) -> Result<()> {
    let proposal = &mut ctx.accounts.proposal;
    let clock = Clock::get()?;

    // Verify execution delay has passed
    require!(
        proposal.is_executable(clock.unix_timestamp),
        GovernanceError::ExecutionDelayActive
    );

    // Mark as executed
    proposal.status = ProposalStatus::Executed;

    msg!("Proposal executed");
    msg!("ID: {}", proposal.id);
    msg!("Type: {:?}", proposal.proposal_type);
    msg!("Executor: {}", ctx.accounts.executor.key());

    // Note: Actual execution logic would invoke target programs
    // based on proposal.execution_data using CPI
    // For now, just marking as executed

    Ok(())
}
