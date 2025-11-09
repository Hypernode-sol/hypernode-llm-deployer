/**
 * Oracle Service for Hypernode Facilitator
 *
 * Verifies job execution and submits proofs to Facilitator smart contract
 * Oracle acts as trusted verifier to validate compute work
 *
 * Adapted from standalone oracle.js to work with our facilitator architecture
 */

import crypto from 'crypto';
import facilitatorAdapter from '../facilitator-adapter.js';

interface VerificationQueue {
  jobId: string;
  nodeId: string;
  executionData: any;
  queuedAt: number;
  attempts?: number;
}

interface VerifiedJob {
  intentId: string;
  nodeId: string;
  verification: any;
  proofHash: string;
  txSignature: string;
  verifiedAt: number;
}

interface OracleStats {
  totalVerifications: number;
  successfulProofs: number;
  failedProofs: number;
  queueSize: number;
  verifiedJobs: number;
  authority: string;
}

class OracleService {
  private verificationQueue: Map<string, VerificationQueue>;
  private verifiedJobs: Map<string, VerifiedJob>;
  private stats: {
    totalVerifications: number;
    successfulProofs: number;
    failedProofs: number;
  };
  private queueInterval: NodeJS.Timeout | null;

  constructor() {
    this.verificationQueue = new Map();
    this.verifiedJobs = new Map();
    this.stats = {
      totalVerifications: 0,
      successfulProofs: 0,
      failedProofs: 0,
    };
    this.queueInterval = null;

    console.log('[Oracle] Service initialized');
    if (facilitatorAdapter.oracleAuthority) {
      console.log(`[Oracle] Authority: ${facilitatorAdapter.oracleAuthority.publicKey.toString()}`);
    } else {
      console.log('[Oracle] Running in mock mode');
    }
  }

  /**
   * Queue a job for verification
   */
  queueVerification(jobId: string, nodeId: string, executionData: any) {
    this.verificationQueue.set(jobId, {
      jobId,
      nodeId,
      executionData,
      queuedAt: Date.now(),
    });

    console.log(`[Oracle] Job ${jobId} queued for verification`);
  }

  /**
   * Verify job execution
   * Checks logs, validates execution, ensures work was done
   *
   * Note: In our architecture, job data comes from hypernode-jobs program
   * For now, using execution data directly from queue
   */
  async verifyExecution(jobId: string, nodeId: string, executionData: any) {
    try {
      console.log(`[Oracle] Verifying execution for job ${jobId}`);

      // In production, fetch job from hypernode-jobs program
      // For now, using execution data from queue

      const validations = {
        hasExecutionData: !!executionData,
        hasJobId: !!jobId,
        hasNodeId: !!nodeId,
        hasCompletionMarker: this.checkCompletionMarker(executionData.logs),
        timingValid: this.validateTiming(executionData),
        hashesValid: this.validateHashes(executionData),
      };

      // Calculate verification score
      const score = Object.values(validations).filter(v => v === true).length;
      const totalChecks = Object.keys(validations).length;
      const verificationScore = score / totalChecks;

      // Decide if verification passes (>= 80% checks must pass)
      const verified = verificationScore >= 0.8;

      const result = {
        verified,
        score: verificationScore,
        validations,
        timestamp: Date.now(),
      };

      console.log(`[Oracle] Verification result for ${jobId}:`, result);

      return result;

    } catch (error) {
      console.error(`[Oracle] Verification failed for ${jobId}:`, error);
      return {
        verified: false,
        error: error.message,
      };
    }
  }

  /**
   * Check if logs contain completion marker
   */
  private checkCompletionMarker(logs: any): boolean {
    if (!logs) return false;

    const completionMarkers = [
      'completed',
      'finished',
      'success',
      'done',
      '✅',
      'exit code 0',
    ];

    const logsString = JSON.stringify(logs).toLowerCase();

    return completionMarkers.some(marker => logsString.includes(marker));
  }

  /**
   * Validate execution timing
   */
  private validateTiming(executionData: any): boolean {
    if (!executionData.startedAt || !executionData.completedAt) {
      return false;
    }

    const startTime = executionData.startedAt;
    const endTime = executionData.completedAt;
    const duration = endTime - startTime;

    // Job should take at least 1 second (not instant)
    // and not exceed estimated time by more than 2x
    const minDuration = 1000; // 1 second
    const maxDuration = (executionData.estimatedTime || 3600) * 2 * 1000; // 2x estimated

    return duration >= minDuration && duration <= maxDuration;
  }

  /**
   * Validate execution hashes
   */
  private validateHashes(executionData: any): boolean {
    if (!executionData.executionHash || !executionData.logsHash) {
      return false;
    }

    // Hashes should be SHA256 (64 hex chars)
    const hashRegex = /^[a-f0-9]{64}$/i;

    return (
      hashRegex.test(executionData.executionHash) &&
      hashRegex.test(executionData.logsHash)
    );
  }

  /**
   * Submit usage proof to Facilitator
   */
  async submitProof(intentId: string, nodeId: string, executionData: any) {
    try {
      console.log(`[Oracle] Submitting proof for intent ${intentId}`);

      this.stats.totalVerifications++;

      // 1. Verify execution
      const verification = await this.verifyExecution(
        executionData.jobId,
        nodeId,
        executionData
      );

      if (!verification.verified) {
        console.log(`[Oracle] Verification failed, not submitting proof`);
        this.stats.failedProofs++;
        return {
          success: false,
          reason: 'Verification failed',
          verification,
        };
      }

      // 2. Generate proof hashes
      const executionHash = executionData.executionHash || this.generateHash({
        jobId: executionData.jobId,
        logs: executionData.logs,
        result: executionData.result,
      });

      const logsHash = executionData.logsHash || this.generateHash({
        logs: executionData.logs,
        timestamp: executionData.completedAt,
      });

      // 3. Submit to Facilitator smart contract via adapter
      const result = await facilitatorAdapter.submitUsageProof(
        intentId,
        nodeId,
        executionHash,
        logsHash
      );

      // 4. Record verification
      this.verifiedJobs.set(executionData.jobId, {
        intentId,
        nodeId,
        verification,
        proofHash: executionHash,
        txSignature: result.txSignature,
        verifiedAt: Date.now(),
      });

      this.stats.successfulProofs++;

      console.log(`[Oracle] Proof submitted successfully: ${result.txSignature}`);

      return {
        success: true,
        verification,
        txSignature: result.txSignature,
        executionHash,
        logsHash,
      };

    } catch (error) {
      console.error('[Oracle] Failed to submit proof:', error);
      this.stats.failedProofs++;
      throw error;
    }
  }

  /**
   * Generate hash for data
   */
  generateHash(data: any): string {
    const str = JSON.stringify(data);
    return crypto.createHash('sha256').update(str).digest('hex');
  }

  /**
   * Process verification queue
   */
  async processQueue() {
    if (this.verificationQueue.size === 0) {
      return;
    }

    console.log(`[Oracle] Processing ${this.verificationQueue.size} verifications...`);

    for (const [jobId, item] of this.verificationQueue.entries()) {
      try {
        const { nodeId, executionData } = item;

        await this.submitProof(
          executionData.intentId,
          nodeId,
          executionData
        );

        this.verificationQueue.delete(jobId);

      } catch (error) {
        console.error(`[Oracle] Failed to process ${jobId}:`, error);

        // Remove from queue after 5 attempts
        if ((item.attempts || 0) > 5) {
          this.verificationQueue.delete(jobId);
        } else {
          item.attempts = (item.attempts || 0) + 1;
        }
      }
    }
  }

  /**
   * Start queue processor
   */
  startQueueProcessor(intervalMs: number = 10000) {
    this.queueInterval = setInterval(() => {
      this.processQueue();
    }, intervalMs);

    console.log(`[Oracle] Queue processor started (${intervalMs}ms interval)`);
  }

  /**
   * Stop queue processor
   */
  stopQueueProcessor() {
    if (this.queueInterval) {
      clearInterval(this.queueInterval);
      this.queueInterval = null;
      console.log('[Oracle] Queue processor stopped');
    }
  }

  /**
   * Get verification status
   */
  getVerificationStatus(jobId: string): VerifiedJob | null {
    return this.verifiedJobs.get(jobId) || null;
  }

  /**
   * Get Oracle stats
   */
  getStats(): OracleStats {
    return {
      ...this.stats,
      queueSize: this.verificationQueue.size,
      verifiedJobs: this.verifiedJobs.size,
      authority: facilitatorAdapter.oracleAuthority?.publicKey.toString() || 'mock',
    };
  }
}

// Singleton instance
const oracleService = new OracleService();

// Start queue processor automatically
oracleService.startQueueProcessor();

export default oracleService;
export { OracleService };
