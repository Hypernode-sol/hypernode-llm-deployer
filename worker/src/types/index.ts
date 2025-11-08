import { PublicKey } from "@solana/web3.js";

/**
 * Job state from Markets Program
 */
export enum JobState {
  Queued = "queued",
  Running = "running",
  Completed = "completed",
  Stopped = "stopped",
  TimedOut = "timedOut",
}

/**
 * GPU type requirement
 */
export enum GpuType {
  Any = 0,
  NVIDIA = 1,
  AMD = 2,
}

/**
 * Job definition from IPFS
 */
export interface JobDefinition {
  /** Model to run (e.g., "deepseek-r1-qwen-7b", "llama-3.1-8b") */
  model: string;

  /** Framework (e.g., "pytorch", "huggingface", "stable-diffusion") */
  framework: string;

  /** Operations to execute */
  operations: JobOperation[];

  /** Input data */
  input: any;

  /** Environment variables */
  env?: Record<string, string>;

  /** Timeout in seconds */
  timeout?: number;
}

/**
 * Job operation (similar to Nosana's operations)
 */
export interface JobOperation {
  /** Operation type (e.g., "run", "download", "upload") */
  type: string;

  /** Command to execute */
  command?: string;

  /** Working directory */
  workdir?: string;

  /** Args for the operation */
  args?: any;
}

/**
 * Job result to upload to IPFS
 */
export interface JobResult {
  /** Exit code (0 = success) */
  exit_code: number;

  /** Stdout */
  stdout: string;

  /** Stderr */
  stderr: string;

  /** Execution time in seconds */
  execution_time: number;

  /** Output files (IPFS CIDs) */
  outputs?: Record<string, string>;

  /** Metrics */
  metrics?: JobMetrics;
}

/**
 * Job execution metrics
 */
export interface JobMetrics {
  /** GPU utilization (%) */
  gpu_utilization: number;

  /** VRAM used (GB) */
  vram_used: number;

  /** Tokens generated (for LLMs) */
  tokens_generated?: number;

  /** Inference time (ms) */
  inference_time?: number;

  /** Images generated (for SD) */
  images_generated?: number;
}

/**
 * GPU specs
 */
export interface GpuSpec {
  /** GPU vendor (NVIDIA, AMD, Apple, etc) */
  vendor: string;

  /** GPU model */
  model: string;

  /** VRAM in GB */
  vram: number;

  /** GPU type */
  type: GpuType;

  /** CUDA version (for NVIDIA) */
  cuda_version?: string;

  /** Driver version */
  driver_version?: string;

  /** PCI bus ID */
  pci_bus?: string;
}

/**
 * System specs
 */
export interface SystemSpec {
  /** CPU info */
  cpu: {
    model: string;
    cores: number;
    threads: number;
  };

  /** RAM in GB */
  ram: number;

  /** GPUs */
  gpus: GpuSpec[];

  /** OS */
  os: {
    platform: string;
    distro: string;
    release: string;
  };

  /** Docker/Podman version */
  container_runtime?: {
    type: "docker" | "podman";
    version: string;
  };
}

/**
 * Worker configuration
 */
export interface WorkerConfig {
  /** Solana RPC endpoint */
  rpc_url: string;

  /** Worker keypair path */
  keypair_path: string;

  /** Market public key */
  market: PublicKey;

  /** Program ID */
  program_id: PublicKey;

  /** Markets Program ID */
  marketsProgramId: PublicKey;

  /** IPFS gateway */
  ipfs_gateway: string;

  /** IPFS upload endpoint */
  ipfs_upload_url: string;

  /** Container runtime (docker or podman) */
  container_runtime: "docker" | "podman";

  /** Auto-accept jobs */
  auto_accept: boolean;

  /** Polling interval (ms) */
  polling_interval: number;

  /** Health check interval (ms) */
  health_check_interval: number;
}

/**
 * Job execution context
 */
export interface JobContext {
  /** Job account public key */
  job_pubkey: PublicKey;

  /** Job definition from IPFS */
  definition: JobDefinition;

  /** Container ID */
  container_id?: string;

  /** Start time */
  start_time: Date;

  /** Logs */
  logs: string[];

  /** Current state */
  state: JobState;
}

/**
 * Health status
 */
export interface HealthStatus {
  /** Overall health (ok, warning, error) */
  status: "ok" | "warning" | "error";

  /** System specs */
  system: SystemSpec;

  /** GPU utilization */
  gpu_utilization: number[];

  /** VRAM usage */
  vram_usage: number[];

  /** CPU usage (%) */
  cpu_usage: number;

  /** RAM usage (%) */
  ram_usage: number;

  /** Disk usage (%) */
  disk_usage: number;

  /** Active jobs */
  active_jobs: number;

  /** Uptime (seconds) */
  uptime: number;

  /** Last update */
  timestamp: Date;
}
