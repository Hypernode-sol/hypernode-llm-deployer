import * as anchor from "@coral-xyz/anchor";
import { AnchorProvider, Program, Wallet } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { WorkerConfig, JobState } from "../types";
import fs from "fs";

/**
 * Solana client for interacting with Markets Program
 */
export class SolanaClient {
  private connection: Connection;
  private wallet: Wallet;
  private provider: AnchorProvider;
  private program: Program;
  private config: WorkerConfig;
  private keypair: Keypair;

  constructor(config: WorkerConfig) {
    this.config = config;

    // Load wallet keypair
    const keypairData = JSON.parse(fs.readFileSync(config.keypair_path, "utf-8"));
    this.keypair = Keypair.fromSecretKey(new Uint8Array(keypairData));

    // Setup connection and provider
    this.connection = new Connection(config.rpc_url, "confirmed");
    this.wallet = new Wallet(this.keypair);
    this.provider = new AnchorProvider(this.connection, this.wallet, {
      commitment: "confirmed",
    });

    // Load program IDL (would need to be imported)
    // For now, we'll create a simplified interface
    // In production, import the generated IDL from anchor build
    this.program = this.loadProgram();
  }

  /**
   * Load Markets Program
   */
  private loadProgram(): Program {
    // TODO: Import actual IDL from target/idl/hypernode_markets.json
    // For now, returning a mock
    return {} as Program;
  }

  /**
   * Get node's public key
   */
  public getNodePublicKey(): PublicKey {
    return this.wallet.publicKey;
  }

  /**
   * List node in queue (register to wait for jobs)
   */
  public async listNode(): Promise<string> {
    console.log(`[Solana] Listing node in market queue...`);

    try {
      const tx = await this.program.methods
        .listNode()
        .accounts({
          market: this.config.market,
          node: this.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log(`[Solana] Node listed successfully: ${tx}`);
      return tx;
    } catch (error) {
      console.error(`[Solana] Failed to list node:`, error);
      throw error;
    }
  }

  /**
   * Claim a job from the queue
   */
  public async workJob(jobPubkey: PublicKey): Promise<string> {
    console.log(`[Solana] Claiming job ${jobPubkey.toString()}...`);

    try {
      const tx = await this.program.methods
        .workJob()
        .accounts({
          job: jobPubkey,
          market: this.config.market,
          node: this.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log(`[Solana] Job claimed successfully: ${tx}`);
      return tx;
    } catch (error) {
      console.error(`[Solana] Failed to claim job:`, error);
      throw error;
    }
  }

  /**
   * Finish a job and receive payment
   */
  public async finishJob(
    jobPubkey: PublicKey,
    ipfsResultCid: Buffer
  ): Promise<string> {
    console.log(`[Solana] Finishing job ${jobPubkey.toString()}...`);

    // Get vault PDA
    const [vaultPda] = await PublicKey.findProgramAddress(
      [Buffer.from("vault"), this.config.market.toBuffer()],
      this.config.program_id
    );

    try {
      const tx = await this.program.methods
        .finishJob(Array.from(ipfsResultCid))
        .accounts({
          job: jobPubkey,
          market: this.config.market,
          node: this.wallet.publicKey,
          nodeAccount: this.wallet.publicKey,
          vault: vaultPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log(`[Solana] Job finished successfully: ${tx}`);
      return tx;
    } catch (error) {
      console.error(`[Solana] Failed to finish job:`, error);
      throw error;
    }
  }

  /**
   * Fetch job account
   */
  public async fetchJob(jobPubkey: PublicKey): Promise<any> {
    try {
      const jobAccount = await (this.program.account as any).jobAccount.fetch(jobPubkey);
      return jobAccount;
    } catch (error) {
      console.error(`[Solana] Failed to fetch job:`, error);
      throw error;
    }
  }

  /**
   * Fetch market account
   */
  public async fetchMarket(): Promise<any> {
    try {
      const marketAccount = await (this.program.account as any).marketAccount.fetch(
        this.config.market
      );
      return marketAccount;
    } catch (error) {
      console.error(`[Solana] Failed to fetch market:`, error);
      throw error;
    }
  }

  /**
   * Poll for new jobs in the queue
   * Returns job pubkeys that are queued
   */
  public async pollForJobs(): Promise<PublicKey[]> {
    try {
      const market = await this.fetchMarket();

      // Check if queue has jobs
      if (market.queueType === 1) {
        // QUEUE_TYPE_JOBS
        return market.queue || [];
      }

      return [];
    } catch (error) {
      console.error(`[Solana] Failed to poll for jobs:`, error);
      return [];
    }
  }

  /**
   * Subscribe to job state changes
   */
  public async subscribeToJob(
    jobPubkey: PublicKey,
    callback: (job: any) => void
  ): Promise<number> {
    return this.connection.onAccountChange(
      jobPubkey,
      (accountInfo) => {
        try {
          // Decode job account
          const job = this.program.coder.accounts.decode(
            "jobAccount",
            accountInfo.data
          );
          callback(job);
        } catch (error) {
          console.error(`[Solana] Failed to decode job account:`, error);
        }
      },
      "confirmed"
    );
  }

  /**
   * Unsubscribe from account changes
   */
  public async unsubscribe(subscriptionId: number): Promise<void> {
    await this.connection.removeAccountChangeListener(subscriptionId);
  }

  /**
   * Get SOL balance
   */
  public async getBalance(): Promise<number> {
    const balance = await this.connection.getBalance(this.wallet.publicKey);
    return balance / anchor.web3.LAMPORTS_PER_SOL;
  }

  /**
   * Check if node has sufficient xHYPER stake
   * TODO: Integrate with hypernode-staking program
   */
  public async checkStake(): Promise<boolean> {
    // Placeholder - would query staking program
    console.log(`[Solana] Checking xHYPER stake...`);
    return true;
  }

  /**
   * Get Connection instance
   */
  public getConnection(): Connection {
    return this.connection;
  }

  /**
   * Get Keypair
   */
  public getKeypair(): Keypair {
    return this.keypair;
  }
}
