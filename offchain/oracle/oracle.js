/**
 * Oracle Service for Hypernode Facilitator
 *
 * Verifies job execution and submits proofs to Facilitator smart contract
 * Oracle acts as trusted third party to validate compute work
 */

import crypto from 'crypto';
import facilitatorClient from './client.js';
import { getJobById, getJobLogs } from '../db/dao/jobs.js';

class OracleService {
  constructor() {
    this.verificationQueue = new Map();
    this.verifiedJobs = new Map();
    this.stats = {
      totalVerifications: 0,
      successfulProofs: 0,
      failedProofs: 0,
    };

    console.log('[Oracle] Service initialized');
    if (facilitatorClient.oracleAuthority) {
      console.log(`[Oracle] Authority: ${facilitatorClient.oracleAuthority.publicKey.toString()}`);
    } else {
      console.log('[Oracle] Running in mock mode (Facilitator client not fully initialized)');
    }
  }

  /**
   * Queue a job for verification
   */
  queueVerification(jobId, nodeId, executionData) {
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
   */
  async verifyExecution(jobId, nodeId, executionData) {
    try {
      console.log(`[Oracle] Verifying execution for job ${jobId}`);

      // 1. Get job data from database
      const job = await getJobById(jobId);

      if (!job) {
        throw new Error('Job not found');
      }

      // 2. Get logs
      const logs = await getJobLogs(jobId);

      // 3. Validation checks
      const validations = {
        jobExists: !!job,
        logsExist: logs && logs.length > 0,
        nodeMatches: job.node_id === nodeId,
        hasCompletionMarker: this.checkCompletionMarker(logs),
        timingValid: this.validateTiming(job, executionData),
        hashesValid: this.validateHashes(executionData),
      };

      // 4. Calculate verification score
      const score = Object.values(validations).filter(v => v === true).length;
      const totalChecks = Object.keys(validations).length;
      const verificationScore = score / totalChecks;

      // 5. Decide if verification passes (>= 80% checks must pass)
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
  checkCompletionMarker(logs) {
    if (!logs || logs.length === 0) return false;

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
  validateTiming(job, executionData) {
    if (!job.created_at || !executionData.completedAt) return false;

    const startTime = new Date(job.created_at).getTime();
    const endTime = executionData.completedAt;
    const duration = endTime - startTime;

    // Job should take at least 1 second (not instant)
    // and not exceed estimated time by more than 2x
    const minDuration = 1000; // 1 second
    const maxDuration = (job.estimated_time || 3600) * 2 * 1000; // 2x estimated

    return duration >= minDuration && duration <= maxDuration;
  }

  /**
   * Validate execution hashes
   */
  validateHashes(executionData) {
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
  async submitProof(intentId, nodeId, executionData) {
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

      // 3. Submit to Facilitator smart contract
      const result = await facilitatorClient.submitUsageProof(
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
  generateHash(data) {
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
        if (item.attempts > 5) {
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
  startQueueProcessor(intervalMs = 10000) {
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
  getVerificationStatus(jobId) {
    return this.verifiedJobs.get(jobId) || null;
  }

  /**
   * Get Oracle stats
   */
  getStats() {
    return {
      ...this.stats,
      queueSize: this.verificationQueue.size,
      verifiedJobs: this.verifiedJobs.size,
      authority: facilitatorClient.oracleAuthority.publicKey.toString(),
    };
  }

  /**
   * Verify Oracle signature (for external verification)
   */
  verifyOracleSignature(data, signature) {
    // Implement signature verification
    // This would be used by external parties to verify Oracle attestations
    return true;
  }
}

// Singleton instance
const oracleService = new OracleService();

// Start queue processor automatically
oracleService.startQueueProcessor();

export default oracleService;
export { OracleService };
