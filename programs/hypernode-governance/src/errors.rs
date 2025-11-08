use anchor_lang::prelude::*;

#[error_code]
pub enum GovernanceError {
    #[msg("Insufficient xHYPER to create proposal")]
    InsufficientVotingPower,

    #[msg("Voting period has ended")]
    VotingEnded,

    #[msg("Voting period still active")]
    VotingStillActive,

    #[msg("Proposal has not passed")]
    ProposalNotPassed,

    #[msg("Execution delay has not passed")]
    ExecutionDelayActive,

    #[msg("Proposal already executed")]
    AlreadyExecuted,

    #[msg("Already voted on this proposal")]
    AlreadyVoted,

    #[msg("Unauthorized to perform this action")]
    Unauthorized,

    #[msg("Proposal has been cancelled")]
    ProposalCancelled,

    #[msg("Title too long (max 100 characters)")]
    TitleTooLong,

    #[msg("Execution data too large (max 256 bytes)")]
    ExecutionDataTooLarge,
}
