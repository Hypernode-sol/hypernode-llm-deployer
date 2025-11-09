import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import { clsx, type ClassValue } from 'clsx';

// Utility for conditional className merging
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

// Convert SOL to lamports
export function solToLamports(sol: number): BN {
  return new BN(sol * 1e9);
}

// Convert lamports to SOL
export function lamportsToSol(lamports: BN | number): number {
  const amount = typeof lamports === 'number' ? lamports : lamports.toNumber();
  return amount / 1e9;
}

// Format SOL amount
export function formatSol(lamports: BN | number, decimals: number = 4): string {
  const sol = lamportsToSol(lamports);
  return sol.toFixed(decimals);
}

// Format HYPER amount (6 decimals)
export function formatHyper(amount: BN | number, decimals: number = 2): string {
  const value = typeof amount === 'number' ? amount : amount.toNumber();
  return (value / 1e6).toFixed(decimals);
}

// Truncate address
export function truncateAddress(address: PublicKey | string, chars: number = 4): string {
  const addr = typeof address === 'string' ? address : address.toString();
  return `${addr.slice(0, chars)}...${addr.slice(-chars)}`;
}

// Format date
export function formatDate(timestamp: BN | number): string {
  const ts = typeof timestamp === 'number' ? timestamp : timestamp.toNumber();
  const date = new Date(ts * 1000);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Format duration
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

// Format bytes
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

// Calculate xHYPER from HYPER amount and duration
export function calculateXHyper(amount: number, durationDays: number): number {
  let multiplier = 1.0;

  if (durationDays >= 365) multiplier = 4.0;
  else if (durationDays >= 180) multiplier = 2.5;
  else if (durationDays >= 90) multiplier = 1.75;
  else if (durationDays >= 30) multiplier = 1.25;
  else if (durationDays >= 14) multiplier = 1.0;

  return amount * multiplier;
}

// Validate PublicKey
export function isValidPublicKey(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

// Sleep utility
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Copy to clipboard
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

// Format job state
export function formatJobState(state: any): string {
  if (typeof state === 'object') {
    const key = Object.keys(state)[0];
    return key.charAt(0).toUpperCase() + key.slice(1);
  }
  return state.toString();
}

// Format GPU type
export function formatGpuType(type: number): string {
  const types: Record<number, string> = {
    0: 'Any',
    1: 'NVIDIA',
    2: 'AMD',
  };
  return types[type] || 'Unknown';
}

// Check if job is finished
export function isJobFinished(state: any): boolean {
  const stateStr = formatJobState(state).toLowerCase();
  return ['completed', 'stopped', 'timedout'].includes(stateStr);
}

// Calculate execution time
export function calculateExecutionTime(timeStart: BN, timeEnd: BN): number {
  return timeEnd.sub(timeStart).toNumber();
}

// Format percentage
export function formatPercent(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

// Get relative time
export function getRelativeTime(timestamp: BN | number): string {
  const ts = typeof timestamp === 'number' ? timestamp : timestamp.toNumber();
  const now = Date.now() / 1000;
  const diff = now - ts;

  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// Convert IPFS hash to URL
export function ipfsToUrl(hash: string | number[], gateway: string = 'https://ipfs.io'): string {
  const hashStr = Array.isArray(hash)
    ? Buffer.from(hash).toString('utf8').trim()
    : hash;
  return `${gateway}/ipfs/${hashStr}`;
}

// Retry with exponential backoff
export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxAttempts) {
        await sleep(delayMs * Math.pow(2, attempt - 1));
      }
    }
  }

  throw lastError;
}
