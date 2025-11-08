use anchor_lang::prelude::*;

#[error_code]
pub enum MarketError {
    #[msg("Queue is full")]
    QueueFull,

    #[msg("Queue is empty")]
    QueueEmpty,

    #[msg("Invalid queue type")]
    InvalidQueueType,

    #[msg("Job not in queued state")]
    JobNotQueued,

    #[msg("Job not in running state")]
    JobNotRunning,

    #[msg("Job already finished")]
    JobAlreadyFinished,

    #[msg("Job has timed out")]
    JobTimedOut,

    #[msg("Job has not timed out yet")]
    JobNotTimedOut,

    #[msg("Unauthorized")]
    Unauthorized,

    #[msg("Insufficient funds")]
    InsufficientFunds,

    #[msg("Invalid node stake")]
    InvalidNodeStake,

    #[msg("Node not eligible")]
    NodeNotEligible,

    #[msg("Market mismatch")]
    MarketMismatch,

    #[msg("Invalid IPFS CID")]
    InvalidIpfsCid,

    #[msg("Invalid vault owner")]
    InvalidVaultOwner,
}
