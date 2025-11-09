/**
 * x402 Payment Protocol - Job Status API Route
 *
 * GET /api/x402/jobs/[jobId] - Get job status
 */

import { NextRequest, NextResponse } from 'next/server';
import { createErrorResponse } from '@/lib/x402/adapter';
import { JobStatus } from '@/lib/x402/types';

/**
 * GET /api/x402/jobs/[jobId] - Get job status
 *
 * This endpoint returns the current status of a job.
 * No payment verification is required for status checks.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;

    if (!jobId) {
      return createErrorResponse(
        'INVALID_JOB_ID',
        'Job ID is required',
        400
      );
    }

    // Fetch job status from the system
    // In production, this would query the hypernode-jobs Solana program
    const job = await getJobStatus(jobId);

    if (!job) {
      return createErrorResponse(
        'JOB_NOT_FOUND',
        `Job with ID ${jobId} not found`,
        404,
        { jobId }
      );
    }

    return NextResponse.json<JobStatus>(job);
  } catch (error) {
    console.error('[x402] Error fetching job status:', error);

    return createErrorResponse(
      'JOB_STATUS_ERROR',
      error instanceof Error ? error.message : 'Failed to fetch job status',
      500
    );
  }
}

/**
 * Get job status from the system
 *
 * This is a placeholder that should integrate with the actual
 * hypernode-jobs Solana program in production.
 *
 * @param jobId - Job identifier
 * @returns Job status or null if not found
 */
async function getJobStatus(jobId: string): Promise<JobStatus | null> {
  // In production, this would:
  // 1. Query the hypernode-jobs Solana program
  // 2. Fetch the job account data
  // 3. Return the current job status

  // TODO: Integrate with hypernode-jobs program
  // Example integration:
  // ```typescript
  // const connection = new Connection(process.env.SOLANA_RPC_URL!);
  // const jobsProgram = new Program(IDL, PROGRAM_ID, { connection });
  //
  // const jobPDA = PublicKey.findProgramAddressSync(
  //   [Buffer.from('job'), Buffer.from(jobId)],
  //   jobsProgram.programId
  // )[0];
  //
  // try {
  //   const jobAccount = await jobsProgram.account.job.fetch(jobPDA);
  //   return {
  //     jobId: jobAccount.id.toString(),
  //     status: jobAccount.status,
  //     paymentStatus: jobAccount.paymentStatus,
  //     worker: jobAccount.worker?.toBase58(),
  //     ...
  //   };
  // } catch (error) {
  //   return null; // Job not found
  // }
  // ```

  // For now, return a mock job status
  const mockJob: JobStatus = {
    jobId,
    status: 'running',
    paymentStatus: 'locked',
    worker: 'HvWJ9nrKC8a7fYxJKd3RYqpNAzgPZb8VQwXkN6FMqz9T',
    result: undefined,
    error: undefined,
    createdAt: new Date(Date.now() - 60000).toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: undefined,
    metrics: {
      executionTime: 45,
      gpuUtilization: 85,
      memoryUsed: 16000,
    },
  };

  return mockJob;
}

/**
 * OPTIONS handler for CORS
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
