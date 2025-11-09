use anchor_lang::prelude::*;

#[error_code]
pub enum FacilitatorError {
    #[msg("Payment intent has expired")]
    IntentExpired,

    #[msg("Payment intent not verified")]
    IntentNotVerified,

    #[msg("Payment already claimed")]
    AlreadyClaimed,

    #[msg("Invalid payment amount")]
    InvalidAmount,

    #[msg("Invalid expiration time")]
    InvalidExpiration,

    #[msg("Payment intent not expired, cannot refund")]
    CannotRefund,

    #[msg("Invalid payment status")]
    InvalidStatus,

    #[msg("Unauthorized operation")]
    Unauthorized,

    #[msg("Invalid signature")]
    InvalidSignature,

    #[msg("Insufficient escrow balance")]
    InsufficientBalance,
}
