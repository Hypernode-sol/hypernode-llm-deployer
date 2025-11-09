use anchor_lang::prelude::*;
use crate::state::*;

/// Register a new node with hardware specifications
pub fn register(
    ctx: Context<Register>,
    node_id: String,
    architecture: Architecture,
    country: Country,
    cpu_cores: u16,
    gpu_cores: u16,
    ram_gb: u16,
    iops: u32,
    storage_gb: u32,
    endpoint: String,
) -> Result<()> {
    let node = &mut ctx.accounts.node;
    let clock = Clock::get()?;

    // Validate all hardware specs are non-zero
    require!(cpu_cores > 0, NodeError::InvalidHardwareSpec);
    require!(ram_gb > 0, NodeError::InvalidHardwareSpec);
    require!(storage_gb > 0, NodeError::InvalidHardwareSpec);

    // Validate string lengths
    require!(
        node_id.len() <= Node::MAX_NODE_ID_LEN,
        NodeError::NodeIdTooLong
    );
    require!(
        endpoint.len() <= Node::MAX_ENDPOINT_LEN,
        NodeError::EndpointTooLong
    );

    node.authority = ctx.accounts.authority.key();
    node.node_id = node_id;
    node.is_audited = false;

    // Hardware specs
    node.architecture = architecture;
    node.country = country;
    node.cpu_cores = cpu_cores;
    node.gpu_cores = gpu_cores;
    node.ram_gb = ram_gb;
    node.iops = iops;
    node.storage_gb = storage_gb;

    // Initialize stats
    node.jobs_completed = 0;
    node.jobs_failed = 0;
    node.total_earned = 0;
    node.reputation_score = 100; // Start at 100
    node.uptime_percentage = 100; // Assume 100% initially

    // Network info
    node.endpoint = endpoint;
    node.version = 1;

    // Timestamps
    node.registered_at = clock.unix_timestamp;
    node.last_heartbeat = clock.unix_timestamp;
    node.is_active = true;

    // Health check stats (initialized to zero)
    node.last_health_check = 0;
    node.total_health_checks = 0;
    node.passed_health_checks = 0;
    node.failed_health_checks = 0;
    node.health_check_pass_rate = 0;

    node.bump = ctx.bumps.node;

    msg!(
        "Node registered: {} | {} cores CPU, {} cores GPU, {}GB RAM",
        node.node_id,
        node.cpu_cores,
        node.gpu_cores,
        node.ram_gb
    );

    Ok(())
}

#[derive(Accounts)]
#[instruction(node_id: String)]
pub struct Register<'info> {
    #[account(
        init,
        payer = authority,
        space = Node::SPACE,
        seeds = [b"node", node_id.as_bytes()],
        bump
    )]
    pub node: Account<'info, Node>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[error_code]
pub enum NodeError {
    #[msg("Hardware specification must be greater than 0")]
    InvalidHardwareSpec,

    #[msg("Node ID exceeds maximum length")]
    NodeIdTooLong,

    #[msg("Endpoint URL exceeds maximum length")]
    EndpointTooLong,

    #[msg("Node is not active")]
    NodeNotActive,

    #[msg("Unauthorized")]
    Unauthorized,
}
