use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("BYGEToSgdrpmbZt2uapsW6s7NnFuCmVabJzfd8uFT4dE");

/// Hypernode Governance Program
/// DAO governance with xHYPER-weighted voting
#[program]
pub mod hypernode_governance {
    use super::*;

    pub fn create_proposal(
        ctx: Context<CreateProposal>,
        title: String,
        description: String,
        proposal_type: u8,
        execution_data: Vec<u8>,
    ) -> Result<()> {
        instructions::create_proposal::handler(ctx, title, description, proposal_type, execution_data)
    }

    pub fn vote(
        ctx: Context<Vote>,
        vote_choice: bool,
    ) -> Result<()> {
        instructions::vote::handler(ctx, vote_choice)
    }

    pub fn execute_proposal(ctx: Context<ExecuteProposal>) -> Result<()> {
        instructions::execute_proposal::handler(ctx)
    }

    pub fn cancel_proposal(ctx: Context<CancelProposal>) -> Result<()> {
        instructions::cancel_proposal::handler(ctx)
    }
}
