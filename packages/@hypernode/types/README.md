# @hypernode/types

Shared TypeScript types for the Hypernode GPU Network ecosystem.

## Installation

```bash
npm install @hypernode/types
```

## Usage

```typescript
import {
  // Smart contract types
  JobAccount,
  NodeAccount,
  MarketAccount,
  JobState,
  NodeStatus,
  GpuType,

  // x402 payment types
  PaymentIntent,
  PaymentStatus,
  X402Adapter,

  // API types
  JobSubmissionRequest,
  JobStatusResponse,
  NodeRegistrationRequest,
  ApiResponse,

  // Common types and constants
  HYPER_MAINNET,
  HYPER_DEVNET,
  NetworkConfig,
  ErrorCode,
  HypernodeError,
} from '@hypernode/types';
```

## Type Categories

### Contract Types (`contracts/`)

Types for Solana smart contracts:
- **Markets**: Job marketplace types
- **Nodes**: Node registry types
- **Staking**: Time-locked staking with xNOS
- **Rewards**: Token reflection distribution
- **Governance**: DAO proposal and voting
- **Slashing**: Penalty system

### x402 Types (`x402/`)

HTTP 402 Payment Required protocol:
- Payment intent management
- Request/response types
- Configuration and metrics
- Adapter interface

### API Types (`api/`)

REST and WebSocket API:
- Job submission and status
- Node registration and listing
- Market statistics
- Real-time updates via WebSocket

### Common Types (`common/`)

Shared utilities:
- Network configuration
- Token constants (HYPER mainnet/devnet)
- Error codes and custom errors
- Time and conversion utilities

## Constants

```typescript
// Token addresses
HYPER_MAINNET.mint // 92s9qna3djkMncZzkacyNQ38UKnNXZFh4Jgqe3Cmpump
HYPER_DEVNET.mint  // 56jZUEMAhXxRu7Am3L2AkRRxNJb187zBbBQqnTf6jV75

// Common values
LAMPORTS_PER_SOL      // 1_000_000_000
DEFAULT_JOB_TIMEOUT   // 3600 seconds
MIN_NODE_STAKE        // 5 SOL
```

## Error Handling

```typescript
import { HypernodeError, ErrorCode } from '@hypernode/types';

try {
  // Your code
} catch (error) {
  if (error instanceof HypernodeError) {
    switch (error.code) {
      case ErrorCode.PaymentRequired:
        // Handle payment
        break;
      case ErrorCode.JobNotFound:
        // Handle not found
        break;
    }
  }
}
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode
npm run dev

# Test
npm test
```

## License

MIT
