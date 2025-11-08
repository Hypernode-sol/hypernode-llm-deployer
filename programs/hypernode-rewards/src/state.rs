use anchor_lang::prelude::*;

/// HYPER Token Configuration
/// Mint Address: 92s9qna3djkMncZzkacyNQ38UKnNXZFh4Jgqe3Cmpump
/// Total Supply: 1,000,000,000 HYPER
/// Decimals: 6
pub const HYPER_DECIMALS: u8 = 6;

/// Precision for reflection calculations
pub const REFLECTION_PRECISION: u128 = 1_000_000_000_000_000_000; // 10^18

/// Reflection account - tracks global rewards distribution
/// Uses reflection algorithm for O(1) reward distribution
#[account]
pub struct ReflectionAccount {
    /// Authority that can add rewards
    pub authority: Pubkey,

    /// Current reflection rate (reflection points per xHYPER)
    /// Rate = total_reflection / total_xhyper
    /// Decreases as rewards are added
    pub rate: u128,

    /// Total reflection points distributed
    pub total_reflection: u128,

    /// Total xHYPER in the system
    pub total_xhyper: u128,

    /// Total rewards distributed (for stats)
    pub total_rewards_distributed: u64,

    /// Bump seed for PDA
    pub bump: u8,
}

impl ReflectionAccount {
    pub const LEN: usize = 8 + 32 + 16 + 16 + 16 + 8 + 1;

    /// Add rewards to the pool
    /// This is called when job completes and node receives payment
    /// A percentage of payment goes to rewards pool
    pub fn add_rewards(&mut self, reward_amount: u64) {
        // Add rewards to total xHYPER pool
        self.total_xhyper += reward_amount as u128;

        // Recalculate rate (decreases with more rewards)
        if self.total_xhyper > 0 {
            self.rate = (self.total_reflection * REFLECTION_PRECISION) / self.total_xhyper;
        }

        self.total_rewards_distributed += reward_amount;
    }

    /// Register a new staker in reflection system
    /// Returns reflection points for this stake
    pub fn add_staker(&mut self, xhyper: u128) -> u128 {
        // Calculate reflection points for this xHYPER amount
        let reflection = if self.rate > 0 {
            (xhyper * self.rate) / REFLECTION_PRECISION
        } else {
            xhyper * REFLECTION_PRECISION
        };

        // Add to totals
        self.total_reflection += reflection;
        self.total_xhyper += xhyper;

        // Recalculate rate
        if self.total_xhyper > 0 {
            self.rate = (self.total_reflection * REFLECTION_PRECISION) / self.total_xhyper;
        }

        reflection
    }

    /// Remove staker from reflection system (on unstake)
    pub fn remove_staker(&mut self, xhyper: u128, reflection: u128) {
        if self.total_xhyper >= xhyper {
            self.total_xhyper -= xhyper;
        }

        if self.total_reflection >= reflection {
            self.total_reflection -= reflection;
        }

        // Recalculate rate
        if self.total_xhyper > 0 {
            self.rate = (self.total_reflection * REFLECTION_PRECISION) / self.total_xhyper;
        }
    }
}

/// User rewards account - tracks individual user rewards
#[account]
pub struct UserRewardsAccount {
    /// User's authority
    pub authority: Pubkey,

    /// Initial reflection points when user joined
    pub initial_reflection: u128,

    /// Current xHYPER balance (synced with stake account)
    pub xhyper: u128,

    /// Total rewards claimed so far
    pub total_claimed: u64,

    /// Last claim timestamp
    pub last_claim: i64,

    /// Bump seed
    pub bump: u8,
}

impl UserRewardsAccount {
    pub const LEN: usize = 8 + 32 + 16 + 16 + 8 + 8 + 1;

    /// Calculate claimable rewards
    /// rewards = (current_reflection / rate) - initial_xhyper
    pub fn calculate_claimable(&self, current_rate: u128) -> u64 {
        if current_rate == 0 || self.xhyper == 0 {
            return 0;
        }

        // Calculate current reflection value with overflow protection
        let current_reflection_value = match self.xhyper
            .checked_mul(current_rate)
            .and_then(|v| v.checked_div(REFLECTION_PRECISION))
        {
            Some(v) => v,
            None => return 0, // Overflow protection
        };

        // Calculate rewards
        if current_reflection_value > self.initial_reflection {
            let reflection_gained = current_reflection_value - self.initial_reflection;
            let rewards = match reflection_gained
                .checked_mul(REFLECTION_PRECISION)
                .and_then(|v| v.checked_div(current_rate))
            {
                Some(v) => v,
                None => return 0, // Overflow protection
            };
            rewards as u64
        } else {
            0
        }
    }

    /// Update after claiming rewards
    pub fn update_after_claim(&mut self, claimed_amount: u64, current_rate: u128) {
        self.total_claimed += claimed_amount;
        self.last_claim = Clock::get().unwrap().unix_timestamp;

        // Reset reflection to current value
        self.initial_reflection = (self.xhyper * current_rate) / REFLECTION_PRECISION;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_reflection_distribution() {
        let mut reflection = ReflectionAccount {
            authority: Pubkey::default(),
            rate: 0,
            total_reflection: 0,
            total_xhyper: 0,
            total_rewards_distributed: 0,
            bump: 0,
        };

        // User 1 stakes with 1000 xHYPER
        let user1_reflection = reflection.add_staker(1000);
        assert_eq!(reflection.total_xhyper, 1000);

        // Add 100 rewards
        reflection.add_rewards(100);
        assert_eq!(reflection.total_xhyper, 1100);

        // User 2 stakes with 1000 xHYPER
        let user2_reflection = reflection.add_staker(1000);

        // User 1 should have more reflection points (got in before rewards)
        assert!(user1_reflection > user2_reflection);

        // Add more rewards
        reflection.add_rewards(200);

        // Both users should be able to claim proportional rewards
        // (exact calculations would need more precision testing)
    }
}
