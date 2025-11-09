# x402 Payment Protocol Integration

Complete guide to x402 implementation in the Hypernode ecosystem.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Implementation](#implementation)
- [Usage Examples](#usage-examples)
- [Configuration](#configuration)
- [Testing](#testing)
- [Production Deployment](#production-deployment)

---

## Overview

### What is x402?

The **x402 protocol** adapts HTTP 402 "Payment Required" for blockchain-based payments. In Hypernode, x402 enables:

- **Trustless Payments**: Cryptographic verification without intermediaries
- **Intent-Based**: Users sign payment commitments off-chain
- **On-Chain Settlement**: Payments execute via Solana smart contracts
- **Job-Specific**: Each job gets a unique payment intent

### How It Works

```
┌──────────┐         ┌──────────┐         ┌──────────┐
│  Client  │         │ Backend  │         │  Solana  │
│ (Wallet) │         │   API    │         │Blockchain│
└────┬─────┘         └────┬─────┘         └────┬─────┘
     │                    │                    │
     │  1. Submit Job     │                    │
     ├───────────────────>│                    │
     │                    │                    │
     │  2. 402 Required   │                    │
     │<───────────────────┤                    │
     │  + Payment Intent  │                    │
     │                    │                    │
     │  3. Sign Intent    │                    │
     │  (Ed25519)         │                    │
     │                    │                    │
     │  4. Submit Signed  │                    │
     ├───────────────────>│                    │
     │                    │                    │
     │                    │  5. Verify Sig     │
     │                    ├───────────────────>│
     │                    │                    │
     │                    │  6. Lock Escrow    │
     │                    │<───────────────────┤
     │                    │                    │
     │  7. Job Accepted   │                    │
     │<───────────────────┤                    │
     │                    │                    │
     │                    │  8. Job Execution  │
     │                    │                    │
     │                    │  9. Release Payment│
     │                    │<───────────────────┤
     │                    │    (on completion) │
```

---

## Architecture

### Components

```
hypernode-llm-deployer/
├── hypernode-app/              # Next.js frontend (optional UI)
│   └── src/lib/x402/          # x402 client utilities
│
Hypernode-Site-App/
├── api/
│   ├── x402/
│   │   ├── adapter.ts         # Main x402 adapter
│   │   ├── types.ts           # TypeScript definitions
│   │   └── redis-intent-store.ts  # Intent storage (Redis)
│   └── routes/
│       └── x402.ts            # x402 API endpoints
│
└── src/
    └── lib/
        └── x402-client.js     # Frontend x402 client

packages/@hypernode/types/
└── src/x402/                  # Shared type definitions
```

### Key Files

| File | Purpose |
|------|---------|
| `api/x402/adapter.ts` | Core payment verification logic |
| `api/x402/redis-intent-store.ts` | Intent persistence (dev: memory, prod: Redis) |
| `api/routes/x402.ts` | HTTP endpoints (`/api/x402/*`) |
| `src/lib/x402-client.js` | Browser-side SDK |
| `@hypernode/types/src/x402/` | Shared TypeScript types |

---

## Implementation

### Payment Intent Structure

```typescript
interface PaymentIntent {
  id: string;                    // UUID v4
  payer: string;                 // Solana public key (base58)
  amount: number;                // Lamports
  jobId?: string;                // Associated job ID
  timestamp: number;             // Unix timestamp (ms)
  expiresAt: number;             // Expiration timestamp
  signature?: string;            // Transaction signature (once verified)
  status: 'pending' | 'verified' | 'failed' | 'expired';
  metadata?: Record<string, any>;
}
```

### Backend: Creating Payment Intents

```typescript
// api/x402/adapter.ts
import { X402Adapter } from './adapter';

const x402 = new X402Adapter({
  network: 'devnet',
  programId: 'HYPRjobs11111111111111111111111111111111111',
  tokenMint: '56jZUEMAhXxRu7Am3L2AkRRxNJb187zBbBQqnTf6jV75', // Devnet HYPER
});

// Create payment intent for a job
const intent = await x402.createIntent({
  payer: 'UserWalletPublicKey...',
  amount: 100_000_000, // 0.1 SOL
  jobId: 'job-12345',
  expiresIn: 300, // 5 minutes
});

console.log(intent);
// {
//   id: '550e8400-e29b-41d4-a716-446655440000',
//   payer: '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin',
//   amount: 100000000,
//   jobId: 'job-12345',
//   timestamp: 1735689600000,
//   expiresAt: 1735689900000,
//   status: 'pending'
// }
```

### Frontend: Signing and Verifying

```javascript
// src/lib/x402-client.js
import { useWallet } from '@solana/wallet-adapter-react';
import { X402Client } from '@hypernode/sdk';

function SubmitJobWithPayment() {
  const { publicKey, signTransaction } = useWallet();
  const x402 = new X402Client('http://localhost:3002');

  async function submitJob(jobData) {
    try {
      // 1. Submit job (receives 402 response)
      const response = await fetch('/api/jobs', {
        method: 'POST',
        body: JSON.stringify(jobData),
      });

      if (response.status === 402) {
        const { paymentIntent } = await response.json();

        // 2. Sign payment intent with wallet
        const signature = await signPaymentIntent(paymentIntent);

        // 3. Verify payment
        const verified = await x402.verifyPayment({
          intentId: paymentIntent.id,
          signature,
          payer: publicKey.toBase58(),
        });

        if (verified) {
          // 4. Resubmit job (now with verified payment)
          return await fetch('/api/jobs', {
            method: 'POST',
            body: JSON.stringify(jobData),
            headers: {
              'X-Payment-Intent-ID': paymentIntent.id,
            },
          });
        }
      }
    } catch (error) {
      console.error('Payment failed:', error);
    }
  }

  async function signPaymentIntent(intent) {
    const transaction = await x402.createPaymentTransaction(intent);
    const signed = await signTransaction(transaction);
    const signature = await connection.sendRawTransaction(signed.serialize());
    await connection.confirmTransaction(signature);
    return signature;
  }

  return (
    <button onClick={() => submitJob({ model: 'llama-3-70b', ... })}>
      Submit Job
    </button>
  );
}
```

### Backend: Verifying Payments

```typescript
// api/routes/x402.ts
app.post('/api/x402/verify', async (req, res) => {
  const { intentId, signature, payer } = req.body;

  try {
    // Verify signature on Solana
    const verified = await x402.verifyPayment({
      intentId,
      signature,
      payer,
    });

    if (verified) {
      // Mark intent as verified
      const intent = await x402.getIntent(intentId);
      intent.status = 'verified';
      intent.signature = signature;

      return res.json({ verified: true, intent });
    }

    return res.status(400).json({ verified: false, error: 'Invalid signature' });
  } catch (error) {
    console.error('Verification error:', error);
    return res.status(500).json({ verified: false, error: error.message });
  }
});
```

---

## Usage Examples

### Example 1: Job Submission with Payment

```typescript
// Backend API route
app.post('/api/jobs', async (req, res) => {
  const { model, prompt } = req.body;
  const intentId = req.headers['x-payment-intent-id'];

  // Check if payment is required
  if (!intentId) {
    const intent = await x402.createIntent({
      payer: req.user.wallet,
      amount: calculateJobPrice(model),
      expiresIn: 300,
    });

    return res.status(402).json({
      message: 'Payment Required',
      paymentIntent: intent,
    });
  }

  // Verify existing payment
  const intent = await x402.getIntent(intentId);
  if (intent.status !== 'verified') {
    return res.status(402).json({
      message: 'Payment not verified',
      paymentIntent: intent,
    });
  }

  // Payment verified - process job
  const job = await createJob({ model, prompt, paymentIntent: intentId });
  return res.json({ job });
});
```

### Example 2: Checking Payment Status

```typescript
// Get intent status
const intent = await x402.getIntent('550e8400-e29b-41d4-a716-446655440000');

console.log(intent.status);
// 'pending' | 'verified' | 'failed' | 'expired'

// Check if job requires payment
const requiresPayment = await x402.requiresPayment('job-12345');
if (requiresPayment) {
  const intent = await x402.getPaymentForJob('job-12345');
  console.log('Pay:', intent.amount, 'lamports');
}
```

---

## Configuration

### Environment Variables

```bash
# Hypernode-Site-App/api/.env

# x402 Configuration
X402_ENABLED=true
X402_MIN_PAYMENT=100000           # 0.0001 SOL minimum
X402_MAX_PAYMENT=100000000000     # 100 SOL maximum
X402_DEFAULT_EXPIRATION=300       # 5 minutes
X402_MAX_EXPIRATION=3600          # 1 hour max

# Rate Limiting
X402_MAX_REQUESTS_PER_WALLET=100
X402_RATE_LIMIT_WINDOW_MS=3600000  # 1 hour
X402_MAX_VOLUME_PER_WALLET=100000000000

# Circuit Breaker
X402_CIRCUIT_BREAKER_THRESHOLD=5
X402_CIRCUIT_BREAKER_TIMEOUT=60000

# Redis (Production)
REDIS_URL=redis://localhost:6379

# Solana
SOLANA_NETWORK=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com
HYPER_TOKEN_MINT=56jZUEMAhXxRu7Am3L2AkRRxNJb187zBbBQqnTf6jV75
```

### TypeScript Configuration

```typescript
// api/x402/config.ts
import { X402Config } from '@hypernode/types';

export const x402Config: X402Config = {
  enabled: process.env.X402_ENABLED === 'true',
  minPayment: parseInt(process.env.X402_MIN_PAYMENT || '100000'),
  maxPayment: parseInt(process.env.X402_MAX_PAYMENT || '100000000000'),
  defaultExpiration: parseInt(process.env.X402_DEFAULT_EXPIRATION || '300'),
  maxExpiration: parseInt(process.env.X402_MAX_EXPIRATION || '3600'),
  rateLimit: {
    maxRequestsPerWallet: 100,
    windowMs: 3600000,
    maxVolumePerWallet: 100000000000,
  },
  circuitBreaker: {
    threshold: 5,
    timeout: 60000,
  },
  monitoringEnabled: true,
};
```

---

## Testing

### Unit Tests

```typescript
// api/x402/__tests__/adapter.test.ts
import { X402Adapter } from '../adapter';

describe('X402Adapter', () => {
  let adapter: X402Adapter;

  beforeEach(() => {
    adapter = new X402Adapter({ network: 'devnet' });
  });

  test('creates payment intent', async () => {
    const intent = await adapter.createIntent({
      payer: 'TestWallet...',
      amount: 100000,
    });

    expect(intent.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(intent.status).toBe('pending');
    expect(intent.amount).toBe(100000);
  });

  test('verifies valid payment', async () => {
    const intent = await adapter.createIntent({
      payer: 'TestWallet...',
      amount: 100000,
    });

    const verified = await adapter.verifyPayment({
      intentId: intent.id,
      signature: 'validSignature...',
      payer: 'TestWallet...',
    });

    expect(verified).toBe(true);
  });

  test('rejects expired intent', async () => {
    const intent = await adapter.createIntent({
      payer: 'TestWallet...',
      amount: 100000,
      expiresIn: -1, // Already expired
    });

    const verified = await adapter.verifyPayment({
      intentId: intent.id,
      signature: 'validSignature...',
      payer: 'TestWallet...',
    });

    expect(verified).toBe(false);
  });
});
```

### Integration Tests

```bash
# Run backend tests
cd Hypernode-Site-App/api
npm test

# Run with coverage
npm run test:coverage
```

---

## Production Deployment

See [X402_PRODUCTION.md](./hypernode-app/X402_PRODUCTION.md) for complete production setup guide including:

- Redis configuration
- Monitoring with Prometheus/Grafana
- Rate limiting and circuit breakers
- Security hardening
- Disaster recovery

### Quick Production Checklist

- [ ] Set `X402_ENABLED=true`
- [ ] Configure Redis for intent storage
- [ ] Set appropriate rate limits
- [ ] Enable monitoring (`X402_MONITORING_ENABLED=true`)
- [ ] Configure circuit breaker thresholds
- [ ] Use mainnet HYPER token: `92s9qna3djkMncZzkacyNQ38UKnNXZFh4Jgqe3Cmpump`
- [ ] Set up alerts for circuit breaker events
- [ ] Test failover scenarios
- [ ] Document rollback procedure

---

## Future Enhancements

**On-Chain Integration** (Planned):
- `hypernode-facilitator` program for on-chain payment verification
- Direct smart contract escrow (no off-chain verification)
- Automatic refunds for expired intents
- On-chain payment history

**Current Status**: x402 currently operates off-chain with signature verification. Full on-chain integration is planned for future releases.

---

## Resources

- **Production Guide**: [X402_PRODUCTION.md](./hypernode-app/X402_PRODUCTION.md)
- **Type Definitions**: [packages/@hypernode/types/src/x402/](./packages/@hypernode/types/src/x402/)
- **Implementation**: [Hypernode-Site-App/api/x402/](../Hypernode-Site-App/api/x402/)
- **Whitepaper**: [Whitepaper/README.md - Section 3](../Whitepaper/README.md#3-x402-payment-protocol)

---

## Support

For issues or questions:
- **GitHub Issues**: [hypernode-llm-deployer/issues](https://github.com/Hypernode-sol/hypernode-llm-deployer/issues)
- **Email**: contact@hypernodesolana.org
