use anchor_lang::prelude::*;
use crate::state::*;
use crate::instructions::register::NodeError;

/// Update node heartbeat to show it's still active
pub fn heartbeat(ctx: Context<Heartbeat>) -> Result<()> {
    let node = &mut ctx.accounts.node;
    let clock = Clock::get()?;

    node.last_heartbeat = clock.unix_timestamp;
    node.is_active = true;

    Ok(())
}

#[derive(Accounts)]
pub struct Heartbeat<'info> {
    #[account(
        mut,
        seeds = [b"node", node.node_id.as_bytes()],
        bump = node.bump,
        has_one = authority @ NodeError::Unauthorized
    )]
    pub node: Account<'info, Node>,

    pub authority: Signer<'info>,
}
