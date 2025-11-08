# Hypernode Markets Program

GPU marketplace program for Hypernode Network on Solana.

## Overview

The Markets Program implements a dual-queue matching system for GPU job distribution with escrow payments. Based on proven patterns from Nosana.

### Key Features

- **Dual Queue Matching**: Jobs and nodes can queue independently for instant matching
- **Escrow Payments**: Trustless PDA vaults hold payments until job completion
- **IPFS Integration**: Job definitions and results stored on IPFS
- **Flexible Requirements**: Specify GPU VRAM, type, and other requirements
- **Timeout Protection**: Automatic timeout detection for stalled jobs

## Architecture

### State Accounts

#### MarketAccount
```rust
pub struct MarketAccount {
    pub authority: Pubkey,
    pub job_price: u64,
    pub job_timeout: i64,
    pub node_xhyper_minimum: u128,
    pub queue: Vec<Pubkey>,
    pub queue_type: u8,
    pub vault: Pubkey,
    pub vault_bump: u8,
    pub total_jobs: u64,
    pub total_nodes: u64,
}
```

#### JobAccount
```rust
pub struct JobAccount {
    pub id: Pubkey,
    pub market: Pubkey,
    pub client: Pubkey,
    pub node: Option<Pubkey>,
    pub ipfs_job: [u8; 32],
    pub ipfs_result: [u8; 32],
    pub price: u64,
    pub timeout: i64,
    pub state: JobState,
    pub time_created: i64,
    pub time_start: i64,
    pub time_end: i64,
    pub min_vram: u8,
    pub gpu_type: u8,
    pub bump: u8,
}
```

### Instructions

1. **create_market** - Create a new GPU marketplace
2. **create_job** - Client creates a job and pays into escrow
3. **list_node** - Node registers to wait for jobs
4. **work_job** - Node claims a job from the queue
5. **finish_job** - Node completes job and receives payment

## Dual Queue Matching

The system uses a smart queue that can hold either jobs or nodes:

### Scenario 1: Jobs Waiting
1. Client calls `create_job` → job added to queue (queue_type = JOBS)
2. Node calls `work_job` → job popped from queue and assigned to node

### Scenario 2: Nodes Waiting
1. Node calls `list_node` → node added to queue (queue_type = NODES)
2. Client calls `create_job` → job immediately matched with queued node

This ensures **< 2 minute deployment times** as jobs are matched instantly when nodes are available.

## Escrow Flow

```
Client → create_job → Pay to Vault (PDA)
                         ↓
                    Job Execution
                         ↓
Node → finish_job → Vault releases payment to Node
```

The vault is a PDA (Program Derived Address) controlled by the program, ensuring trustless escrow.

## Usage Example

### TypeScript SDK

```typescript
import * as anchor from "@coral-xyz/anchor";

// Create a market
await program.methods
  .createMarket(
    new anchor.BN(1_000_000_000), // 1 SOL per job
    new anchor.BN(3600),           // 1 hour timeout
    new anchor.BN(100_000_000)     // 100 xHYPER minimum
  )
  .accounts({
    market: marketKeypair.publicKey,
    authority: wallet.publicKey,
    vault: vaultPda,
    systemProgram: SystemProgram.programId,
  })
  .signers([marketKeypair])
  .rpc();

// Create a job
await program.methods
  .createJob(
    jobId,
    ipfsJobCid,  // 32-byte IPFS CID
    8,           // 8GB VRAM
    1            // NVIDIA GPU
  )
  .accounts({
    job: jobPda,
    market: market.publicKey,
    client: client.publicKey,
    vault: vaultPda,
    systemProgram: SystemProgram.programId,
  })
  .signers([client])
  .rpc();

// Node claims job
await program.methods
  .workJob()
  .accounts({
    job: jobPda,
    market: market.publicKey,
    node: node.publicKey,
    systemProgram: SystemProgram.programId,
  })
  .signers([node])
  .rpc();

// Node finishes job
await program.methods
  .finishJob(ipfsResultCid)
  .accounts({
    job: jobPda,
    market: market.publicKey,
    node: node.publicKey,
    nodeAccount: node.publicKey,
    vault: vaultPda,
    systemProgram: SystemProgram.programId,
  })
  .signers([node])
  .rpc();
```

## Testing

```bash
# Install dependencies
npm install

# Build programs
anchor build

# Run tests
anchor test
```

## Security Considerations

1. **Escrow Safety**: Vault is a PDA, no private key exists
2. **State Validation**: All state transitions validated (Queued → Running → Completed)
3. **Authorization**: Only assigned node can finish a job
4. **Timeout Protection**: Jobs can be timed out if node is unresponsive
5. **Queue Limits**: Maximum 314 items to fit in 10KB account

## Next Steps

- [ ] Implement timeout handler instruction
- [ ] Add slashing for malicious nodes
- [ ] Integrate with hypernode-staking program for xHYPER verification
- [ ] Add support for partial payments/checkpoints
- [ ] Implement reputation system

## References

Based on:
- [Nosana Markets Program](https://github.com/nosana-ci/nosana-programs)
- Hypernode analysis: `C:\Users\optim\OneDrive\Documentos\GitHub\hypernode-analysis\docs\`

## License

MIT
