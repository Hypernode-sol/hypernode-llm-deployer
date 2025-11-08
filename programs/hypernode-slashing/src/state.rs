use anchor_lang::prelude::*;

/// HYPER Token Configuration
pub const HYPER_DECIMALS: u8 = 6;

/// Slashing configuration
pub const MAX_SLASH_PERCENTAGE: u16 = 5000; // 50% max slash
pub const APPEAL_PERIOD: i64 = 7 * 86400; // 7 days to appeal
pub const MIN_EVIDENCE_VALIDATORS: u8 = 3; // Min validators to confirm fraud

/// Fraud report - tracks reported malicious behavior
#[account]
pub struct FraudReport {
    /// Node being reported
    pub node: Pubkey,

    /// Reporter address
    pub reporter: Pubkey,

    /// IPFS CID of evidence (logs, screenshots, etc.)
    pub evidence_cid: [u8; 32],

    /// Type of fraud
    pub fraud_type: FraudType,

    /// Timestamp of report
    pub time_reported: i64,

    /// Number of validators confirming this report
    pub validator_count: u8,

    /// Validators who confirmed (max 10)
    pub validators: Vec<Pubkey>,

    /// Status
    pub status: ReportStatus,

    /// Proposed slash amount
    pub slash_amount: u64,

    /// PDA bump
    pub bump: u8,
}

impl FraudReport {
    pub const LEN: usize = 8 + 32 + 32 + 32 + 1 + 8 + 1 + (4 + 32 * 10) + 1 + 8 + 1;

    /// Check if appeal period has passed
    pub fn can_execute_slash(&self, current_time: i64) -> bool {
        self.status == ReportStatus::Confirmed
            && current_time >= self.time_reported + APPEAL_PERIOD
    }

    /// Check if enough validators confirmed
    pub fn is_confirmed(&self) -> bool {
        self.validator_count >= MIN_EVIDENCE_VALIDATORS
    }
}

/// Slash record - tracks executed slashes
#[account]
pub struct SlashRecord {
    /// Node that was slashed
    pub node: Pubkey,

    /// Related fraud report
    pub fraud_report: Pubkey,

    /// Amount slashed
    pub amount_slashed: u64,

    /// Timestamp of slash
    pub time_slashed: i64,

    /// Authority that executed slash
    pub executor: Pubkey,

    /// PDA bump
    pub bump: u8,
}

impl SlashRecord {
    pub const LEN: usize = 8 + 32 + 32 + 8 + 8 + 32 + 1;
}

/// Types of fraudulent behavior
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Debug)]
pub enum FraudType {
    /// Node submitted invalid/fake results
    InvalidResults,

    /// Node went offline for extended period (>48h)
    ProlongedDowntime,

    /// Multiple consecutive job failures
    RepeatedFailures,

    /// Node attempted to double-claim payment
    DoubleSpend,

    /// Other malicious behavior
    Other,
}

/// Report status
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum ReportStatus {
    /// Pending validation
    Pending,

    /// Confirmed by validators
    Confirmed,

    /// Executed (slash applied)
    Executed,

    /// Appealed by node
    Appealed,

    /// Dismissed (insufficient evidence)
    Dismissed,
}
