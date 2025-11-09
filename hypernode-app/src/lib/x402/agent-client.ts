/**
 * x402 Agent Client
 *
 * TypeScript/JavaScript client for AI agents to interact with x402 payment protocol.
 * Handles payment intent creation, signing, and job submission automatically.
 */

import nacl from 'tweetnacl';
import bs58 from 'bs58';
import {
  PaymentIntent,
  JobSubmission,
  JobStatus,
  PricingInfo,
  X402Headers,
  X402_CONSTANTS,
} from './types';
import {
  signPaymentIntent,
  generateIntentId,
  getPublicKeyFromSecretKey,
} from './verifier';

/**
 * Configuration for x402 agent client
 */
export interface AgentClientConfig {
  /** API base URL */
  apiUrl: string;

  /** Wallet secret key (64 bytes Uint8Array) */
  walletSecretKey: Uint8Array;

  /** Optional: Custom timeout in milliseconds */
  timeout?: number;

  /** Optional: Auto-retry failed requests */
  autoRetry?: boolean;

  /** Optional: Maximum retry attempts */
  maxRetries?: number;
}

/**
 * x402 Agent Client
 *
 * Provides a simple interface for AI agents to submit jobs with automatic payment.
 */
export class X402AgentClient {
  private config: Required<AgentClientConfig>;
  private publicKey: string;

  constructor(config: AgentClientConfig) {
    this.config = {
      timeout: 30000,
      autoRetry: true,
      maxRetries: 3,
      ...config,
    };

    // Derive public key from secret key
    this.publicKey = getPublicKeyFromSecretKey(config.walletSecretKey);
  }

  /**
   * Submit a job with automatic payment
   *
   * @param jobType - Type of job to submit
   * @param config - Job configuration
   * @returns Job status
   */
  async submitJob(
    jobType: string,
    config: Record<string, unknown>
  ): Promise<JobStatus> {
    // Get pricing for the job type
    const pricing = await this.getPricing(jobType);

    // Create payment intent
    const intent = this.createPaymentIntent(pricing.minimumPayment, jobType);

    // Create job submission
    const submission: JobSubmission = {
      payment: intent,
      jobType,
      config: config as any, // Cast to JobConfig
    };

    // Submit to API
    const response = await this.request<JobStatus>(
      'POST',
      '/x402',
      intent,
      submission
    );

    return response;
  }

  /**
   * Get job status
   *
   * @param jobId - Job identifier
   * @returns Job status
   */
  async getJobStatus(jobId: string): Promise<JobStatus> {
    const response = await fetch(`${this.config.apiUrl}/x402/jobs/${jobId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to get job status: ${error.message || response.statusText}`);
    }

    return response.json();
  }

  /**
   * Wait for job completion
   *
   * @param jobId - Job identifier
   * @param pollInterval - Polling interval in milliseconds
   * @param maxWaitTime - Maximum time to wait in milliseconds
   * @returns Completed job status
   */
  async waitForCompletion(
    jobId: string,
    pollInterval: number = 5000,
    maxWaitTime: number = 300000
  ): Promise<JobStatus> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      const status = await this.getJobStatus(jobId);

      if (status.status === 'completed') {
        return status;
      }

      if (status.status === 'failed' || status.status === 'cancelled') {
        throw new Error(`Job ${status.status}: ${status.error || 'Unknown error'}`);
      }

      // Wait before polling again
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error(`Job ${jobId} did not complete within ${maxWaitTime}ms`);
  }

  /**
   * Get pricing information
   *
   * @param jobType - Optional job type, or null for all pricing
   * @returns Pricing information
   */
  async getPricing(jobType?: string): Promise<PricingInfo> {
    const url = jobType
      ? `${this.config.apiUrl}/x402/pricing?jobType=${encodeURIComponent(jobType)}`
      : `${this.config.apiUrl}/x402/pricing`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get pricing: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Create a payment intent
   *
   * @param amount - Payment amount in lamports
   * @param jobId - Job identifier
   * @param expiresIn - Expiration time in seconds
   * @returns Signed payment intent
   */
  private createPaymentIntent(
    amount: number,
    jobId: string,
    expiresIn: number = X402_CONSTANTS.DEFAULT_EXPIRATION
  ): PaymentIntent {
    const timestamp = new Date().toISOString();

    const intentWithoutSignature = {
      payer: this.publicKey,
      amount,
      jobId,
      timestamp,
      expiresIn,
    };

    const id = generateIntentId(intentWithoutSignature);
    const signature = signPaymentIntent(
      { ...intentWithoutSignature, id },
      this.config.walletSecretKey
    );

    return {
      id,
      ...intentWithoutSignature,
      signature,
    };
  }

  /**
   * Make an authenticated request to the API
   *
   * @param method - HTTP method
   * @param path - API path
   * @param intent - Payment intent
   * @param body - Request body
   * @returns Response data
   */
  private async request<T>(
    method: string,
    path: string,
    intent: PaymentIntent,
    body?: unknown
  ): Promise<T> {
    const url = `${this.config.apiUrl}${path}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Payment-Intent-ID': intent.id,
      'X-Payer': intent.payer,
      'X-Payment-Signature': intent.signature,
      'X-Payment-Amount': intent.amount.toString(),
      'X-Job-ID': intent.jobId,
      'X-Timestamp': intent.timestamp,
      'X-Expires-In': intent.expiresIn.toString(),
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          `API request failed: ${error.message || response.statusText}`
        );
      }

      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.config.timeout}ms`);
      }

      throw error;
    }
  }

  /**
   * Get the client's public key
   */
  getPublicKey(): string {
    return this.publicKey;
  }
}

/**
 * Create a new x402 agent client
 *
 * @param apiUrl - API base URL
 * @param secretKeyBase58 - Wallet secret key (base58 encoded)
 * @returns Client instance
 */
export function createAgentClient(
  apiUrl: string,
  secretKeyBase58: string
): X402AgentClient {
  const secretKey = bs58.decode(secretKeyBase58);

  if (secretKey.length !== 64) {
    throw new Error('Invalid secret key length (expected 64 bytes)');
  }

  return new X402AgentClient({
    apiUrl,
    walletSecretKey: secretKey,
  });
}

/**
 * Helper to generate a new keypair for testing
 */
export function generateKeypair(): { publicKey: string; secretKey: string } {
  const keypair = nacl.sign.keyPair();

  return {
    publicKey: bs58.encode(keypair.publicKey),
    secretKey: bs58.encode(keypair.secretKey),
  };
}
