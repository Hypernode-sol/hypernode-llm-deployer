use anchor_lang::prelude::*;

/// Governance configuration constants
pub const PROPOSAL_THRESHOLD: u128 = 1_000_000; // 1M xHYPER to create proposal
pub const QUORUM_PERCENTAGE: u16 = 1000; // 10% quorum required
pub const VOTING_PERIOD: i64 = 3 * 86400; // 3 days voting period
pub const EXECUTION_DELAY: i64 = 1 * 86400; // 1 day delay after passing

/// Governance configuration account
/// Stores global state including proposal counter
#[account]
pub struct GovernanceConfig {
    /// Authority that can update config
    pub authority: Pubkey,

    /// Global proposal counter (prevents ID collisions)
    pub proposal_count: u64,

    /// Total xHYPER voting power (updated periodically)
    pub total_voting_power: u128,

    /// PDA bump
    pub bump: u8,
}

impl GovernanceConfig {
    pub const LEN: usize = 8 + 32 + 8 + 16 + 1;
}

/// Governance proposal
#[account]
pub struct Proposal {
    /// Proposal ID (incremental)
    pub id: u64,

    /// Proposer
    pub proposer: Pubkey,

    /// Title (max 100 chars)
    pub title: String,

    /// Description IPFS CID
    pub description_cid: [u8; 32],

    /// Proposal type
    pub proposal_type: ProposalType,

    /// Execution data (serialized instruction data)
    pub execution_data: Vec<u8>,

    /// Voting start time
    pub time_created: i64,

    /// Voting end time
    pub time_voting_ends: i64,

    /// Execution time (if passed)
    pub time_executable: i64,

    /// Total xHYPER voting power when created
    pub total_voting_power: u128,

    /// Votes in favor (weighted by xHYPER)
    pub votes_for: u128,

    /// Votes against (weighted by xHYPER)
    pub votes_against: u128,

    /// Number of unique voters
    pub voter_count: u64,

    /// Status
    pub status: ProposalStatus,

    /// PDA bump
    pub bump: u8,
}

impl Proposal {
    pub const LEN: usize = 8 + 8 + 32 + 100 + 32 + 1 + (4 + 256) + 8 + 8 + 8 + 16 + 16 + 16 + 8 + 1 + 1;

    /// Check if proposal passed quorum and majority
    pub fn has_passed(&self) -> bool {
        // Check if voting ended
        let clock = Clock::get().unwrap();
        if clock.unix_timestamp < self.time_voting_ends {
            return false;
        }

        // Check quorum (at least 10% of total xHYPER voted)
        let total_votes = self.votes_for + self.votes_against;
        let quorum_required = (self.total_voting_power * QUORUM_PERCENTAGE as u128) / 10000;

        if total_votes < quorum_required {
            return false;
        }

        // Check majority (>50%)
        self.votes_for > self.votes_against
    }

    /// Check if proposal is executable
    pub fn is_executable(&self, current_time: i64) -> bool {
        self.status == ProposalStatus::Passed
            && current_time >= self.time_executable
    }
}

/// Vote record - tracks individual votes
#[account]
pub struct VoteRecord {
    /// Proposal being voted on
    pub proposal: Pubkey,

    /// Voter
    pub voter: Pubkey,

    /// Vote choice (true = for, false = against)
    pub choice: bool,

    /// Voting power used (xHYPER at time of vote)
    pub voting_power: u128,

    /// Timestamp
    pub time_voted: i64,

    /// PDA bump
    pub bump: u8,
}

impl VoteRecord {
    pub const LEN: usize = 8 + 32 + 32 + 1 + 16 + 8 + 1;
}

/// Proposal types
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Debug)]
pub enum ProposalType {
    /// Update market parameters (fees, timeouts, etc.)
    MarketParameter,

    /// Update staking parameters (durations, multipliers)
    StakingParameter,

    /// Treasury allocation
    TreasurySpend,

    /// Protocol upgrade
    ProtocolUpgrade,

    /// General text proposal (no execution)
    Text,
}

/// Proposal status
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum ProposalStatus {
    /// Active voting period
    Active,

    /// Passed, awaiting execution delay
    Passed,

    /// Executed successfully
    Executed,

    /// Rejected (didn't pass vote)
    Rejected,

    /// Cancelled by proposer
    Cancelled,

    /// Expired (not executed in time)
    Expired,
}
