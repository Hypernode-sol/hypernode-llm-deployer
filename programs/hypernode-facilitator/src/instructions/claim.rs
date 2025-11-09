use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::state::*;
use crate::errors::*;

#[derive(Accounts)]
pub struct ClaimPayment<'info> {
    #[account(
        mut,
        seeds = [b"payment_intent", payment_intent.id.as_ref()],
        bump = payment_intent.bump,
        constraint = payment_intent.can_claim() @ FacilitatorError::IntentNotVerified
    )]
    pub payment_intent: Account<'info, PaymentIntent>,

    #[account(
        mut,
        seeds = [b"escrow", payment_intent.key().as_ref()],
        bump,
        constraint = escrow.amount >= payment_intent.amount @ FacilitatorError::InsufficientBalance
    )]
    pub escrow: Account<'info, TokenAccount>,

    /// CHECK: PDA authority for escrow
    #[account(
        seeds = [b"escrow_authority"],
        bump
    )]
    pub escrow_authority: UncheckedAccount<'info>,

    #[account(
        mut,
        constraint = recipient_token_account.mint == escrow.mint
    )]
    pub recipient_token_account: Account<'info, TokenAccount>,

    pub recipient: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<ClaimPayment>) -> Result<()> {
    let payment_intent = &mut ctx.accounts.payment_intent;

    require!(payment_intent.status == PaymentStatus::Verified, FacilitatorError::IntentNotVerified);

    let escrow_auth_bump = ctx.bumps.escrow_authority;
    let seeds = &[
        b"escrow_authority".as_ref(),
        &[escrow_auth_bump],
    ];
    let signer = &[&seeds[..]];

    // Transfer tokens from escrow to recipient
    let cpi_accounts = Transfer {
        from: ctx.accounts.escrow.to_account_info(),
        to: ctx.accounts.recipient_token_account.to_account_info(),
        authority: ctx.accounts.escrow_authority.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
    token::transfer(cpi_ctx, payment_intent.amount)?;

    payment_intent.status = PaymentStatus::Claimed;

    msg!("Payment claimed: {:?}, amount: {}, recipient: {}",
        payment_intent.id,
        payment_intent.amount,
        ctx.accounts.recipient.key()
    );

    Ok(())
}
