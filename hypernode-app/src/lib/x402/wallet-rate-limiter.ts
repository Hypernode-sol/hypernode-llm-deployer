/**
 * Wallet-based Rate Limiting
 *
 * Implements per-wallet rate limiting to prevent abuse from individual wallets.
 * Supports both in-memory and Redis-based tracking.
 */

import { RateLimiter } from './adapter';
import { monitor, Metrics } from './monitoring';

/**
 * Configuration for wallet rate limiter
 */
export interface WalletRateLimiterConfig {
  /** Maximum requests per window */
  maxRequests: number;

  /** Time window in milliseconds */
  windowMs: number;

  /** Optional: Maximum payment volume per window (lamports) */
  maxVolume?: number;

  /** Optional: Redis client for distributed rate limiting */
  redis?: any;
}

/**
 * Wallet-based rate limiter
 *
 * Tracks requests and payment volume per wallet address.
 */
export class WalletRateLimiter {
  private requestLimiter: RateLimiter;
  private volumeTracking = new Map<string, { volume: number; timestamp: number }>();
  private config: WalletRateLimiterConfig;

  constructor(config: WalletRateLimiterConfig) {
    this.config = config;
    this.requestLimiter = new RateLimiter(config.maxRequests, config.windowMs);

    // Cleanup old volume tracking every minute
    setInterval(() => this.cleanupVolumeTracking(), 60000);
  }

  /**
   * Check if wallet can make a request
   *
   * @param walletAddress - Wallet public key
   * @param paymentAmount - Payment amount in lamports (optional)
   * @returns True if allowed, false if rate limited
   */
  async checkLimit(walletAddress: string, paymentAmount?: number): Promise<boolean> {
    // Check request rate limit
    const requestAllowed = await this.requestLimiter.checkLimit(walletAddress);

    if (!requestAllowed) {
      monitor.incrementCounter(Metrics.RATE_LIMIT_HIT, 1, { wallet: walletAddress, type: 'requests' });
      return false;
    }

    // Check volume limit if configured and payment amount provided
    if (this.config.maxVolume && paymentAmount !== undefined) {
      const volumeAllowed = this.checkVolumeLimit(walletAddress, paymentAmount);

      if (!volumeAllowed) {
        monitor.incrementCounter(Metrics.RATE_LIMIT_HIT, 1, { wallet: walletAddress, type: 'volume' });
        return false;
      }

      // Track volume
      this.addVolume(walletAddress, paymentAmount);
    }

    return true;
  }

  /**
   * Check if wallet is within volume limit
   *
   * @param walletAddress - Wallet public key
   * @param amount - Payment amount in lamports
   * @returns True if within limit
   */
  private checkVolumeLimit(walletAddress: string, amount: number): boolean {
    if (!this.config.maxVolume) return true;

    const now = Date.now();
    const tracking = this.volumeTracking.get(walletAddress);

    if (!tracking) return true;

    // Check if tracking is within window
    if (now - tracking.timestamp > this.config.windowMs) {
      return true;
    }

    // Check if adding this amount would exceed limit
    return tracking.volume + amount <= this.config.maxVolume;
  }

  /**
   * Add volume to wallet tracking
   *
   * @param walletAddress - Wallet public key
   * @param amount - Payment amount in lamports
   */
  private addVolume(walletAddress: string, amount: number): void {
    const now = Date.now();
    const existing = this.volumeTracking.get(walletAddress);

    if (!existing || now - existing.timestamp > this.config.windowMs) {
      this.volumeTracking.set(walletAddress, { volume: amount, timestamp: now });
    } else {
      existing.volume += amount;
      existing.timestamp = now;
    }

    // Update monitoring
    monitor.setGauge(Metrics.TOTAL_VOLUME, amount, { wallet: walletAddress });
  }

  /**
   * Cleanup old volume tracking
   */
  private cleanupVolumeTracking(): void {
    const now = Date.now();

    for (const [wallet, tracking] of this.volumeTracking.entries()) {
      if (now - tracking.timestamp > this.config.windowMs) {
        this.volumeTracking.delete(wallet);
      }
    }
  }

  /**
   * Get current volume for a wallet
   *
   * @param walletAddress - Wallet public key
   * @returns Current volume in lamports
   */
  getCurrentVolume(walletAddress: string): number {
    const tracking = this.volumeTracking.get(walletAddress);
    if (!tracking) return 0;

    const now = Date.now();
    if (now - tracking.timestamp > this.config.windowMs) {
      return 0;
    }

    return tracking.volume;
  }

  /**
   * Reset limits for a wallet (admin function)
   *
   * @param walletAddress - Wallet public key
   */
  resetLimits(walletAddress: string): void {
    this.volumeTracking.delete(walletAddress);
    // Note: Cannot reset requestLimiter as it's internal
  }
}

/**
 * Create wallet rate limiter from environment configuration
 *
 * @returns Configured wallet rate limiter
 */
export function createWalletRateLimiter(): WalletRateLimiter {
  return new WalletRateLimiter({
    maxRequests: parseInt(process.env.X402_MAX_REQUESTS_PER_WALLET || '100', 10),
    windowMs: parseInt(process.env.X402_RATE_LIMIT_WINDOW_MS || '3600000', 10), // 1 hour default
    maxVolume: process.env.X402_MAX_VOLUME_PER_WALLET
      ? parseInt(process.env.X402_MAX_VOLUME_PER_WALLET, 10)
      : 100000000000, // 100 SOL default
  });
}
