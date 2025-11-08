use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::*;

/// Report fraudulent behavior by a node
#[derive(Accounts)]
#[instruction(evidence_cid: [u8; 32])]
pub struct ReportFraud<'info> {
    #[account(
        init,
        payer = reporter,
        space = FraudReport::LEN,
        seeds = [b"fraud_report", node.key().as_ref(), evidence_cid.as_ref()],
        bump
    )]
    pub fraud_report: Account<'info, FraudReport>,

    /// Node being reported
    /// CHECK: This is the node being accused
    pub node: AccountInfo<'info>,

    /// Reporter (must pay for account creation)
    #[account(mut)]
    pub reporter: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<ReportFraud>,
    evidence_cid: [u8; 32],
) -> Result<()> {
    let fraud_report = &mut ctx.accounts.fraud_report;
    let clock = Clock::get()?;

    // Initialize fraud report
    fraud_report.node = ctx.accounts.node.key();
    fraud_report.reporter = ctx.accounts.reporter.key();
    fraud_report.evidence_cid = evidence_cid;
    fraud_report.fraud_type = FraudType::InvalidResults; // Default, can be updated
    fraud_report.time_reported = clock.unix_timestamp;
    fraud_report.validator_count = 0;
    fraud_report.validators = Vec::new();
    fraud_report.status = ReportStatus::Pending;
    fraud_report.slash_amount = 0; // To be set by validators
    fraud_report.bump = ctx.bumps.fraud_report;

    msg!("Fraud report created");
    msg!("Node: {}", fraud_report.node);
    msg!("Reporter: {}", fraud_report.reporter);
    msg!("Evidence IPFS: {:?}", evidence_cid);

    Ok(())
}
