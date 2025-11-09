use anchor_lang::prelude::*;

/// Errors for hypernode-jobs program
#[error_code]
pub enum JobError {
    #[msg("Job ID exceeds maximum length")]
    JobIdTooLong,

    #[msg("Price is below market minimum")]
    PriceTooLow,

    #[msg("Invalid timeout value")]
    InvalidTimeout,

    #[msg("Queue is full (max 314 items)")]
    QueueFull,

    #[msg("Invalid IPFS hash (must not be empty)")]
    InvalidIpfsHash,

    #[msg("Queue is unexpectedly empty")]
    QueueEmpty,

    #[msg("Job is not in running state")]
    JobNotRunning,

    #[msg("Only assigned node can finish job")]
    UnauthorizedNode,

    #[msg("Job has expired (exceeded timeout)")]
    JobExpired,

    #[msg("Node is not active")]
    NodeNotActive,

    #[msg("Node is already in queue")]
    NodeAlreadyInQueue,

    #[msg("Job has not expired yet (cannot recover)")]
    JobNotExpired,
}
