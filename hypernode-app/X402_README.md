# x402 Payment Protocol - Quick Start

Implementation of HTTP 402 Payment Required protocol for the Hypernode GPU Network. Enables AI agents to autonomously pay for computational resources using cryptographic signatures on Solana.

## Features

- **Trustless**: Ed25519 cryptographic verification, no central authority
- **Modular**: Independent components, works with any Solana wallet
- **Safe**: Circuit breakers, rate limiting, replay attack prevention
- **Clear**: Well-documented, fully tested (62 unit tests)

## Quick Start

### For AI Agents (TypeScript/JavaScript)

```typescript
import { createAgentClient } from '@/lib/x402/agent-client';

// Initialize client with your wallet
const client = createAgentClient(
  'https://api.hypernode.sol',
  process.env.SOLANA_SECRET_KEY! // base58 encoded
);

// Submit a job
const job = await client.submitJob('inference_medium', {
  model: 'llama-3-70b',
  input: { prompt: 'Explain quantum computing' },
});

// Wait for completion
const result = await client.waitForCompletion(job.jobId);
console.log(result.result);
```

### For API Servers (Next.js)

```typescript
import { withPaymentVerification } from '@/lib/x402/adapter';

export const POST = withPaymentVerification(
  async (request, { intent, verification }) => {
    // Payment is verified, intent contains:
    // - intent.payer: wallet address
    // - intent.amount: lamports
    // - intent.jobId: job identifier

    // Your business logic here
    return NextResponse.json({ success: true });
  }
);
```

## Installation

The x402 protocol is integrated into the Hypernode Next.js application:

```bash
cd hypernode-app
npm install
```

Dependencies are already configured:
- `tweetnacl` - Ed25519 signatures
- `bs58` - Base58 encoding
- `@solana/web3.js` - Solana integration

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/x402` | POST | Submit job with payment |
| `/api/x402/jobs/[jobId]` | GET | Get job status |
| `/api/x402/pricing` | GET | Get pricing information |

## Testing

```bash
# Run all x402 tests (62 tests)
npm test -- x402

# Run specific test suites
npm test -- verifier.test.ts  # 29 tests
npm test -- adapter.test.ts   # 33 tests
```

## Security

- **Replay Attack Prevention**: Used payment intents are tracked
- **Expiration**: Payment intents expire (default 5 minutes)
- **Amount Validation**: Min/max payment limits enforced
- **Signature Verification**: Ed25519 cryptographic verification
- **Rate Limiting**: Built-in rate limiter
- **Circuit Breaker**: Automatic failure handling

## Architecture

```
┌─────────────┐      ┌──────────────┐      ┌───────────────┐
│  AI Agent   │─────>│ x402 Client  │─────>│  API Route    │
└─────────────┘      └──────────────┘      └───────────────┘
                            │                       │
                            │ Creates & Signs       │ Verifies
                            │ Payment Intent        │ Signature
                            │                       │
                            v                       v
                     ┌──────────────┐      ┌───────────────┐
                     │  Verifier    │<─────│   Adapter     │
                     └──────────────┘      └───────────────┘
                            │                       │
                            │                       │
                            v                       v
                     ┌──────────────────────────────────────┐
                     │      Hypernode Jobs Program          │
                     │         (Solana Blockchain)          │
                     └──────────────────────────────────────┘
```

## Pricing

| Job Type | Price | GPU | VRAM | Est. Time |
|----------|-------|-----|------|-----------|
| `inference_small` | 0.0001 SOL | T4 | 16GB | 1 min |
| `inference_medium` | 0.0005 SOL | A10 | 24GB | 1 min |
| `inference_large` | 0.002 SOL | A100 | 40GB | 1 min |
| `training_small` | 0.005 SOL | A10 | 24GB | 1 hour |
| `training_medium` | 0.02 SOL | A100 | 40GB | 1 hour |
| `training_large` | 0.1 SOL | H100 | 80GB | 1 hour |

## Environment Configuration

Create `.env.local`:

```bash
# Solana Configuration
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com

# x402 Configuration
NEXT_PUBLIC_X402_ENABLED=true
X402_MIN_PAYMENT=100000       # 0.0001 SOL
X402_MAX_PAYMENT=100000000000 # 100 SOL
```

## Documentation

- [Full Implementation Guide](./docs/X402_IMPLEMENTATION.md) - Complete technical documentation
- [API Reference](#) - Detailed API documentation

## Support

- GitHub Issues: https://github.com/Hypernode-sol/hypernode-llm-deployer/issues
- Email: contact@hypernodesolana.org

## License

See main project [LICENSE](../LICENSE)
