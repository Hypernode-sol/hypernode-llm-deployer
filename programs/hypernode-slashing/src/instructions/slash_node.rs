use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};
use crate::state::*;
use crate::errors::*;
use hypernode_staking::program::HypernodeStaking;
use hypernode_staking::StakeAccount;

/// Execute slash on confirmed fraud report
#[derive(Accounts)]
pub struct SlashNode<'info> {
    #[account(
        mut,
        constraint = fraud_report.status == ReportStatus::Confirmed @ SlashingError::ReportNotActive,
        constraint = fraud_report.is_confirmed() @ SlashingError::InsufficientValidators
    )]
    pub fraud_report: Account<'info, FraudReport>,

    #[account(
        init,
        payer = executor,
        space = SlashRecord::LEN,
        seeds = [b"slash_record", fraud_report.key().as_ref()],
        bump
    )]
    pub slash_record: Account<'info, SlashRecord>,

    /// Node's stake account
    #[account(
        mut,
        seeds = [b"stake", fraud_report.node.as_ref()],
        bump,
        seeds::program = staking_program.key()
    )]
    pub stake_account: Account<'info, StakeAccount>,

    /// Staking vault (holds staked tokens)
    #[account(
        mut,
        seeds = [b"vault"],
        bump,
        seeds::program = staking_program.key()
    )]
    pub staking_vault: Account<'info, TokenAccount>,

    /// Treasury to receive slashed funds
    #[account(mut)]
    pub treasury: Account<'info, TokenAccount>,

    /// Executor (authority that can execute slashes)
    #[account(mut)]
    pub executor: Signer<'info>,

    /// Staking program
    pub staking_program: Program<'info, HypernodeStaking>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<SlashNode>,
    slash_amount: u64,
) -> Result<()> {
    let fraud_report = &mut ctx.accounts.fraud_report;
    let stake_account = &ctx.accounts.stake_account;
    let clock = Clock::get()?;

    // Verify appeal period has passed
    require!(
        fraud_report.can_execute_slash(clock.unix_timestamp),
        SlashingError::AppealPeriodActive
    );

    // Verify slash amount is within limits
    let max_slash = (stake_account.amount as u128 * MAX_SLASH_PERCENTAGE as u128) / 10000;
    require!(
        slash_amount <= max_slash as u64,
        SlashingError::SlashAmountTooHigh
    );

    // Verify node has sufficient stake
    require!(
        stake_account.amount >= slash_amount,
        SlashingError::InsufficientStake
    );

    // Transfer slashed tokens from staking vault to treasury
    // Use PDA signer from staking program
    let staking_program_key = ctx.accounts.staking_program.key();
    let vault_bump = ctx.bumps.staking_vault;
    let vault_seeds: &[&[u8]] = &[b"vault", &[vault_bump]];
    let signer_seeds = &[vault_seeds];

    let cpi_accounts = Transfer {
        from: ctx.accounts.staking_vault.to_account_info(),
        to: ctx.accounts.treasury.to_account_info(),
        authority: ctx.accounts.staking_vault.to_account_info(),
    };

    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        cpi_accounts,
        signer_seeds,
    );

    // Update fraud report status BEFORE external call (reentrancy protection)
    fraud_report.status = ReportStatus::Executed;

    // Execute token transfer after state update
    token::transfer(cpi_ctx, slash_amount)?;

    // Create slash record
    let slash_record = &mut ctx.accounts.slash_record;
    slash_record.node = fraud_report.node;
    slash_record.fraud_report = fraud_report.key();
    slash_record.amount_slashed = slash_amount;
    slash_record.time_slashed = clock.unix_timestamp;
    slash_record.executor = ctx.accounts.executor.key();
    slash_record.bump = ctx.bumps.slash_record;

    msg!("Node slashed successfully");
    msg!("Node: {}", fraud_report.node);
    msg!("Amount slashed: {} tokens", slash_amount);
    msg!("Slash type: {:?}", fraud_report.fraud_type);

    Ok(())
}
