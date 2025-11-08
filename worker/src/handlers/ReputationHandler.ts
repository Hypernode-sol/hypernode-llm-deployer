import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";

export interface ReputationStats {
  totalJobs: number;
  failedJobs: number;
  timeoutJobs: number;
  avgResponseTime: number;
  totalUptime: number;
  lastActive: number;
  reputationScore: number;
  tier: number;
  totalRevenue: number;
}

export class ReputationHandler {
  private connection: Connection;
  private wallet: Wallet;
  private program: Program;
  private nodePublicKey: PublicKey;
  private reputationPda: PublicKey | null = null;

  // Local tracking
  private stats: ReputationStats = {
    totalJobs: 0,
    failedJobs: 0,
    timeoutJobs: 0,
    avgResponseTime: 0,
    totalUptime: 0,
    lastActive: Date.now(),
    reputationScore: 1000,
    tier: 4,
    totalRevenue: 0,
  };

  constructor(
    connection: Connection,
    keypair: Keypair,
    programId: PublicKey
  ) {
    this.connection = connection;
    this.wallet = new Wallet(keypair);
    this.nodePublicKey = keypair.publicKey;

    const provider = new AnchorProvider(
      connection,
      this.wallet,
      { commitment: "confirmed" }
    );

    this.program = new Program(
      require("../../target/idl/hypernode_markets.json"),
      provider
    );
  }

  /**
   * Initialize reputation on-chain
   */
  async initialize(): Promise<void> {
    try {
      // Derive reputation PDA
      [this.reputationPda] = await PublicKey.findProgramAddress(
        [Buffer.from("reputation"), this.nodePublicKey.toBuffer()],
        this.program.programId
      );

      // Initialize on-chain reputation
      await this.program.methods
        .updateReputation()
        .accounts({
          reputation: this.reputationPda,
          authority: this.nodePublicKey,
          systemProgram: PublicKey.default,
        })
        .rpc();

      console.log("✅ Reputation initialized on-chain");
      console.log("   PDA:", this.reputationPda.toString());

      // Fetch initial stats
      await this.fetchStats();
    } catch (error) {
      console.error("Failed to initialize reputation:", error);
      throw error;
    }
  }

  /**
   * Fetch reputation stats from blockchain
   */
  async fetchStats(): Promise<ReputationStats> {
    if (!this.reputationPda) {
      throw new Error("Reputation not initialized");
    }

    try {
      const accountData = await (this.program.account as any).nodeReputation.fetch(
        this.reputationPda
      );

      this.stats = {
        totalJobs: accountData.totalJobs.toNumber(),
        failedJobs: accountData.failedJobs.toNumber(),
        timeoutJobs: accountData.timeoutJobs.toNumber(),
        avgResponseTime: accountData.avgResponseTime.toNumber(),
        totalUptime: accountData.totalUptime.toNumber(),
        lastActive: accountData.lastActive.toNumber(),
        reputationScore: accountData.reputationScore,
        tier: accountData.tier,
        totalRevenue: accountData.totalRevenue.toNumber(),
      };

      return this.stats;
    } catch (error) {
      console.error("Failed to fetch reputation stats:", error);
      throw error;
    }
  }

  /**
   * Record successful job completion
   */
  async recordSuccess(executionTime: number, revenue: number): Promise<void> {
    console.log("📊 Recording successful job completion");
    console.log(`   Execution time: ${executionTime}ms`);
    console.log(`   Revenue: ${revenue} lamports`);

    // Update local stats
    this.stats.totalJobs++;
    this.stats.totalRevenue += revenue;

    // Update average response time (rolling average)
    if (this.stats.avgResponseTime === 0) {
      this.stats.avgResponseTime = executionTime;
    } else {
      this.stats.avgResponseTime =
        (this.stats.avgResponseTime * 9 + executionTime) / 10;
    }

    // Update on-chain (in background to not block)
    this.updateOnChain().catch((err) =>
      console.error("Failed to update on-chain reputation:", err)
    );
  }

  /**
   * Record failed job
   */
  async recordFailure(): Promise<void> {
    console.log("❌ Recording job failure");

    this.stats.failedJobs++;

    // Update on-chain
    this.updateOnChain().catch((err) =>
      console.error("Failed to update on-chain reputation:", err)
    );
  }

  /**
   * Record timeout
   */
  async recordTimeout(): Promise<void> {
    console.log("⏱️ Recording job timeout");

    this.stats.timeoutJobs++;

    // Update on-chain
    this.updateOnChain().catch((err) =>
      console.error("Failed to update on-chain reputation:", err)
    );
  }

  /**
   * Update uptime tracking
   */
  async updateUptime(): Promise<void> {
    const now = Date.now();
    const elapsed = (now - this.stats.lastActive) / 1000; // Convert to seconds

    // Only count as uptime if less than 1 hour gap
    if (elapsed < 3600) {
      this.stats.totalUptime += Math.floor(elapsed);
    }

    this.stats.lastActive = now;

    // Periodic on-chain update (every 5 minutes)
    if (elapsed >= 300) {
      this.updateOnChain().catch((err) =>
        console.error("Failed to update on-chain uptime:", err)
      );
    }
  }

  /**
   * Update reputation on-chain
   */
  private async updateOnChain(): Promise<void> {
    if (!this.reputationPda) {
      console.warn("Reputation PDA not initialized, skipping on-chain update");
      return;
    }

    try {
      await this.program.methods
        .updateReputation()
        .accounts({
          reputation: this.reputationPda,
          authority: this.nodePublicKey,
          systemProgram: PublicKey.default,
        })
        .rpc();

      // Fetch updated stats
      await this.fetchStats();

      console.log("✅ On-chain reputation updated");
      this.printStats();
    } catch (error) {
      console.error("Failed to update reputation on-chain:", error);
      throw error;
    }
  }

  /**
   * Get current stats
   */
  getStats(): ReputationStats {
    return { ...this.stats };
  }

  /**
   * Calculate completion rate
   */
  getCompletionRate(): number {
    const total =
      this.stats.totalJobs + this.stats.failedJobs + this.stats.timeoutJobs;
    if (total === 0) return 100;

    return (this.stats.totalJobs / total) * 100;
  }

  /**
   * Get tier name
   */
  getTierName(): string {
    const tiers = ["Starter", "Bronze", "Silver", "Gold", "Diamond"];
    return tiers[this.stats.tier] || "Unknown";
  }

  /**
   * Print current stats
   */
  printStats(): void {
    console.log("\n" + "=".repeat(50));
    console.log("📊 REPUTATION STATS");
    console.log("=".repeat(50));
    console.log(`Reputation Score: ${this.stats.reputationScore}/1000`);
    console.log(`Tier: ${this.getTierName()} (${this.stats.tier})`);
    console.log(`Completion Rate: ${this.getCompletionRate().toFixed(2)}%`);
    console.log(`Total Jobs: ${this.stats.totalJobs}`);
    console.log(`Failed Jobs: ${this.stats.failedJobs}`);
    console.log(`Timeout Jobs: ${this.stats.timeoutJobs}`);
    console.log(
      `Avg Response Time: ${this.stats.avgResponseTime.toFixed(0)}ms`
    );
    console.log(
      `Total Uptime: ${Math.floor(this.stats.totalUptime / 3600)}h ${
        Math.floor(this.stats.totalUptime / 60) % 60
      }m`
    );
    console.log(
      `Total Revenue: ${(this.stats.totalRevenue / 1e9).toFixed(4)} SOL`
    );
    console.log("=".repeat(50) + "\n");
  }

  /**
   * Check if in good standing
   */
  isGoodStanding(): boolean {
    return this.stats.reputationScore >= 500; // At least Silver tier
  }

  /**
   * Get priority boost
   */
  getPriorityBoost(): number {
    const boosts = [0, 1, 2, 5, 10];
    return boosts[this.stats.tier] || 0;
  }
}
