use anchor_lang::prelude::*;

/// Node reputation account - tracks performance metrics
#[account]
pub struct NodeReputation {
    /// Node owner
    pub authority: Pubkey,

    /// Total jobs completed successfully
    pub total_jobs: u64,

    /// Total jobs failed
    pub failed_jobs: u64,

    /// Total jobs timed out
    pub timeout_jobs: u64,

    /// Average response time (milliseconds)
    pub avg_response_time: u64,

    /// Total uptime (seconds)
    pub total_uptime: u64,

    /// Last active timestamp
    pub last_active: i64,

    /// Reputation score (0-1000)
    /// Calculated from: completion_rate, response_time, uptime
    pub reputation_score: u16,

    /// Tier level (0-4: Starter, Bronze, Silver, Gold, Diamond)
    pub tier: u8,

    /// Total revenue earned (for stats)
    pub total_revenue: u64,

    /// PDA bump
    pub bump: u8,
}

impl NodeReputation {
    pub const LEN: usize = 8 + 32 + 8 + 8 + 8 + 8 + 8 + 8 + 2 + 1 + 8 + 1;

    /// Calculate completion rate (0-10000 basis points)
    pub fn completion_rate(&self) -> u16 {
        if self.total_jobs == 0 {
            return 10000; // 100% for new nodes (benefit of doubt)
        }

        let completed = self.total_jobs;
        let total = self.total_jobs + self.failed_jobs + self.timeout_jobs;

        if total == 0 {
            return 10000;
        }

        ((completed * 10000) / total) as u16
    }

    /// Update reputation score based on metrics
    /// Score = (completion_rate * 0.6) + (uptime_factor * 0.3) + (response_factor * 0.1)
    pub fn update_reputation_score(&mut self) {
        let completion_rate = self.completion_rate();

        // Uptime factor: >99% = 1000, <90% = 0
        let uptime_factor = if self.total_uptime > 0 {
            let uptime_percentage = (self.total_uptime * 100) / (30 * 86400); // 30-day window
            ((uptime_percentage as u32 * 10).min(1000)) as u16
        } else {
            1000 // New nodes get benefit of doubt
        };

        // Response time factor: <1000ms = 1000, >10000ms = 0
        let response_factor = if self.avg_response_time > 0 {
            let clamped = self.avg_response_time.min(10000).max(1000);
            let normalized = 10000 - clamped;
            ((normalized * 1000) / 9000) as u16
        } else {
            1000 // New nodes get benefit of doubt
        };

        // Weighted calculation
        let score = (completion_rate as u32 * 6 / 10)
            + (uptime_factor as u32 * 3 / 10)
            + (response_factor as u32 * 1 / 10);

        self.reputation_score = score.min(1000) as u16;

        // Update tier based on score
        self.tier = self.calculate_tier();
    }

    /// Calculate tier based on reputation score
    fn calculate_tier(&self) -> u8 {
        match self.reputation_score {
            0..=200 => 0,     // Starter
            201..=500 => 1,   // Bronze
            501..=750 => 2,   // Silver
            751..=900 => 3,   // Gold
            901..=1000 => 4,  // Diamond
            _ => 0,
        }
    }

    /// Record successful job completion
    pub fn record_success(&mut self, execution_time: u64, revenue: u64) {
        self.total_jobs += 1;
        self.total_revenue += revenue;

        // Update average response time (rolling average)
        if self.avg_response_time == 0 {
            self.avg_response_time = execution_time;
        } else {
            self.avg_response_time = (self.avg_response_time * 9 + execution_time) / 10;
        }

        self.update_reputation_score();
    }

    /// Record failed job
    pub fn record_failure(&mut self) {
        self.failed_jobs += 1;
        self.update_reputation_score();
    }

    /// Record timeout
    pub fn record_timeout(&mut self) {
        self.timeout_jobs += 1;
        self.update_reputation_score();
    }

    /// Update uptime
    pub fn update_uptime(&mut self, current_time: i64) {
        if self.last_active > 0 {
            let elapsed = (current_time - self.last_active) as u64;
            // Only count as uptime if less than 1 hour gap
            if elapsed < 3600 {
                self.total_uptime += elapsed;
            }
        }

        self.last_active = current_time;
        self.update_reputation_score();
    }

    /// Check if node is in good standing
    pub fn is_good_standing(&self) -> bool {
        self.reputation_score >= 500 // At least Silver tier
    }

    /// Get priority boost based on reputation
    /// Higher reputation = better queue position
    pub fn get_priority_boost(&self) -> u8 {
        match self.tier {
            0 => 0,  // Starter: no boost
            1 => 1,  // Bronze: +1
            2 => 2,  // Silver: +2
            3 => 5,  // Gold: +5
            4 => 10, // Diamond: +10
            _ => 0,
        }
    }
}
