use anchor_lang::prelude::*;
use anchor_spl::token::{Token, TokenAccount};
use crate::state::*;
use crate::errors::*;
use hypernode_rewards::program::HypernodeRewards;
use hypernode_rewards::{ReflectionAccount, cpi::accounts::AddRewards};

/// Node finishes job and receives payment from escrow vault
/// Result is stored as IPFS CID
#[derive(Accounts)]
pub struct FinishJob<'info> {
    #[account(
        mut,
        constraint = job.node == Some(node.key()) @ MarketError::Unauthorized
    )]
    pub job: Account<'info, JobAccount>,

    #[account(
        mut,
        constraint = job.market == market.key() @ MarketError::MarketMismatch
    )]
    pub market: Account<'info, MarketAccount>,

    /// Node finishing the job
    pub node: Signer<'info>,

    /// Node's account to receive payment
    #[account(mut)]
    pub node_account: SystemAccount<'info>,

    /// Vault PDA for escrow payment
    #[account(
        mut,
        seeds = [b"vault", market.key().as_ref()],
        bump,
        constraint = *vault.owner == system_program.key() @ MarketError::InvalidVaultOwner
    )]
    pub vault: SystemAccount<'info>,

    /// Reflection account from Rewards Program (optional)
    /// When provided, seeds should be [b"reflection"] with rewards_program as the program
    #[account(mut)]
    pub reflection_account: Option<Account<'info, ReflectionAccount>>,

    /// Rewards vault (optional)
    #[account(mut)]
    pub rewards_vault: Option<Account<'info, TokenAccount>>,

    /// Rewards program (optional)
    pub rewards_program: Option<Program<'info, HypernodeRewards>>,

    pub token_program: Option<Program<'info, Token>>,
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<FinishJob>,
    ipfs_result: [u8; 32],
) -> Result<()> {
    let job = &mut ctx.accounts.job;
    let market = &ctx.accounts.market;
    let node = &ctx.accounts.node;
    let vault = &ctx.accounts.vault;
    let node_account = &ctx.accounts.node_account;
    let clock = Clock::get()?;

    // Verify job is running
    require!(job.is_running(), MarketError::JobNotRunning);

    // Check for timeout
    require!(
        !job.check_timeout(clock.unix_timestamp),
        MarketError::JobTimedOut
    );

    // Update job state
    job.ipfs_result = ipfs_result;
    job.state = JobState::Completed;
    job.time_end = clock.unix_timestamp;

    // Transfer payment from vault to node
    // PDA signer seeds
    let market_key = market.key();
    let seeds = &[
        b"vault",
        market_key.as_ref(),
        &[market.vault_bump],
    ];
    let signer_seeds = &[&seeds[..]];

    // Calculate rewards fee (1% of payment goes to rewards pool per whitepaper)
    let rewards_fee = job.price / 100;
    let node_payment = job.price - rewards_fee;

    // Transfer payment to node
    **vault.to_account_info().try_borrow_mut_lamports()? -= node_payment;
    **node_account.to_account_info().try_borrow_mut_lamports()? += node_payment;

    // Add rewards to pool if Rewards Program is provided
    if let (Some(_reflection), Some(_rewards_vault), Some(rewards_program)) = (
        &ctx.accounts.reflection_account,
        &ctx.accounts.rewards_vault,
        &ctx.accounts.rewards_program,
    ) {
        // For now, just log that rewards would be distributed
        // Full CPI implementation would require token transfers
        msg!("Rewards fee collected: {} lamports", rewards_fee);
        msg!("Note: Full token-based rewards integration pending");

        // TODO: Implement full CPI to add_rewards when using SPL tokens
        // let cpi_accounts = AddRewards {
        //     reflection_account: ctx.accounts.reflection_account.as_ref().unwrap().to_account_info(),
        //     source_token_account: vault_token_account,
        //     rewards_vault: ctx.accounts.rewards_vault.as_ref().unwrap().to_account_info(),
        //     authority: market_authority,
        //     token_program: ctx.accounts.token_program.as_ref().unwrap().to_account_info(),
        // };
        // let cpi_ctx = CpiContext::new(rewards_program.to_account_info(), cpi_accounts);
        // hypernode_rewards::cpi::add_rewards(cpi_ctx, rewards_fee)?;
    }

    msg!("Job finished: {}", job.key());
    msg!("Node: {}", node.key());
    msg!("Node payment: {} lamports", node_payment);
    msg!("Rewards fee: {} lamports", rewards_fee);
    msg!("Duration: {} seconds", job.time_end - job.time_start);
    msg!("Result IPFS: {:?}", ipfs_result);

    Ok(())
}
