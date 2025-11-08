import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  Keypair,
} from "@solana/web3.js";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from "@solana/spl-token";

export interface RewardsInfo {
  authority: PublicKey;
  initialReflection: BN;
  xhyper: BN;
  totalClaimed: BN;
  lastClaim: BN;
  bump: number;
  claimable: BN;
  sharePercentage: number;
}

export interface ReflectionInfo {
  authority: PublicKey;
  rate: BN;
  totalReflection: BN;
  totalXhyper: BN;
  totalRewardsDistributed: BN;
  bump: number;
}

export interface RewardsConfig {
  connection: Connection;
  wallet: Keypair;
  programId: PublicKey;
  tokenMint: PublicKey;
}

/**
 * RewardsClient - Interact with Hypernode Rewards Program
 *
 * Features:
 * - Register stake to receive rewards
 * - Claim accumulated rewards
 * - Query claimable rewards and reflection stats
 * - O(1) gas-efficient distribution algorithm
 */
export class RewardsClient {
  private connection: Connection;
  private wallet: Keypair;
  private program: Program;
  private tokenMint: PublicKey;

  constructor(config: RewardsConfig) {
    this.connection = config.connection;
    this.wallet = config.wallet;
    this.tokenMint = config.tokenMint;

    const provider = new AnchorProvider(
      this.connection,
      { publicKey: this.wallet.publicKey, signTransaction: async (tx: any) => tx, signAllTransactions: async (txs: any) => txs } as any,
      { commitment: "confirmed" }
    );

    try {
      const idl = require("../idl/hypernode_rewards.json");
      this.program = new Program(idl, provider);
    } catch (error) {
      this.program = {} as Program;
    }
  }

  /**
   * Register stake in rewards system
   * Should be called after staking in Staking Program
   *
   * @param xhyper - xHYPER balance from stake account
   * @returns Transaction signature
   *
   * @example
   * ```typescript
   * // After staking
   * const stakeInfo = await stakingClient.getStakeInfo();
   * const txid = await rewardsClient.registerStake(stakeInfo.xhyper);
   * ```
   */
  public async registerStake(xhyper: BN): Promise<string> {
    const [reflectionAccount] = await this.getReflectionPDA();
    const [userRewardsAccount] = await this.getUserRewardsPDA(this.wallet.publicKey);

    const tx = await this.program.methods
      .registerStake(xhyper)
      .accounts({
        reflectionAccount,
        userRewardsAccount,
        authority: this.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx;
  }

  /**
   * Claim accumulated rewards
   * Transfers proportional share of rewards to user's token account
   *
   * @returns Transaction signature and amount claimed
   */
  public async claimRewards(): Promise<{ txid: string; amount: BN }> {
    const [reflectionAccount] = await this.getReflectionPDA();
    const [userRewardsAccount] = await this.getUserRewardsPDA(this.wallet.publicKey);
    const [rewardsVault] = await this.getRewardsVaultPDA();

    const userTokenAccount = await getAssociatedTokenAddress(
      this.tokenMint,
      this.wallet.publicKey
    );

    // Get claimable amount before claim
    const rewardsInfo = await this.getRewardsInfo();
    const claimable = rewardsInfo.claimable;

    const tx = await this.program.methods
      .claimRewards()
      .accounts({
        reflectionAccount,
        userRewardsAccount,
        userTokenAccount,
        rewardsVault,
        authority: this.wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    return { txid: tx, amount: claimable };
  }

  /**
   * Unregister from rewards system
   * Called when unstaking from Staking Program
   *
   * @param xhyper - xHYPER amount to remove
   * @param initialReflection - Initial reflection value
   * @returns Transaction signature
   */
  public async unregisterStake(xhyper: BN, initialReflection: BN): Promise<string> {
    const [reflectionAccount] = await this.getReflectionPDA();
    const [userRewardsAccount] = await this.getUserRewardsPDA(this.wallet.publicKey);

    const tx = await this.program.methods
      .unregisterStake(xhyper, initialReflection)
      .accounts({
        reflectionAccount,
        userRewardsAccount,
        authority: this.wallet.publicKey,
      })
      .rpc();

    return tx;
  }

  /**
   * Get user rewards information
   *
   * @param authority - User's public key (defaults to wallet)
   * @returns RewardsInfo object with claimable rewards
   */
  public async getRewardsInfo(authority?: PublicKey): Promise<RewardsInfo> {
    const user = authority || this.wallet.publicKey;
    const [userRewardsAccount] = await this.getUserRewardsPDA(user);
    const [reflectionAccount] = await this.getReflectionPDA();

    const userData = await (this.program.account as any).userRewardsAccount.fetch(userRewardsAccount);
    const reflectionData = await (this.program.account as any).reflectionAccount.fetch(reflectionAccount);

    // Calculate claimable rewards
    const claimable = this.calculateClaimable(
      userData.xhyper,
      userData.initialReflection,
      reflectionData.rate
    );

    // Calculate share percentage
    const totalXhyper = Number(reflectionData.totalXhyper);
    const userXhyper = Number(userData.xhyper);
    const sharePercentage = totalXhyper > 0 ? (userXhyper / totalXhyper) * 100 : 0;

    return {
      authority: userData.authority,
      initialReflection: userData.initialReflection,
      xhyper: userData.xhyper,
      totalClaimed: userData.totalClaimed,
      lastClaim: userData.lastClaim,
      bump: userData.bump,
      claimable,
      sharePercentage,
    };
  }

  /**
   * Get global reflection information
   *
   * @returns ReflectionInfo with pool statistics
   */
  public async getReflectionInfo(): Promise<ReflectionInfo> {
    const [reflectionAccount] = await this.getReflectionPDA();

    const data = await (this.program.account as any).reflectionAccount.fetch(reflectionAccount);

    return {
      authority: data.authority,
      rate: data.rate,
      totalReflection: data.totalReflection,
      totalXhyper: data.totalXhyper,
      totalRewardsDistributed: data.totalRewardsDistributed,
      bump: data.bump,
    };
  }

  /**
   * Calculate claimable rewards
   * Uses reflection algorithm formula from program
   */
  private calculateClaimable(
    xhyper: BN,
    initialReflection: BN,
    currentRate: BN
  ): BN {
    if (currentRate.isZero() || xhyper.isZero()) {
      return new BN(0);
    }

    const REFLECTION_PRECISION = new BN("1000000000000000000"); // 10^18

    // Calculate current reflection value
    const currentReflectionValue = xhyper
      .mul(currentRate)
      .div(REFLECTION_PRECISION);

    // Calculate rewards
    if (currentReflectionValue.gt(initialReflection)) {
      const reflectionGained = currentReflectionValue.sub(initialReflection);
      const rewards = reflectionGained.mul(REFLECTION_PRECISION).div(currentRate);
      return rewards;
    }

    return new BN(0);
  }

  /**
   * Get estimated APR based on current pool state
   * This is an approximation based on recent reward distribution
   *
   * @param timeframeSeconds - Timeframe to calculate APR (default: 30 days)
   * @returns Estimated APR as percentage
   */
  public async getEstimatedAPR(timeframeSeconds: number = 30 * 86400): Promise<number> {
    const reflectionInfo = await this.getReflectionInfo();

    const totalRewards = Number(reflectionInfo.totalRewardsDistributed);
    const totalXhyper = Number(reflectionInfo.totalXhyper);

    if (totalXhyper === 0) {
      return 0;
    }

    // Annualize the rewards
    const secondsPerYear = 365 * 86400;
    const annualizedRewards = (totalRewards / timeframeSeconds) * secondsPerYear;

    // Calculate APR
    const apr = (annualizedRewards / totalXhyper) * 100;

    return apr;
  }

  /**
   * Check if user is registered in rewards system
   */
  public async isRegistered(authority?: PublicKey): Promise<boolean> {
    try {
      await this.getRewardsInfo(authority);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get total rewards claimed by user
   */
  public async getTotalClaimed(authority?: PublicKey): Promise<BN> {
    const rewardsInfo = await this.getRewardsInfo(authority);
    return rewardsInfo.totalClaimed;
  }

  /**
   * Get user's share of rewards pool
   *
   * @returns Percentage (0-100)
   */
  public async getPoolShare(authority?: PublicKey): Promise<number> {
    const rewardsInfo = await this.getRewardsInfo(authority);
    return rewardsInfo.sharePercentage;
  }

  /**
   * Get PDA for reflection account
   */
  private async getReflectionPDA(): Promise<[PublicKey, number]> {
    return PublicKey.findProgramAddress(
      [Buffer.from("reflection")],
      this.program.programId
    );
  }

  /**
   * Get PDA for user rewards account
   */
  private async getUserRewardsPDA(authority: PublicKey): Promise<[PublicKey, number]> {
    return PublicKey.findProgramAddress(
      [Buffer.from("rewards"), authority.toBuffer()],
      this.program.programId
    );
  }

  /**
   * Get PDA for rewards vault
   */
  private async getRewardsVaultPDA(): Promise<[PublicKey, number]> {
    return PublicKey.findProgramAddress(
      [Buffer.from("rewards_vault")],
      this.program.programId
    );
  }

  /**
   * Subscribe to rewards updates
   * Polls for changes in claimable rewards
   *
   * @param callback - Called when claimable amount changes
   * @param intervalMs - Polling interval (default: 10 seconds)
   * @returns Unsubscribe function
   */
  public subscribeToRewards(
    callback: (rewardsInfo: RewardsInfo) => void,
    intervalMs: number = 10000
  ): () => void {
    let lastClaimable = new BN(0);

    const interval = setInterval(async () => {
      try {
        const rewardsInfo = await this.getRewardsInfo();

        if (!rewardsInfo.claimable.eq(lastClaimable)) {
          lastClaimable = rewardsInfo.claimable;
          callback(rewardsInfo);
        }
      } catch (error) {
        console.error("Error fetching rewards:", error);
      }
    }, intervalMs);

    return () => clearInterval(interval);
  }
}
