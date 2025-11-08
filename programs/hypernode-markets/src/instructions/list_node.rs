use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::*;
use hypernode_staking::program::HypernodeStaking;
use hypernode_staking::StakeAccount;

/// Node registers itself in the queue when no jobs are available
/// This completes the dual queue matching system:
/// - If jobs are queued: nodes call work_job to claim them
/// - If no jobs: nodes call list_node to wait for jobs
#[derive(Accounts)]
pub struct ListNode<'info> {
    #[account(mut)]
    pub market: Account<'info, MarketAccount>,

    /// Node registering to wait for jobs
    pub node: Signer<'info>,

    /// Node's stake account from Staking Program
    #[account(
        seeds = [b"stake", node.key().as_ref()],
        bump,
        seeds::program = staking_program.key()
    )]
    pub stake_account: Account<'info, StakeAccount>,

    /// Staking program
    pub staking_program: Program<'info, HypernodeStaking>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<ListNode>) -> Result<()> {
    let market = &mut ctx.accounts.market;
    let node = &ctx.accounts.node;
    let stake_account = &ctx.accounts.stake_account;

    // Verify node has sufficient xHYPER stake
    require!(
        stake_account.is_active(),
        MarketError::InvalidNodeStake
    );

    require!(
        stake_account.xhyper >= market.node_xhyper_minimum,
        MarketError::InvalidNodeStake
    );

    msg!("Node xHYPER: {}", stake_account.xhyper);
    msg!("Required: {}", market.node_xhyper_minimum);

    // Dual Queue Logic
    match market.queue_type {
        // No items in queue - add node
        MarketAccount::QUEUE_TYPE_EMPTY => {
            market.queue_push(node.key())?;
            market.queue_type = MarketAccount::QUEUE_TYPE_NODES;
            market.total_nodes += 1;
            msg!("Node {} added to queue (first)", node.key());
        }
        // Jobs are queued - node should call work_job instead
        MarketAccount::QUEUE_TYPE_JOBS => {
            return Err(MarketError::InvalidQueueType.into());
        }
        // Other nodes are queued - add to queue
        MarketAccount::QUEUE_TYPE_NODES => {
            market.queue_push(node.key())?;
            market.total_nodes += 1;
            msg!("Node {} added to queue", node.key());
        }
        _ => {
            return Err(MarketError::InvalidQueueType.into());
        }
    }

    msg!("Queue length: {}", market.queue_len());

    Ok(())
}
