/**
 * x402-solana Backend Adapter
 *
 * Adapts x402-solana client requests to work with Hypernode's
 * Facilitator and Oracle infrastructure while using HYPER token
 */

import { PaymentIntent, X402Verifier, intentStore } from './x402.js';
import facilitatorClient from './client.js';
import oracleService from './oracle.js';

export class X402SolanaAdapter {
  constructor(config = {}) {
    this.network = config.network || 'solana-devnet';
    this.treasuryAddress = config.treasuryAddress;
    this.hyperTokenMint = config.hyperTokenMint;
  }

  /**
   * Extract payment header from x402-solana format
   *
   * x402-solana sends payment in X-PAYMENT header as JSON:
   * {
   *   intent: { ... },
   *   signature: "base58...",
   *   transaction: "base58..." (optional)
   * }
   */
  extractPayment(headers) {
    // Support both formats: x402-solana and our custom
    const xPaymentHeader = headers.get ? headers.get('x-payment') : headers['x-payment'];

    if (!xPaymentHeader) {
      return null;
    }

    try {
      // Parse x402-solana format
      if (typeof xPaymentHeader === 'string') {
        const payment = JSON.parse(xPaymentHeader);

        return {
          intent: payment.intent,
          signature: payment.signature,
          transaction: payment.transaction,
          format: 'x402-solana',
        };
      }

      // Already parsed
      return {
        ...xPaymentHeader,
        format: 'x402-solana',
      };

    } catch (error) {
      console.error('[X402SolanaAdapter] Failed to parse payment header:', error);
      return null;
    }
  }

  /**
   * Create payment requirements in x402-solana format
   *
   * Converts from our PaymentIntent format to x402-solana RouteConfig
   */
  createPaymentRequirements(config) {
    const {
      jobId,
      amount,
      description,
      resource,
      estimatedTime,
      tokenMint,
    } = config;

    return {
      price: {
        amount: amount.toString(),
        asset: {
          address: tokenMint || this.hyperTokenMint,
          decimals: 6,
          symbol: 'HYPER',
        },
      },
      network: this.network,
      config: {
        description: description || 'Hypernode Compute Job',
        resource: resource || '/api/facilitator/submit-job',
        mimeType: 'application/json',
        maxTimeoutSeconds: estimatedTime || 3600,
        metadata: {
          jobId,
          jobType: config.jobType,
          resourceType: config.resourceType,
        },
      },
    };
  }

  /**
   * Create 402 response compatible with x402-solana
   */
  create402Response(paymentRequirements) {
    return {
      status: 402,
      headers: {
        'Content-Type': 'application/json',
        'X-Payment-Required': 'true',
      },
      body: {
        error: 'Payment Required',
        code: 'PAYMENT_REQUIRED',
        paymentRequirements,
      },
    };
  }

  /**
   * Verify payment using our X402Verifier
   *
   * Validates signature and intent, then checks with Facilitator
   */
  async verifyPayment(paymentHeader, requirements) {
    if (!paymentHeader || !paymentHeader.intent) {
      return { valid: false, error: 'Missing payment intent' };
    }

    try {
      // 1. Create PaymentIntent object from x402-solana format
      const intent = new PaymentIntent({
        ...paymentHeader.intent,
        // Ensure compatibility with our format
        client: paymentHeader.intent.client || paymentHeader.intent.payer,
        amount: paymentHeader.intent.amount || requirements.price.amount,
      });

      // 2. Verify signature using our verifier
      const verification = X402Verifier.verify(
        intent,
        paymentHeader.signature,
        intent.client
      );

      if (!verification.valid) {
        return {
          valid: false,
          error: verification.error || 'Invalid signature',
        };
      }

      // 3. Check if intent already used
      if (intentStore.isUsed(intent.intentId)) {
        return {
          valid: false,
          error: 'Payment intent already used',
        };
      }

      // 4. Validate amount matches requirements
      const requiredAmount = BigInt(requirements.price.amount);
      const providedAmount = BigInt(intent.amount);

      if (providedAmount < requiredAmount) {
        return {
          valid: false,
          error: `Insufficient payment: required ${requiredAmount}, provided ${providedAmount}`,
        };
      }

      // 5. Validate token mint
      if (requirements.price.asset.address !== this.hyperTokenMint) {
        return {
          valid: false,
          error: 'Invalid token: must use HYPER token',
        };
      }

      return {
        valid: true,
        intent,
        verification,
      };

    } catch (error) {
      console.error('[X402SolanaAdapter] Payment verification error:', error);
      return {
        valid: false,
        error: error.message || 'Verification failed',
      };
    }
  }

  /**
   * Settle payment with Facilitator smart contract
   *
   * Creates escrow and queues for Oracle verification
   */
  async settlePayment(paymentHeader, requirements, jobMetadata = {}) {
    try {
      const intent = paymentHeader.intent;

      // 1. Authorize payment on Facilitator smart contract
      const expiresAt = Math.floor((intent.expiresAt || Date.now() + 3600000) / 1000);
      const amountInLamports = BigInt(intent.amount);

      console.log(`[X402SolanaAdapter] Settling payment for intent ${intent.intentId}`);

      const facilitatorResult = await facilitatorClient.authorizePayment(
        intent.client,
        intent.intentId,
        amountInLamports,
        expiresAt
      );

      // 2. Store intent to prevent reuse
      intentStore.store(intent, paymentHeader.signature);
      intentStore.markUsed(intent.intentId);

      // 3. If job metadata provided, queue for Oracle verification
      if (jobMetadata.jobId) {
        console.log(`[X402SolanaAdapter] Queuing job ${jobMetadata.jobId} for Oracle`);

        // Oracle will verify after job completion
        oracleService.queueVerification(
          jobMetadata.jobId,
          jobMetadata.nodeId || 'pending',
          {
            intentId: intent.intentId,
            escrowPubkey: facilitatorResult.escrow,
            ...jobMetadata,
          }
        );
      }

      return {
        success: true,
        escrow: facilitatorResult.escrow,
        txSignature: facilitatorResult.txSignature,
        intentId: intent.intentId,
      };

    } catch (error) {
      console.error('[X402SolanaAdapter] Payment settlement error:', error);
      throw error;
    }
  }

  /**
   * Handle job completion and trigger Oracle verification
   *
   * This is called when a job finishes execution
   */
  async handleJobCompletion(jobData) {
    const {
      jobId,
      nodeId,
      success,
      logs,
      executionHash,
      logsHash,
      completedAt,
    } = jobData;

    try {
      console.log(`[X402SolanaAdapter] Handling completion for job ${jobId}`);

      // Prepare execution data for Oracle
      const executionData = {
        jobId,
        nodeId,
        completedAt: completedAt || Date.now(),
        executionHash,
        logsHash,
        logs,
        result: { success, logs },
      };

      // Submit to Oracle for verification
      // Oracle will:
      // 1. Verify execution (6 checks)
      // 2. Submit proof to Facilitator
      // 3. Facilitator releases payment if valid
      const proofResult = await oracleService.submitProof(
        executionData.intentId,
        nodeId,
        executionData
      );

      return {
        success: true,
        proofSubmitted: proofResult.success,
        txSignature: proofResult.txSignature,
      };

    } catch (error) {
      console.error('[X402SolanaAdapter] Job completion handling error:', error);
      throw error;
    }
  }

  /**
   * Get adapter statistics
   */
  getStats() {
    const intentStats = intentStore.stats();
    const oracleStats = oracleService.getStats();

    return {
      paymentIntents: intentStats,
      oracle: oracleStats,
      network: this.network,
      hyperTokenMint: this.hyperTokenMint,
      treasuryAddress: this.treasuryAddress,
    };
  }

  /**
   * Middleware function for Express
   *
   * Use this to automatically handle x402 payments in routes
   */
  middleware() {
    return async (req, res, next) => {
      // Extract payment header
      const paymentHeader = this.extractPayment(req.headers);

      if (!paymentHeader) {
        // No payment provided - continue (route will check if payment required)
        req.x402 = { paymentProvided: false };
        return next();
      }

      // Payment provided - store in request for route handler
      req.x402 = {
        paymentProvided: true,
        paymentHeader,
      };

      next();
    };
  }
}

/**
 * Helper: Create adapter instance with environment config
 */
export function createX402SolanaAdapter(config = {}) {
  return new X402SolanaAdapter({
    network: process.env.SOLANA_NETWORK || 'solana-devnet',
    treasuryAddress: process.env.TREASURY_WALLET_ADDRESS,
    hyperTokenMint: process.env.HYPER_TOKEN_MINT_DEVNET,
    ...config,
  });
}

export default {
  X402SolanaAdapter,
  createX402SolanaAdapter,
};
