# Hypernode Governance UI

Modern React dashboard for Hypernode DAO governance.

## Features

- View active proposals
- Create new proposals
- Vote with xHYPER-weighted voting power
- Real-time voting statistics
- Wallet integration (Phantom, Solflare)
- Responsive design

## Quick Start

```bash
cd governance-ui
npm install
npm run dev
```

Open http://localhost:5173

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **TailwindCSS** - Styling
- **@solana/wallet-adapter** - Wallet connections
- **@tanstack/react-query** - Data fetching
- **Recharts** - Charts and visualizations
- **Lucide React** - Icons

## Components

- `Dashboard` - Main layout
- `ProposalList` - List of all proposals
- `ProposalCard` - Individual proposal display
- `CreateProposal` - Proposal creation form
- `Stats` - Governance statistics
- `VotingPower` - User's voting power display

## Hooks

- `useProposals` - Fetch proposals from blockchain
- `useVote` - Submit votes
- `useCreateProposal` - Create new proposals
- `useVotingPower` - Get user's xHYPER balance

## Build

```bash
npm run build
```

Output in `dist/` folder.

## Deploy

### Vercel
```bash
vercel deploy
```

### Netlify
```bash
netlify deploy --prod
```

## Configuration

Update RPC endpoint in `src/App.tsx`:

```typescript
const endpoint = useMemo(() => clusterApiUrl(network), [network]);
// Or use custom RPC:
// const endpoint = 'https://your-rpc-endpoint.com';
```

## Screenshots

[Dashboard screenshots would go here]

## License

MIT
