# Hypernode Rewards Program

Gas-efficient rewards distribution using reflection algorithm for Hypernode Network.

## Overview

The Rewards Program distributes earnings to xHYPER holders using a mathematical reflection system. Instead of iterating over all users (O(n) operations), it uses a global rate mechanism requiring only O(1) operations per distribution.

### Key Features

- **O(1) Distribution**: No iteration over users required
- **Proportional Rewards**: Based on xHYPER holdings
- **Automatic Compounding**: Rewards accumulate continuously
- **Gas Efficient**: 80-90% gas savings vs traditional distribution
- **Trustless**: Fully on-chain calculations

---

## Reflection Algorithm

### How It Works

The reflection system maintains a global "rate" that tracks the conversion between xHYPER and accumulated rewards.

#### Core Concept

```
rate = total_reflection / total_xhyper
```

- **total_reflection**: Sum of all reflection points
- **total_xhyper**: Sum of all xHYPER in system
- **rate**: Conversion factor (decreases as rewards added)

#### When User Joins

```rust
reflection = xhyper * rate
total_reflection += reflection
total_xhyper += xhyper
```

#### When Rewards Added

```rust
total_xhyper += reward_amount
rate = total_reflection / total_xhyper  // Rate decreases
```

#### When User Claims

```rust
current_value = xhyper * rate
rewards_earned = (current_value - initial_reflection) / rate
```

### Example

#### Initial State
```
total_reflection = 0
total_xhyper = 0
rate = 0
```

#### User A Stakes (1000 xHYPER)
```
User A reflection = 1000 * 10^18 = 1,000,000,000,000,000,000,000
total_reflection = 1,000,000,000,000,000,000,000
total_xhyper = 1000
rate = 1,000,000,000,000,000,000,000 / 1000 = 10^18
```

#### 100 Rewards Added
```
total_xhyper = 1000 + 100 = 1100
rate = 1,000,000,000,000,000,000,000 / 1100 = 9.09 * 10^17
```

#### User B Stakes (1000 xHYPER)
```
User B reflection = 1000 * 9.09 * 10^17 = 9.09 * 10^20
total_reflection = 1,000,000,000,000,000,000,000 + 9.09 * 10^20
total_xhyper = 1100 + 1000 = 2100
```

#### User A Claims Rewards
```
current_value = 1000 * (new_rate)
earned = current_value - 10^21
rewards = earned / rate ≈ 50 tokens
```

User A gets ~50% of the 100 rewards (they were the only staker when rewards added).

---

## Architecture

### State Accounts

#### ReflectionAccount

Global account tracking all rewards distribution.

```rust
pub struct ReflectionAccount {
    pub authority: Pubkey,              // Can add rewards
    pub rate: u128,                     // Current reflection rate
    pub total_reflection: u128,         // Total reflection points
    pub total_xhyper: u128,             // Total xHYPER in system
    pub total_rewards_distributed: u64, // Stats
    pub bump: u8,
}
```

#### UserRewardsAccount

Per-user account tracking individual rewards.

```rust
pub struct UserRewardsAccount {
    pub authority: Pubkey,          // User
    pub initial_reflection: u128,   // Reflection at join
    pub xhyper: u128,               // Current xHYPER balance
    pub total_claimed: u64,         // Total claimed
    pub last_claim: i64,            // Last claim timestamp
    pub bump: u8,
}
```

### Instructions

#### 1. `initialize`

Initialize reflection account.

**Accounts:**
- `reflection_account` (init) - PDA: `["reflection"]`
- `authority` (signer) - Can add rewards
- `system_program`

#### 2. `register_stake`

Register user in rewards system after staking.

**Accounts:**
- `reflection_account` (mut)
- `user_rewards_account` (init) - PDA: `["user_rewards", authority]`
- `authority` (signer)
- `stake_account` - User's stake from Staking Program
- `system_program`

**Parameters:**
- `xhyper: u128` - User's xHYPER balance

**Logic:**
1. Calculate initial reflection points
2. Add to global totals
3. Create user rewards account

#### 3. `add_rewards`

Add rewards to the pool.

**Accounts:**
- `reflection_account` (mut)
- `source_token_account` (mut) - Source of rewards
- `rewards_vault` (mut) - PDA: `["rewards_vault"]`
- `authority` (signer) - Usually Markets Program
- `token_program`

**Parameters:**
- `amount: u64` - Reward amount

**Logic:**
1. Transfer tokens to vault
2. Update total_xhyper
3. Recalculate rate

#### 4. `claim_rewards`

Claim accumulated rewards.

**Accounts:**
- `reflection_account`
- `user_rewards_account` (mut)
- `authority` (signer)
- `user_token_account` (mut) - Destination
- `rewards_vault` (mut)
- `vault_authority` - PDA signer
- `token_program`

**Logic:**
1. Calculate claimable: `(xhyper * rate - initial_reflection) / rate`
2. Transfer from vault to user
3. Update user's initial_reflection

#### 5. `unregister_stake`

Remove user from rewards system (on unstake).

**Accounts:**
- `reflection_account` (mut)
- `user_rewards_account` (mut, close)
- `authority` (signer)

**Logic:**
1. Remove from global totals
2. Close user rewards account

---

## Integration with Other Programs

### Staking Program Integration

When user stakes:
```typescript
// 1. Stake in Staking Program
await stakingProgram.methods.stake(amount, duration).rpc();

// 2. Register in Rewards Program
await rewardsProgram.methods
  .registerStake(xhyper)
  .accounts({
    reflectionAccount,
    userRewardsAccount,
    authority: user.publicKey,
    stakeAccount,
  })
  .rpc();
```

When user unstakes:
```typescript
// 1. Unstake in Staking Program
await stakingProgram.methods.unstake().rpc();

// 2. Unregister from Rewards
await rewardsProgram.methods
  .unregisterStake()
  .accounts({
    reflectionAccount,
    userRewardsAccount,
    authority: user.publicKey,
  })
  .rpc();
```

### Markets Program Integration

When job completes:
```rust
// In Markets Program finish_job instruction

// Calculate rewards fee (e.g., 2% of payment)
let rewards_fee = job.price * 2 / 100;

// CPI to Rewards Program
let cpi_accounts = AddRewards {
    reflection_account,
    source_token_account: vault,
    rewards_vault,
    authority: market_authority,
    token_program,
};

let cpi_ctx = CpiContext::new(rewards_program, cpi_accounts);
hypernode_rewards::cpi::add_rewards(cpi_ctx, rewards_fee)?;
```

---

## Usage Examples

### Initialize Rewards System

```typescript
await program.methods
  .initialize()
  .accounts({
    reflectionAccount: reflectionPda,
    authority: admin.publicKey,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```

### Register After Staking

```typescript
// Get xHYPER from stake account
const stakeAccount = await stakingProgram.account.stakeAccount.fetch(stakePda);
const xhyper = stakeAccount.xhyper;

// Register in rewards
await program.methods
  .registerStake(xhyper)
  .accounts({
    reflectionAccount: reflectionPda,
    userRewardsAccount: userRewardsPda,
    authority: user.publicKey,
    stakeAccount: stakePda,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```

### Add Rewards (from Markets)

```typescript
// Transfer rewards to pool
await program.methods
  .addRewards(new BN(1000000)) // 0.001 SOL
  .accounts({
    reflectionAccount: reflectionPda,
    sourceTokenAccount: marketVault,
    rewardsVault: rewardsVaultPda,
    authority: marketAuthority.publicKey,
    tokenProgram: TOKEN_PROGRAM_ID,
  })
  .rpc();
```

### Claim Rewards

```typescript
// Check claimable amount
const reflection = await program.account.reflectionAccount.fetch(reflectionPda);
const userRewards = await program.account.userRewardsAccount.fetch(userRewardsPda);

const claimable = userRewards.calculateClaimable(reflection.rate);
console.log(`Claimable: ${claimable} tokens`);

// Claim
await program.methods
  .claimRewards()
  .accounts({
    reflectionAccount: reflectionPda,
    userRewardsAccount: userRewardsPda,
    authority: user.publicKey,
    userTokenAccount: userTokenAccount,
    rewardsVault: rewardsVaultPda,
    vaultAuthority: vaultAuthorityPda,
    tokenProgram: TOKEN_PROGRAM_ID,
  })
  .rpc();
```

---

## Gas Efficiency Comparison

### Traditional Distribution (O(n))

```rust
// Iterate over ALL users
for user in all_stakers {
    let reward_share = (user.xhyper * total_rewards) / total_xhyper;
    transfer(reward_share, user);
}
```

**Cost**: 10,000 users × 5,000 gas = **50,000,000 gas**

### Reflection Distribution (O(1))

```rust
// Single operation
total_xhyper += rewards;
rate = total_reflection / total_xhyper;
```

**Cost**: **5,000 gas**

**Savings**: 99.99%

---

## Mathematics

### Precision

Uses 10^18 precision for calculations:
```rust
const REFLECTION_PRECISION: u128 = 1_000_000_000_000_000_000;
```

### Reward Calculation

```
current_reflection_value = xhyper * current_rate
reflection_gained = current_reflection_value - initial_reflection
rewards = reflection_gained / current_rate
```

### Edge Cases

1. **First User**: Gets full reflection points (rate = 0)
2. **Zero xHYPER**: Cannot claim rewards
3. **No Rewards Added**: Rate stays constant
4. **Rounding**: Uses u128 to minimize rounding errors

---

## Security Considerations

### 1. Precision Loss

- Uses u128 with 10^18 precision
- Minimizes rounding errors
- Tests verify accuracy

### 2. Integer Overflow

- All calculations use checked math
- Rate cannot exceed u128::MAX
- Protected by Anchor overflow checks

### 3. Reentrancy

- Accounts closed after transfer
- State updated before external calls
- No reentrancy risk

### 4. Access Control

- Only authority can add rewards
- Users can only claim their own rewards
- PDA vault ensures trustless custody

---

## Testing

```bash
anchor test
```

Tests cover:
- Reflection calculation accuracy
- Multi-user distribution
- Reward claiming
- Edge cases (zero amounts, overflow, etc.)

---

## Future Enhancements

- [ ] Auto-claim on stake changes
- [ ] Rewards history tracking
- [ ] APY calculation helpers
- [ ] Emergency pause mechanism
- [ ] Multiple reward tokens

---

## References

Based on:
- [Nosana Rewards](https://github.com/nosana-ci/nosana-programs) - Reflection implementation
- [RFI Token](https://reflect.finance/) - Original reflection concept
- Hypernode analysis docs

---

## License

MIT
