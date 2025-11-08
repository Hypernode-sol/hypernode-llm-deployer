use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::*;

/// Cancel a proposal (only by proposer, before voting ends)
#[derive(Accounts)]
pub struct CancelProposal<'info> {
    #[account(
        mut,
        constraint = proposal.proposer == proposer.key() @ GovernanceError::Unauthorized,
        constraint = proposal.status == ProposalStatus::Active @ GovernanceError::AlreadyExecuted
    )]
    pub proposal: Account<'info, Proposal>,

    pub proposer: Signer<'info>,
}

pub fn handler(ctx: Context<CancelProposal>) -> Result<()> {
    let proposal = &mut ctx.accounts.proposal;
    let clock = Clock::get()?;

    // Can only cancel during voting period
    require!(
        clock.unix_timestamp < proposal.time_voting_ends,
        GovernanceError::VotingEnded
    );

    proposal.status = ProposalStatus::Cancelled;

    msg!("Proposal cancelled");
    msg!("ID: {}", proposal.id);

    Ok(())
}
