/**
 * Health Check Instruction
 *
 * Inspired by Aethir's Checker system:
 * - Verifies node specifications and performance
 * - Records health check results on-chain
 * - Enables automatic penalties for underperformance
 *
 * Architecture Principles:
 * - Trustless: Permissionless checks anyone can call
 * - Safe: Validates timestamp and prevents spam
 * - Clear: Simple pass/fail with timestamp
 */

use anchor_lang::prelude::*;
use crate::state::*;

#[derive(Accounts)]
pub struct CheckHealth<'info> {
    #[account(
        mut,
        seeds = [b"node", node.authority.as_ref()],
        bump = node.bump
    )]
    pub node: Account<'info, Node>,

    /// Checker authority (can be anyone - permissionless)
    pub checker: Signer<'info>,
}

pub fn check_health(
    ctx: Context<CheckHealth>,
    passed: bool,
    message: String,
) -> Result<()> {
    let node = &mut ctx.accounts.node;
    let clock = Clock::get()?;

    // Prevent spam: minimum 5 minutes between checks
    const MIN_CHECK_INTERVAL: i64 = 300; // 5 minutes
    require!(
        clock.unix_timestamp - node.last_health_check >= MIN_CHECK_INTERVAL,
        ErrorCode::CheckTooFrequent
    );

    // Update health check data
    node.last_health_check = clock.unix_timestamp;
    node.total_health_checks = node.total_health_checks.checked_add(1).unwrap();

    if passed {
        node.passed_health_checks = node.passed_health_checks.checked_add(1).unwrap();
    } else {
        node.failed_health_checks = node.failed_health_checks.checked_add(1).unwrap();

        // Reduce reputation on failed check
        const REPUTATION_PENALTY: u16 = 10;
        node.reputation_score = node.reputation_score.saturating_sub(REPUTATION_PENALTY);
    }

    // Calculate health check pass rate
    if node.total_health_checks > 0 {
        node.health_check_pass_rate = ((node.passed_health_checks * 100) / node.total_health_checks) as u8;
    }

    msg!("Health check result: {} - {}", if passed { "PASSED" } else { "FAILED" }, message);

    Ok(())
}

#[error_code]
pub enum ErrorCode {
    #[msg("Health check too frequent. Wait at least 5 minutes between checks.")]
    CheckTooFrequent,
}
