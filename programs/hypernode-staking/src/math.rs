use anchor_lang::prelude::*;
use crate::errors::*;

/// Safe math operations for preventing overflow/underflow
///
/// All operations return errors instead of panicking

/// Safe addition with overflow check
pub fn safe_add(a: u64, b: u64) -> Result<u64> {
    a.checked_add(b)
        .ok_or(StakingError::MathOverflow.into())
}

/// Safe subtraction with underflow check
pub fn safe_sub(a: u64, b: u64) -> Result<u64> {
    a.checked_sub(b)
        .ok_or(StakingError::MathUnderflow.into())
}

/// Safe multiplication with overflow check
pub fn safe_mul(a: u64, b: u64) -> Result<u64> {
    a.checked_mul(b)
        .ok_or(StakingError::MathOverflow.into())
}

/// Safe division with zero check
pub fn safe_div(a: u64, b: u64) -> Result<u64> {
    if b == 0 {
        return Err(StakingError::DivisionByZero.into());
    }
    Ok(a / b)
}

/// Safe division with remainder
pub fn safe_div_rem(a: u64, b: u64) -> Result<(u64, u64)> {
    if b == 0 {
        return Err(StakingError::DivisionByZero.into());
    }
    Ok((a / b, a % b))
}

/// Calculate multiplier based on duration
/// Formula: 1.0 + (duration / ONE_YEAR) * 3.0
/// Min: 1.0x at 2 weeks, Max: 4.0x at 1 year
pub fn calculate_multiplier(duration: i64) -> Result<u64> {
    const TWO_WEEKS: i64 = 14 * 24 * 60 * 60;
    const ONE_YEAR: i64 = 365 * 24 * 60 * 60;
    const BASE: u64 = 1000; // 1.0x = 1000 basis points
    const MAX_MULT: u64 = 4000; // 4.0x = 4000 basis points

    if duration < TWO_WEEKS {
        return Err(StakingError::InvalidDuration.into());
    }

    if duration > ONE_YEAR {
        return Ok(MAX_MULT);
    }

    // Calculate: BASE + (duration / ONE_YEAR) * 3000
    let ratio = safe_mul(duration as u64, 3000)?;
    let scaled = safe_div(ratio, ONE_YEAR as u64)?;
    safe_add(BASE, scaled)
}

/// Calculate xHYPER amount based on stake and multiplier
pub fn calculate_xhyper(stake_amount: u64, multiplier: u64) -> Result<u64> {
    // xHYPER = stake * (multiplier / 1000)
    // multiplier is in basis points (1000 = 1.0x)
    safe_mul(stake_amount, multiplier)?
        .checked_div(1000)
        .ok_or(StakingError::MathOverflow.into())
}

/// Calculate total xHYPER with multiple stakes
pub fn calculate_total_xhyper(stakes: &[(u64, u64)]) -> Result<u64> {
    let mut total = 0u64;
    for (amount, multiplier) in stakes {
        let xhyper = calculate_xhyper(*amount, *multiplier)?;
        total = safe_add(total, xhyper)?;
    }
    Ok(total)
}

/// Percentage calculation with basis points (10000 = 100%)
pub fn apply_basis_points(amount: u64, basis_points: u64) -> Result<u64> {
    const PRECISION: u64 = 10000;
    safe_mul(amount, basis_points)?
        .checked_div(PRECISION)
        .ok_or(StakingError::MathOverflow.into())
}

/// Calculate amount minus fee (in basis points)
pub fn apply_fee(amount: u64, fee_bps: u64) -> Result<u64> {
    if fee_bps > 10000 {
        return Err(StakingError::InvalidFee.into());
    }
    let fee = apply_basis_points(amount, fee_bps)?;
    safe_sub(amount, fee)
}

/// Safe i64 addition
pub fn safe_add_i64(a: i64, b: i64) -> Result<i64> {
    a.checked_add(b)
        .ok_or(StakingError::MathOverflow.into())
}

/// Safe i64 subtraction
pub fn safe_sub_i64(a: i64, b: i64) -> Result<i64> {
    a.checked_sub(b)
        .ok_or(StakingError::MathUnderflow.into())
}

/// Safe i64 multiplication
pub fn safe_mul_i64(a: i64, b: i64) -> Result<i64> {
    a.checked_mul(b)
        .ok_or(StakingError::MathOverflow.into())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_safe_add() {
        assert!(safe_add(1000, 2000).is_ok());
        assert!(safe_add(u64::MAX, 1).is_err());
    }

    #[test]
    fn test_safe_sub() {
        assert!(safe_sub(1000, 500).is_ok());
        assert!(safe_sub(100, 200).is_err());
    }

    #[test]
    fn test_safe_mul() {
        assert!(safe_mul(1000, 1000).is_ok());
        assert!(safe_mul(u64::MAX, 2).is_err());
    }
}
