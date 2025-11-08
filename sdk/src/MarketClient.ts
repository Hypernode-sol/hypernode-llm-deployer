import * as anchor from "@coral-xyz/anchor";
import { AnchorProvider, Program, Wallet } from "@coral-xyz/anchor";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import BN from "bn.js";
import {
  HypernodeConfig,
  MarketAccount,
  CreateMarketParams,
  QueueType,
} from "./types";

/**
 * MarketClient - Interact with Hypernode Markets
 */
export class MarketClient {
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
    // TODO: Load actual IDL in production
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
      return {} as Program;
    }
  }

  /**
   * Create a new market
   */
  public async createMarket(
    params: CreateMarketParams,
    marketKeypair?: Keypair
  ): Promise<{ signature: string; market: PublicKey }> {
    const market = marketKeypair || Keypair.generate();

    // Convert params to BN if needed
    const jobPrice = params.jobPrice instanceof BN
      ? params.jobPrice
      : new BN(params.jobPrice);

    const jobTimeout = params.jobTimeout instanceof BN
      ? params.jobTimeout
      : new BN(params.jobTimeout);

    const nodeXhyperMinimum = params.nodeXhyperMinimum instanceof BN
      ? params.nodeXhyperMinimum
      : new BN(params.nodeXhyperMinimum);

    // Derive vault PDA
    const [vault, vaultBump] = await this.getVaultPda(market.publicKey);

    const signature = await this.program.methods
      .createMarket(jobPrice, jobTimeout, nodeXhyperMinimum)
      .accounts({
        market: market.publicKey,
        authority: this.provider.wallet.publicKey,
        vault,
        systemProgram: SystemProgram.programId,
      })
      .signers([market])
      .rpc();

    return {
      signature,
      market: market.publicKey,
    };
  }

  /**
   * Fetch market account
   */
  public async getMarket(marketPubkey?: PublicKey): Promise<MarketAccount> {
    const market = marketPubkey || this.config.market;

    if (!market) {
      throw new Error("Market pubkey not provided and not in config");
    }

    const account = await (this.program.account as any).marketAccount.fetch(market);

    return {
      authority: account.authority,
      jobPrice: account.jobPrice,
      jobTimeout: account.jobTimeout,
      nodeXhyperMinimum: account.nodeXhyperMinimum,
      queue: account.queue || [],
      queueType: this.parseQueueType(account.queueType),
      vault: account.vault,
      vaultBump: account.vaultBump,
      totalJobs: account.totalJobs,
      totalNodes: account.totalNodes,
    };
  }

  /**
   * Get market statistics
   */
  public async getMarketStats(
    marketPubkey?: PublicKey
  ): Promise<{
    totalJobs: number;
    totalNodes: number;
    queueLength: number;
    queueType: QueueType;
    jobPrice: number;
  }> {
    const market = await this.getMarket(marketPubkey);

    return {
      totalJobs: market.totalJobs.toNumber(),
      totalNodes: market.totalNodes.toNumber(),
      queueLength: market.queue.length,
      queueType: market.queueType,
      jobPrice: market.jobPrice.toNumber(),
    };
  }

  /**
   * Get jobs in queue
   */
  public async getQueuedJobs(marketPubkey?: PublicKey): Promise<PublicKey[]> {
    const market = await this.getMarket(marketPubkey);

    if (market.queueType === QueueType.Jobs) {
      return market.queue;
    }

    return [];
  }

  /**
   * Get nodes in queue
   */
  public async getQueuedNodes(marketPubkey?: PublicKey): Promise<PublicKey[]> {
    const market = await this.getMarket(marketPubkey);

    if (market.queueType === QueueType.Nodes) {
      return market.queue;
    }

    return [];
  }

  /**
   * Subscribe to market updates
   */
  public async subscribeToMarket(
    callback: (market: MarketAccount) => void,
    marketPubkey?: PublicKey
  ): Promise<number> {
    const market = marketPubkey || this.config.market;

    if (!market) {
      throw new Error("Market pubkey not provided and not in config");
    }

    return this.connection.onAccountChange(
      market,
      (accountInfo) => {
        try {
          const data = this.program.coder.accounts.decode(
            "marketAccount",
            accountInfo.data
          );

          callback({
            authority: data.authority,
            jobPrice: data.jobPrice,
            jobTimeout: data.jobTimeout,
            nodeXhyperMinimum: data.nodeXhyperMinimum,
            queue: data.queue || [],
            queueType: this.parseQueueType(data.queueType),
            vault: data.vault,
            vaultBump: data.vaultBump,
            totalJobs: data.totalJobs,
            totalNodes: data.totalNodes,
          });
        } catch (error) {
          console.error("Failed to decode market account:", error);
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
   * Get vault PDA for market
   */
  public async getVaultPda(
    marketPubkey?: PublicKey
  ): Promise<[PublicKey, number]> {
    const market = marketPubkey || this.config.market;

    if (!market) {
      throw new Error("Market pubkey not provided and not in config");
    }

    return await PublicKey.findProgramAddress(
      [Buffer.from("vault"), market.toBuffer()],
      this.config.programId
    );
  }

  /**
   * Parse queue type from u8
   */
  private parseQueueType(queueType: number): QueueType {
    switch (queueType) {
      case 0:
        return QueueType.Empty;
      case 1:
        return QueueType.Jobs;
      case 2:
        return QueueType.Nodes;
      default:
        return QueueType.Empty;
    }
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
