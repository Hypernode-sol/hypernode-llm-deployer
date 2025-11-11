use anchor_lang::prelude::*;

pub mod instructions;
pub mod state;

use instructions::*;
use state::*;

declare_id!("5X4cihCXyDe23U4nzv6uobwp5CHLCPaye5bQ2PNB7srE");

#[program]
pub mod hypernode_nodes {
    use super::*;

    /// Register a new node with hardware specifications
    pub fn register(
        ctx: Context<Register>,
        node_id: String,
        architecture: Architecture,
        country: Country,
        cpu_cores: u16,
        gpu_cores: u16,
        ram_gb: u16,
        iops: u32,
        storage_gb: u32,
        endpoint: String,
    ) -> Result<()> {
        instructions::register::register(
            ctx,
            node_id,
            architecture,
            country,
            cpu_cores,
            gpu_cores,
            ram_gb,
            iops,
            storage_gb,
            endpoint,
        )
    }

    /// Update node hardware specifications
    pub fn update(
        ctx: Context<Update>,
        cpu_cores: u16,
        gpu_cores: u16,
        ram_gb: u16,
        iops: u32,
        storage_gb: u32,
        endpoint: String,
    ) -> Result<()> {
        instructions::update::update(
            ctx,
            cpu_cores,
            gpu_cores,
            ram_gb,
            iops,
            storage_gb,
            endpoint,
        )
    }

    /// Send heartbeat to mark node as active
    pub fn heartbeat(ctx: Context<Heartbeat>) -> Result<()> {
        instructions::heartbeat::heartbeat(ctx)
    }

    /// Check node health (permissionless - Checker system)
    pub fn check_health(
        ctx: Context<CheckHealth>,
        passed: bool,
        message: String,
    ) -> Result<()> {
        instructions::check_health::check_health(ctx, passed, message)
    }
}
