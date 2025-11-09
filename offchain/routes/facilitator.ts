/**
 * Facilitator API Routes
 *
 * HTTP API for x402 payment protocol and facilitator integration
 * Simplified version focusing on core payment functionality
 */

import express from 'express';
import { PaymentIntent, X402Verifier, intentStore } from '../x402/x402.js';
import { createX402SolanaAdapter } from '../x402/x402-solana-adapter.js';
import facilitatorAdapter from '../facilitator-adapter.js';
import oracleService from '../oracle/index.js';

const router = express.Router();

// Create x402-solana adapter instance
const x402Adapter = createX402SolanaAdapter({
  network: process.env.SOLANA_NETWORK || 'solana-devnet',
  treasuryAddress: process.env.TREASURY_WALLET_ADDRESS,
  hyperTokenMint: process.env.HYPER_MINT_DEVNET || '56jZUEMAhXxRu7Am3L2AkRRxNJb187zBbBQqnTf6jV75',
});

/**
 * POST /api/facilitator/create-intent
 * Helper endpoint to create payment intent (client-side use)
 *
 * Creates an x402 payment intent that client needs to sign
 */
router.post('/create-intent', (req, res) => {
  try {
    const { wallet, amount, jobId } = req.body;

    if (!wallet) {
      return res.status(400).json({ error: 'Missing wallet address' });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const intent = new PaymentIntent({
      client: wallet,
      amount: amount.toString(),
      jobId: jobId || 'job-' + Date.now(),
      timestamp: Date.now(),
      expiresAt: Date.now() + (3600 * 1000), // 1 hour
    });

    res.json({
      intent: intent.toJSON(),
      message: intent.toSigningMessage(),
      hash: intent.hash(),
      instructions: 'Sign the message with your Solana wallet and include signature in X-PAYMENT header',
    });

  } catch (error) {
    console.error('[Facilitator API] Create intent failed:', error);
    res.status(500).json({
      error: 'Failed to create payment intent',
      message: error.message,
    });
  }
});

/**
 * POST /api/facilitator/submit-job
 * Submit job with x402 payment
 *
 * Supports x402-solana format with automatic 402 response if no payment
 */
router.post('/submit-job', async (req, res) => {
  try {
    const {
      jobId,
      jobType,
      description,
      estimatedTime,
      paymentAmount,
      wallet,
    } = req.body;

    const finalJobId = jobId || 'job-' + crypto.randomUUID();

    // 1. Create payment requirements
    const paymentRequirements = x402Adapter.createPaymentRequirements({
      jobId: finalJobId,
      amount: paymentAmount || '1000000', // Default: 0.001 HYPER (9 decimals)
      description: description || 'Hypernode Compute Job',
      resource: '/api/facilitator/submit-job',
      estimatedTime: parseInt(estimatedTime) || 3600,
      tokenMint: x402Adapter.hyperTokenMint,
      jobType,
      resourceType: 'compute',
    });

    // 2. Extract payment from x402-solana header (if present)
    const paymentHeader = x402Adapter.extractPayment(req.headers);

    // 3. If no payment provided, return 402 with requirements
    if (!paymentHeader) {
      const response402 = x402Adapter.create402Response(paymentRequirements);

      return res.status(response402.status)
        .set(response402.headers)
        .json({
          ...response402.body,
          jobId: finalJobId,
          hint: 'Use POST /api/facilitator/create-intent to generate payment intent',
        });
    }

    // 4. Verify payment
    const verification = await x402Adapter.verifyPayment(
      paymentHeader,
      paymentRequirements
    );

    if (!verification.valid) {
      return res.status(402).json({
        error: 'Payment Required',
        message: verification.error,
        code: 'INVALID_PAYMENT',
      });
    }

    // 5. Settle payment and create escrow on-chain
    const settlementResult = await x402Adapter.settlePayment(
      paymentHeader,
      paymentRequirements,
      {
        jobId: finalJobId,
        nodeId: null, // Will be assigned later
        jobType,
        resourceType: 'compute',
      }
    );

    console.log(`[Facilitator API] Job ${finalJobId} submitted with x402 payment`);
    console.log(`[Facilitator API] Escrow: ${settlementResult.escrow}`);
    console.log(`[Facilitator API] TX: ${settlementResult.txSignature}`);

    res.json({
      success: true,
      jobId: finalJobId,
      intentId: settlementResult.intentId,
      escrow: settlementResult.escrow,
      txSignature: settlementResult.txSignature,
      message: 'Job submitted successfully with x402 payment',
      status: 'pending',
      nextSteps: 'Job will be assigned to available node. Payment escrowed on-chain.',
    });

  } catch (error) {
    console.error('[Facilitator API] Submit job failed:', error);
    res.status(500).json({
      error: 'Failed to submit job',
      message: error.message,
    });
  }
});

/**
 * POST /api/facilitator/complete-job
 * Complete job and submit usage proof to Oracle
 *
 * Called by node after job execution
 */
router.post('/complete-job', async (req, res) => {
  try {
    const { jobId, nodeId, intentId, success, logs, result } = req.body;

    if (!jobId || !nodeId || !intentId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Generate execution proof hashes
    const executionHash = facilitatorAdapter.generateExecutionHash(logs, result);
    const logsHash = facilitatorAdapter.generateExecutionHash(logs, { timestamp: Date.now() });

    // Queue for Oracle verification
    oracleService.queueVerification(jobId, nodeId, {
      intentId,
      jobId,
      logs,
      result,
      executionHash,
      logsHash,
      completedAt: Date.now(),
      startedAt: Date.now() - 10000, // Mock: 10 seconds ago
    });

    res.json({
      success: true,
      jobId,
      intentId,
      message: 'Job completion queued for Oracle verification',
      status: 'verifying',
      nextSteps: 'Oracle will verify execution and submit proof to facilitator',
    });

  } catch (error) {
    console.error('[Facilitator API] Complete job failed:', error);
    res.status(500).json({
      error: 'Failed to complete job',
      message: error.message,
    });
  }
});

/**
 * GET /api/facilitator/payment-intent/:intentId
 * Get payment intent data from on-chain
 */
router.get('/payment-intent/:intentId', async (req, res) => {
  try {
    const { intentId } = req.params;

    const paymentIntent = await facilitatorAdapter.getPaymentIntent(intentId);

    if (!paymentIntent) {
      return res.status(404).json({ error: 'Payment intent not found' });
    }

    res.json(paymentIntent);

  } catch (error) {
    console.error('[Facilitator API] Get payment intent failed:', error);
    res.status(500).json({
      error: 'Failed to get payment intent',
      message: error.message,
    });
  }
});

/**
 * GET /api/facilitator/oracle/status/:jobId
 * Get Oracle verification status for a job
 */
router.get('/oracle/status/:jobId', (req, res) => {
  try {
    const { jobId } = req.params;

    const status = oracleService.getVerificationStatus(jobId);

    if (!status) {
      return res.status(404).json({
        error: 'Verification not found',
        message: 'Job has not been verified yet',
      });
    }

    res.json(status);

  } catch (error) {
    console.error('[Facilitator API] Get oracle status failed:', error);
    res.status(500).json({
      error: 'Failed to get oracle status',
      message: error.message,
    });
  }
});

/**
 * GET /api/facilitator/stats
 * Get x402 payment intent and Oracle statistics
 */
router.get('/stats', (req, res) => {
  try {
    const intentStats = intentStore.stats();
    const oracleStats = oracleService.getStats();

    res.json({
      paymentIntents: intentStats,
      oracle: oracleStats,
      facilitatorProgram: process.env.FACILITATOR_PROGRAM_ID || 'FAC1L1TaTorProgRamIdPLacehOLdEr111111111111',
      hyperMint: process.env.HYPER_MINT_DEVNET || '56jZUEMAhXxRu7Am3L2AkRRxNJb187zBbBQqnTf6jV75',
      network: process.env.SOLANA_NETWORK || 'devnet',
    });

  } catch (error) {
    console.error('[Facilitator API] Get stats failed:', error);
    res.status(500).json({
      error: 'Failed to get stats',
      message: error.message,
    });
  }
});

/**
 * GET /api/facilitator/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    services: {
      facilitator: 'operational',
      oracle: 'operational',
      x402: 'operational',
    },
    timestamp: new Date().toISOString(),
  });
});

export default router;
