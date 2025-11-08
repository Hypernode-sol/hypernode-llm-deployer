use anchor_lang::prelude::*;

#[error_code]
pub enum RewardsError {
    #[msg("Unauthorized")]
    Unauthorized,

    #[msg("Invalid amount")]
    InvalidAmount,

    #[msg("Invalid xHYPER amount")]
    InvalidXhyperAmount,

    #[msg("No rewards to claim")]
    NoRewardsToClaim,

    #[msg("Insufficient vault balance")]
    InsufficientVaultBalance,

    #[msg("Calculation overflow")]
    CalculationOverflow,
}
