use anchor_lang::prelude::*;

/// Job account with IPFS hashes
#[account]
pub struct Job {
    /// Market this job belongs to
    pub market: Pubkey,

    /// Client who submitted the job
    pub client: Pubkey,

    /// IPFS hash of job definition (content-addressed)
    pub ipfs_job: [u8; 32],

    /// IPFS hash of result (set when finished)
    pub ipfs_result: [u8; 32],

    /// Payment amount
    pub price: u64,

    /// Job state
    pub state: JobState,

    /// Timeout (seconds)
    pub timeout: i64,

    /// Assigned node (if any)
    pub node: Option<Pubkey>,

    /// Timestamps
    pub created_at: i64,
    pub started_at: Option<i64>,
    pub completed_at: Option<i64>,

    /// Job identifier
    pub job_id: String,

    /// PDA bump
    pub bump: u8,
}

impl Job {
    pub const MAX_JOB_ID_LEN: usize = 64;

    pub const SPACE: usize = 8 + // discriminator
        32 + // market
        32 + // client
        32 + // ipfs_job
        32 + // ipfs_result
        8 + // price
        1 + // state
        8 + // timeout
        1 + 32 + // node (Option<Pubkey>)
        8 + // created_at
        1 + 8 + // started_at (Option<i64>)
        1 + 8 + // completed_at (Option<i64>)
        4 + Self::MAX_JOB_ID_LEN + // job_id
        1; // bump
}

/// Job lifecycle states (simplified from Nosana)
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum JobState {
    Queued,    // In queue or just created
    Running,   // Assigned to node and executing
    Completed, // Successfully finished
    Failed,    // Failed execution
    Stopped,   // Manually stopped
}

/// Run account tracks active job execution
#[account]
pub struct Run {
    /// Job being executed
    pub job: Pubkey,

    /// Node executing the job
    pub node: Pubkey,

    /// When execution started
    pub started_at: i64,

    /// Duration in seconds (if completed)
    pub duration: Option<i64>,

    /// PDA bump
    pub bump: u8,
}

impl Run {
    pub const SPACE: usize = 8 + // discriminator
        32 + // job
        32 + // node
        8 + // started_at
        1 + 8 + // duration (Option<i64>)
        1; // bump
}
