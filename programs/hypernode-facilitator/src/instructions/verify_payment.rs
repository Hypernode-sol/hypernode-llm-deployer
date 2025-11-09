use anchor_lang::prelude::*;

use crate::state::*;
use crate::errors::*;

#[derive(Accounts)]
pub struct VerifyPayment<'info> {
    #[account(
        mut,
        seeds = [b"payment_intent", payment_intent.id.as_ref()],
        bump = payment_intent.bump,
        constraint = payment_intent.payer == payer.key() @ FacilitatorError::Unauthorized
    )]
    pub payment_intent: Account<'info, PaymentIntent>,

    pub payer: Signer<'info>,
}

pub fn handler(
    ctx: Context<VerifyPayment>,
    signature: [u8; 64],
) -> Result<()> {
    let payment_intent = &mut ctx.accounts.payment_intent;
    let clock = Clock::get()?;

    require!(!payment_intent.is_expired(clock.unix_timestamp), FacilitatorError::IntentExpired);
    require!(payment_intent.status == PaymentStatus::Pending, FacilitatorError::InvalidStatus);

    // Store signature and mark as verified
    payment_intent.signature = signature;
    payment_intent.status = PaymentStatus::Verified;

    msg!("Payment intent verified: {:?}", payment_intent.id);

    Ok(())
}
