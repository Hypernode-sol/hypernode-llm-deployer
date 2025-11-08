use anchor_lang::prelude::*;

/// HYPER Token Configuration
/// Mint Address: 92s9qna3djkMncZzkacyNQ38UKnNXZFh4Jgqe3Cmpump
/// Total Supply: 1,000,000,000 HYPER
/// Decimals: 6
pub const HYPER_DECIMALS: u8 = 6;

/// Market account - manages GPU job marketplace
/// Based on Nosana's MarketAccount pattern with dual queue system
#[account]
pub struct MarketAccount {
    /// Authority that can update market parameters
    pub authority: Pubkey,

    /// Minimum price per job in lamports
    pub job_price: u64,

    /// Job timeout in seconds (default: 3600 = 1 hour)
    pub job_timeout: i64,

    /// Minimum xHYPER stake required for nodes
    pub node_xhyper_minimum: u128,

    /// Queue type: 0=Empty, 1=Jobs, 2=Nodes
    pub queue_type: u8,

    /// Vault PDA bump seed
    pub vault_bump: u8,

    /// Total jobs processed
    pub total_jobs: u64,

    /// Total nodes registered
    pub total_nodes: u64,

    /// Vault PDA for escrow payments
    pub vault: Pubkey,

    /// Queue of job/node pubkeys (dynamic vector)
    pub queue: Vec<Pubkey>,
}

impl MarketAccount {
    /// Maximum queue size
    pub const MAX_QUEUE_SIZE: usize = 314;

    /// Queue types
    pub const QUEUE_TYPE_EMPTY: u8 = 0;
    pub const QUEUE_TYPE_JOBS: u8 = 1;
    pub const QUEUE_TYPE_NODES: u8 = 2;

    /// Get current queue length
    #[inline(always)]
    pub fn queue_len(&self) -> usize {
        self.queue.len()
    }

    /// Add item to queue
    pub fn queue_push(&mut self, pubkey: Pubkey) -> Result<()> {
        require!(
            self.queue.len() < Self::MAX_QUEUE_SIZE,
            crate::errors::MarketError::QueueFull
        );
        self.queue.push(pubkey);
        Ok(())
    }

    /// Remove first item from queue
    pub fn queue_pop(&mut self) -> Option<Pubkey> {
        if self.queue.is_empty() {
            None
        } else {
            Some(self.queue.remove(0))
        }
    }

    /// Check if queue is empty
    #[inline(always)]
    pub fn queue_is_empty(&self) -> bool {
        self.queue.is_empty()
    }

    /// Remove specific item from queue
    pub fn queue_remove(&mut self, pubkey: Pubkey) -> bool {
        if let Some(pos) = self.queue.iter().position(|&x| x == pubkey) {
            self.queue.remove(pos);
            true
        } else {
            false
        }
    }
}
