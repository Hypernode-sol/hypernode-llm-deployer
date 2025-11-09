use anchor_lang::prelude::*;

pub mod state;
pub mod instructions;
pub mod errors;

use instructions::*;

declare_id!("FAC1L1TaTorProgRamIdPLacehOLdEr111111111111");

#[program]
pub mod hypernode_facilitator {
    use super::*;

    /// Create a new payment intent with escrow
    pub fn create_intent(
        ctx: Context<CreateIntent>,
        id: [u8; 16],
        amount: u64,
        job_id: Option<[u8; 32]>,
        expiration: i64,
    ) -> Result<()> {
        instructions::create_intent::handler(ctx, id, amount, job_id, expiration)
    }

    /// Verify payment and mark intent as verified
    pub fn verify_payment(
        ctx: Context<VerifyPayment>,
        signature: [u8; 64],
    ) -> Result<()> {
        instructions::verify_payment::handler(ctx, signature)
    }

    /// Claim payment (for node provider after job completion)
    pub fn claim_payment(ctx: Context<ClaimPayment>) -> Result<()> {
        instructions::claim::handler(ctx)
    }

    /// Refund expired payment intent
    pub fn refund_payment(ctx: Context<RefundPayment>) -> Result<()> {
        instructions::refund::handler(ctx)
    }
}
