import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  Keypair,
  SYSVAR_CLOCK_PUBKEY,
} from "@solana/web3.js";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from "@solana/spl-token";

export interface StakeInfo {
  authority: PublicKey;
  amount: BN;
  xhyper: BN;
  timeStake: BN;
  timeUnstake: BN;
  duration: BN;
  bump: number;
  isActive: boolean;
  canWithdraw: boolean;
  multiplier: number;
}

export interface StakingConfig {
  connection: Connection;
  wallet: Keypair;
  programId: PublicKey;
  tokenMint: PublicKey;
}

/**
 * StakingClient - Interact with Hypernode Staking Program
 *
 * Features:
 * - Stake HYPER tokens with time-lock
 * - Receive xHYPER based on staking duration (1x-4x multiplier)
 * - Unstake and withdraw after cooldown period
 * - Query stake status and xHYPER balance
 */
export class StakingClient {
  private connection: Connection;
  private wallet: Keypair;
  private program: Program;
  private tokenMint: PublicKey;

  // Constants from program
  private readonly DURATION_MIN = 14 * 86400; // 2 weeks
  private readonly DURATION_MAX = 365 * 86400; // 1 year

  constructor(config: StakingConfig) {
    this.connection = config.connection;
    this.wallet = config.wallet;
    this.tokenMint = config.tokenMint;

    // Initialize program
    const provider = new AnchorProvider(
      this.connection,
      { publicKey: this.wallet.publicKey, signTransaction: async (tx: any) => tx, signAllTransactions: async (txs: any) => txs } as any,
      { commitment: "confirmed" }
    );

    // Load program IDL
    try {
      const idl = require("../idl/hypernode_staking.json");
      this.program = new Program(idl, provider);
    } catch (error) {
      this.program = {} as Program;
    }
  }

  /**
   * Stake HYPER tokens for specified duration
   *
   * @param amount - Amount of HYPER tokens to stake (in base units)
   * @param durationDays - Staking duration in days (14-365)
   * @returns Transaction signature
   *
   * @example
   * ```typescript
   * const txid = await stakingClient.stake(
   *   10_000_000_000, // 10,000 HYPER (6 decimals)
   *   365             // 1 year
   * );
   * ```
   */
  public async stake(amount: number | BN, durationDays: number): Promise<string> {
    const amountBN = typeof amount === "number" ? new BN(amount) : amount;
    const durationSeconds = durationDays * 86400;

    if (durationSeconds < this.DURATION_MIN) {
      throw new Error(`Duration must be at least ${this.DURATION_MIN / 86400} days`);
    }

    if (durationSeconds > this.DURATION_MAX) {
      throw new Error(`Duration cannot exceed ${this.DURATION_MAX / 86400} days`);
    }

    // Derive PDAs
    const [stakeAccount] = await this.getStakeAccountPDA(this.wallet.publicKey);
    const [vault] = await this.getVaultPDA();

    // Get user token account
    const userTokenAccount = await getAssociatedTokenAddress(
      this.tokenMint,
      this.wallet.publicKey
    );

    const tx = await this.program.methods
      .stake(amountBN, new BN(durationSeconds))
      .accounts({
        stakeAccount,
        authority: this.wallet.publicKey,
        userTokenAccount,
        vault,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    return tx;
  }

  /**
   * Initiate unstake process
   * Starts cooldown period equal to staking duration
   * Burns xHYPER immediately
   *
   * @returns Transaction signature
   */
  public async unstake(): Promise<string> {
    const [stakeAccount] = await this.getStakeAccountPDA(this.wallet.publicKey);

    const tx = await this.program.methods
      .unstake()
      .accounts({
        stakeAccount,
        authority: this.wallet.publicKey,
      })
      .rpc();

    return tx;
  }

  /**
   * Withdraw tokens after cooldown period ends
   * Closes stake account and returns staked tokens
   *
   * @returns Transaction signature
   */
  public async withdraw(): Promise<string> {
    const [stakeAccount] = await this.getStakeAccountPDA(this.wallet.publicKey);
    const [vault] = await this.getVaultPDA();

    const userTokenAccount = await getAssociatedTokenAddress(
      this.tokenMint,
      this.wallet.publicKey
    );

    const tx = await this.program.methods
      .withdraw()
      .accounts({
        stakeAccount,
        authority: this.wallet.publicKey,
        userTokenAccount,
        vault,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    return tx;
  }

  /**
   * Get stake information for a user
   *
   * @param authority - User's public key (defaults to wallet)
   * @returns StakeInfo object with all stake details
   */
  public async getStakeInfo(authority?: PublicKey): Promise<StakeInfo> {
    const user = authority || this.wallet.publicKey;
    const [stakeAccount] = await this.getStakeAccountPDA(user);

    const accountData = await (this.program.account as any).stakeAccount.fetch(stakeAccount);

    // Get current time to check if can withdraw
    const currentTime = Math.floor(Date.now() / 1000);
    const timeUnstake = accountData.timeUnstake.toNumber();
    const duration = accountData.duration.toNumber();
    const canWithdraw = timeUnstake > 0 && currentTime >= timeUnstake + duration;

    // Calculate multiplier
    const amount = accountData.amount.toNumber();
    const xhyper = Number(accountData.xhyper);
    const multiplier = amount > 0 ? xhyper / amount : 0;

    return {
      authority: accountData.authority,
      amount: accountData.amount,
      xhyper: accountData.xhyper,
      timeStake: accountData.timeStake,
      timeUnstake: accountData.timeUnstake,
      duration: accountData.duration,
      bump: accountData.bump,
      isActive: timeUnstake === 0,
      canWithdraw,
      multiplier,
    };
  }

  /**
   * Calculate xHYPER for given amount and duration
   * Useful for estimating rewards before staking
   *
   * @param amount - Amount to stake
   * @param durationDays - Staking duration in days
   * @returns Estimated xHYPER amount
   */
  public calculateXHyper(amount: number, durationDays: number): number {
    const durationSeconds = durationDays * 86400;
    const cappedDuration = Math.min(durationSeconds, this.DURATION_MAX);

    // Formula from program:
    // multiplier = (duration / XHYPER_DIV) + 1
    // xhyper = multiplier * amount
    const XHYPER_DIV = (4 * this.DURATION_MAX) / 12;
    const multiplier = (cappedDuration / XHYPER_DIV) + 1;
    const xhyper = multiplier * amount;

    return Math.floor(xhyper);
  }

  /**
   * Get PDA for stake account
   */
  private async getStakeAccountPDA(authority: PublicKey): Promise<[PublicKey, number]> {
    return PublicKey.findProgramAddress(
      [Buffer.from("stake"), authority.toBuffer()],
      this.program.programId
    );
  }

  /**
   * Get PDA for staking vault
   */
  private async getVaultPDA(): Promise<[PublicKey, number]> {
    return PublicKey.findProgramAddress(
      [Buffer.from("vault")],
      this.program.programId
    );
  }

  /**
   * Get time remaining in cooldown period
   *
   * @returns Seconds remaining, or 0 if not unstaking or cooldown complete
   */
  public async getCooldownRemaining(authority?: PublicKey): Promise<number> {
    const stakeInfo = await this.getStakeInfo(authority);

    if (!stakeInfo.isActive && !stakeInfo.canWithdraw) {
      const currentTime = Math.floor(Date.now() / 1000);
      const timeUnstake = stakeInfo.timeUnstake.toNumber();
      const duration = stakeInfo.duration.toNumber();
      const cooldownEnd = timeUnstake + duration;

      return Math.max(0, cooldownEnd - currentTime);
    }

    return 0;
  }

  /**
   * Check if user has an active stake
   */
  public async hasActiveStake(authority?: PublicKey): Promise<boolean> {
    try {
      const stakeInfo = await this.getStakeInfo(authority);
      return stakeInfo.isActive;
    } catch {
      return false;
    }
  }

  /**
   * Get multiplier for duration in days
   *
   * @param durationDays - Duration in days (14-365)
   * @returns Multiplier (1.0 to 4.0)
   */
  public getMultiplierForDuration(durationDays: number): number {
    const durationSeconds = durationDays * 86400;
    const cappedDuration = Math.min(durationSeconds, this.DURATION_MAX);
    const XHYPER_DIV = (4 * this.DURATION_MAX) / 12;

    return (cappedDuration / XHYPER_DIV) + 1;
  }
}
