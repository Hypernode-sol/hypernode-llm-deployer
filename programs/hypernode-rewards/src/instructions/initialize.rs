use anchor_lang::prelude::*;
use crate::state::*;

/// Initialize reflection account for rewards distribution
#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = ReflectionAccount::LEN,
        seeds = [b"reflection"],
        bump
    )]
    pub reflection_account: Account<'info, ReflectionAccount>,

    /// Authority that can add rewards
    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<Initialize>) -> Result<()> {
    let reflection = &mut ctx.accounts.reflection_account;

    reflection.authority = ctx.accounts.authority.key();
    reflection.rate = 0;
    reflection.total_reflection = 0;
    reflection.total_xhyper = 0;
    reflection.total_rewards_distributed = 0;
    reflection.bump = ctx.bumps.reflection_account;

    msg!("Reflection account initialized");
    msg!("Authority: {}", reflection.authority);

    Ok(())
}
