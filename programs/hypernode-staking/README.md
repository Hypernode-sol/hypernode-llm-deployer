# Hypernode Staking Program

Time-locked staking with xHYPER multiplier system for Hypernode Network.

## Overview

The Staking Program allows users to stake HYPER tokens and receive xHYPER based on their staking duration. Longer lock periods provide higher multipliers, incentivizing long-term commitment to the network.

### Key Features

- **xHYPER Multiplier**: 1x to 4x based on staking duration
- **Time-Locked Staking**: Lock tokens for 2 weeks to 1 year
- **Cooldown Period**: Unstake cooldown equals staking duration
- **Trustless**: Fully on-chain, no admin controls

---

## xHYPER Multiplier System

### Multiplier Formula

```rust
xHYPER = (duration * PRECISION / XHYPER_DIV + PRECISION) * amount / PRECISION
```

Where:
- `PRECISION` = 10^15
- `XHYPER_DIV` = (4 * DURATION_MAX) / 12
- `DURATION_MAX` = 365 days

### Multiplier Examples

| Lock Duration | Multiplier | Example (1000 HYPER) |
|---------------|------------|----------------------|
| 2 weeks (min) | 1.0x       | 1,000 xHYPER        |
| 1 month       | 1.25x      | 1,250 xHYPER        |
| 3 months      | 1.75x      | 1,750 xHYPER        |
| 6 months      | 2.5x       | 2,500 xHYPER        |
| 1 year (max)  | 4.0x       | 4,000 xHYPER        |

### Why xHYPER?

xHYPER represents **voting power** and **rewards weight** in the Hypernode ecosystem:

1. **Node Requirements**: Markets can require minimum xHYPER for node participation
2. **Rewards Distribution**: Higher xHYPER = higher share of network rewards
3. **Governance**: xHYPER used for DAO voting (future)
4. **Slashing Protection**: Higher xHYPER = higher penalties for malicious behavior

---

## Architecture

### State Accounts

#### StakeAccount

```rust
pub struct StakeAccount {
    pub authority: Pubkey,      // Stake owner
    pub amount: u64,             // HYPER tokens staked
    pub xhyper: u128,            // Calculated xHYPER balance
    pub time_stake: i64,         // Stake creation timestamp
    pub time_unstake: i64,       // Unstake initiation (0 if active)
    pub duration: i64,           // Lock duration in seconds
    pub bump: u8,                // PDA bump seed
}
```

### Instructions

#### 1. `stake`

Stake HYPER tokens for specified duration.

**Accounts:**
- `stake_account` (init) - PDA: `["stake", authority]`
- `authority` (signer) - User staking tokens
- `user_token_account` (mut) - Source of HYPER tokens
- `vault` (mut) - Staking vault PDA
- `token_program`
- `system_program`

**Parameters:**
- `amount: u64` - Amount of HYPER to stake
- `duration: i64` - Lock duration in seconds (min: 2 weeks)

**Logic:**
1. Validate duration >= 2 weeks
2. Calculate xHYPER with multiplier
3. Transfer HYPER to vault
4. Create stake account

#### 2. `unstake`

Initiate unstake process (starts cooldown).

**Accounts:**
- `stake_account` (mut) - User's stake PDA
- `authority` (signer) - Stake owner

**Logic:**
1. Verify stake is active
2. Mark `time_unstake` = current timestamp
3. Set `xhyper` = 0 (burned immediately)
4. Start cooldown period

#### 3. `withdraw`

Withdraw tokens after cooldown.

**Accounts:**
- `stake_account` (mut, close) - User's stake PDA
- `authority` (signer, mut) - Stake owner (receives rent)
- `user_token_account` (mut) - Destination for tokens
- `vault` (mut) - Staking vault
- `vault_authority` - Vault authority PDA
- `token_program`

**Logic:**
1. Verify cooldown has passed (`current_time >= time_unstake + duration`)
2. Transfer tokens from vault to user
3. Close stake account (refund rent)

---

## Staking Flow

### 1. Stake Tokens

```
User → stake(1000 HYPER, 365 days)
  ↓
Create StakeAccount
  ↓
Calculate xHYPER = 4000 (4x multiplier)
  ↓
Transfer HYPER to vault
```

### 2. Wait (Earn Rewards)

```
While staked:
- xHYPER balance: 4000
- Can participate in markets
- Earning rewards
- Cannot withdraw
```

### 3. Unstake (Start Cooldown)

```
User → unstake()
  ↓
Mark time_unstake = now
  ↓
Burn xHYPER (set to 0)
  ↓
Start 365-day cooldown
```

### 4. Withdraw (After Cooldown)

```
Wait 365 days...
  ↓
User → withdraw()
  ↓
Transfer 1000 HYPER back
  ↓
Close stake account
```

---

## Usage Examples

### Stake with Maximum Multiplier (1 year)

```typescript
import * as anchor from "@coral-xyz/anchor";

// Stake 1000 HYPER for 1 year (365 days)
await program.methods
  .stake(
    new anchor.BN(1000 * 1e9), // 1000 HYPER
    new anchor.BN(365 * 86400)  // 1 year in seconds
  )
  .accounts({
    stakeAccount: stakeAccountPda,
    authority: wallet.publicKey,
    userTokenAccount: userTokenAccount,
    vault: vaultPda,
    tokenProgram: TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
  })
  .rpc();

// Result: 4000 xHYPER (4x multiplier)
```

### Stake with Minimum Multiplier (2 weeks)

```typescript
// Stake 1000 HYPER for 2 weeks (minimum)
await program.methods
  .stake(
    new anchor.BN(1000 * 1e9),
    new anchor.BN(14 * 86400)  // 2 weeks
  )
  .accounts({...})
  .rpc();

// Result: 1000 xHYPER (1x multiplier)
```

### Unstake

```typescript
await program.methods
  .unstake()
  .accounts({
    stakeAccount: stakeAccountPda,
    authority: wallet.publicKey,
  })
  .rpc();

// xHYPER immediately burned
// Cooldown period starts
```

### Withdraw After Cooldown

```typescript
// Check if cooldown has passed
const stakeAccount = await program.account.stakeAccount.fetch(stakeAccountPda);
const currentTime = Math.floor(Date.now() / 1000);

if (currentTime >= stakeAccount.timeUnstake + stakeAccount.duration) {
  await program.methods
    .withdraw()
    .accounts({
      stakeAccount: stakeAccountPda,
      authority: wallet.publicKey,
      userTokenAccount: userTokenAccount,
      vault: vaultPda,
      vaultAuthority: vaultAuthorityPda,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();
}
```

---

## Integration with Markets Program

Markets can require minimum xHYPER for node participation:

```rust
// In Markets Program
pub struct MarketAccount {
    pub node_xhyper_minimum: u128,  // Minimum xHYPER required
    // ...
}

// When node tries to list
pub fn list_node(ctx: Context<ListNode>) -> Result<()> {
    // Fetch node's stake account
    let stake_account = fetch_stake_account(ctx.accounts.node.key())?;

    // Verify sufficient xHYPER
    require!(
        stake_account.xhyper >= ctx.accounts.market.node_xhyper_minimum,
        MarketError::InsufficientStake
    );

    // Allow node to register
    // ...
}
```

---

## Security Considerations

### 1. Cooldown Period

The cooldown period prevents:
- Flash staking attacks
- Rapid stake/unstake to manipulate rewards
- Gaming the multiplier system

### 2. xHYPER Burn on Unstake

When unstaking:
- xHYPER goes to 0 immediately
- Prevents voting/rewards during cooldown
- Ensures accurate reward calculations

### 3. PDA Vaults

- Tokens held in program-controlled PDAs
- No admin keys
- Trustless withdrawals

### 4. Time Locks

- Minimum 2 weeks prevents spam
- Maximum 1 year caps multiplier
- Durations validated on-chain

---

## Constants

```rust
XHYPER_PRECISION = 10^15           // Calculation precision
DURATION_MIN = 14 * 86400          // 2 weeks (1,209,600 seconds)
DURATION_MAX = 365 * 86400         // 1 year (31,536,000 seconds)
XHYPER_DIV = (4 * DURATION_MAX) / 12  // Multiplier divisor
```

---

## Future Enhancements

- [ ] Auto-compound rewards
- [ ] Governance integration (xHYPER voting)
- [ ] Stake migration (change duration)
- [ ] Multiple stakes per user
- [ ] Delegation system

---

## Testing

```bash
anchor test
```

Tests cover:
- xHYPER calculation for all durations
- Stake/unstake/withdraw flow
- Cooldown period enforcement
- Edge cases (min/max duration, zero amounts, etc.)

---

## License

MIT

---

Based on [Nosana Staking](https://github.com/nosana-ci/nosana-programs) with improvements for Hypernode Network.
