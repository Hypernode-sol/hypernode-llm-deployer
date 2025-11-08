import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

/**
 * Job state enum matching Rust program
 */
export enum JobState {
  Queued = "queued",
  Running = "running",
  Completed = "completed",
  Stopped = "stopped",
  TimedOut = "timedOut",
}

/**
 * GPU type enum
 */
export enum GpuType {
  Any = 0,
  NVIDIA = 1,
  AMD = 2,
}

/**
 * Queue type enum
 */
export enum QueueType {
  Empty = 0,
  Jobs = 1,
  Nodes = 2,
}

/**
 * Market account from blockchain
 */
export interface MarketAccount {
  authority: PublicKey;
  jobPrice: BN;
  jobTimeout: BN;
  nodeXhyperMinimum: BN;
  queue: PublicKey[];
  queueType: QueueType;
  vault: PublicKey;
  vaultBump: number;
  totalJobs: BN;
  totalNodes: BN;
}

/**
 * Job account from blockchain
 */
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

/**
 * Job definition for IPFS
 */
export interface JobDefinition {
  model: string;
  framework: string;
  operations: JobOperation[];
  input: any;
  env?: Record<string, string>;
  timeout?: number;
}

/**
 * Job operation
 */
export interface JobOperation {
  type: string;
  command?: string;
  workdir?: string;
  args?: any;
}

/**
 * Job result from IPFS
 */
export interface JobResult {
  exit_code: number;
  stdout: string;
  stderr: string;
  execution_time: number;
  outputs?: Record<string, string>;
  metrics?: JobMetrics;
}

/**
 * Job metrics
 */
export interface JobMetrics {
  gpu_utilization: number;
  vram_used: number;
  tokens_generated?: number;
  inference_time?: number;
  images_generated?: number;
}

/**
 * Create job params
 */
export interface CreateJobParams {
  jobId?: PublicKey; // Optional, will generate if not provided
  model: string;
  framework: string;
  operations: JobOperation[];
  input: any;
  minVram: number;
  gpuType?: GpuType;
  env?: Record<string, string>;
  timeout?: number;
}

/**
 * Create market params
 */
export interface CreateMarketParams {
  jobPrice: number | BN;
  jobTimeout: number | BN;
  nodeXhyperMinimum: number | BN;
}

/**
 * SDK configuration
 */
export interface HypernodeConfig {
  rpcUrl: string;
  programId: PublicKey; // Markets Program ID
  stakingProgramId?: PublicKey;
  rewardsProgramId?: PublicKey;
  tokenMint?: PublicKey; // HYPER token mint: 92s9qna3djkMncZzkacyNQ38UKnNXZFh4Jgqe3Cmpump
  market?: PublicKey;
  ipfsGateway?: string;
  ipfsUploadUrl?: string;
}
