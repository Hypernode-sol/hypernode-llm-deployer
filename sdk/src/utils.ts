import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

/**
 * Convert SOL to lamports
 */
export function solToLamports(sol: number): BN {
  return new BN(sol * 1_000_000_000);
}

/**
 * Convert lamports to SOL
 */
export function lamportsToSol(lamports: BN | number): number {
  const bn = typeof lamports === "number" ? new BN(lamports) : lamports;
  return bn.toNumber() / 1_000_000_000;
}

/**
 * Convert seconds to BN
 */
export function secondsToBN(seconds: number): BN {
  return new BN(seconds);
}

/**
 * Convert BN to seconds
 */
export function bnToSeconds(bn: BN): number {
  return bn.toNumber();
}

/**
 * Format job state to readable string
 */
export function formatJobState(state: any): string {
  if (state.queued !== undefined) return "Queued";
  if (state.running !== undefined) return "Running";
  if (state.completed !== undefined) return "Completed";
  if (state.stopped !== undefined) return "Stopped";
  if (state.timedOut !== undefined) return "Timed Out";
  return "Unknown";
}

/**
 * Format GPU type to readable string
 */
export function formatGpuType(type: number): string {
  switch (type) {
    case 0:
      return "Any";
    case 1:
      return "NVIDIA";
    case 2:
      return "AMD";
    default:
      return "Unknown";
  }
}

/**
 * Calculate execution time in seconds
 */
export function calculateExecutionTime(
  timeStart: BN,
  timeEnd: BN
): number {
  if (timeStart.isZero() || timeEnd.isZero()) {
    return 0;
  }
  return timeEnd.sub(timeStart).toNumber();
}

/**
 * Check if job is finished (completed, stopped, or timed out)
 */
export function isJobFinished(state: any): boolean {
  return (
    state.completed !== undefined ||
    state.stopped !== undefined ||
    state.timedOut !== undefined
  );
}

/**
 * Validate PublicKey string
 */
export function isValidPublicKey(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

/**
 * Sleep for ms
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxAttempts - 1) {
        const delay = delayMs * Math.pow(2, attempt);
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

/**
 * Format bytes to human readable size
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

/**
 * Format duration in seconds to human readable
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
}

/**
 * Truncate public key for display
 */
export function truncateAddress(address: PublicKey | string, chars: number = 4): string {
  const str = typeof address === "string" ? address : address.toString();
  return `${str.slice(0, chars)}...${str.slice(-chars)}`;
}
