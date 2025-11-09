/**
 * Common Types and Constants
 * Shared across the Hypernode ecosystem
 */

import { PublicKey } from '@solana/web3.js';

// ============================================================================
// Network Configuration
// ============================================================================

export type SolanaNetwork = 'mainnet-beta' | 'devnet' | 'testnet' | 'localnet';

export interface NetworkConfig {
  name: SolanaNetwork;
  rpcUrl: string;
  wsUrl?: string;
  programIds: ProgramIds;
  tokenMint: string; // HYPER token mint address
}

export interface ProgramIds {
  markets: string;
  staking: string;
  rewards: string;
  slashing: string;
  governance: string;
  jobs: string;
  nodes: string;
}

// ============================================================================
// Token Configuration
// ============================================================================

export interface TokenConfig {
  /** Token mint address */
  mint: string;

  /** Token symbol */
  symbol: string;

  /** Token name */
  name: string;

  /** Decimals */
  decimals: number;

  /** Network */
  network: SolanaNetwork;
}

/** HYPER token on mainnet */
export const HYPER_MAINNET: TokenConfig = {
  mint: '92s9qna3djkMncZzkacyNQ38UKnNXZFh4Jgqe3Cmpump',
  symbol: 'HYPER',
  name: 'Hypernode',
  decimals: 9,
  network: 'mainnet-beta',
};

/** HYPER token on devnet */
export const HYPER_DEVNET: TokenConfig = {
  mint: '56jZUEMAhXxRu7Am3L2AkRRxNJb187zBbBQqnTf6jV75',
  symbol: 'HYPER',
  name: 'Hypernode (Devnet)',
  decimals: 9,
  network: 'devnet',
};

// ============================================================================
// Constants
// ============================================================================

export const LAMPORTS_PER_SOL = 1_000_000_000;

export const DEFAULT_COMMITMENT = 'confirmed';

export const DEFAULT_JOB_TIMEOUT = 3600; // 1 hour

export const DEFAULT_STAKE_AMOUNT = 10 * LAMPORTS_PER_SOL; // 10 SOL

export const MIN_NODE_STAKE = 5 * LAMPORTS_PER_SOL; // 5 SOL

export const DEFAULT_PAGE_SIZE = 20;

export const MAX_PAGE_SIZE = 100;

// ============================================================================
// Error Types
// ============================================================================

export enum ErrorCode {
  // Generic errors
  Unknown = 'UNKNOWN_ERROR',
  InvalidInput = 'INVALID_INPUT',
  NotFound = 'NOT_FOUND',
  Unauthorized = 'UNAUTHORIZED',
  Forbidden = 'FORBIDDEN',

  // Blockchain errors
  TransactionFailed = 'TRANSACTION_FAILED',
  InsufficientFunds = 'INSUFFICIENT_FUNDS',
  AccountNotFound = 'ACCOUNT_NOT_FOUND',
  InvalidSignature = 'INVALID_SIGNATURE',

  // Job errors
  JobNotFound = 'JOB_NOT_FOUND',
  JobAlreadyAssigned = 'JOB_ALREADY_ASSIGNED',
  JobTimeout = 'JOB_TIMEOUT',
  JobFailed = 'JOB_FAILED',
  InvalidJobState = 'INVALID_JOB_STATE',

  // Node errors
  NodeNotFound = 'NODE_NOT_FOUND',
  NodeOffline = 'NODE_OFFLINE',
  NodeBusy = 'NODE_BUSY',
  InsufficientStake = 'INSUFFICIENT_STAKE',
  NodeSlashed = 'NODE_SLASHED',

  // Payment errors
  PaymentRequired = 'PAYMENT_REQUIRED',
  PaymentFailed = 'PAYMENT_FAILED',
  PaymentExpired = 'PAYMENT_EXPIRED',
  InvalidPayment = 'INVALID_PAYMENT',

  // Rate limiting
  RateLimitExceeded = 'RATE_LIMIT_EXCEEDED',
  CircuitBreakerOpen = 'CIRCUIT_BREAKER_OPEN',
}

export class HypernodeError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'HypernodeError';
  }
}

// ============================================================================
// Utility Types
// ============================================================================

/** Convert bigint fields to strings for JSON serialization */
export type Serializable<T> = {
  [P in keyof T]: T[P] extends bigint
    ? string
    : T[P] extends PublicKey
    ? string
    : T[P] extends object
    ? Serializable<T[P]>
    : T[P];
};

/** Make specified fields optional */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/** Make specified fields required */
export type RequireBy<T, K extends keyof T> = T & Required<Pick<T, K>>;

// ============================================================================
// IPFS Types
// ============================================================================

export interface IpfsHash {
  /** IPFS CID */
  cid: string;

  /** URL to access the content */
  url: string;

  /** Content size in bytes */
  size?: number;
}

export interface IpfsUploadResponse {
  hash: IpfsHash;
  pinned: boolean;
  timestamp: number;
}

// ============================================================================
// Time Utils
// ============================================================================

export const SECONDS_PER_MINUTE = 60;
export const SECONDS_PER_HOUR = 3600;
export const SECONDS_PER_DAY = 86400;
export const SECONDS_PER_WEEK = 604800;

export const MILLISECONDS_PER_SECOND = 1000;

