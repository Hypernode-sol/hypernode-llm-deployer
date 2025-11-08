import { PublicKey } from "@solana/web3.js";
import axios from "axios";
import { JobDefinition, JobResult, JobContext, JobState, WorkerConfig } from "../types";
import { SolanaClient } from "../solana/SolanaClient";
import { DockerProvider } from "../providers/DockerProvider";
import { SpecsHandler } from "./SpecsHandler";
import { HealthHandler } from "./HealthHandler";

/**
 * JobHandler - Orchestrates job execution lifecycle
 * 1. Fetch job definition from IPFS
 * 2. Validate requirements
 * 3. Execute job in container
 * 4. Upload result to IPFS
 * 5. Submit result to blockchain
 */
export class JobHandler {
  private solanaClient: SolanaClient;
  private dockerProvider: DockerProvider;
  private specsHandler: SpecsHandler;
  private healthHandler: HealthHandler;
  private config: WorkerConfig;
  private activeJobs: Map<string, JobContext> = new Map();

  constructor(
    solanaClient: SolanaClient,
    dockerProvider: DockerProvider,
    specsHandler: SpecsHandler,
    healthHandler: HealthHandler,
    config: WorkerConfig
  ) {
    this.solanaClient = solanaClient;
    this.dockerProvider = dockerProvider;
    this.specsHandler = specsHandler;
    this.healthHandler = healthHandler;
    this.config = config;
  }

  /**
   * Execute a job end-to-end
   */
  public async executeJob(jobPubkey: PublicKey): Promise<void> {
    const jobId = jobPubkey.toString();
    console.log(`\n[JobHandler] Starting job ${jobId}...`);

    try {
      // 1. Fetch job account from blockchain
      console.log(`[JobHandler] Fetching job account...`);
      const jobAccount = await this.solanaClient.fetchJob(jobPubkey);

      // 2. Fetch job definition from IPFS
      console.log(`[JobHandler] Fetching job definition from IPFS...`);
      const definition = await this.fetchJobDefinition(jobAccount.ipfsJob);

      // 3. Validate job requirements
      console.log(`[JobHandler] Validating requirements...`);
      const canRun = await this.validateRequirements(
        jobAccount.minVram,
        jobAccount.gpuType
      );

      if (!canRun) {
        throw new Error(
          `System does not meet job requirements (${jobAccount.minVram}GB VRAM, GPU type ${jobAccount.gpuType})`
        );
      }

      // 4. Claim job on blockchain
      console.log(`[JobHandler] Claiming job on blockchain...`);
      await this.solanaClient.workJob(jobPubkey);

      // 5. Create job context
      const context: JobContext = {
        job_pubkey: jobPubkey,
        definition,
        start_time: new Date(),
        logs: [],
        state: JobState.Running,
      };

      this.activeJobs.set(jobId, context);
      this.healthHandler.incrementActiveJobs();

      // 6. Execute job in container
      console.log(`[JobHandler] Executing job in container...`);
      const result = await this.dockerProvider.executeJob(jobId, definition);

      // 7. Upload result to IPFS
      console.log(`[JobHandler] Uploading result to IPFS...`);
      const ipfsResultCid = await this.uploadJobResult(result);

      // 8. Finish job on blockchain and receive payment
      console.log(`[JobHandler] Finishing job on blockchain...`);
      await this.solanaClient.finishJob(jobPubkey, ipfsResultCid);

      // 9. Update context
      context.state = JobState.Completed;
      this.activeJobs.delete(jobId);
      this.healthHandler.decrementActiveJobs();

      console.log(`[JobHandler] ✅ Job ${jobId} completed successfully!`);
      console.log(`[JobHandler] Exit code: ${result.exit_code}`);
      console.log(`[JobHandler] Execution time: ${result.execution_time}s`);
      console.log(`[JobHandler] IPFS result: ${Buffer.from(ipfsResultCid).toString("hex")}`);
    } catch (error) {
      console.error(`[JobHandler] ❌ Job ${jobId} failed:`, error);

      // Cleanup
      if (this.activeJobs.has(jobId)) {
        this.activeJobs.delete(jobId);
        this.healthHandler.decrementActiveJobs();
      }

      throw error;
    }
  }

  /**
   * Fetch job definition from IPFS
   */
  private async fetchJobDefinition(ipfsJobCid: number[]): Promise<JobDefinition> {
    // Convert CID bytes to string
    const cidHex = Buffer.from(ipfsJobCid).toString("hex");
    const cidUrl = `${this.config.ipfs_gateway}/ipfs/${cidHex}`;

    console.log(`[JobHandler] Fetching from ${cidUrl}...`);

    try {
      const response = await axios.get(cidUrl, { timeout: 30000 });
      return response.data as JobDefinition;
    } catch (error) {
      console.error(`[JobHandler] Failed to fetch job definition from IPFS:`, error);
      throw new Error(`Failed to fetch job definition: ${error}`);
    }
  }

  /**
   * Validate system meets job requirements
   */
  private async validateRequirements(
    minVram: number,
    gpuType: number
  ): Promise<boolean> {
    return await this.specsHandler.meetsJobRequirements(minVram, gpuType);
  }

  /**
   * Upload job result to IPFS
   */
  private async uploadJobResult(result: JobResult): Promise<Buffer> {
    console.log(`[JobHandler] Uploading result to IPFS...`);

    try {
      // Upload to IPFS
      const response = await axios.post(
        this.config.ipfs_upload_url,
        result,
        {
          headers: { "Content-Type": "application/json" },
          timeout: 60000,
        }
      );

      // Get CID from response
      const cid = response.data.cid || response.data.Hash;

      if (!cid) {
        throw new Error("No CID returned from IPFS upload");
      }

      // Convert CID to 32-byte buffer
      // In production, use proper IPFS CID encoding
      const cidBuffer = Buffer.alloc(32);
      Buffer.from(cid, "utf8").copy(cidBuffer);

      return cidBuffer;
    } catch (error) {
      console.error(`[JobHandler] Failed to upload result to IPFS:`, error);
      throw new Error(`Failed to upload result: ${error}`);
    }
  }

  /**
   * Get active job contexts
   */
  public getActiveJobs(): JobContext[] {
    return Array.from(this.activeJobs.values());
  }

  /**
   * Get job context by ID
   */
  public getJobContext(jobId: string): JobContext | undefined {
    return this.activeJobs.get(jobId);
  }

  /**
   * Cancel job (emergency stop)
   */
  public async cancelJob(jobId: string): Promise<void> {
    const context = this.activeJobs.get(jobId);

    if (!context) {
      throw new Error(`Job ${jobId} not found`);
    }

    console.log(`[JobHandler] Cancelling job ${jobId}...`);

    // Stop container if running
    if (context.container_id) {
      await this.dockerProvider.stopContainer(context.container_id);
    }

    // Update context
    context.state = JobState.Stopped;
    this.activeJobs.delete(jobId);
    this.healthHandler.decrementActiveJobs();

    console.log(`[JobHandler] Job ${jobId} cancelled`);
  }
}
