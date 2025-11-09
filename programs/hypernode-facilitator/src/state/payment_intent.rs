use anchor_lang::prelude::*;

#[account]
#[derive(Default)]
pub struct PaymentIntent {
    /// Unique identifier (UUID v4 as bytes)
    pub id: [u8; 16],

    /// Payer's wallet address
    pub payer: Pubkey,

    /// Payment amount in lamports
    pub amount: u64,

    /// Associated job ID (optional)
    pub job_id: [u8; 32],

    /// Creation timestamp (Unix)
    pub created_at: i64,

    /// Expiration timestamp (Unix)
    pub expires_at: i64,

    /// Transaction signature (once verified)
    pub signature: [u8; 64],

    /// Payment status
    pub status: PaymentStatus,

    /// Escrow account holding funds
    pub escrow: Pubkey,

    /// Bump seed for PDA
    pub bump: u8,
}

impl PaymentIntent {
    pub const LEN: usize = 8 + // discriminator
        16 +      // id
        32 +      // payer
        8 +       // amount
        32 +      // job_id
        8 +       // created_at
        8 +       // expires_at
        64 +      // signature
        1 +       // status
        32 +      // escrow
        1;        // bump

    pub fn is_expired(&self, current_time: i64) -> bool {
        current_time > self.expires_at
    }

    pub fn can_claim(&self) -> bool {
        self.status == PaymentStatus::Verified
    }

    pub fn can_refund(&self, current_time: i64) -> bool {
        self.is_expired(current_time) && self.status == PaymentStatus::Pending
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Default)]
pub enum PaymentStatus {
    #[default]
    Pending,
    Verified,
    Claimed,
    Refunded,
    Expired,
}
