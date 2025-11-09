use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::state::*;
use crate::errors::*;

#[derive(Accounts)]
#[instruction(id: [u8; 16], amount: u64, expiration: i64)]
pub struct CreateIntent<'info> {
    #[account(
        init,
        payer = payer,
        space = PaymentIntent::LEN,
        seeds = [b"payment_intent", id.as_ref()],
        bump
    )]
    pub payment_intent: Account<'info, PaymentIntent>,

    #[account(
        init,
        payer = payer,
        seeds = [b"escrow", payment_intent.key().as_ref()],
        bump,
        token::mint = token_mint,
        token::authority = escrow_authority
    )]
    pub escrow: Account<'info, TokenAccount>,

    /// CHECK: PDA authority for escrow
    #[account(
        seeds = [b"escrow_authority"],
        bump
    )]
    pub escrow_authority: UncheckedAccount<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        mut,
        constraint = payer_token_account.owner == payer.key(),
        constraint = payer_token_account.mint == token_mint.key()
    )]
    pub payer_token_account: Account<'info, TokenAccount>,

    /// CHECK: Token mint account
    pub token_mint: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(
    ctx: Context<CreateIntent>,
    id: [u8; 16],
    amount: u64,
    job_id: Option<[u8; 32]>,
    expiration: i64,
) -> Result<()> {
    let clock = Clock::get()?;

    require!(amount > 0, FacilitatorError::InvalidAmount);
    require!(expiration > clock.unix_timestamp, FacilitatorError::InvalidExpiration);
    require!(expiration <= clock.unix_timestamp + 3600, FacilitatorError::InvalidExpiration); // Max 1 hour

    let payment_intent = &mut ctx.accounts.payment_intent;
    payment_intent.id = id;
    payment_intent.payer = ctx.accounts.payer.key();
    payment_intent.amount = amount;
    payment_intent.job_id = job_id.unwrap_or([0; 32]);
    payment_intent.created_at = clock.unix_timestamp;
    payment_intent.expires_at = expiration;
    payment_intent.signature = [0; 64];
    payment_intent.status = PaymentStatus::Pending;
    payment_intent.escrow = ctx.accounts.escrow.key();
    payment_intent.bump = ctx.bumps.payment_intent;

    // Transfer tokens to escrow
    let cpi_accounts = Transfer {
        from: ctx.accounts.payer_token_account.to_account_info(),
        to: ctx.accounts.escrow.to_account_info(),
        authority: ctx.accounts.payer.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    token::transfer(cpi_ctx, amount)?;

    msg!("Payment intent created: {:?}, amount: {}, expires: {}", id, amount, expiration);

    Ok(())
}
