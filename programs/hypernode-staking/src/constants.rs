use anchor_lang::prelude::*;

/// Security and operational constants for Hypernode Staking Program

/// Minimum staking amount in lamports (0.1 HYPER)
pub const MIN_STAKE_AMOUNT: u64 = 100_000_000;

/// Maximum staking amount in lamports (1,000,000 HYPER)
pub const MAX_STAKE_AMOUNT: u64 = 1_000_000_000_000_000;

/// Minimum staking duration in seconds (2 weeks = 14 days)
pub const MIN_STAKE_DURATION: i64 = 14 * 24 * 60 * 60;

/// Maximum staking duration in seconds (4 years)
pub const MAX_STAKE_DURATION: i64 = 4 * 365 * 24 * 60 * 60;

/// Duration of 2 weeks in seconds (for base multiplier)
pub const TWO_WEEKS_SECONDS: i64 = 14 * 24 * 60 * 60;

/// Duration of 1 year in seconds
pub const ONE_YEAR_SECONDS: i64 = 365 * 24 * 60 * 60;

/// Base multiplier for minimum duration (1.0x = 1000 basis points)
pub const BASE_MULTIPLIER: u64 = 1000;

/// Maximum multiplier for maximum duration (4.0x = 4000 basis points)
pub const MAX_MULTIPLIER: u64 = 4000;

/// Withdrawal fee in basis points (0% = 0, 100% = 10000)
pub const WITHDRAWAL_FEE_BPS: u64 = 0;

/// Early withdrawal penalty in basis points (10% penalty)
pub const EARLY_WITHDRAWAL_PENALTY_BPS: u64 = 1000;

/// Minimum withdrawal amount in lamports to avoid dust
pub const MIN_WITHDRAWAL_AMOUNT: u64 = 1_000_000;

/// Maximum number of concurrent stakes per user
pub const MAX_STAKES_PER_USER: u32 = 10;

/// Slashing percentage for protocol violations (in basis points, 20% = 2000)
pub const SLASHING_PERCENTAGE_BPS: u64 = 2000;

/// Cooldown period multiplier (equal to stake duration)
pub const COOLDOWN_PERIOD_MULTIPLIER: f64 = 1.0;

/// Authority version for upgrade compatibility
pub const AUTHORITY_VERSION: u8 = 1;

/// Maximum basis points value (100%)
pub const MAX_BASIS_POINTS: u64 = 10000;
