/**
 * x402 Payment Protocol Types
 * HTTP 402 Payment Required implementation for Solana
 */
export declare enum PaymentStatus {
    Pending = "pending",
    Verified = "verified",
    Failed = "failed",
    Expired = "expired"
}
export interface PaymentIntent {
    /** Unique payment intent ID */
    id: string;
    /** Payer's Solana public key */
    payer: string;
    /** Payment amount in lamports */
    amount: number;
    /** Associated job ID (optional) */
    jobId?: string;
    /** Unix timestamp when created */
    timestamp: number;
    /** Unix timestamp when expires */
    expiresAt: number;
    /** Payment transaction signature (once verified) */
    signature?: string;
    /** Current payment status */
    status: PaymentStatus;
    /** Additional metadata */
    metadata?: Record<string, any>;
}
export interface X402PaymentRequiredResponse {
    /** HTTP status code (402) */
    status: 402;
    /** Error message */
    message: string;
    /** Payment intent details */
    paymentIntent: {
        id: string;
        amount: number;
        recipient: string;
        expiresIn: number;
        network: 'mainnet-beta' | 'devnet' | 'testnet';
    };
    /** Challenge to sign (for verification) */
    challenge?: string;
}
export interface X402VerifyPaymentRequest {
    /** Payment intent ID */
    intentId: string;
    /** Transaction signature */
    signature: string;
    /** Payer's public key */
    payer: string;
}
export interface X402VerifyPaymentResponse {
    /** Verification status */
    verified: boolean;
    /** Error message if verification failed */
    error?: string;
    /** Verified payment details */
    payment?: {
        intentId: string;
        signature: string;
        amount: number;
        payer: string;
        verifiedAt: number;
    };
}
export interface X402Config {
    /** Enable x402 protocol */
    enabled: boolean;
    /** Minimum payment amount (lamports) */
    minPayment: number;
    /** Maximum payment amount (lamports) */
    maxPayment: number;
    /** Default expiration time (seconds) */
    defaultExpiration: number;
    /** Max expiration time (seconds) */
    maxExpiration: number;
    /** Rate limiting */
    rateLimit: {
        maxRequestsPerWallet: number;
        windowMs: number;
        maxVolumePerWallet: number;
    };
    /** Circuit breaker settings */
    circuitBreaker: {
        threshold: number;
        timeout: number;
    };
    /** Monitoring enabled */
    monitoringEnabled: boolean;
}
export interface X402Metrics {
    /** Total payment intents created */
    totalIntents: number;
    /** Total verified payments */
    totalVerified: number;
    /** Total failed verifications */
    totalFailed: number;
    /** Total expired intents */
    totalExpired: number;
    /** Active jobs with payments */
    activeJobs: number;
    /** Rate limit hits */
    rateLimitHits: number;
    /** Circuit breaker status */
    circuitBreakerOpen: boolean;
    /** Average verification time (ms) */
    avgVerificationTime: number;
    /** Total volume (lamports) */
    totalVolume: bigint;
}
export interface X402Adapter {
    /** Create a new payment intent */
    createIntent(params: {
        payer: string;
        amount: number;
        jobId?: string;
        expiresIn?: number;
    }): Promise<PaymentIntent>;
    /** Verify a payment */
    verifyPayment(params: {
        intentId: string;
        signature: string;
        payer: string;
    }): Promise<boolean>;
    /** Get payment intent by ID */
    getIntent(intentId: string): Promise<PaymentIntent | null>;
    /** Check if payment is required for a job */
    requiresPayment(jobId: string): Promise<boolean>;
    /** Get payment for a job */
    getPaymentForJob(jobId: string): Promise<PaymentIntent | null>;
}
export interface X402Headers {
    /** Payment required header */
    'X-Payment-Required': 'true' | 'false';
    /** Payment intent ID */
    'X-Payment-Intent-ID'?: string;
    /** Payment amount in lamports */
    'X-Payment-Amount'?: string;
    /** Payment recipient address */
    'X-Payment-Recipient'?: string;
    /** Payment expiration (Unix timestamp) */
    'X-Payment-Expires-At'?: string;
    /** Solana network */
    'X-Payment-Network'?: 'mainnet-beta' | 'devnet' | 'testnet';
}
