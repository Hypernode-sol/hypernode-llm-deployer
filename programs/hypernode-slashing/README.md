# Hypernode Slashing Program

Penalizes malicious nodes by slashing their staked HYPER tokens.

## Overview

The Slashing Program provides a decentralized mechanism to report and punish malicious behavior on the Hypernode Network. Nodes can be slashed for fraud, extended downtime, or repeated failures.

## Features

- **Fraud Reporting**: Community-driven fraud detection with IPFS evidence
- **Validator Consensus**: Minimum 3 validators must confirm before slash
- **Appeal Period**: 7-day window for nodes to appeal
- **Partial Slashing**: Up to 50% of stake can be slashed
- **Transparent Records**: All slashes recorded on-chain

## Instructions

### `report_fraud`
Report fraudulent behavior by a node.

**Accounts**:
- `fraud_report` - PDA to store report
- `node` - Node being reported
- `reporter` - User submitting report

**Parameters**:
- `evidence_cid` - IPFS CID of evidence (logs, screenshots)

### `slash_node`
Execute slash after validator confirmation and appeal period.

**Accounts**:
- `fraud_report` - Confirmed fraud report
- `slash_record` - New slash record
- `stake_account` - Node's stake account (from Staking Program)
- `staking_vault` - Vault holding staked tokens
- `treasury` - Treasury to receive slashed funds
- `executor` - Authority executing slash

**Parameters**:
- `slash_amount` - Amount to slash (max 50% of stake)

## Fraud Types

- **InvalidResults**: Submitted fake or incorrect job results
- **ProlongedDowntime**: Offline for >48 hours
- **RepeatedFailures**: Multiple consecutive job failures
- **DoubleSpend**: Attempted to claim payment twice
- **Other**: Miscellaneous malicious behavior

## Appeal Process

1. Fraud reported → `Pending` status
2. 3+ validators confirm → `Confirmed` status
3. 7-day appeal period begins
4. If no appeal → Slash executed → `Executed` status

## Security

- Requires minimum 3 validators to confirm
- 7-day appeal period protects against false reports
- Maximum 50% slash prevents complete fund loss
- All evidence stored on IPFS for transparency

## Integration

Cross-program calls to Staking Program to access stake accounts and execute slashes.

```rust
use hypernode_slashing::program::HypernodeSlashing;
use hypernode_slashing::{FraudReport, SlashRecord};
```
