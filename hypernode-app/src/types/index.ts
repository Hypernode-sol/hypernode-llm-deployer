import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

// Job States
export enum JobState {
  Queued = 'queued',
  Running = 'running',
  Completed = 'completed',
  Stopped = 'stopped',
  TimedOut = 'timedOut',
}

// GPU Types
export enum GpuType {
  Any = 0,
  NVIDIA = 1,
  AMD = 2,
}

// Job Account
export interface JobAccount {
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

// Job Definition
export interface JobDefinition {
  model: string;
  framework: string;
  operations: JobOperation[];
  input: any;
  env?: Record<string, string>;
  timeout?: number;
}

// Job Operation
export interface JobOperation {
  type: 'run' | 'copy' | 'env';
  command?: string;
  workdir?: string;
  source?: string;
  dest?: string;
  key?: string;
  value?: string;
}

// Job Result
export interface JobResult {
  exit_code: number;
  stdout: string;
  stderr: string;
  execution_time: number;
  outputs?: Record<string, string>;
  metrics?: JobMetrics;
}

// Job Metrics
export interface JobMetrics {
  gpu_utilization?: number;
  vram_usage?: number;
  cpu_usage?: number;
  ram_usage?: number;
}

// Market Account
export interface MarketAccount {
  authority: PublicKey;
  jobPrice: BN;
  jobTimeout: BN;
  nodeXhyperMinimum: BN;
  queue: PublicKey[];
  queueType: QueueType;
  totalJobs: BN;
  totalNodes: BN;
  bump: number;
}

// Queue Type
export enum QueueType {
  Jobs = 0,
  Nodes = 1,
}

// Node Account
export interface NodeAccount {
  authority: PublicKey;
  market: PublicKey;
  gpuType: GpuType;
  vram: number;
  reputation: number;
  totalJobs: BN;
  successfulJobs: BN;
  timeRegistered: BN;
  bump: number;
}

// Stake Account
export interface StakeAccount {
  authority: PublicKey;
  amount: BN;
  xhyper: BN;
  multiplier: number;
  timeStaked: BN;
  duration: BN;
  cooldownStart: BN;
  bump: number;
}

// Create Job Params
export interface CreateJobParams {
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

// Stats
export interface MarketStats {
  totalJobs: number;
  totalNodes: number;
  queueLength: number;
  queueType: QueueType;
  jobPrice: number;
}

// Node Stats
export interface NodeStats {
  totalEarnings: BN;
  activeJobs: number;
  successRate: number;
  uptime: number;
}
