/**
 * x402 Payment Protocol Adapter for Next.js API Routes
 *
 * Provides middleware for verifying payment intents in API routes.
 * Implements safety mechanisms including timeouts, rate limiting, and circuit breakers.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  PaymentIntent,
  VerificationResult,
  ErrorResponse,
  X402_CONSTANTS,
} from './types';
import { verifyPaymentIntent, validateIntentStructure } from './verifier';

/**
 * Configuration for x402 adapter
 */
export interface X402AdapterConfig {
  /** Minimum payment amount in lamports */
  minPaymentAmount?: number;

  /** Maximum payment amount in lamports */
  maxPaymentAmount?: number;

  /** Request timeout in milliseconds */
  timeout?: number;

  /** Enable request logging */
  enableLogging?: boolean;

  /** Custom verification function (optional) */
  customVerifier?: (intent: PaymentIntent) => Promise<VerificationResult>;

  /** Used payment intents store (prevents replay attacks) */
  usedIntentsStore?: UsedIntentsStore;
}

/**
 * Interface for tracking used payment intents
 */
export interface UsedIntentsStore {
  has(intentId: string): Promise<boolean>;
  add(intentId: string, expiresAt: Date): Promise<void>;
  cleanup(): Promise<void>;
}

/**
 * In-memory implementation of UsedIntentsStore
 * For production, use Redis or database
 */
export class MemoryUsedIntentsStore implements UsedIntentsStore {
  private store = new Map<string, Date>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Cleanup expired intents every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  async has(intentId: string): Promise<boolean> {
    const expiresAt = this.store.get(intentId);
    if (!expiresAt) return false;

    // Check if expired
    if (new Date() > expiresAt) {
      this.store.delete(intentId);
      return false;
    }

    return true;
  }

  async add(intentId: string, expiresAt: Date): Promise<void> {
    this.store.set(intentId, expiresAt);
  }

  async cleanup(): Promise<void> {
    const now = new Date();
    for (const [id, expiresAt] of this.store.entries()) {
      if (now > expiresAt) {
        this.store.delete(id);
      }
    }
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.store.clear();
  }
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<Omit<X402AdapterConfig, 'customVerifier'>> = {
  minPaymentAmount: 100000, // 0.0001 SOL
  maxPaymentAmount: 1000000000000, // 1000 SOL
  timeout: 30000, // 30 seconds
  enableLogging: process.env.NODE_ENV === 'development',
  usedIntentsStore: new MemoryUsedIntentsStore(),
};

/**
 * Extract payment intent from request headers
 *
 * @param request - Next.js request object
 * @returns Payment intent or null if not present
 */
export function extractPaymentIntent(request: NextRequest): PaymentIntent | null {
  try {
    const headers = request.headers;

    // Extract required headers
    const id = headers.get('X-Payment-Intent-ID');
    const payer = headers.get('X-Payer');
    const signature = headers.get('X-Payment-Signature');
    const amountStr = headers.get('X-Payment-Amount');
    const timestamp = headers.get('X-Timestamp');
    const expiresInStr = headers.get('X-Expires-In');
    const jobId = headers.get('X-Job-ID');

    // Validate all required headers are present
    if (!id || !payer || !signature || !amountStr || !timestamp || !jobId) {
      return null;
    }

    // Parse numeric values
    const amount = parseInt(amountStr, 10);
    const expiresIn = expiresInStr
      ? parseInt(expiresInStr, 10)
      : X402_CONSTANTS.DEFAULT_EXPIRATION;

    // Validate numeric values
    if (isNaN(amount) || isNaN(expiresIn)) {
      return null;
    }

    return {
      id,
      payer,
      amount,
      jobId,
      timestamp,
      expiresIn,
      signature,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Create error response for x402
 *
 * @param code - Error code
 * @param message - Error message
 * @param status - HTTP status code
 * @param details - Additional details
 * @returns Next.js response
 */
export function createErrorResponse(
  code: string,
  message: string,
  status: number = 400,
  details?: Record<string, unknown>
): NextResponse<ErrorResponse> {
  const error: ErrorResponse = {
    code,
    message,
    details,
    requestId: generateRequestId(),
  };

  return NextResponse.json(error, { status });
}

/**
 * Create payment required response (402)
 *
 * @param message - Error message
 * @param requiredAmount - Minimum required payment amount
 * @returns Next.js response with 402 status
 */
export function createPaymentRequiredResponse(
  message: string = 'Payment required to access this resource',
  requiredAmount?: number
): NextResponse<ErrorResponse> {
  return createErrorResponse(
    'PAYMENT_REQUIRED',
    message,
    X402_CONSTANTS.STATUS_CODE_PAYMENT_REQUIRED,
    requiredAmount ? { requiredAmount } : undefined
  );
}

/**
 * Verify payment intent middleware for Next.js API routes
 *
 * @param request - Next.js request
 * @param config - Adapter configuration
 * @returns Verification result or error response
 */
export async function verifyPaymentMiddleware(
  request: NextRequest,
  config: X402AdapterConfig = {}
): Promise<
  | { success: true; intent: PaymentIntent; verification: VerificationResult }
  | { success: false; response: NextResponse<ErrorResponse> }
> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  try {
    // Extract payment intent from headers
    const intent = extractPaymentIntent(request);

    if (!intent) {
      return {
        success: false,
        response: createPaymentRequiredResponse(
          'Missing payment intent headers',
          mergedConfig.minPaymentAmount
        ),
      };
    }

    // Validate intent structure
    const structureValidation = validateIntentStructure(intent);
    if (!structureValidation.valid) {
      return {
        success: false,
        response: createErrorResponse(
          'INVALID_INTENT_STRUCTURE',
          structureValidation.error || 'Invalid payment intent structure',
          X402_CONSTANTS.STATUS_CODE_INVALID_PAYMENT
        ),
      };
    }

    // Check if intent was already used (replay attack prevention)
    if (mergedConfig.usedIntentsStore) {
      const isUsed = await mergedConfig.usedIntentsStore.has(intent.id);
      if (isUsed) {
        if (mergedConfig.enableLogging) {
          console.warn(`[x402] Replay attack detected: intent ${intent.id} already used`);
        }
        return {
          success: false,
          response: createErrorResponse(
            'INTENT_ALREADY_USED',
            'This payment intent has already been used',
            X402_CONSTANTS.STATUS_CODE_INVALID_PAYMENT,
            { intentId: intent.id }
          ),
        };
      }
    }

    // Validate payment amount is within acceptable range
    if (intent.amount < mergedConfig.minPaymentAmount) {
      return {
        success: false,
        response: createErrorResponse(
          'INSUFFICIENT_PAYMENT',
          `Payment amount ${intent.amount} is below minimum ${mergedConfig.minPaymentAmount}`,
          X402_CONSTANTS.STATUS_CODE_PAYMENT_REQUIRED,
          {
            provided: intent.amount,
            required: mergedConfig.minPaymentAmount,
          }
        ),
      };
    }

    if (intent.amount > mergedConfig.maxPaymentAmount) {
      return {
        success: false,
        response: createErrorResponse(
          'EXCESSIVE_PAYMENT',
          `Payment amount ${intent.amount} exceeds maximum ${mergedConfig.maxPaymentAmount}`,
          X402_CONSTANTS.STATUS_CODE_INVALID_PAYMENT,
          {
            provided: intent.amount,
            maximum: mergedConfig.maxPaymentAmount,
          }
        ),
      };
    }

    // Verify cryptographic signature
    const verification = mergedConfig.customVerifier
      ? await mergedConfig.customVerifier(intent)
      : await verifyPaymentIntent(intent);

    if (!verification.valid) {
      if (mergedConfig.enableLogging) {
        console.warn(
          `[x402] Signature verification failed for intent ${intent.id}: ${verification.error}`
        );
      }

      return {
        success: false,
        response: createErrorResponse(
          'INVALID_SIGNATURE',
          verification.error || 'Payment signature verification failed',
          X402_CONSTANTS.STATUS_CODE_INVALID_PAYMENT,
          {
            intentId: intent.id,
            payer: intent.payer,
          }
        ),
      };
    }

    // Mark intent as used
    if (mergedConfig.usedIntentsStore) {
      const expiresAt = new Date(
        new Date(intent.timestamp).getTime() + intent.expiresIn * 1000
      );
      await mergedConfig.usedIntentsStore.add(intent.id, expiresAt);
    }

    // Log successful verification
    if (mergedConfig.enableLogging) {
      console.log(
        `[x402] Payment verified: ${intent.amount} lamports from ${intent.payer} (intent: ${intent.id})`
      );
    }

    return {
      success: true,
      intent,
      verification,
    };
  } catch (error) {
    if (mergedConfig.enableLogging) {
      console.error('[x402] Verification error:', error);
    }

    return {
      success: false,
      response: createErrorResponse(
        'VERIFICATION_ERROR',
        error instanceof Error ? error.message : 'Payment verification failed',
        500
      ),
    };
  }
}

/**
 * Wrapper for Next.js API routes with payment verification
 *
 * @param handler - Your API route handler
 * @param config - x402 configuration
 * @returns Wrapped handler with payment verification
 */
export function withPaymentVerification<T = unknown>(
  handler: (
    request: NextRequest,
    context: { intent: PaymentIntent; verification: VerificationResult }
  ) => Promise<NextResponse<T>>,
  config: X402AdapterConfig = {}
): (request: NextRequest) => Promise<NextResponse<T | ErrorResponse>> {
  return async (request: NextRequest) => {
    const result = await verifyPaymentMiddleware(request, config);

    if (!result.success) {
      return result.response;
    }

    // Call the actual handler with verified payment context
    return handler(request, {
      intent: result.intent,
      verification: result.verification,
    });
  };
}

/**
 * Generate a unique request ID for tracking
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Helper to check if a request has payment intent headers
 *
 * @param request - Next.js request
 * @returns True if payment headers are present
 */
export function hasPaymentIntent(request: NextRequest): boolean {
  return (
    request.headers.has('X-Payment-Intent-ID') &&
    request.headers.has('X-Payer') &&
    request.headers.has('X-Payment-Signature') &&
    request.headers.has('X-Job-ID')
  );
}

/**
 * Create pricing response for a job type
 *
 * @param jobType - Job type identifier
 * @param pricePerSecond - Price in lamports per second
 * @param estimatedTime - Estimated execution time in seconds
 * @returns Pricing information
 */
export function createPricingResponse(
  jobType: string,
  pricePerSecond: number,
  estimatedTime: number = 60
) {
  const minimumPayment = pricePerSecond * estimatedTime;

  return {
    jobType,
    pricePerSecond,
    minimumPayment,
    estimatedTime,
    resources: {
      gpu: 'NVIDIA A100',
      vram: '40GB',
      cpu: '16 vCPUs',
      memory: '64GB',
    },
    available: true,
  };
}

/**
 * Circuit breaker implementation for safety
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private threshold: number = 5,
    private timeout: number = 60000
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      const now = Date.now();
      if (now - this.lastFailureTime > this.timeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'closed';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.threshold) {
      this.state = 'open';
    }
  }

  getState(): 'closed' | 'open' | 'half-open' {
    return this.state;
  }

  reset(): void {
    this.failures = 0;
    this.lastFailureTime = 0;
    this.state = 'closed';
  }
}

/**
 * Rate limiter implementation for safety
 */
export class RateLimiter {
  private requests = new Map<string, number[]>();

  constructor(
    private maxRequests: number = 10,
    private windowMs: number = 60000
  ) {}

  async checkLimit(key: string): Promise<boolean> {
    const now = Date.now();
    const requests = this.requests.get(key) || [];

    // Remove old requests outside the window
    const validRequests = requests.filter((time) => now - time < this.windowMs);

    if (validRequests.length >= this.maxRequests) {
      return false;
    }

    validRequests.push(now);
    this.requests.set(key, validRequests);

    return true;
  }

  cleanup(): void {
    const now = Date.now();
    for (const [key, requests] of this.requests.entries()) {
      const validRequests = requests.filter((time) => now - time < this.windowMs);
      if (validRequests.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validRequests);
      }
    }
  }
}
