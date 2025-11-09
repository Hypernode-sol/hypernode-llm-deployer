use anchor_lang::prelude::*;

/// Market manages the dynamic queue system (Nosana-style)
#[account]
pub struct Market {
    /// Authority that can update market params
    pub authority: Pubkey,

    /// Current queue type (dynamic based on supply/demand)
    pub queue_type: QueueType,

    /// Queue of either nodes or jobs (max 314 items due to account size limit)
    pub queue: Vec<Pubkey>,

    /// Market parameters
    pub job_price: u64,        // Base price in lamports
    pub job_timeout: i64,      // Default timeout in seconds
    pub node_stake_minimum: u64, // Minimum stake required

    /// Payment vault for this market
    pub vault: Pubkey,

    /// Market identifier
    pub market_id: String,

    /// Stats
    pub total_jobs: u64,
    pub total_nodes: u64,

    /// PDA bump
    pub bump: u8,
}

impl Market {
    pub const MAX_MARKET_ID_LEN: usize = 32;
    pub const MAX_QUEUE_SIZE: usize = 314; // Account size limit

    pub const SPACE: usize = 8 + // discriminator
        32 + // authority
        1 + // queue_type
        4 + (32 * Self::MAX_QUEUE_SIZE) + // queue (vec of pubkeys)
        8 + // job_price
        8 + // job_timeout
        8 + // node_stake_minimum
        32 + // vault
        4 + Self::MAX_MARKET_ID_LEN + // market_id
        8 + // total_jobs
        8 + // total_nodes
        1; // bump
}

/// Dynamic queue type (Nosana pattern)
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum QueueType {
    Empty,  // Supply == Demand
    Node,   // Supply > Demand (nodes waiting for jobs)
    Job,    // Demand > Supply (jobs waiting for nodes)
}
