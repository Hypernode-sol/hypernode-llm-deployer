# Hypernode App

Web application for the Hypernode decentralized GPU network on Solana.

## Overview

The Hypernode App is the main user-facing interface for interacting with the Hypernode protocol. It allows users to:

- Submit AI inference jobs to the GPU marketplace
- Monitor job status and results
- Register GPUs as node operators
- Stake HYPER tokens for rewards
- Participate in DAO governance

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **Blockchain**: Solana Web3.js + Anchor
- **Wallet**: Solana Wallet Adapter
- **State**: TanStack React Query
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Solana wallet (Phantom or Solflare)
- Some devnet SOL for testing

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm start
```

## Project Structure

```
hypernode-app/
├── src/
│   ├── app/                    # Next.js app router pages
│   │   ├── page.tsx           # Landing page
│   │   ├── marketplace/       # Marketplace page
│   │   ├── dashboard/         # User dashboard
│   │   ├── node/              # Node operator page
│   │   ├── staking/           # Staking page
│   │   └── governance/        # Governance page
│   ├── components/            # React components
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── WalletProvider.tsx
│   │   └── marketplace/       # Marketplace components
│   ├── lib/                   # Utilities and config
│   │   ├── config.ts         # App configuration
│   │   └── utils.ts          # Helper functions
│   ├── hooks/                 # Custom React hooks
│   └── types/                 # TypeScript types
├── public/                    # Static assets
└── package.json
```

## Features

### Landing Page
- Hero section with network stats
- Feature highlights
- How it works section
- Call-to-action buttons

### Marketplace
- Browse available GPU jobs
- Create new inference jobs
- Filter and search functionality
- Job status tracking

### Dashboard (TODO)
- View your submitted jobs
- Track job progress
- Download results
- Payment history

### Node Operator (TODO)
- Register your GPU
- View earnings
- Monitor GPU status
- Update node settings

### Staking (TODO)
- Stake HYPER tokens
- View xHYPER multipliers
- Claim rewards
- Unstake with cooldown

### Governance (TODO)
- View proposals
- Vote with xHYPER
- Create proposals
- Track voting power

## Environment Variables

Create a `.env.local` file:

```bash
# Solana Configuration
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com

# Program IDs (Devnet)
NEXT_PUBLIC_MARKETS_PROGRAM_ID=67UE2LconF9QU5Vobsaf5sXnW9yUisebLj8VmgGWLSdb
NEXT_PUBLIC_STAKING_PROGRAM_ID=3fw9eQN1KHarGcYVETvF7FDt2BYGuDPMjuhoE45RJnTJ
NEXT_PUBLIC_REWARDS_PROGRAM_ID=EqBzwuXKmDZbAMf2WTogQhzABsrG6dYbbKXW1adsLhbb

# HYPER Token
NEXT_PUBLIC_HYPER_MINT=92s9qna3djkMncZzkacyNQ38UKnNXZFh4Jgqe3Cmpump

# IPFS
NEXT_PUBLIC_IPFS_GATEWAY=https://ipfs.io
```

## Integration with SDK

To integrate with the Hypernode SDK:

```typescript
import { HypernodeSDK } from '@hypernode/sdk';
import { useWallet } from '@solana/wallet-adapter-react';

// In your component
const { publicKey, signTransaction } = useWallet();

// Initialize SDK
const sdk = new HypernodeSDK({
  rpcUrl: process.env.NEXT_PUBLIC_SOLANA_RPC_URL!,
  programId: PROGRAM_IDS.markets,
}, wallet);

// Create a job
const { job } = await sdk.jobs.createJob({
  model: 'meta-llama/Llama-3.1-8B',
  framework: 'pytorch',
  operations: [{ type: 'run', command: 'python inference.py' }],
  input: { prompt: 'Hello', max_tokens: 100 },
  minVram: 12,
});
```

## Development Roadmap

### Phase 1: Core Pages (Current)
- [x] Landing page
- [x] Marketplace page
- [x] Job creation form
- [ ] Dashboard page
- [ ] Node operator page
- [ ] Staking page

### Phase 2: SDK Integration
- [ ] Connect SDK to marketplace
- [ ] Real-time job updates
- [ ] IPFS integration
- [ ] Transaction signing

### Phase 3: Advanced Features
- [ ] Job result display
- [ ] Analytics dashboard
- [ ] Notification system
- [ ] Mobile responsive optimization

### Phase 4: Production Ready
- [ ] Error handling
- [ ] Loading states
- [ ] Performance optimization
- [ ] Security audit
- [ ] Deploy to production

## Contributing

This is currently in active development. Contributions are welcome!

## License

MIT

---

**Built on Solana. Powered by decentralization.**
