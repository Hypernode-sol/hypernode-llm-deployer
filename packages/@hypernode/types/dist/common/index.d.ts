/**
 * Common Types and Constants
 * Shared across the Hypernode ecosystem
 */
import { PublicKey } from '@solana/web3.js';
export type SolanaNetwork = 'mainnet-beta' | 'devnet' | 'testnet' | 'localnet';
export interface NetworkConfig {
    name: SolanaNetwork;
    rpcUrl: string;
    wsUrl?: string;
    programIds: ProgramIds;
    tokenMint: string;
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
export declare const HYPER_MAINNET: TokenConfig;
/** HYPER token on devnet */
export declare const HYPER_DEVNET: TokenConfig;
export declare const LAMPORTS_PER_SOL = 1000000000;
export declare const DEFAULT_COMMITMENT = "confirmed";
export declare const DEFAULT_JOB_TIMEOUT = 3600;
export declare const DEFAULT_STAKE_AMOUNT: number;
export declare const MIN_NODE_STAKE: number;
export declare const DEFAULT_PAGE_SIZE = 20;
export declare const MAX_PAGE_SIZE = 100;
export declare enum ErrorCode {
    Unknown = "UNKNOWN_ERROR",
    InvalidInput = "INVALID_INPUT",
    NotFound = "NOT_FOUND",
    Unauthorized = "UNAUTHORIZED",
    Forbidden = "FORBIDDEN",
    TransactionFailed = "TRANSACTION_FAILED",
    InsufficientFunds = "INSUFFICIENT_FUNDS",
    AccountNotFound = "ACCOUNT_NOT_FOUND",
    InvalidSignature = "INVALID_SIGNATURE",
    JobNotFound = "JOB_NOT_FOUND",
    JobAlreadyAssigned = "JOB_ALREADY_ASSIGNED",
    JobTimeout = "JOB_TIMEOUT",
    JobFailed = "JOB_FAILED",
    InvalidJobState = "INVALID_JOB_STATE",
    NodeNotFound = "NODE_NOT_FOUND",
    NodeOffline = "NODE_OFFLINE",
    NodeBusy = "NODE_BUSY",
    InsufficientStake = "INSUFFICIENT_STAKE",
    NodeSlashed = "NODE_SLASHED",
    PaymentRequired = "PAYMENT_REQUIRED",
    PaymentFailed = "PAYMENT_FAILED",
    PaymentExpired = "PAYMENT_EXPIRED",
    InvalidPayment = "INVALID_PAYMENT",
    RateLimitExceeded = "RATE_LIMIT_EXCEEDED",
    CircuitBreakerOpen = "CIRCUIT_BREAKER_OPEN"
}
export declare class HypernodeError extends Error {
    code: ErrorCode;
    details?: any | undefined;
    constructor(code: ErrorCode, message: string, details?: any | undefined);
}
/** Convert bigint fields to strings for JSON serialization */
export type Serializable<T> = {
    [P in keyof T]: T[P] extends bigint ? string : T[P] extends PublicKey ? string : T[P] extends object ? Serializable<T[P]> : T[P];
};
/** Make specified fields optional */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
/** Make specified fields required */
export type RequireBy<T, K extends keyof T> = T & Required<Pick<T, K>>;
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
export declare const SECONDS_PER_MINUTE = 60;
export declare const SECONDS_PER_HOUR = 3600;
export declare const SECONDS_PER_DAY = 86400;
export declare const SECONDS_PER_WEEK = 604800;
export declare const MILLISECONDS_PER_SECOND = 1000;
