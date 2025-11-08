use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("83rLt9YBCTkaAX6vLUuEAQE7QdhofvQWUhjybXVr7nCL");

/// Hypernode Slashing Program
/// Penalizes malicious nodes by slashing their stake
#[program]
pub mod hypernode_slashing {
    use super::*;

    pub fn report_fraud(ctx: Context<ReportFraud>, evidence_cid: [u8; 32]) -> Result<()> {
        instructions::report_fraud::handler(ctx, evidence_cid)
    }

    pub fn slash_node(ctx: Context<SlashNode>, slash_amount: u64) -> Result<()> {
        instructions::slash_node::handler(ctx, slash_amount)
    }
}
