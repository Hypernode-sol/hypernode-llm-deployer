# hypernode-facilitator

**On-chain payment facilitator for the x402 protocol**

This Solana program provides trustless payment verification and escrow management for the Hypernode x402 payment protocol.

---

## Overview

The facilitator enables:
- **On-chain payment intents** with token escrow
- **Cryptographic verification** of payment commitments
- **Automatic refunds** for expired intents
- **Secure claims** for node providers after job completion

---

## Features

✅ **Trustless Escrow**: Tokens locked on-chain until payment is claimed or refunded
✅ **Time-Based Expiration**: Automatic refund eligibility after expiration
✅ **SPL Token Support**: Works with any SPL token (HYPER, SOL, USDC, etc.)
✅ **PDA-Based Security**: All accounts derived from deterministic seeds

---

## Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Client    │         │ Facilitator  │         │ Node Provider│
│  (Payer)    │         │   Program    │         │ (Recipient)  │
└──────┬──────┘         └──────┬───────┘         └──────┬──────┘
       │                       │                        │
       │  1. create_intent     │                        │
       ├──────────────────────>│                        │
       │    (lock tokens)      │                        │
       │                       │                        │
       │  2. verify_payment    │                        │
       ├──────────────────────>│                        │
       │    (sign intent)      │                        │
       │                       │                        │
       │                       │  3. claim_payment      │
       │                       │<───────────────────────┤
       │                       │   (after job done)     │
       │                       │                        │
       │  4. refund_payment    │                        │
       ├──────────────────────>│                        │
       │   (if expired)        │                        │
```

---

## Instructions

### 1. create_intent

Creates a payment intent and locks tokens in escrow.

**Parameters:**
- `id`: Unique 16-byte identifier (UUID v4)
- `amount`: Payment amount in lamports/smallest unit
- `job_id`: Optional 32-byte job identifier
- `expiration`: Unix timestamp when intent expires

**Accounts:**
- `payment_intent`: PDA to create (seeds: `["payment_intent", id]`)
- `escrow`: Token account for escrowed funds
- `payer`: Wallet paying for the intent
- `payer_token_account`: Source of tokens

**Example:**
```typescript
await program.methods
  .createIntent(
    uuidToBytes(intentId),
    new BN(1000000), // 0.001 token
    jobIdBytes,
    new BN(Date.now() / 1000 + 300) // Expires in 5 minutes
  )
  .accounts({
    paymentIntent,
    escrow,
    payer: payerWallet.publicKey,
    payerTokenAccount,
    tokenMint,
  })
  .rpc();
```

---

### 2. verify_payment

Verifies payment by storing transaction signature.

**Parameters:**
- `signature`: 64-byte transaction signature

**Accounts:**
- `payment_intent`: Intent to verify
- `payer`: Original payer (must match)

**Example:**
```typescript
await program.methods
  .verifyPayment(signatureBytes)
  .accounts({
    paymentIntent,
    payer: payerWallet.publicKey,
  })
  .rpc();
```

---

### 3. claim_payment

Transfers escrowed tokens to recipient after job completion.

**Accounts:**
- `payment_intent`: Verified intent to claim
- `escrow`: Escrow holding tokens
- `recipient`: Node provider claiming payment
- `recipient_token_account`: Destination for tokens

**Example:**
```typescript
await program.methods
  .claimPayment()
  .accounts({
    paymentIntent,
    escrow,
    recipient: nodeWallet.publicKey,
    recipientTokenAccount,
  })
  .rpc();
```

---

### 4. refund_payment

Refunds expired payment intents back to payer.

**Accounts:**
- `payment_intent`: Expired intent to refund
- `escrow`: Escrow holding tokens
- `payer`: Original payer
- `payer_token_account`: Refund destination

**Example:**
```typescript
await program.methods
  .refundPayment()
  .accounts({
    paymentIntent,
    escrow,
    payer: payerWallet.publicKey,
    payerTokenAccount,
  })
  .rpc();
```

---

## State

### PaymentIntent

```rust
pub struct PaymentIntent {
    pub id: [u8; 16],           // UUID v4
    pub payer: Pubkey,          // Wallet address
    pub amount: u64,            // Payment amount
    pub job_id: [u8; 32],       // Optional job ID
    pub created_at: i64,        // Creation timestamp
    pub expires_at: i64,        // Expiration timestamp
    pub signature: [u8; 64],    // Transaction signature
    pub status: PaymentStatus,  // Current status
    pub escrow: Pubkey,         // Escrow account
    pub bump: u8,               // PDA bump
}
```

### PaymentStatus

```rust
pub enum PaymentStatus {
    Pending,    // Created but not verified
    Verified,   // Payment signature verified
    Claimed,    // Payment claimed by recipient
    Refunded,   // Payment refunded to payer
    Expired,    // Intent expired (unused)
}
```

---

## Security

### Account Validation

- All PDAs derived with deterministic seeds
- Owner checks on all token accounts
- Authority checks on all operations
- Amount validation (> 0, <= escrow balance)

### Time-Based Controls

- Maximum expiration: 1 hour from creation
- Refunds only available after expiration
- Claims only available when verified and not expired

### Error Handling

```rust
pub enum FacilitatorError {
    IntentExpired,        // 6000
    IntentNotVerified,    // 6001
    AlreadyClaimed,       // 6002
    InvalidAmount,        // 6003
    InvalidExpiration,    // 6004
    CannotRefund,         // 6005
    InvalidStatus,        // 6006
    Unauthorized,         // 6007
    InvalidSignature,     // 6008
    InsufficientBalance,  // 6009
}
```

---

## Integration

### With hypernode-jobs

The facilitator integrates with the jobs program for payment verification:

```rust
// In hypernode-jobs program
pub fn submit_job(ctx: Context<SubmitJob>, payment_intent_id: [u8; 16]) -> Result<()> {
    // Verify payment intent is verified via CPI
    let cpi_accounts = GetIntent {
        payment_intent: ctx.accounts.payment_intent.to_account_info(),
    };
    let cpi_program = ctx.accounts.facilitator_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

    // Check status is Verified
    require!(
        ctx.accounts.payment_intent.status == PaymentStatus::Verified,
        JobError::PaymentNotVerified
    );

    // Create job...
    Ok(())
}
```

---

## Testing

```bash
# Build program
anchor build

# Run tests
anchor test

# Deploy to devnet
anchor deploy --provider.cluster devnet
```

---

## License

MIT License
