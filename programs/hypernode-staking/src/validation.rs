use anchor_lang::prelude::*;
use crate::constants::*;
use crate::errors::*;

/// Input validation utilities for staking operations

/// Validate stake amount
pub fn validate_stake_amount(amount: u64) -> Result<()> {
    if amount < MIN_STAKE_AMOUNT {
        return Err(StakingError::AmountTooSmall.into());
    }
    if amount > MAX_STAKE_AMOUNT {
        return Err(StakingError::AmountTooLarge.into());
    }
    Ok(())
}

/// Validate stake duration
pub fn validate_duration(duration: i64) -> Result<()> {
    if duration < MIN_STAKE_DURATION {
        return Err(StakingError::DurationTooShort.into());
    }
    if duration > MAX_STAKE_DURATION {
        return Err(StakingError::InvalidDuration.into());
    }
    Ok(())
}

/// Validate both amount and duration
pub fn validate_stake_params(amount: u64, duration: i64) -> Result<()> {
    validate_stake_amount(amount)?;
    validate_duration(duration)?;
    Ok(())
}

/// Validate withdrawal amount
pub fn validate_withdrawal_amount(amount: u64) -> Result<()> {
    if amount < MIN_WITHDRAWAL_AMOUNT && amount > 0 {
        return Err(StakingError::AmountTooSmall.into());
    }
    Ok(())
}

/// Validate fee configuration
pub fn validate_fee_bps(fee_bps: u64) -> Result<()> {
    if fee_bps > MAX_BASIS_POINTS {
        return Err(StakingError::InvalidFee.into());
    }
    Ok(())
}

/// Validate token account ownership
pub fn validate_token_account_owner(
    token_account_owner: &Pubkey,
    expected_owner: &Pubkey,
) -> Result<()> {
    if token_account_owner != expected_owner {
        return Err(StakingError::InvalidOwner.into());
    }
    Ok(())
}

/// Validate authority signature
pub fn validate_authority(actual: &Pubkey, expected: &Pubkey) -> Result<()> {
    if actual != expected {
        return Err(StakingError::Unauthorized.into());
    }
    Ok(())
}

/// Validate account is signer
pub fn validate_signer(account: &Signer) -> Result<()> {
    if !account.is_signer {
        return Err(StakingError::Unauthorized.into());
    }
    Ok(())
}

/// Validate timestamp is not in the future
pub fn validate_timestamp(timestamp: i64, clock: &Clock) -> Result<()> {
    if timestamp > clock.unix_timestamp {
        return Err(StakingError::InvalidTimestamp.into());
    }
    Ok(())
}

/// Validate cooldown period has passed
pub fn validate_cooldown_passed(cooldown_end: i64, current_time: i64) -> Result<()> {
    if current_time < cooldown_end {
        return Err(StakingError::CooldownNotPassed.into());
    }
    Ok(())
}

/// Validate multiplier is within valid range
pub fn validate_multiplier(multiplier: u64) -> Result<()> {
    if multiplier < BASE_MULTIPLIER || multiplier > MAX_MULTIPLIER {
        return Err(StakingError::InvalidDuration.into());
    }
    Ok(())
}

/// Validate max stakes per user not exceeded
pub fn validate_max_stakes(current_stakes: u32) -> Result<()> {
    if current_stakes >= MAX_STAKES_PER_USER {
        return Err(StakingError::MaxStakesExceeded.into());
    }
    Ok(())
}

/// Validate account rent exempt status
pub fn validate_rent_exempt(account_lamports: u64, rent: &Rent, account_data_len: usize) -> Result<()> {
    let minimum_balance = rent.minimum_balance(account_data_len);
    if account_lamports < minimum_balance {
        return Err(StakingError::InsufficientBalance.into());
    }
    Ok(())
}

/// Validate PDA seed derivation
pub fn validate_pda(account: &AccountInfo, expected_bump: u8, seeds: &[&[u8]]) -> Result<()> {
    let (expected_pubkey, _) = Pubkey::find_program_address(seeds, &crate::ID);
    if account.key() != expected_pubkey {
        return Err(StakingError::InvalidVault.into());
    }
    Ok(())
}

/// Comprehensive validation for stake instruction
pub fn validate_stake_instruction(
    amount: u64,
    duration: i64,
    authority: &Pubkey,
    user_token_account_owner: &Pubkey,
) -> Result<()> {
    validate_stake_params(amount, duration)?;
    validate_authority(user_token_account_owner, authority)?;
    Ok(())
}

/// Comprehensive validation for unstake instruction
pub fn validate_unstake_instruction(
    stake_account_state: u8,
    authority: &Pubkey,
    signer: &Pubkey,
) -> Result<()> {
    // State: 0 = active, 1 = unstaking, 2 = done
    if stake_account_state != 0 {
        return Err(StakingError::AlreadyUnstaking.into());
    }
    validate_authority(signer, authority)?;
    Ok(())
}

/// Comprehensive validation for withdraw instruction
pub fn validate_withdraw_instruction(
    stake_account_state: u8,
    cooldown_end: i64,
    authority: &Pubkey,
    signer: &Pubkey,
    clock: &Clock,
) -> Result<()> {
    // State: 0 = active, 1 = unstaking, 2 = done
    if stake_account_state != 1 {
        return Err(StakingError::NotUnstaking.into());
    }
    validate_cooldown_passed(cooldown_end, clock.unix_timestamp)?;
    validate_authority(signer, authority)?;
    Ok(())
}
