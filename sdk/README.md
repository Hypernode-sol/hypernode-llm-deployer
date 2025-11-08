# Hypernode SDK

TypeScript SDK for interacting with Hypernode GPU Network on Solana.

## Installation

```bash
npm install @hypernode/sdk
```

## Quick Start

```typescript
import { HypernodeSDK, GpuType } from "@hypernode/sdk";
import { PublicKey } from "@solana/web3.js";

// Initialize SDK
const sdk = HypernodeSDK.fromKeypairFile(
  "~/.config/solana/id.json",
  {
    rpcUrl: "https://api.devnet.solana.com",
    programId: "HYPERMarket11111111111111111111111111111111",
    market: new PublicKey("YOUR_MARKET_PUBKEY"),
  }
);

// Create a GPU job
const { job, signature } = await sdk.jobs.createJob({
  model: "meta-llama/Llama-3.1-8B-Instruct",
  framework: "pytorch",
  operations: [
    {
      type: "run",
      command: "python inference.py",
    },
  ],
  input: {
    prompt: "Explain quantum computing",
    max_tokens: 200,
  },
  minVram: 12, // 12GB VRAM
  gpuType: GpuType.NVIDIA,
});

console.log(`Job created: ${job.toString()}`);

// Wait for completion
const completedJob = await sdk.jobs.waitForCompletion(job);

// Get result
const result = await sdk.jobs.getJobResult(job);
console.log(result.stdout);
```

## Features

- ✅ Create and manage GPU jobs
- ✅ Monitor marketplace statistics
- ✅ Subscribe to real-time updates
- ✅ IPFS integration (automatic upload/download)
- ✅ Full TypeScript support with types
- ✅ Wallet management utilities
- ✅ Retry logic and error handling

## API Reference

### HypernodeSDK

Main SDK class providing access to all functionality.

#### Constructor

```typescript
new HypernodeSDK(config: HypernodeConfig, wallet: Wallet)
```

#### Static Methods

```typescript
// Create from keypair file
HypernodeSDK.fromKeypairFile(
  keypairPath: string,
  config: HypernodeConfig
): HypernodeSDK

// Create from keypair
HypernodeSDK.fromKeypair(
  keypair: Keypair,
  config: HypernodeConfig
): HypernodeSDK
```

#### Properties

- `market: MarketClient` - Marketplace interactions
- `jobs: JobClient` - Job management
- `staking: StakingClient` - HYPER token staking
- `rewards: RewardsClient` - Rewards distribution

---

### StakingClient

Manage HYPER token staking and xHYPER multipliers.

#### Methods

```typescript
// Stake HYPER tokens
stake(amount: number | BN, durationDays: number): Promise<string>

// Initiate unstaking (starts cooldown)
unstake(): Promise<string>

// Withdraw after cooldown period
withdraw(): Promise<string>

// Get stake information
getStakeInfo(authority?: PublicKey): Promise<StakeInfo>

// Calculate xHYPER for given amount and duration
calculateXHyper(amount: number, durationDays: number): number
```

#### Example

```typescript
import { HypernodeSDK } from "@hypernode/sdk";
import { BN } from "@coral-xyz/anchor";

const sdk = HypernodeSDK.fromKeypairFile("~/.config/solana/id.json", {
  rpcUrl: "https://api.devnet.solana.com",
  programId: "HYPERMarket11111111111111111111111111111111",
  stakingProgramId: "HYPERStake1111111111111111111111111111111111",
  tokenMint: "92s9qna3djkMncZzkacyNQ38UKnNXZFh4Jgqe3Cmpump",
});

// Stake 1000 HYPER for 6 months
const stakeTx = await sdk.staking.stake(1000, 180);
console.log(`Staked: ${stakeTx}`);

// Get stake info
const stakeInfo = await sdk.staking.getStakeInfo();
console.log(`xHYPER: ${stakeInfo.xhyper}`);
console.log(`Multiplier: ${stakeInfo.multiplier}x`);

// Unstake (starts cooldown)
const unstakeTx = await sdk.staking.unstake();

// Wait for cooldown period (same as staking duration)
// ...then withdraw

const withdrawTx = await sdk.staking.withdraw();
console.log(`Withdrawn: ${withdrawTx}`);
```

---

### RewardsClient

Manage rewards distribution and claims.

#### Methods

```typescript
// Register stake in rewards system
registerStake(xhyper: BN): Promise<string>

// Claim accumulated rewards
claimRewards(): Promise<{ txid: string; amount: BN }>

// Unregister stake from rewards
unregisterStake(xhyper: BN, initialReflection: BN): Promise<string>

// Get rewards information
getRewardsInfo(authority?: PublicKey): Promise<RewardsInfo>

// Calculate claimable rewards
calculateClaimable(authority?: PublicKey): Promise<BN>
```

#### Example

```typescript
// Rewards are automatically registered when staking
// Claim accumulated rewards anytime

const { txid, amount } = await sdk.rewards.claimRewards();
console.log(`Claimed ${amount.toString()} lamports`);

// Get rewards info
const rewardsInfo = await sdk.rewards.getRewardsInfo();
console.log(`Total claimed: ${rewardsInfo.totalClaimed}`);
console.log(`Last claim: ${new Date(rewardsInfo.lastClaim * 1000)}`);

// Calculate claimable amount
const claimable = await sdk.rewards.calculateClaimable();
console.log(`Claimable: ${claimable.toString()} lamports`);
```

---

### JobClient

Manage GPU jobs.

#### Methods

```typescript
// Create a new job
createJob(
  params: CreateJobParams,
  marketPubkey?: PublicKey
): Promise<{ signature: string; job: PublicKey; jobId: PublicKey }>

// Get job account
getJob(jobPubkey: PublicKey): Promise<JobAccount>

// Get job definition from IPFS
getJobDefinition(jobPubkey: PublicKey): Promise<JobDefinition>

// Get job result from IPFS
getJobResult(jobPubkey: PublicKey): Promise<JobResult | null>

// Wait for job completion
waitForCompletion(
  jobPubkey: PublicKey,
  timeoutMs?: number
): Promise<JobAccount>

// Subscribe to job updates
subscribeToJob(
  jobPubkey: PublicKey,
  callback: (job: JobAccount) => void
): Promise<number>

// Unsubscribe
unsubscribe(subscriptionId: number): Promise<void>

// Cancel a queued job (client only)
cancelJob(
  jobPubkey: PublicKey,
  marketPubkey?: PublicKey
): Promise<string>

// Mark job as timed out and refund (anyone)
timeoutJob(
  jobPubkey: PublicKey,
  marketPubkey?: PublicKey
): Promise<string>
```

#### CreateJobParams

```typescript
interface CreateJobParams {
  jobId?: PublicKey;
  model: string;
  framework: string;
  operations: JobOperation[];
  input: any;
  minVram: number;
  gpuType?: GpuType;
  env?: Record<string, string>;
  timeout?: number;
}
```

---

### MarketClient

Interact with marketplaces.

#### Methods

```typescript
// Create a new market
createMarket(
  params: CreateMarketParams,
  marketKeypair?: Keypair
): Promise<{ signature: string; market: PublicKey }>

// Get market account
getMarket(marketPubkey?: PublicKey): Promise<MarketAccount>

// Get market statistics
getMarketStats(marketPubkey?: PublicKey): Promise<{
  totalJobs: number;
  totalNodes: number;
  queueLength: number;
  queueType: QueueType;
  jobPrice: number;
}>

// Get queued jobs
getQueuedJobs(marketPubkey?: PublicKey): Promise<PublicKey[]>

// Get queued nodes
getQueuedNodes(marketPubkey?: PublicKey): Promise<PublicKey[]>

// Subscribe to market updates
subscribeToMarket(
  callback: (market: MarketAccount) => void,
  marketPubkey?: PublicKey
): Promise<number>
```

---

### Types

#### JobState

```typescript
enum JobState {
  Queued = "queued",
  Running = "running",
  Completed = "completed",
  Stopped = "stopped",
  TimedOut = "timedOut",
}
```

#### GpuType

```typescript
enum GpuType {
  Any = 0,
  NVIDIA = 1,
  AMD = 2,
}
```

#### JobAccount

```typescript
interface JobAccount {
  id: PublicKey;
  market: PublicKey;
  client: PublicKey;
  node: PublicKey | null;
  ipfsJob: number[];
  ipfsResult: number[];
  price: BN;
  timeout: BN;
  state: JobState;
  timeCreated: BN;
  timeStart: BN;
  timeEnd: BN;
  minVram: number;
  gpuType: GpuType;
  bump: number;
}
```

#### JobDefinition

```typescript
interface JobDefinition {
  model: string;
  framework: string;
  operations: JobOperation[];
  input: any;
  env?: Record<string, string>;
  timeout?: number;
}
```

#### JobResult

```typescript
interface JobResult {
  exit_code: number;
  stdout: string;
  stderr: string;
  execution_time: number;
  outputs?: Record<string, string>;
  metrics?: JobMetrics;
}
```

---

### Utility Functions

```typescript
// Convert SOL to lamports
solToLamports(sol: number): BN

// Convert lamports to SOL
lamportsToSol(lamports: BN | number): number

// Format job state
formatJobState(state: any): string

// Format GPU type
formatGpuType(type: number): string

// Calculate execution time
calculateExecutionTime(timeStart: BN, timeEnd: BN): number

// Check if job is finished
isJobFinished(state: any): boolean

// Validate PublicKey
isValidPublicKey(address: string): boolean

// Sleep utility
sleep(ms: number): Promise<void>

// Retry with backoff
retry<T>(
  fn: () => Promise<T>,
  maxAttempts?: number,
  delayMs?: number
): Promise<T>

// Format bytes
formatBytes(bytes: number): string

// Format duration
formatDuration(seconds: number): string

// Truncate address
truncateAddress(address: PublicKey | string, chars?: number): string
```

---

## Examples

### Create a Job

```typescript
import { HypernodeSDK, GpuType } from "@hypernode/sdk";

const sdk = HypernodeSDK.fromKeypairFile("~/.config/solana/id.json", {
  rpcUrl: "https://api.devnet.solana.com",
  programId: "HYPERMarket11111111111111111111111111111111",
  market: new PublicKey("MARKET_PUBKEY"),
});

const { job } = await sdk.jobs.createJob({
  model: "stabilityai/stable-diffusion-xl",
  framework: "stable-diffusion",
  operations: [
    {
      type: "run",
      command: "python generate.py",
    },
  ],
  input: {
    prompt: "A beautiful sunset over mountains",
    steps: 50,
    width: 1024,
    height: 1024,
  },
  minVram: 8,
  gpuType: GpuType.NVIDIA,
});

console.log(`Job: ${job.toString()}`);
```

### Monitor Market

```typescript
const stats = await sdk.market.getMarketStats();

console.log(`Total Jobs: ${stats.totalJobs}`);
console.log(`Total Nodes: ${stats.totalNodes}`);
console.log(`Queue Length: ${stats.queueLength}`);
console.log(`Job Price: ${stats.jobPrice / 1e9} SOL`);

// Subscribe to updates
await sdk.market.subscribeToMarket((market) => {
  console.log(`Queue length: ${market.queue.length}`);
});
```

### Wait for Job Completion

```typescript
// Create job
const { job } = await sdk.jobs.createJob({...});

// Wait up to 10 minutes
const completedJob = await sdk.jobs.waitForCompletion(job, 600000);

console.log(`Completed in ${completedJob.timeEnd.sub(completedJob.timeStart).toNumber()}s`);

// Get result
const result = await sdk.jobs.getJobResult(job);

if (result) {
  console.log(`Exit code: ${result.exit_code}`);
  console.log(`Output: ${result.stdout}`);
}
```

### Real-time Job Updates

```typescript
const subscriptionId = await sdk.jobs.subscribeToJob(job, (jobAccount) => {
  console.log(`State: ${formatJobState(jobAccount.state)}`);

  if (jobAccount.node) {
    console.log(`Running on: ${jobAccount.node.toString()}`);
  }

  if (isJobFinished(jobAccount.state)) {
    console.log("Job finished!");
    sdk.jobs.unsubscribe(subscriptionId);
  }
});
```

### Cancel a Queued Job

```typescript
// Create a job
const { job } = await sdk.jobs.createJob({...});

// Get job status
const jobAccount = await sdk.jobs.getJob(job);

// Cancel if still queued
if (jobAccount.state === JobState.Queued) {
  const cancelTx = await sdk.jobs.cancelJob(job);
  console.log(`Job cancelled: ${cancelTx}`);
  console.log(`Refund processed automatically`);
}
```

### Handle Job Timeout

```typescript
// Create job with short timeout
const { job } = await sdk.jobs.createJob({
  model: "meta-llama/Llama-3.1-8B-Instruct",
  framework: "pytorch",
  operations: [{type: "run", command: "python inference.py"}],
  input: {prompt: "Test"},
  minVram: 12,
  timeout: 300, // 5 minutes
});

// Wait for job to start
await sdk.jobs.subscribeToJob(job, async (jobAccount) => {
  if (jobAccount.state === JobState.Running) {
    const currentTime = Math.floor(Date.now() / 1000);
    const elapsed = currentTime - jobAccount.timeStart.toNumber();

    // Check if timed out
    if (elapsed >= jobAccount.timeout.toNumber()) {
      console.log(`Job timed out after ${elapsed}s`);

      // Anyone can call this to recover funds
      const timeoutTx = await sdk.jobs.timeoutJob(job);
      console.log(`Timeout processed: ${timeoutTx}`);
    }
  }
});

// Or manually check and timeout
const jobAccount = await sdk.jobs.getJob(job);
const currentTime = Math.floor(Date.now() / 1000);
const elapsed = currentTime - jobAccount.timeStart.toNumber();

if (jobAccount.state === JobState.Running && elapsed >= jobAccount.timeout.toNumber()) {
  await sdk.jobs.timeoutJob(job);
  console.log(`Job timed out and refunded`);
}
```

### Create Market (Authority Only)

```typescript
const { market, signature } = await sdk.market.createMarket({
  jobPrice: solToLamports(0.1), // 0.1 SOL per job
  jobTimeout: 3600, // 1 hour
  nodeXhyperMinimum: new BN(100_000_000), // 100 xHYPER
});

console.log(`Market created: ${market.toString()}`);
```

---

## Configuration

### HypernodeConfig

```typescript
interface HypernodeConfig {
  rpcUrl: string;
  programId: PublicKey;
  market?: PublicKey;
  ipfsGateway?: string;
  ipfsUploadUrl?: string;
}
```

### Environment Variables

```bash
# Solana
SOLANA_RPC_URL=https://api.devnet.solana.com
KEYPAIR_PATH=/home/user/.config/solana/id.json

# Hypernode
MARKET_PUBKEY=<YOUR_MARKET_PUBKEY>
PROGRAM_ID=HYPERMarket11111111111111111111111111111111

# IPFS
IPFS_GATEWAY=https://ipfs.io
IPFS_UPLOAD_URL=https://api.pinata.cloud/pinning/pinJSONToIPFS
```

---

## Supported Frameworks

| Framework | Models | Example |
|-----------|--------|---------|
| **pytorch** | Llama, Mistral, Qwen | `framework: "pytorch"` |
| **huggingface** | Any HF transformer | `framework: "huggingface"` |
| **stable-diffusion** | SD 1.5, SDXL | `framework: "stable-diffusion"` |
| **ollama** | Any Ollama model | `framework: "ollama"` |

---

## Error Handling

The SDK throws descriptive errors:

```typescript
try {
  await sdk.jobs.createJob({...});
} catch (error) {
  if (error.message.includes("Insufficient funds")) {
    console.error("Not enough SOL to create job");
  } else if (error.message.includes("Market pubkey not provided")) {
    console.error("Please configure market in SDK");
  } else {
    console.error("Job creation failed:", error);
  }
}
```

---

## Development

### Build

```bash
npm run build
```

### Test

```bash
npm test
```

### Examples

```bash
# Run example
ts-node examples/create-job.ts
```

---

## License

MIT

---

## Links

- **GitHub**: [github.com/Hypernode-sol/hypernode-llm-deployer](https://github.com/Hypernode-sol/hypernode-llm-deployer)
- **Docs**: [docs.hypernode.com](https://docs.hypernode.com)
- **Discord**: [Join Discord](https://discord.gg/hypernode)

---

**Build decentralized AI with Hypernode! 🚀**
