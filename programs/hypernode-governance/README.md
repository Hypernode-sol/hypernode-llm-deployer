# Hypernode Governance Program

DAO governance with xHYPER-weighted voting for protocol parameters.

## Overview

The Governance Program enables decentralized decision-making through on-chain proposals and voting. Token holders with xHYPER can create proposals, vote, and execute protocol changes.

## Features

- **xHYPER-Weighted Voting**: Voting power based on staked xHYPER
- **Multiple Proposal Types**: Market params, staking params, treasury, upgrades
- **Quorum Requirements**: 10% participation minimum
- **Execution Delay**: 1-day timelock after passing
- **Proposal Threshold**: 1M xHYPER required to create proposals

## Instructions

### `create_proposal`
Create a new governance proposal.

**Accounts**:
- `proposal` - New proposal PDA
- `stake_account` - Proposer's stake (must have ≥1M xHYPER)
- `proposer` - Proposal creator

**Parameters**:
- `title` - Proposal title (max 100 chars)
- `description` - IPFS CID of full description
- `proposal_type` - Type of proposal (0-4)
- `execution_data` - Serialized instruction data (max 256 bytes)

### `vote`
Vote on an active proposal.

**Accounts**:
- `proposal` - Proposal being voted on
- `vote_record` - New vote record
- `stake_account` - Voter's stake (determines voting power)
- `voter` - User casting vote

**Parameters**:
- `vote_choice` - true = FOR, false = AGAINST

### `execute_proposal`
Execute a passed proposal after delay.

**Accounts**:
- `proposal` - Passed proposal (status = Passed)
- `executor` - Anyone can execute

### `cancel_proposal`
Cancel proposal (only proposer, before voting ends).

**Accounts**:
- `proposal` - Active proposal
- `proposer` - Original proposer

## Proposal Types

| Type | Value | Description |
|------|-------|-------------|
| MarketParameter | 0 | Update marketplace fees, timeouts, minimums |
| StakingParameter | 1 | Update staking durations, multipliers |
| TreasurySpend | 2 | Allocate treasury funds |
| ProtocolUpgrade | 3 | Upgrade program logic |
| Text | 4 | Non-executable governance signaling |

## Voting Process

1. **Creation** (Day 0)
   - Proposer creates proposal with 1M+ xHYPER
   - 3-day voting period begins

2. **Voting** (Days 0-3)
   - Token holders vote weighted by xHYPER
   - Votes tallied in real-time

3. **Quorum Check** (Day 3)
   - Must have ≥10% total xHYPER participating
   - Must have >50% votes in favor

4. **Execution Delay** (Day 4)
   - 1-day timelock before execution
   - Safety buffer for last-minute issues

5. **Execution** (Day 4+)
   - Anyone can execute passed proposal
   - Changes applied on-chain

## Example Proposal

```typescript
// Create proposal to reduce market fees
const proposal = await governanceProgram.methods
  .createProposal(
    "Reduce market fees to 0.5%",
    ipfsCid, // Full description on IPFS
    0, // MarketParameter type
    executionData // Encoded instruction
  )
  .accounts({
    proposal: proposalPda,
    stakeAccount: myStakeAccount,
    proposer: wallet.publicKey,
    stakingProgram,
    systemProgram,
  })
  .rpc();
```

## Governance Parameters

- **Proposal Threshold**: 1,000,000 xHYPER
- **Quorum**: 10% of total xHYPER
- **Voting Period**: 3 days
- **Execution Delay**: 1 day
- **Title Limit**: 100 characters
- **Execution Data Limit**: 256 bytes

## Security

- Timelock prevents instant malicious changes
- Quorum ensures broad participation
- xHYPER weighting aligns incentives with long-term holders
- Proposal threshold prevents spam

## Integration

```rust
use hypernode_governance::program::HypernodeGovernance;
use hypernode_governance::{Proposal, VoteRecord, ProposalType, ProposalStatus};
```
