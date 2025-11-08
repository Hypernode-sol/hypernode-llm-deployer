use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::*;
use hypernode_staking::program::HypernodeStaking;
use hypernode_staking::StakeAccount;

/// Vote on a proposal
#[derive(Accounts)]
pub struct Vote<'info> {
    #[account(
        mut,
        constraint = proposal.status == ProposalStatus::Active @ GovernanceError::VotingEnded
    )]
    pub proposal: Account<'info, Proposal>,

    #[account(
        init,
        payer = voter,
        space = VoteRecord::LEN,
        seeds = [b"vote", proposal.key().as_ref(), voter.key().as_ref()],
        bump
    )]
    pub vote_record: Account<'info, VoteRecord>,

    /// Voter's stake account
    #[account(
        seeds = [b"stake", voter.key().as_ref()],
        bump,
        seeds::program = staking_program.key()
    )]
    pub stake_account: Account<'info, StakeAccount>,

    #[account(mut)]
    pub voter: Signer<'info>,

    pub staking_program: Program<'info, HypernodeStaking>,
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<Vote>,
    vote_choice: bool,
) -> Result<()> {
    let proposal = &mut ctx.accounts.proposal;
    let stake_account = &ctx.accounts.stake_account;
    let vote_record = &mut ctx.accounts.vote_record;
    let clock = Clock::get()?;

    // Verify voting period hasn't ended
    require!(
        clock.unix_timestamp < proposal.time_voting_ends,
        GovernanceError::VotingEnded
    );

    // Get voting power from xHYPER stake
    let voting_power = stake_account.xhyper;

    require!(
        voting_power > 0,
        GovernanceError::InsufficientVotingPower
    );

    // Record vote
    vote_record.proposal = proposal.key();
    vote_record.voter = ctx.accounts.voter.key();
    vote_record.choice = vote_choice;
    vote_record.voting_power = voting_power;
    vote_record.time_voted = clock.unix_timestamp;
    vote_record.bump = ctx.bumps.vote_record;

    // Update proposal vote counts
    if vote_choice {
        proposal.votes_for += voting_power;
    } else {
        proposal.votes_against += voting_power;
    }

    proposal.voter_count += 1;

    // Check if proposal passed after this vote
    if proposal.has_passed() && proposal.status == ProposalStatus::Active {
        proposal.status = ProposalStatus::Passed;
        proposal.time_executable = clock.unix_timestamp + EXECUTION_DELAY;

        msg!("Proposal passed!");
        msg!("Executable at: {}", proposal.time_executable);
    }

    msg!("Vote recorded");
    msg!("Voter: {}", vote_record.voter);
    msg!("Choice: {}", if vote_choice { "FOR" } else { "AGAINST" });
    msg!("Voting power: {}", voting_power);
    msg!("Total FOR: {}", proposal.votes_for);
    msg!("Total AGAINST: {}", proposal.votes_against);

    Ok(())
}
