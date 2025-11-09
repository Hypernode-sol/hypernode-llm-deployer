/**
 * x402 Payment Protocol - Main API Route
 *
 * POST /api/x402/jobs - Submit job with payment
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  withPaymentVerification,
  createErrorResponse,
  X402AdapterConfig,
} from '@/lib/x402/adapter';
import { JobSubmission, JobStatus, isJobSubmission } from '@/lib/x402/types';

/**
 * Configuration for x402 API
 */
const x402Config: X402AdapterConfig = {
  minPaymentAmount: 100000, // 0.0001 SOL minimum
  maxPaymentAmount: 100000000000, // 100 SOL maximum
  enableLogging: process.env.NODE_ENV === 'development',
};

/**
 * POST /api/x402/jobs - Submit a new job with payment
 *
 * This endpoint accepts a job submission with a verified payment intent.
 * The payment is locked in escrow until the job completes.
 */
export const POST = withPaymentVerification(
  async (request: NextRequest, { intent, verification }) => {
    try {
      // Parse request body
      const body = await request.json();

      // Validate job submission structure
      if (!isJobSubmission(body)) {
        return createErrorResponse(
          'INVALID_JOB_SUBMISSION',
          'Invalid job submission format',
          400
        );
      }

      const submission: JobSubmission = body;

      // Verify payment amount matches job requirements
      const estimatedCost = calculateJobCost(submission.jobType);
      if (intent.amount < estimatedCost) {
        return createErrorResponse(
          'INSUFFICIENT_PAYMENT_FOR_JOB',
          `Payment ${intent.amount} is insufficient for job type ${submission.jobType} (required: ${estimatedCost})`,
          402,
          {
            provided: intent.amount,
            required: estimatedCost,
            jobType: submission.jobType,
          }
        );
      }

      // Create job in the system
      // In a real implementation, this would integrate with the hypernode-jobs program
      const job = await createJob(submission, intent);

      // Log successful job creation
      if (x402Config.enableLogging) {
        console.log(
          `[x402] Job created: ${job.jobId} for ${intent.payer} (payment: ${intent.amount} lamports)`
        );
      }

      return NextResponse.json<JobStatus>(job, { status: 201 });
    } catch (error) {
      console.error('[x402] Error creating job:', error);

      return createErrorResponse(
        'JOB_CREATION_ERROR',
        error instanceof Error ? error.message : 'Failed to create job',
        500
      );
    }
  },
  x402Config
);

/**
 * Calculate cost for a job type
 *
 * @param jobType - Type of job
 * @returns Estimated cost in lamports
 */
function calculateJobCost(jobType: string): number {
  // Pricing per job type (lamports)
  const pricing: Record<string, number> = {
    'inference_small': 100000,      // 0.0001 SOL (~$0.01)
    'inference_medium': 500000,     // 0.0005 SOL (~$0.05)
    'inference_large': 2000000,     // 0.002 SOL (~$0.20)
    'training_small': 5000000,      // 0.005 SOL (~$0.50)
    'training_medium': 20000000,    // 0.02 SOL (~$2.00)
    'training_large': 100000000,    // 0.1 SOL (~$10.00)
    'custom': 1000000,              // 0.001 SOL (~$0.10) default
  };

  return pricing[jobType] || pricing['custom'];
}

/**
 * Create a job in the system
 *
 * This is a placeholder that should integrate with the actual
 * hypernode-jobs Solana program in production.
 *
 * @param submission - Job submission
 * @param intent - Payment intent
 * @returns Created job status
 */
async function createJob(
  submission: JobSubmission,
  intent: { id: string; payer: string; amount: number }
): Promise<JobStatus> {
  // Generate job ID (in production, this would come from the Solana program)
  const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

  // In production, this would:
  // 1. Call the hypernode-jobs Solana program to create the job
  // 2. Lock the payment in the escrow vault
  // 3. Add the job to the queue
  // 4. Return the on-chain job account data

  // For now, return a mock job status
  const job: JobStatus = {
    jobId,
    status: 'pending',
    paymentStatus: 'locked',
    worker: undefined,
    result: undefined,
    error: undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: undefined,
    metrics: undefined,
  };

  // TODO: Integrate with hypernode-jobs program
  // Example integration:
  // ```typescript
  // const connection = new Connection(process.env.SOLANA_RPC_URL!);
  // const jobsProgram = new Program(IDL, PROGRAM_ID, { connection });
  //
  // const tx = await jobsProgram.methods
  //   .createJob({
  //     jobType: submission.jobType,
  //     config: submission.config,
  //     paymentIntent: intent.id,
  //     payment: new BN(intent.amount),
  //   })
  //   .accounts({
  //     payer: new PublicKey(intent.payer),
  //     vault: vaultPDA,
  //     job: jobPDA,
  //   })
  //   .rpc();
  // ```

  return job;
}

/**
 * OPTIONS handler for CORS
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Payment-Intent-ID, X-Payer, X-Payment-Signature, X-Payment-Amount, X-Job-ID, X-Timestamp, X-Expires-In',
    },
  });
}
