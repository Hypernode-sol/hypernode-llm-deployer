import * as anchor from "@coral-xyz/anchor";
import { AnchorProvider, Program, Wallet } from "@coral-xyz/anchor";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import BN from "bn.js";
import axios from "axios";
import {
  HypernodeConfig,
  JobAccount,
  JobDefinition,
  JobResult,
  JobState,
  CreateJobParams,
  GpuType,
} from "./types";

/**
 * JobClient - Create and manage GPU jobs
 */
export class JobClient {
  private connection: Connection;
  private provider: AnchorProvider;
  private program: Program;
  private config: HypernodeConfig;

  constructor(
    config: HypernodeConfig,
    wallet: Wallet
  ) {
    this.config = config;
    this.connection = new Connection(config.rpcUrl, "confirmed");
    this.provider = new AnchorProvider(this.connection, wallet, {
      commitment: "confirmed",
    });

    // Load program
    this.program = this.loadProgram();
  }

  /**
   * Load Markets Program
   */
  private loadProgram(): Program {
    try {
      const idl = require("../idl/hypernode_markets.json");
      return new Program(idl, this.provider);
    } catch (error) {
      // Return empty program if IDL not found
      return {} as Program;
    }
  }

  /**
   * Create a new job
   */
  public async createJob(
    params: CreateJobParams,
    marketPubkey?: PublicKey
  ): Promise<{ signature: string; job: PublicKey; jobId: PublicKey }> {
    const market = marketPubkey || this.config.market;

    if (!market) {
      throw new Error("Market pubkey not provided and not in config");
    }

    // Generate job ID if not provided
    const jobId = params.jobId || Keypair.generate().publicKey;

    // Derive job PDA
    const [jobPda, jobBump] = await this.getJobPda(jobId);

    // Derive vault PDA
    const [vault, vaultBump] = await PublicKey.findProgramAddress(
      [Buffer.from("vault"), market.toBuffer()],
      this.config.programId
    );

    // Create job definition
    const definition: JobDefinition = {
      model: params.model,
      framework: params.framework,
      operations: params.operations,
      input: params.input,
      env: params.env,
      timeout: params.timeout,
    };

    // Upload to IPFS
    const ipfsJobCid = await this.uploadToIpfs(definition);

    // Convert IPFS CID to 32-byte array
    const ipfsJobBytes = this.cidToBytes(ipfsJobCid);

    const signature = await this.program.methods
      .createJob(
        jobId,
        ipfsJobBytes,
        params.minVram,
        params.gpuType || GpuType.Any
      )
      .accounts({
        job: jobPda,
        market,
        client: this.provider.wallet.publicKey,
        vault,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return {
      signature,
      job: jobPda,
      jobId,
    };
  }

  /**
   * Get job account
   */
  public async getJob(jobPubkey: PublicKey): Promise<JobAccount> {
    const account = await (this.program.account as any).jobAccount.fetch(jobPubkey);

    return {
      id: account.id,
      market: account.market,
      client: account.client,
      node: account.node || null,
      ipfsJob: account.ipfsJob,
      ipfsResult: account.ipfsResult,
      price: account.price,
      timeout: account.timeout,
      state: this.parseJobState(account.state),
      timeCreated: account.timeCreated,
      timeStart: account.timeStart,
      timeEnd: account.timeEnd,
      minVram: account.minVram,
      gpuType: account.gpuType,
      bump: account.bump,
    };
  }

  /**
   * Get job definition from IPFS
   */
  public async getJobDefinition(jobPubkey: PublicKey): Promise<JobDefinition> {
    const job = await this.getJob(jobPubkey);
    const cid = this.bytesToCid(job.ipfsJob);
    return await this.fetchFromIpfs(cid);
  }

  /**
   * Get job result from IPFS
   */
  public async getJobResult(jobPubkey: PublicKey): Promise<JobResult | null> {
    const job = await this.getJob(jobPubkey);

    // Check if job has result
    if (!job.ipfsResult || job.ipfsResult.every((b) => b === 0)) {
      return null;
    }

    const cid = this.bytesToCid(job.ipfsResult);
    return await this.fetchFromIpfs(cid);
  }

  /**
   * Wait for job completion
   */
  public async waitForCompletion(
    jobPubkey: PublicKey,
    timeoutMs: number = 600000 // 10 minutes
  ): Promise<JobAccount> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const job = await this.getJob(jobPubkey);

      if (
        job.state === JobState.Completed ||
        job.state === JobState.Stopped ||
        job.state === JobState.TimedOut
      ) {
        return job;
      }

      // Wait 5 seconds before checking again
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    throw new Error(`Job ${jobPubkey.toString()} did not complete within timeout`);
  }

  /**
   * Subscribe to job updates
   */
  public async subscribeToJob(
    jobPubkey: PublicKey,
    callback: (job: JobAccount) => void
  ): Promise<number> {
    return this.connection.onAccountChange(
      jobPubkey,
      (accountInfo) => {
        try {
          const data = this.program.coder.accounts.decode(
            "jobAccount",
            accountInfo.data
          );

          callback({
            id: data.id,
            market: data.market,
            client: data.client,
            node: data.node || null,
            ipfsJob: data.ipfsJob,
            ipfsResult: data.ipfsResult,
            price: data.price,
            timeout: data.timeout,
            state: this.parseJobState(data.state),
            timeCreated: data.timeCreated,
            timeStart: data.timeStart,
            timeEnd: data.timeEnd,
            minVram: data.minVram,
            gpuType: data.gpuType,
            bump: data.bump,
          });
        } catch (error) {
          console.error("Failed to decode job account:", error);
        }
      },
      "confirmed"
    );
  }

  /**
   * Unsubscribe from updates
   */
  public async unsubscribe(subscriptionId: number): Promise<void> {
    await this.connection.removeAccountChangeListener(subscriptionId);
  }

  /**
   * Get job PDA
   */
  public async getJobPda(jobId: PublicKey): Promise<[PublicKey, number]> {
    return await PublicKey.findProgramAddress(
      [Buffer.from("job"), jobId.toBuffer()],
      this.config.programId
    );
  }

  /**
   * Cancel a queued job and get refund
   * Can only be called by the job creator
   */
  public async cancelJob(
    jobPubkey: PublicKey,
    marketPubkey?: PublicKey
  ): Promise<string> {
    const market = marketPubkey || this.config.market;

    if (!market) {
      throw new Error("Market pubkey not provided and not in config");
    }

    // Get job to verify it's queued
    const job = await this.getJob(jobPubkey);

    if (job.state !== JobState.Queued) {
      throw new Error(`Job is not in queued state (current: ${job.state})`);
    }

    // Derive vault PDA
    const [vault, vaultBump] = await PublicKey.findProgramAddress(
      [Buffer.from("vault"), market.toBuffer()],
      this.config.programId
    );

    const signature = await this.program.methods
      .cancelJob()
      .accounts({
        job: jobPubkey,
        market,
        client: this.provider.wallet.publicKey,
        vault,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return signature;
  }

  /**
   * Mark job as timed out and get refund
   * Can be called by anyone if job has exceeded timeout
   */
  public async timeoutJob(
    jobPubkey: PublicKey,
    marketPubkey?: PublicKey
  ): Promise<string> {
    const market = marketPubkey || this.config.market;

    if (!market) {
      throw new Error("Market pubkey not provided and not in config");
    }

    // Get job account
    const job = await this.getJob(jobPubkey);

    if (job.state !== JobState.Running) {
      throw new Error(`Job is not in running state (current: ${job.state})`);
    }

    // Check if job has timed out
    const currentTime = Math.floor(Date.now() / 1000);
    const elapsed = currentTime - job.timeStart.toNumber();

    if (elapsed < job.timeout.toNumber()) {
      throw new Error(
        `Job has not timed out yet (elapsed: ${elapsed}s, timeout: ${job.timeout.toNumber()}s)`
      );
    }

    // Derive vault PDA
    const [vault, vaultBump] = await PublicKey.findProgramAddress(
      [Buffer.from("vault"), market.toBuffer()],
      this.config.programId
    );

    const signature = await this.program.methods
      .timeoutJob()
      .accounts({
        job: jobPubkey,
        market,
        client: job.client,
        vault,
        caller: this.provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return signature;
  }

  /**
   * Upload data to IPFS
   */
  private async uploadToIpfs(data: any): Promise<string> {
    const ipfsUrl = this.config.ipfsUploadUrl || "https://api.pinata.cloud/pinning/pinJSONToIPFS";

    try {
      const response = await axios.post(ipfsUrl, data, {
        headers: { "Content-Type": "application/json" },
      });

      return response.data.IpfsHash || response.data.cid;
    } catch (error) {
      throw new Error(`Failed to upload to IPFS: ${error}`);
    }
  }

  /**
   * Fetch data from IPFS
   */
  private async fetchFromIpfs(cid: string): Promise<any> {
    const ipfsGateway = this.config.ipfsGateway || "https://ipfs.io";
    const url = `${ipfsGateway}/ipfs/${cid}`;

    try {
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch from IPFS: ${error}`);
    }
  }

  /**
   * Convert CID to 32-byte array
   */
  private cidToBytes(cid: string): number[] {
    const buffer = Buffer.alloc(32);
    Buffer.from(cid, "utf8").copy(buffer);
    return Array.from(buffer);
  }

  /**
   * Convert 32-byte array to CID
   */
  private bytesToCid(bytes: number[]): string {
    return Buffer.from(bytes).toString("utf8").replace(/\0/g, "");
  }

  /**
   * Parse job state from account data
   */
  private parseJobState(state: any): JobState {
    if (state.queued !== undefined) return JobState.Queued;
    if (state.running !== undefined) return JobState.Running;
    if (state.completed !== undefined) return JobState.Completed;
    if (state.stopped !== undefined) return JobState.Stopped;
    if (state.timedOut !== undefined) return JobState.TimedOut;
    return JobState.Queued;
  }

  /**
   * Get connection
   */
  public getConnection(): Connection {
    return this.connection;
  }

  /**
   * Get provider
   */
  public getProvider(): AnchorProvider {
    return this.provider;
  }
}
