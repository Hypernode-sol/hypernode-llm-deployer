use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::*;
use hypernode_staking::program::HypernodeStaking;
use hypernode_staking::StakeAccount;

/// Create new governance proposal
#[derive(Accounts)]
#[instruction(title: String, description: String)]
pub struct CreateProposal<'info> {
    /// Governance config (stores proposal counter)
    #[account(
        mut,
        seeds = [b"gov_config"],
        bump = config.bump
    )]
    pub config: Account<'info, GovernanceConfig>,

    #[account(
        init,
        payer = proposer,
        space = Proposal::LEN,
        seeds = [b"proposal", &config.proposal_count.to_le_bytes()],
        bump
    )]
    pub proposal: Account<'info, Proposal>,

    /// Proposer's stake account (must have minimum xHYPER)
    #[account(
        seeds = [b"stake", proposer.key().as_ref()],
        bump,
        seeds::program = staking_program.key()
    )]
    pub stake_account: Account<'info, StakeAccount>,

    #[account(mut)]
    pub proposer: Signer<'info>,

    pub staking_program: Program<'info, HypernodeStaking>,
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<CreateProposal>,
    title: String,
    description: String,
    proposal_type: u8,
    execution_data: Vec<u8>,
) -> Result<()> {
    let config = &mut ctx.accounts.config;
    let proposal = &mut ctx.accounts.proposal;
    let stake_account = &ctx.accounts.stake_account;
    let clock = Clock::get()?;

    // Validate title length
    require!(
        title.len() <= 100,
        GovernanceError::TitleTooLong
    );

    // Validate execution data size
    require!(
        execution_data.len() <= 256,
        GovernanceError::ExecutionDataTooLarge
    );

    // Verify proposer has sufficient xHYPER
    require!(
        stake_account.xhyper >= PROPOSAL_THRESHOLD,
        GovernanceError::InsufficientVotingPower
    );

    // Parse description as IPFS CID (simplified)
    let mut description_cid = [0u8; 32];
    let desc_bytes = description.as_bytes();
    let copy_len = desc_bytes.len().min(32);
    description_cid[..copy_len].copy_from_slice(&desc_bytes[..copy_len]);

    // Parse proposal type
    let prop_type = match proposal_type {
        0 => ProposalType::MarketParameter,
        1 => ProposalType::StakingParameter,
        2 => ProposalType::TreasurySpend,
        3 => ProposalType::ProtocolUpgrade,
        _ => ProposalType::Text,
    };

    // Get current proposal ID and increment counter
    let proposal_id = config.proposal_count;
    config.proposal_count += 1;

    // Initialize proposal
    proposal.id = proposal_id;
    proposal.proposer = ctx.accounts.proposer.key();
    proposal.title = title.clone();
    proposal.description_cid = description_cid;
    proposal.proposal_type = prop_type;
    proposal.execution_data = execution_data;
    proposal.time_created = clock.unix_timestamp;
    proposal.time_voting_ends = clock.unix_timestamp + VOTING_PERIOD;
    proposal.time_executable = 0; // Set when/if passed
    proposal.total_voting_power = config.total_voting_power; // Use total from config
    proposal.votes_for = 0;
    proposal.votes_against = 0;
    proposal.voter_count = 0;
    proposal.status = ProposalStatus::Active;
    proposal.bump = ctx.bumps.proposal;

    msg!("Proposal created with counter-based ID");
    msg!("ID: {}", proposal.id);
    msg!("Title: {}", title);
    msg!("Proposer: {}", proposal.proposer);
    msg!("Voting ends: {}", proposal.time_voting_ends);

    Ok(())
}
