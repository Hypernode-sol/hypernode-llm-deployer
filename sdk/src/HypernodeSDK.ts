import { Wallet } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { MarketClient } from "./MarketClient";
import { JobClient } from "./JobClient";
import { StakingClient } from "./StakingClient";
import { RewardsClient } from "./RewardsClient";
import { HypernodeConfig } from "./types";
import fs from "fs";

// Default Program IDs (localnet)
const DEFAULT_MARKETS_PROGRAM_ID = "HYPERMarket11111111111111111111111111111111";
const DEFAULT_STAKING_PROGRAM_ID = "HYPERStake1111111111111111111111111111111111";
const DEFAULT_REWARDS_PROGRAM_ID = "HYPERReward1111111111111111111111111111111111";

// HYPER Token Mint Address (Solana Mainnet)
const HYPER_TOKEN_MINT = "92s9qna3djkMncZzkacyNQ38UKnNXZFh4Jgqe3Cmpump";

/**
 * HypernodeSDK - Main SDK class
 * Provides unified access to all Hypernode functionality
 */
export class HypernodeSDK {
  public market: MarketClient;
  public jobs: JobClient;
  public staking?: StakingClient;
  public rewards?: RewardsClient;
  private wallet: Wallet;
  private config: HypernodeConfig;

  constructor(config: HypernodeConfig, wallet: Wallet) {
    this.config = config;
    this.wallet = wallet;

    // Initialize markets and jobs clients (always available)
    this.market = new MarketClient(config, wallet);
    this.jobs = new JobClient(config, wallet);

    // Initialize staking client if program ID provided
    if (config.stakingProgramId && config.tokenMint) {
      const connection = new Connection(config.rpcUrl);
      this.staking = new StakingClient({
        connection,
        wallet: wallet.payer,
        programId: config.stakingProgramId,
        tokenMint: config.tokenMint,
      });
    }

    // Initialize rewards client if program ID provided
    if (config.rewardsProgramId && config.tokenMint) {
      const connection = new Connection(config.rpcUrl);
      this.rewards = new RewardsClient({
        connection,
        wallet: wallet.payer,
        programId: config.rewardsProgramId,
        tokenMint: config.tokenMint,
      });
    }
  }

  /**
   * Create SDK instance from keypair file
   */
  public static fromKeypairFile(
    keypairPath: string,
    config: Omit<HypernodeConfig, "programId"> & { programId?: PublicKey | string }
  ): HypernodeSDK {
    // Load keypair
    const keypairData = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
    const keypair = Keypair.fromSecretKey(new Uint8Array(keypairData));
    const wallet = new Wallet(keypair);

    // Parse program ID
    const programId =
      typeof config.programId === "string"
        ? new PublicKey(config.programId)
        : config.programId || new PublicKey("HYPERMarket11111111111111111111111111111111");

    const fullConfig: HypernodeConfig = {
      ...config,
      programId,
    };

    return new HypernodeSDK(fullConfig, wallet);
  }

  /**
   * Create SDK instance from keypair
   */
  public static fromKeypair(
    keypair: Keypair,
    config: Omit<HypernodeConfig, "programId"> & { programId?: PublicKey | string }
  ): HypernodeSDK {
    const wallet = new Wallet(keypair);

    // Parse program ID
    const programId =
      typeof config.programId === "string"
        ? new PublicKey(config.programId)
        : config.programId || new PublicKey("HYPERMarket11111111111111111111111111111111");

    const fullConfig: HypernodeConfig = {
      ...config,
      programId,
    };

    return new HypernodeSDK(fullConfig, wallet);
  }

  /**
   * Get wallet public key
   */
  public getPublicKey(): PublicKey {
    return this.wallet.publicKey;
  }

  /**
   * Get wallet
   */
  public getWallet(): Wallet {
    return this.wallet;
  }

  /**
   * Get config
   */
  public getConfig(): HypernodeConfig {
    return this.config;
  }
}
