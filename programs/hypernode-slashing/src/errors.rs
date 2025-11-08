use anchor_lang::prelude::*;

#[error_code]
pub enum SlashingError {
    #[msg("Unauthorized to perform this action")]
    Unauthorized,

    #[msg("Slash amount exceeds maximum allowed")]
    SlashAmountTooHigh,

    #[msg("Appeal period has not expired yet")]
    AppealPeriodActive,

    #[msg("Report not confirmed by enough validators")]
    InsufficientValidators,

    #[msg("Report already executed")]
    AlreadyExecuted,

    #[msg("Node stake insufficient for slash amount")]
    InsufficientStake,

    #[msg("Validator already confirmed this report")]
    ValidatorAlreadyConfirmed,

    #[msg("Maximum validators reached for this report")]
    MaxValidatorsReached,

    #[msg("Report has been dismissed or appealed")]
    ReportNotActive,

    #[msg("Node has no active stake")]
    NoActiveStake,
}
