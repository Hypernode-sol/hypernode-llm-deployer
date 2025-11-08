import { PublicKey } from "@solana/web3.js";
import { WorkerConfig } from "./types";
import { SolanaClient } from "./solana/SolanaClient";
import { DockerProvider } from "./providers/DockerProvider";
import { SpecsHandler } from "./handlers/SpecsHandler";
import { HealthHandler } from "./handlers/HealthHandler";
import { JobHandler } from "./handlers/JobHandler";
import { ReputationHandler } from "./handlers/ReputationHandler";

/**
 * NodeManager - Core orchestrator for Hypernode GPU worker
 * Coordinates all handlers and manages the worker lifecycle
 */
export class NodeManager {
  private config: WorkerConfig;
  private solanaClient: SolanaClient;
  private dockerProvider: DockerProvider;
  private specsHandler: SpecsHandler;
  private healthHandler: HealthHandler;
  private jobHandler: JobHandler;
  private reputationHandler: ReputationHandler;

  private isRunning: boolean = false;
  private pollingInterval?: NodeJS.Timeout;
  private healthInterval?: NodeJS.Timeout;
  private reputationInterval?: NodeJS.Timeout;

  constructor(config: WorkerConfig) {
    this.config = config;

    // Initialize components
    this.solanaClient = new SolanaClient(config);
    this.dockerProvider = new DockerProvider();
    this.specsHandler = new SpecsHandler();
    this.healthHandler = new HealthHandler(this.specsHandler);
    this.reputationHandler = new ReputationHandler(
      this.solanaClient.getConnection(),
      this.solanaClient.getKeypair(),
      this.config.marketsProgramId
    );
    this.jobHandler = new JobHandler(
      this.solanaClient,
      this.dockerProvider,
      this.specsHandler,
      this.healthHandler,
      config
    );
  }

  /**
   * Start the worker node
   */
  public async start(): Promise<void> {
    console.log("\n🚀 Starting Hypernode Worker...\n");

    try {
      // 1. Detect system specs
      console.log("📊 Detecting system specifications...");
      const specs = await this.specsHandler.getSystemSpecs();

      if (specs.gpus.length === 0) {
        throw new Error("No GPUs detected! This worker requires at least one GPU.");
      }

      // 2. Check Docker/Podman
      if (!specs.container_runtime) {
        throw new Error(
          "No container runtime detected! Please install Docker or Podman."
        );
      }

      // 3. Check Solana connection
      console.log("\n🔗 Connecting to Solana...");
      const balance = await this.solanaClient.getBalance();
      console.log(`Wallet: ${this.solanaClient.getNodePublicKey().toString()}`);
      console.log(`Balance: ${balance.toFixed(4)} SOL`);

      if (balance < 0.01) {
        console.warn("⚠️  Warning: Low SOL balance. You may need more SOL for transactions.");
      }

      // 4. Check xHYPER stake
      console.log("\n💎 Checking xHYPER stake...");
      const hasStake = await this.solanaClient.checkStake();

      if (!hasStake) {
        throw new Error(
          "Insufficient xHYPER stake. Please stake HYPER tokens to run a node."
        );
      }

      // 5. Initialize reputation tracking
      console.log("\n📊 Initializing reputation tracking...");
      try {
        await this.reputationHandler.initialize();
        this.reputationHandler.printStats();
      } catch (error) {
        console.warn("⚠️  Could not initialize reputation (may already exist)");
      }

      // 6. List node in market queue
      console.log("\n📝 Registering node in market...");
      await this.solanaClient.listNode();
      console.log("✅ Node registered successfully!");

      // 7. Start polling for jobs
      console.log("\n🔄 Starting job polling...");
      this.isRunning = true;
      this.startPolling();

      // 8. Start health monitoring
      console.log("💓 Starting health monitoring...");
      this.startHealthMonitoring();

      // 9. Start reputation monitoring
      console.log("📊 Starting reputation tracking...");
      this.startReputationMonitoring();

      console.log("\n✨ Worker started successfully!");
      console.log("👀 Watching for jobs...\n");
    } catch (error) {
      console.error("\n❌ Failed to start worker:", error);
      throw error;
    }
  }

  /**
   * Stop the worker node
   */
  public async stop(): Promise<void> {
    console.log("\n🛑 Stopping Hypernode Worker...");

    this.isRunning = false;

    // Stop polling
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    // Stop health monitoring
    if (this.healthInterval) {
      clearInterval(this.healthInterval);
    }

    // Stop reputation monitoring
    if (this.reputationInterval) {
      clearInterval(this.reputationInterval);
    }

    // Wait for active jobs to complete
    const activeJobs = this.jobHandler.getActiveJobs();
    if (activeJobs.length > 0) {
      console.log(`⏳ Waiting for ${activeJobs.length} active jobs to complete...`);

      // TODO: Implement graceful shutdown with timeout
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    console.log("✅ Worker stopped successfully!");
  }

  /**
   * Start polling for jobs
   */
  private startPolling(): void {
    const poll = async () => {
      if (!this.isRunning) return;

      try {
        // Check if we can accept new jobs
        const canAccept = await this.healthHandler.canAcceptNewJob();

        if (!canAccept) {
          return;
        }

        // Poll for available jobs
        const jobs = await this.solanaClient.pollForJobs();

        if (jobs.length === 0) {
          // No jobs available - list node in queue if not already
          // This is handled by the initial listNode() call
          return;
        }

        // Process first available job
        const jobPubkey = jobs[0];
        console.log(`\n🎯 New job available: ${jobPubkey.toString()}`);

        // Execute job (async)
        this.jobHandler.executeJob(jobPubkey).catch((error) => {
          console.error(`Failed to execute job ${jobPubkey.toString()}:`, error);
        });
      } catch (error) {
        console.error("[NodeManager] Polling error:", error);
      }
    };

    // Initial poll
    poll();

    // Setup interval
    this.pollingInterval = setInterval(poll, this.config.polling_interval);
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    const monitor = async () => {
      if (!this.isRunning) return;

      try {
        await this.healthHandler.logHealthStatus();
      } catch (error) {
        console.error("[NodeManager] Health monitoring error:", error);
      }
    };

    // Initial health check
    monitor();

    // Setup interval
    this.healthInterval = setInterval(
      monitor,
      this.config.health_check_interval
    );
  }

  /**
   * Get current health status
   */
  public async getHealth() {
    return await this.healthHandler.getHealthStatus();
  }

  /**
   * Get active jobs
   */
  public getActiveJobs() {
    return this.jobHandler.getActiveJobs();
  }

  /**
   * Start reputation monitoring
   */
  private startReputationMonitoring(): void {
    const monitor = async () => {
      if (!this.isRunning) return;

      try {
        await this.reputationHandler.updateUptime();
      } catch (error) {
        console.error("[NodeManager] Reputation monitoring error:", error);
      }
    };

    // Initial update
    monitor();

    // Setup interval (every 5 minutes)
    this.reputationInterval = setInterval(monitor, 5 * 60 * 1000);
  }

  /**
   * Get current reputation stats
   */
  public getReputationStats() {
    return this.reputationHandler.getStats();
  }

  /**
   * Get system specs
   */
  public async getSpecs() {
    return await this.specsHandler.getSystemSpecs();
  }
}
