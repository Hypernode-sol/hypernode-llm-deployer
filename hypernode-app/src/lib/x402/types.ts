/**
 * x402 Payment Protocol Types
 *
 * Defines the core types for the x402 payment protocol implementation.
 * This protocol enables AI agents to autonomously pay for computational
 * resources on the Hypernode network using cryptographic signatures.
 */

/**
 * Payment intent created by the agent's wallet
 * Contains signed authorization to spend funds for a specific job
 */
export interface PaymentIntent {
  /** Unique identifier for this payment intent */
  id: string;

  /** Public key of the paying wallet (base58 encoded) */
  payer: string;

  /** Amount to be paid in lamports */
  amount: number;

  /** Job identifier this payment is for */
  jobId: string;

  /** ISO timestamp when intent was created */
  timestamp: string;

  /** Expiration time in seconds from timestamp */
  expiresIn: number;

  /** Ed25519 signature of the intent payload (base58 encoded) */
  signature: string;

  /** Optional: Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Verification result for a payment intent
 */
export interface VerificationResult {
  /** Whether the signature is valid */
  valid: boolean;

  /** Error message if verification failed */
  error?: string;

  /** Verified payer public key */
  payer?: string;

  /** Whether the intent has expired */
  expired?: boolean;

  /** Remaining time until expiration in seconds */
  expiresIn?: number;
}

/**
 * Job submission request with payment
 */
export interface JobSubmission {
  /** Payment intent containing signed authorization */
  payment: PaymentIntent;

  /** Job type (e.g., 'inference_medium', 'training_large') */
  jobType: string;

  /** Job configuration and parameters */
  config: JobConfig;

  /** Optional: Upload specification for large files */
  upload?: UploadSpec;
}

/**
 * Job configuration parameters
 */
export interface JobConfig {
  /** Model identifier or IPFS CID */
  model: string;

  /** GPU requirements */
  gpu?: {
    /** Minimum VRAM in GB */
    minVram?: number;

    /** Preferred GPU type */
    type?: string;

    /** Number of GPUs required */
    count?: number;
  };

  /** Docker container configuration */
  container?: {
    /** Container image (IPFS CID or registry URL) */
    image: string;

    /** Environment variables */
    env?: Record<string, string>;

    /** Resource limits */
    resources?: {
      cpus?: number;
      memory?: string;
    };
  };

  /** Input data for the job */
  input: unknown;

  /** Maximum execution time in seconds */
  timeout?: number;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Upload specification for large files
 */
export interface UploadSpec {
  /** IPFS CID of the uploaded file */
  cid: string;

  /** File size in bytes */
  size: number;

  /** MIME type */
  contentType: string;

  /** Upload timestamp */
  uploadedAt: string;
}

/**
 * Job status response
 */
export interface JobStatus {
  /** Job identifier */
  jobId: string;

  /** Current status */
  status: 'pending' | 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

  /** Payment status */
  paymentStatus: 'pending' | 'locked' | 'released' | 'refunded';

  /** Assigned worker public key */
  worker?: string;

  /** Job result (if completed) */
  result?: unknown;

  /** Error message (if failed) */
  error?: string;

  /** Creation timestamp */
  createdAt: string;

  /** Last update timestamp */
  updatedAt: string;

  /** Completion timestamp */
  completedAt?: string;

  /** Execution metrics */
  metrics?: {
    executionTime?: number;
    gpuUtilization?: number;
    memoryUsed?: number;
  };
}

/**
 * Pricing information for job types
 */
export interface PricingInfo {
  /** Job type identifier */
  jobType: string;

  /** Price in lamports per second */
  pricePerSecond: number;

  /** Minimum payment required in lamports */
  minimumPayment: number;

  /** Estimated execution time in seconds */
  estimatedTime?: number;

  /** Resource description */
  resources: {
    gpu: string;
    vram: string;
    cpu: string;
    memory: string;
  };

  /** Availability status */
  available: boolean;

  /** Number of available workers */
  availableWorkers?: number;
}

/**
 * Error response structure
 */
export interface ErrorResponse {
  /** Error code */
  code: string;

  /** Human-readable error message */
  message: string;

  /** Additional error details */
  details?: Record<string, unknown>;

  /** Request ID for tracking */
  requestId?: string;
}

/**
 * Request headers required for x402
 */
export interface X402Headers {
  /** Payment intent ID */
  'X-Payment-Intent-ID': string;

  /** Payer's public key */
  'X-Payer': string;

  /** Payment signature */
  'X-Payment-Signature': string;

  /** Payment amount in lamports */
  'X-Payment-Amount': string;

  /** Job ID this payment is for */
  'X-Job-ID': string;

  /** Request timestamp */
  'X-Timestamp': string;

  /** Optional: Expiration time in seconds */
  'X-Expires-In'?: string;
}

/**
 * Configuration for x402 client
 */
export interface X402ClientConfig {
  /** API base URL */
  apiUrl: string;

  /** Wallet private key (Uint8Array) */
  walletSecretKey: Uint8Array;

  /** Optional: Custom timeout in ms */
  timeout?: number;

  /** Optional: Retry configuration */
  retry?: {
    maxRetries: number;
    backoff: number;
  };
}

/**
 * Constants for x402 protocol
 */
export const X402_CONSTANTS = {
  /** Current protocol version */
  VERSION: '1.0.0',

  /** Default expiration time for payment intents (5 minutes) */
  DEFAULT_EXPIRATION: 300,

  /** Maximum expiration time (1 hour) */
  MAX_EXPIRATION: 3600,

  /** Signature message prefix to prevent replay attacks */
  SIGNATURE_PREFIX: 'x402-payment:',

  /** HTTP status code for payment required */
  STATUS_CODE_PAYMENT_REQUIRED: 402,

  /** HTTP status code for invalid payment */
  STATUS_CODE_INVALID_PAYMENT: 400,
} as const;

/**
 * Type guard to check if an object is a valid PaymentIntent
 */
export function isPaymentIntent(obj: unknown): obj is PaymentIntent {
  if (typeof obj !== 'object' || obj === null) return false;

  const intent = obj as Record<string, unknown>;

  return (
    typeof intent.id === 'string' &&
    typeof intent.payer === 'string' &&
    typeof intent.amount === 'number' &&
    typeof intent.jobId === 'string' &&
    typeof intent.timestamp === 'string' &&
    typeof intent.expiresIn === 'number' &&
    typeof intent.signature === 'string'
  );
}

/**
 * Type guard to check if an object is a valid JobSubmission
 */
export function isJobSubmission(obj: unknown): obj is JobSubmission {
  if (typeof obj !== 'object' || obj === null) return false;

  const submission = obj as Record<string, unknown>;

  return (
    isPaymentIntent(submission.payment) &&
    typeof submission.jobType === 'string' &&
    typeof submission.config === 'object' &&
    submission.config !== null
  );
}
