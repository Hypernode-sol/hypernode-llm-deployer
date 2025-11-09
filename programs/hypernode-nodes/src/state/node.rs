use anchor_lang::prelude::*;

/// Node account storing hardware specs and stats
#[account]
pub struct Node {
    /// Owner/authority of the node
    pub authority: Pubkey,

    /// Unique node identifier
    pub node_id: String,

    /// Whether node has been audited by trusted authority
    pub is_audited: bool,

    /// Hardware specifications
    pub architecture: Architecture,
    pub country: Country,
    pub cpu_cores: u16,
    pub gpu_cores: u16,
    pub ram_gb: u16,
    pub iops: u32,
    pub storage_gb: u32,

    /// Performance stats
    pub jobs_completed: u64,
    pub jobs_failed: u64,
    pub total_earned: u64,
    pub reputation_score: u16, // 0-1000
    pub uptime_percentage: u8, // 0-100

    /// Network information
    pub endpoint: String, // HTTP endpoint for logs
    pub version: u32,

    /// Timestamps
    pub registered_at: i64,
    pub last_heartbeat: i64,
    pub is_active: bool,

    /// Health check stats (Checker system)
    pub last_health_check: i64,
    pub total_health_checks: u64,
    pub passed_health_checks: u64,
    pub failed_health_checks: u64,
    pub health_check_pass_rate: u8, // 0-100

    /// Anti-spoofing verification
    pub gpu_fingerprint_hash: [u8; 32], // Hash of GPU hardware details
    pub last_challenge_ts: i64,
    pub challenge_failures: u32,
    pub challenge_successes: u32,
    pub audit_failures: u32,
    pub is_flagged: bool, // Flagged for suspicious behavior

    /// PDA bump
    pub bump: u8,
}

impl Node {
    pub const MAX_NODE_ID_LEN: usize = 64;
    pub const MAX_ENDPOINT_LEN: usize = 128;

    pub const SPACE: usize = 8 + // discriminator
        32 + // authority
        4 + Self::MAX_NODE_ID_LEN + // node_id
        1 + // is_audited
        1 + // architecture (enum)
        1 + // country (enum)
        2 + // cpu_cores
        2 + // gpu_cores
        2 + // ram_gb
        4 + // iops
        4 + // storage_gb
        8 + // jobs_completed
        8 + // jobs_failed
        8 + // total_earned
        2 + // reputation_score
        1 + // uptime_percentage
        4 + Self::MAX_ENDPOINT_LEN + // endpoint
        4 + // version
        8 + // registered_at
        8 + // last_heartbeat
        1 + // is_active
        8 + // last_health_check
        8 + // total_health_checks
        8 + // passed_health_checks
        8 + // failed_health_checks
        1 + // health_check_pass_rate
        32 + // gpu_fingerprint_hash
        8 + // last_challenge_ts
        4 + // challenge_failures
        4 + // challenge_successes
        4 + // audit_failures
        1 + // is_flagged
        1; // bump
}

/// Hardware architecture types
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum Architecture {
    Amd64,
    Arm64,
    ArmV7,
    Arm,
    I386,
    Mips64,
    Mips64le,
    Ppc64,
    Ppc64le,
    S390x,
    Riscv64,
}

/// Country codes (ISO 3166-1 alpha-2)
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum Country {
    US, // United States
    BR, // Brazil
    DE, // Germany
    JP, // Japan
    CN, // China
    GB, // United Kingdom
    FR, // France
    CA, // Canada
    AU, // Australia
    IN, // India
    Unknown,
}
