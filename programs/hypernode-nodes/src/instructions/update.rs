use anchor_lang::prelude::*;
use crate::state::*;
use crate::instructions::register::NodeError;

/// Update node hardware specifications
pub fn update(
    ctx: Context<Update>,
    cpu_cores: u16,
    gpu_cores: u16,
    ram_gb: u16,
    iops: u32,
    storage_gb: u32,
    endpoint: String,
) -> Result<()> {
    let node = &mut ctx.accounts.node;

    // Validate specs
    require!(cpu_cores > 0, NodeError::InvalidHardwareSpec);
    require!(ram_gb > 0, NodeError::InvalidHardwareSpec);
    require!(storage_gb > 0, NodeError::InvalidHardwareSpec);
    require!(
        endpoint.len() <= Node::MAX_ENDPOINT_LEN,
        NodeError::EndpointTooLong
    );

    // Update specs
    node.cpu_cores = cpu_cores;
    node.gpu_cores = gpu_cores;
    node.ram_gb = ram_gb;
    node.iops = iops;
    node.storage_gb = storage_gb;
    node.endpoint = endpoint;

    msg!("Node {} hardware specs updated", node.node_id);

    Ok(())
}

#[derive(Accounts)]
pub struct Update<'info> {
    #[account(
        mut,
        seeds = [b"node", node.node_id.as_bytes()],
        bump = node.bump,
        has_one = authority @ NodeError::Unauthorized
    )]
    pub node: Account<'info, Node>,

    pub authority: Signer<'info>,
}
