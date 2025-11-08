use anchor_lang::prelude::*;

/// Job state enum
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum JobState {
    /// Job is queued, waiting for a node
    Queued,
    /// Job is being executed by a node
    Running,
    /// Job completed successfully
    Completed,
    /// Job stopped/cancelled
    Stopped,
    /// Job timed out
    TimedOut,
}

/// Job account - represents a GPU computation job
/// Based on Nosana's JobAccount pattern
#[account]
pub struct JobAccount {
    /// Unique job ID (PDA seed)
    pub id: Pubkey,

    /// Market this job belongs to
    pub market: Pubkey,

    /// Client who created the job
    pub client: Pubkey,

    /// Node executing the job (None if queued)
    pub node: Option<Pubkey>,

    /// IPFS CID of job definition (32 bytes)
    /// Contains: model, framework, operations, input data
    pub ipfs_job: [u8; 32],

    /// IPFS CID of job result (32 bytes, empty until completed)
    pub ipfs_result: [u8; 32],

    /// Price paid for this job in lamports
    pub price: u64,

    /// Timeout in seconds
    pub timeout: i64,

    /// Current job state
    pub state: JobState,

    /// Timestamp when job was created
    pub time_created: i64,

    /// Timestamp when job started execution (0 if not started)
    pub time_start: i64,

    /// Timestamp when job ended (0 if not ended)
    pub time_end: i64,

    /// GPU requirements (VRAM in GB)
    pub min_vram: u8,

    /// GPU type requirement (0=Any, 1=NVIDIA, 2=AMD)
    pub gpu_type: u8,

    /// PDA bump seed
    pub bump: u8,
}

impl JobAccount {
    /// Account size: 8 (discriminator) + size of fields
    pub const LEN: usize = 8 + 32 + 32 + 32 + (1 + 32) + 32 + 32 + 8 + 8 + 1 + 8 + 8 + 8 + 1 + 1 + 1;

    /// Job state helpers (inlined for performance)
    #[inline(always)]
    pub fn is_queued(&self) -> bool {
        self.state == JobState::Queued
    }

    #[inline(always)]
    pub fn is_running(&self) -> bool {
        self.state == JobState::Running
    }

    #[inline(always)]
    pub fn is_completed(&self) -> bool {
        self.state == JobState::Completed
    }

    #[inline(always)]
    pub fn is_finished(&self) -> bool {
        matches!(
            self.state,
            JobState::Completed | JobState::Stopped | JobState::TimedOut
        )
    }

    /// Check if job has timed out
    #[inline]
    pub fn check_timeout(&self, current_time: i64) -> bool {
        if self.time_start == 0 {
            return false;
        }
        current_time - self.time_start > self.timeout
    }
}
