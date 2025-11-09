# SDK Integration Guide

This guide explains how to integrate the Hypernode SDK with the frontend application.

## Current Status

The frontend is currently using **placeholder implementations** in `src/hooks/useHypernodeSDK.ts`. These need to be replaced with actual SDK calls once the SDK is built and published.

## Prerequisites

1. Build the SDK package:
```bash
cd ../sdk
npm install
npm run build
```

2. Link the SDK locally (for development):
```bash
cd ../sdk
npm link

cd ../hypernode-app
npm link @hypernode/sdk
```

Or install from npm (once published):
```bash
npm install @hypernode/sdk
```

## Integration Steps

### Step 1: Update useHypernodeSDK.ts

Replace placeholder implementations with actual SDK calls:

```typescript
import { HypernodeSDK } from '@hypernode/sdk';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PROGRAM_IDS, RPC_ENDPOINT } from '@/lib/config';

// Initialize SDK instance
function useSDK() {
  const { publicKey, signTransaction, signAllTransactions } = useWallet();
  const { connection } = useConnection();

  if (!publicKey || !signTransaction || !signAllTransactions) {
    return null;
  }

  const wallet = { publicKey, signTransaction, signAllTransactions };

  return new HypernodeSDK(
    {
      rpcUrl: RPC_ENDPOINT,
      programId: PROGRAM_IDS.markets,
      stakingProgramId: PROGRAM_IDS.staking,
      rewardsProgramId: PROGRAM_IDS.rewards,
    },
    wallet
  );
}

// Update hooks to use SDK
export function useCreateJob() {
  const sdk = useSDK();

  return useMutation({
    mutationFn: async (params: CreateJobParams) => {
      if (!sdk) throw new Error('Wallet not connected');
      return await sdk.jobs.createJob(params);
    },
  });
}
```

### Step 2: IPFS Integration

Set up IPFS service for job definitions and results:

```typescript
// src/lib/ipfs.ts
import axios from 'axios';
import { IPFS_CONFIG } from './config';

export async function uploadToIPFS(data: any): Promise<string> {
  const response = await axios.post(IPFS_CONFIG.uploadUrl, {
    pinataContent: data,
  }, {
    headers: {
      'Content-Type': 'application/json',
      'pinata_api_key': process.env.NEXT_PUBLIC_PINATA_API_KEY,
      'pinata_secret_api_key': process.env.NEXT_PUBLIC_PINATA_SECRET_KEY,
    },
  });

  return response.data.IpfsHash;
}

export async function fetchFromIPFS(hash: string): Promise<any> {
  const response = await axios.get(`${IPFS_CONFIG.gateway}/ipfs/${hash}`);
  return response.data;
}
```

### Step 3: Update CreateJobForm

Integrate IPFS upload in job creation:

```typescript
// In src/components/marketplace/CreateJobForm.tsx

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  // Upload job definition to IPFS
  const jobDefinition = {
    model: selectedModel,
    framework,
    operations: [...],
    input: JSON.parse(input),
    env,
  };

  const ipfsHash = await uploadToIPFS(jobDefinition);

  // Create job on-chain
  const params = {
    ...jobDefinition,
    ipfsHash, // Include IPFS hash
    minVram,
    gpuType,
    timeout,
  };

  await onSubmit(params);
};
```

### Step 4: Real-time Updates

Implement WebSocket or polling for job status:

```typescript
// In src/hooks/useJobUpdates.ts
export function useJobUpdates(jobId: PublicKey) {
  const sdk = useSDK();

  useEffect(() => {
    if (!sdk || !jobId) return;

    const subscription = sdk.jobs.subscribeToJob(jobId, (job) => {
      // Update state with new job data
      queryClient.setQueryData(['job', jobId.toString()], job);
    });

    return () => {
      sdk.jobs.unsubscribe(subscription);
    };
  }, [sdk, jobId]);
}
```

### Step 5: Transaction Signing

Handle transaction signing with proper error handling:

```typescript
try {
  const { signature, job } = await sdk.jobs.createJob(params);

  // Wait for confirmation
  await connection.confirmTransaction(signature, 'confirmed');

  // Show success message
  toast.success(`Job created: ${job.toString()}`);

  // Redirect to job detail page
  router.push(`/jobs/${job.toString()}`);
} catch (error) {
  if (error.message.includes('User rejected')) {
    toast.error('Transaction cancelled');
  } else if (error.message.includes('Insufficient funds')) {
    toast.error('Insufficient SOL for transaction');
  } else {
    toast.error('Failed to create job');
    console.error(error);
  }
}
```

## Environment Variables

Add to `.env.local`:

```bash
# IPFS (Pinata)
NEXT_PUBLIC_PINATA_API_KEY=your_api_key
NEXT_PUBLIC_PINATA_SECRET_KEY=your_secret_key

# Or use public gateway (read-only)
NEXT_PUBLIC_IPFS_GATEWAY=https://ipfs.io
```

## Testing

### Local Testing

1. Start local validator:
```bash
solana-test-validator
```

2. Deploy programs locally:
```bash
cd ..
anchor build
anchor deploy --provider.cluster localnet
```

3. Update `.env.local` with local program IDs

4. Run frontend:
```bash
npm run dev
```

### Devnet Testing

1. Ensure devnet program IDs are correct in `.env.local`
2. Airdrop devnet SOL to test wallet
3. Test job creation, staking, etc.

## Troubleshooting

### Common Issues

**SDK not found:**
```bash
# Check if SDK is built
cd ../sdk && npm run build

# Re-link package
npm link @hypernode/sdk
```

**Transaction fails:**
- Check SOL balance
- Verify program IDs are correct
- Check RPC endpoint is responding
- Ensure wallet is connected

**IPFS upload fails:**
- Verify API keys are correct
- Check network connection
- Try alternative gateway

## Next Steps

1. Build and link SDK
2. Replace placeholder hooks
3. Add IPFS integration
4. Test on devnet
5. Add error handling
6. Implement loading states
7. Add success/error notifications
8. Test all flows end-to-end

## Reference

- [SDK Documentation](../sdk/README.md)
- [Solana Wallet Adapter](https://github.com/solana-labs/wallet-adapter)
- [TanStack Query](https://tanstack.com/query/latest)
- [Pinata IPFS](https://www.pinata.cloud/docs)
