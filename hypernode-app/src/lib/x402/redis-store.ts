/**
 * Redis-based Used Intents Store
 *
 * Production implementation of UsedIntentsStore using Redis for distributed systems.
 * Provides better performance and scalability than in-memory store.
 */

import { UsedIntentsStore } from './adapter';

/**
 * Redis client interface (compatible with ioredis and node-redis)
 */
export interface RedisClient {
  set(key: string, value: string, mode?: string, duration?: number): Promise<string | null>;
  get(key: string): Promise<string | null>;
  del(key: string): Promise<number>;
  keys(pattern: string): Promise<string[]>;
  ttl(key: string): Promise<number>;
}

/**
 * Redis-based implementation of UsedIntentsStore
 *
 * Features:
 * - Distributed tracking across multiple servers
 * - Automatic expiration using Redis TTL
 * - Better performance for high-volume applications
 * - Persistence and replication support
 */
export class RedisUsedIntentsStore implements UsedIntentsStore {
  private redis: RedisClient;
  private keyPrefix: string;

  constructor(redis: RedisClient, keyPrefix: string = 'x402:intent:') {
    this.redis = redis;
    this.keyPrefix = keyPrefix;
  }

  /**
   * Check if payment intent has been used
   *
   * @param intentId - Payment intent ID
   * @returns True if intent exists and not expired
   */
  async has(intentId: string): Promise<boolean> {
    const key = this.getKey(intentId);
    const value = await this.redis.get(key);
    return value !== null;
  }

  /**
   * Mark payment intent as used with automatic expiration
   *
   * @param intentId - Payment intent ID
   * @param expiresAt - Expiration date
   */
  async add(intentId: string, expiresAt: Date): Promise<void> {
    const key = this.getKey(intentId);
    const now = Date.now();
    const ttl = Math.max(0, Math.floor((expiresAt.getTime() - now) / 1000));

    // Store with TTL - Redis will automatically delete when expired
    await this.redis.set(key, expiresAt.toISOString(), 'EX', ttl);
  }

  /**
   * Cleanup expired intents
   *
   * Note: Redis automatically deletes expired keys, so this is a no-op.
   * Included for interface compatibility.
   */
  async cleanup(): Promise<void> {
    // Redis handles expiration automatically via TTL
    // No manual cleanup needed
  }

  /**
   * Get full Redis key for an intent ID
   *
   * @param intentId - Payment intent ID
   * @returns Full Redis key
   */
  private getKey(intentId: string): string {
    return `${this.keyPrefix}${intentId}`;
  }

  /**
   * Get statistics about stored intents
   *
   * @returns Stats object
   */
  async getStats(): Promise<{ total: number; expiringSoon: number }> {
    const pattern = `${this.keyPrefix}*`;
    const keys = await this.redis.keys(pattern);

    let expiringSoon = 0;
    for (const key of keys) {
      const ttl = await this.redis.ttl(key);
      if (ttl >= 0 && ttl < 60) {
        // Expiring within 60 seconds
        expiringSoon++;
      }
    }

    return {
      total: keys.length,
      expiringSoon,
    };
  }
}

/**
 * Create Redis store from environment configuration
 *
 * @returns Configured Redis store or null if Redis not configured
 */
export function createRedisStore(): RedisUsedIntentsStore | null {
  // Check if Redis is configured
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.warn('[x402] Redis not configured, falling back to memory store');
    return null;
  }

  try {
    // Dynamically import ioredis (won't fail if not installed)
    const Redis = require('ioredis');
    const redis = new Redis(redisUrl);

    return new RedisUsedIntentsStore(redis);
  } catch (error) {
    console.warn('[x402] Failed to initialize Redis, falling back to memory store:', error);
    return null;
  }
}
