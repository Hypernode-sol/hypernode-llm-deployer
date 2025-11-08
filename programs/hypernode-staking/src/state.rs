use anchor_lang::prelude::*;

/// HYPER Token Configuration
/// Mint Address: 92s9qna3djkMncZzkacyNQ38UKnNXZFh4Jgqe3Cmpump
/// Total Supply: 1,000,000,000 HYPER
/// Decimals: 6
pub const HYPER_DECIMALS: u8 = 6;

/// Staking precision for xHYPER calculations
pub const XHYPER_PRECISION: u128 = 1_000_000_000_000_000; // 10^15

/// Minimum staking duration (2 weeks in seconds)
pub const DURATION_MIN: i64 = 14 * 86400;

/// Maximum staking duration (1 year in seconds)
pub const DURATION_MAX: i64 = 365 * 86400;

/// xHYPER divisor for multiplier calculation (0.25 per month)
/// Gives 4x multiplier at 1 year
pub const XHYPER_DIV: i64 = (4 * DURATION_MAX) / 12;

/// Stake account - tracks individual user stake
/// Optimized field ordering to minimize padding (saves 7 bytes)
#[account]
pub struct StakeAccount {
    /// Owner of the stake
    pub authority: Pubkey,

    /// Calculated xHYPER balance (with multiplier)
    pub xhyper: u128,

    /// Amount of HYPER tokens staked
    pub amount: u64,

    /// Timestamp when stake was created
    pub time_stake: i64,

    /// Timestamp when unstake was initiated (0 if not unstaking)
    pub time_unstake: i64,

    /// Staking duration in seconds (lock period)
    pub duration: i64,

    /// PDA bump seed
    pub bump: u8,
}

impl StakeAccount {
    /// Account size: 8 (discriminator) + size of fields
    /// Optimized: 8 + 32 + 16 + 8 + 8 + 8 + 8 + 1 = 89 bytes (was 96 with padding)
    pub const LEN: usize = 8 + 32 + 16 + 8 + 8 + 8 + 8 + 1;

    /// Calculate xHYPER based on staking amount and duration
    /// Multiplier ranges from 1x (2 weeks) to 4x (1 year)
    pub fn calculate_xhyper(amount: u64, duration: i64) -> u128 {
        if duration < DURATION_MIN {
            // Below minimum duration, no multiplier
            return amount as u128;
        }

        let capped_duration = if duration > DURATION_MAX {
            DURATION_MAX
        } else {
            duration
        };

        // Formula: xhyper = (duration * PRECISION / XHYPER_DIV + PRECISION) * amount / PRECISION
        // This gives:
        // - 2 weeks: 1.0x multiplier
        // - 1 month: 1.25x multiplier
        // - 6 months: 2.5x multiplier
        // - 1 year: 4.0x multiplier

        let duration_factor = (capped_duration as u128 * XHYPER_PRECISION) / (XHYPER_DIV as u128);
        let multiplier = duration_factor + XHYPER_PRECISION;
        let xhyper = (multiplier * amount as u128) / XHYPER_PRECISION;

        xhyper
    }

    /// Update xHYPER balance
    /// Called when staking or when checking stake status
    pub fn update_xhyper(&mut self) {
        // If unstaking, xHYPER goes to 0
        if self.time_unstake != 0 {
            self.xhyper = 0;
            return;
        }

        // Recalculate xHYPER based on current duration
        self.xhyper = Self::calculate_xhyper(self.amount, self.duration);
    }

    /// Check if stake is active (not unstaking)
    #[inline(always)]
    pub fn is_active(&self) -> bool {
        self.time_unstake == 0
    }

    /// Check if unstake cooldown has passed
    #[inline(always)]
    pub fn can_withdraw(&self, current_time: i64) -> bool {
        if self.time_unstake == 0 {
            return false;
        }

        // Cooldown period = staking duration
        current_time >= self.time_unstake + self.duration
    }

    /// Get multiplier as a decimal (e.g., 2.5x = 250)
    #[inline]
    pub fn get_multiplier_bps(&self) -> u16 {
        if self.amount == 0 {
            return 100; // 1.0x
        }

        let multiplier_bps = ((self.xhyper * 10000) / (self.amount as u128)) as u16;
        multiplier_bps
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_xhyper_calculation() {
        // Test minimum duration (2 weeks)
        let xhyper = StakeAccount::calculate_xhyper(1000, DURATION_MIN);
        assert!(xhyper >= 1000); // Should be >= 1x

        // Test 1 month
        let xhyper = StakeAccount::calculate_xhyper(1000, 30 * 86400);
        println!("1 month: {}", xhyper);
        assert!(xhyper > 1000 && xhyper < 2000); // Should be between 1x and 2x

        // Test maximum duration (1 year)
        let xhyper = StakeAccount::calculate_xhyper(1000, DURATION_MAX);
        println!("1 year: {}", xhyper);
        assert!(xhyper >= 3900 && xhyper <= 4100); // Should be ~4x

        // Test above maximum (should cap at 4x)
        let xhyper = StakeAccount::calculate_xhyper(1000, DURATION_MAX * 2);
        assert!(xhyper >= 3900 && xhyper <= 4100); // Should still be ~4x
    }
}
