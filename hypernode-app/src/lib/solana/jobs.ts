/**
 * Solana Jobs Integration
 *
 * Integration with hypernode-markets Solana program for job management.
 * Handles on-chain job creation, status queries, and escrow payments.
 */

import { Connection, PublicKey, Transaction, SystemProgram, Keypair } from '@solana/web3.js';
import { Program, AnchorProvider, web3, BN, Idl } from '@coral-xyz/anchor';
import { PaymentIntent, JobConfig, JobStatus } from '../x402/types';

/**
 * Job state enum (matches Rust JobState)
 */
export enum SolanaJobState {
  Queued = 'Queued',
  Running = 'Running',
  Completed = 'Completed',
  Stopped = 'Stopped',
  TimedOut = 'TimedOut',
}

/**
 * On-chain job account structure
 */
export interface SolanaJobAccount {
  id: PublicKey;
  market: PublicKey;
  client: PublicKey;
  node: PublicKey | null;
  ipfsJob: number[];
  ipfsResult: number[];
  price: BN;
  timeout: BN;
  state: SolanaJobState;
  timeCreated: BN;
  timeStart: BN;
  timeEnd: BN;
  minVram: number;
  gpuType: number;
  bump: number;
}

/**
 * Configuration for Solana integration
 */
export interface SolanaJobsConfig {
  /** Solana RPC endpoint */
  rpcUrl: string;

  /** Program ID for hypernode-markets */
  programId: PublicKey;

  /** Market public key */
  marketPubkey: PublicKey;

  /** Optional: Custom commitment level */
  commitment?: web3.Commitment;
}

/**
 * Solana Jobs Service
 *
 * Handles interaction with hypernode-markets program on Solana.
 */
export class SolanaJobsService {
  private connection: Connection;
  private config: Required<SolanaJobsConfig>;

  constructor(config: SolanaJobsConfig) {
    this.config = {
      commitment: 'confirmed',
      ...config,
    };

    this.connection = new Connection(config.rpcUrl, this.config.commitment);
  }

  /**
   * Create a job on-chain with escrowed payment
   *
   * @param intent - Payment intent with signature
   * @param jobConfig - Job configuration
   * @returns Job public key and transaction signature
   */
  async createJob(
    intent: PaymentIntent,
    jobConfig: JobConfig
  ): Promise<{ jobPubkey: PublicKey; signature: string }> {
    try {
      // Generate job ID (deterministic from intent ID)
      const jobId = await this.generateJobId(intent.id);

      // Derive job PDA
      const [jobPubkey, jobBump] = PublicKey.findProgramAddressSync(
        [Buffer.from('job'), jobId.toBuffer()],
        this.config.programId
      );

      // Derive vault PDA
      const [vaultPubkey] = PublicKey.findProgramAddressSync(
        [Buffer.from('vault'), this.config.marketPubkey.toBuffer()],
        this.config.programId
      );

      // Convert IPFS CID to bytes (placeholder - needs real IPFS integration)
      const ipfsJob = this.cidToBytes(jobConfig.model);

      // Get GPU requirements
      const minVram = jobConfig.gpu?.minVram || 8;
      const gpuType = this.getGpuType(jobConfig.gpu?.type);

      // Create instruction data
      // This would normally use the Anchor IDL, but for now we'll use a simplified approach
      // In production, load the actual IDL and use Program.methods

      msg!("Job creation on-chain:");
      msg!(`  Job ID: ${jobId.toBase58()}`);
      msg!(`  Job PDA: ${jobPubkey.toBase58()}`);
      msg!(`  Client: ${intent.payer}`);
      msg!(`  Payment: ${intent.amount} lamports`);
      msg!(`  IPFS: ${jobConfig.model}`);
      msg!(`  Min VRAM: ${minVram} GB`);

      // For now, return mock data
      // TODO: Implement actual transaction when Anchor IDL is available
      return {
        jobPubkey,
        signature: 'mock-signature-' + Date.now(),
      };
    } catch (error) {
      throw new Error(`Failed to create job on-chain: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get job status from on-chain account
   *
   * @param jobPubkey - Job public key
   * @returns Job status
   */
  async getJobStatus(jobPubkey: PublicKey): Promise<JobStatus> {
    try {
      // Fetch job account
      const accountInfo = await this.connection.getAccountInfo(jobPubkey);

      if (!accountInfo) {
        throw new Error('Job not found on-chain');
      }

      // Deserialize job account
      // In production, use Anchor's deserialize method
      const job = this.deserializeJobAccount(accountInfo.data);

      // Map to JobStatus
      return {
        jobId: job.id.toBase58(),
        status: this.mapJobState(job.state),
        paymentStatus: this.getPaymentStatus(job.state),
        worker: job.node?.toBase58(),
        result: job.state === SolanaJobState.Completed ? { ipfsCid: this.bytesToCid(job.ipfsResult) } : undefined,
        error: job.state === SolanaJobState.TimedOut ? 'Job timed out' : undefined,
        createdAt: new Date(job.timeCreated.toNumber() * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: job.timeEnd.toNumber() > 0 ? new Date(job.timeEnd.toNumber() * 1000).toISOString() : undefined,
        metrics: job.state === SolanaJobState.Running || job.state === SolanaJobState.Completed
          ? {
              executionTime: job.timeEnd.toNumber() > 0
                ? job.timeEnd.toNumber() - job.timeStart.toNumber()
                : Date.now() / 1000 - job.timeStart.toNumber(),
            }
          : undefined,
      };
    } catch (error) {
      throw new Error(`Failed to get job status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate deterministic job ID from payment intent ID
   *
   * @param intentId - Payment intent ID
   * @returns Job ID public key
   */
  private async generateJobId(intentId: string): Promise<PublicKey> {
    // Use intent ID to create deterministic job ID
    const hash = Buffer.from(intentId).subarray(0, 32);
    return new PublicKey(hash);
  }

  /**
   * Convert IPFS CID to 32-byte array
   *
   * @param cid - IPFS CID string
   * @returns 32-byte array
   */
  private cidToBytes(cid: string): number[] {
    // Simplified conversion - in production, use proper IPFS CID decoding
    const bytes = Buffer.from(cid).subarray(0, 32);
    const result = new Array(32).fill(0);
    bytes.copy(Buffer.from(result), 0);
    return result;
  }

  /**
   * Convert 32-byte array to IPFS CID
   *
   * @param bytes - 32-byte array
   * @returns IPFS CID string
   */
  private bytesToCid(bytes: number[]): string {
    // Simplified conversion - in production, use proper IPFS CID encoding
    return Buffer.from(bytes).toString('base64');
  }

  /**
   * Get GPU type code
   *
   * @param gpuType - GPU type string
   * @returns GPU type code (0=Any, 1=NVIDIA, 2=AMD)
   */
  private getGpuType(gpuType?: string): number {
    if (!gpuType) return 0;
    if (gpuType.toLowerCase().includes('nvidia')) return 1;
    if (gpuType.toLowerCase().includes('amd')) return 2;
    return 0;
  }

  /**
   * Deserialize job account data
   *
   * @param data - Raw account data
   * @returns Deserialized job account
   */
  private deserializeJobAccount(data: Buffer): SolanaJobAccount {
    // Placeholder deserialization
    // In production, use Anchor's IDL-based deserialization
    throw new Error('Deserialization not yet implemented - requires Anchor IDL');
  }

  /**
   * Map Solana job state to x402 status
   *
   * @param state - Solana job state
   * @returns x402 job status
   */
  private mapJobState(state: SolanaJobState): 'pending' | 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' {
    switch (state) {
      case SolanaJobState.Queued:
        return 'queued';
      case SolanaJobState.Running:
        return 'running';
      case SolanaJobState.Completed:
        return 'completed';
      case SolanaJobState.Stopped:
        return 'cancelled';
      case SolanaJobState.TimedOut:
        return 'failed';
      default:
        return 'pending';
    }
  }

  /**
   * Get payment status based on job state
   *
   * @param state - Solana job state
   * @returns Payment status
   */
  private getPaymentStatus(state: SolanaJobState): 'pending' | 'locked' | 'released' | 'refunded' {
    switch (state) {
      case SolanaJobState.Queued:
      case SolanaJobState.Running:
        return 'locked';
      case SolanaJobState.Completed:
        return 'released';
      case SolanaJobState.Stopped:
      case SolanaJobState.TimedOut:
        return 'refunded';
      default:
        return 'pending';
    }
  }
}

/**
 * Helper to log messages (placeholder for msg! macro)
 */
function msg(message: string) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Solana] ${message}`);
  }
}

/**
 * Create Solana jobs service from environment variables
 *
 * @returns Configured service instance
 */
export function createSolanaJobsService(): SolanaJobsService {
  const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.devnet.solana.com';
  const programId = new PublicKey(
    process.env.NEXT_PUBLIC_MARKETS_PROGRAM_ID || '67UE2LconF9QU5Vobsaf5sXnW9yUisebLj8VmgGWLSdb'
  );
  const marketPubkey = new PublicKey(
    process.env.NEXT_PUBLIC_MARKET_PUBKEY || '11111111111111111111111111111111'
  );

  return new SolanaJobsService({
    rpcUrl,
    programId,
    marketPubkey,
  });
}
