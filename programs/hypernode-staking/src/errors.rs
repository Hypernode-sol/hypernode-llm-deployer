use anchor_lang::prelude::*;

#[error_code]
pub enum StakingError {
    #[msg("Unauthorized: Only account owner can perform this action")]
    Unauthorized = 6000,

    #[msg("Insufficient balance: Your token account has insufficient funds for this stake")]
    InsufficientBalance = 6001,

    #[msg("Duration too short: Minimum staking duration is 2 weeks (1,209,600 seconds)")]
    DurationTooShort = 6002,

    #[msg("Already unstaking: Cannot unstake while already in unstaking state")]
    AlreadyUnstaking = 6003,

    #[msg("Cooldown not passed: Cannot withdraw until cooldown period expires")]
    CooldownNotPassed = 6004,

    #[msg("Stake not active: Stake account is not in active state")]
    StakeNotActive = 6005,

    #[msg("Not unstaking: Stake account must be in unstaking state for this operation")]
    NotUnstaking = 6006,

    #[msg("Invalid duration: Duration must be between 2 weeks and 4 years")]
    InvalidDuration = 6007,

    #[msg("Amount too small: Minimum stake amount is 0.1 HYPER tokens")]
    AmountTooSmall = 6008,

    #[msg("Amount too large: Maximum stake amount exceeded")]
    AmountTooLarge = 6009,

    #[msg("Math overflow: Arithmetic operation resulted in overflow")]
    MathOverflow = 6010,

    #[msg("Math underflow: Arithmetic operation resulted in underflow")]
    MathUnderflow = 6011,

    #[msg("Division by zero: Cannot divide by zero")]
    DivisionByZero = 6012,

    #[msg("Invalid fee: Fee basis points cannot exceed 10000 (100%)")]
    InvalidFee = 6013,

    #[msg("Max stakes exceeded: Maximum number of concurrent stakes per user exceeded")]
    MaxStakesExceeded = 6014,

    #[msg("Invalid token: Token account is not valid for HYPER tokens")]
    InvalidToken = 6015,

    #[msg("Invalid vault: Vault account configuration is invalid")]
    InvalidVault = 6016,

    #[msg("Insufficient xhyper: Account does not have enough xHYPER to burn")]
    InsufficientXHyper = 6017,

    #[msg("Account not initialized: Required account has not been initialized")]
    AccountNotInitialized = 6018,

    #[msg("Account already initialized: Account has already been initialized")]
    AccountAlreadyInitialized = 6019,

    #[msg("Invalid owner: Account owner does not match expected value")]
    InvalidOwner = 6020,

    #[msg("Slashing failed: Failed to execute slashing operation")]
    SlashingFailed = 6021,

    #[msg("Protocol paused: Protocol is currently paused for maintenance")]
    ProtocolPaused = 6022,

    #[msg("Signature verification failed: Required signature is invalid")]
    InvalidSignature = 6023,

    #[msg("Timestamp error: Clock timestamp is invalid or in the past")]
    InvalidTimestamp = 6024,

    #[msg("Rewards claim failed: Failed to claim pending rewards")]
    RewardsClaimFailed = 6025,
}
