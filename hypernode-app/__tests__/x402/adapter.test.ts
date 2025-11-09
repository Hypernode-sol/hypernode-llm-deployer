/**
 * Tests for x402 Adapter
 */

import { NextRequest, NextResponse } from 'next/server';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import {
  extractPaymentIntent,
  verifyPaymentMiddleware,
  withPaymentVerification,
  hasPaymentIntent,
  createErrorResponse,
  createPaymentRequiredResponse,
  createPricingResponse,
  MemoryUsedIntentsStore,
  CircuitBreaker,
  RateLimiter,
  X402AdapterConfig,
} from '@/lib/x402/adapter';
import { signPaymentIntent } from '@/lib/x402/verifier';
import { PaymentIntent } from '@/lib/x402/types';

describe('x402 Adapter', () => {
  let testKeypair: nacl.SignKeyPair;
  let validIntent: PaymentIntent;

  beforeEach(() => {
    testKeypair = nacl.sign.keyPair();

    const intentWithoutSignature: Omit<PaymentIntent, 'signature'> = {
      id: 'test-intent-id',
      payer: bs58.encode(testKeypair.publicKey),
      amount: 1000000,
      jobId: 'test-job-123',
      timestamp: new Date().toISOString(),
      expiresIn: 300,
    };

    const signature = signPaymentIntent(intentWithoutSignature, testKeypair.secretKey);
    validIntent = { ...intentWithoutSignature, signature };
  });

  describe('extractPaymentIntent', () => {
    it('should extract payment intent from valid headers', () => {
      const headers = new Headers({
        'X-Payment-Intent-ID': validIntent.id,
        'X-Payer': validIntent.payer,
        'X-Payment-Signature': validIntent.signature,
        'X-Payment-Amount': validIntent.amount.toString(),
        'X-Job-ID': validIntent.jobId,
        'X-Timestamp': validIntent.timestamp,
        'X-Expires-In': validIntent.expiresIn.toString(),
      });

      const request = new NextRequest('http://localhost:3000/api/test', {
        headers,
      });

      const extracted = extractPaymentIntent(request);

      expect(extracted).not.toBeNull();
      expect(extracted?.id).toBe(validIntent.id);
      expect(extracted?.payer).toBe(validIntent.payer);
      expect(extracted?.amount).toBe(validIntent.amount);
    });

    it('should return null for missing headers', () => {
      const headers = new Headers({
        'X-Payment-Intent-ID': validIntent.id,
        // Missing other required headers
      });

      const request = new NextRequest('http://localhost:3000/api/test', {
        headers,
      });

      const extracted = extractPaymentIntent(request);

      expect(extracted).toBeNull();
    });

    it('should return null for invalid numeric values', () => {
      const headers = new Headers({
        'X-Payment-Intent-ID': validIntent.id,
        'X-Payer': validIntent.payer,
        'X-Payment-Signature': validIntent.signature,
        'X-Payment-Amount': 'not-a-number',
        'X-Job-ID': validIntent.jobId,
        'X-Timestamp': validIntent.timestamp,
      });

      const request = new NextRequest('http://localhost:3000/api/test', {
        headers,
      });

      const extracted = extractPaymentIntent(request);

      expect(extracted).toBeNull();
    });

    it('should use default expiration when not provided', () => {
      const headers = new Headers({
        'X-Payment-Intent-ID': validIntent.id,
        'X-Payer': validIntent.payer,
        'X-Payment-Signature': validIntent.signature,
        'X-Payment-Amount': validIntent.amount.toString(),
        'X-Job-ID': validIntent.jobId,
        'X-Timestamp': validIntent.timestamp,
        // X-Expires-In not provided
      });

      const request = new NextRequest('http://localhost:3000/api/test', {
        headers,
      });

      const extracted = extractPaymentIntent(request);

      expect(extracted).not.toBeNull();
      expect(extracted?.expiresIn).toBe(300); // Default expiration
    });
  });

  describe('verifyPaymentMiddleware', () => {
    function createRequestWithIntent(intent: PaymentIntent): NextRequest {
      const headers = new Headers({
        'X-Payment-Intent-ID': intent.id,
        'X-Payer': intent.payer,
        'X-Payment-Signature': intent.signature,
        'X-Payment-Amount': intent.amount.toString(),
        'X-Job-ID': intent.jobId,
        'X-Timestamp': intent.timestamp,
        'X-Expires-In': intent.expiresIn.toString(),
      });

      return new NextRequest('http://localhost:3000/api/test', { headers });
    }

    it('should verify valid payment intent', async () => {
      const request = createRequestWithIntent(validIntent);
      const result = await verifyPaymentMiddleware(request);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.intent.id).toBe(validIntent.id);
        expect(result.verification.valid).toBe(true);
      }
    });

    it('should reject request without payment headers', async () => {
      const request = new NextRequest('http://localhost:3000/api/test');
      const result = await verifyPaymentMiddleware(request);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.response.status).toBe(402);
      }
    });

    it('should reject payment below minimum', async () => {
      const lowPaymentIntent = {
        ...validIntent,
        id: 'low-payment-intent-id',
        amount: 50000,
      };

      // Re-sign with new amount
      const signature = signPaymentIntent(
        { ...lowPaymentIntent, signature: '' },
        testKeypair.secretKey
      );
      lowPaymentIntent.signature = signature;

      const request = createRequestWithIntent(lowPaymentIntent);
      const config: X402AdapterConfig = {
        minPaymentAmount: 100000,
        usedIntentsStore: new MemoryUsedIntentsStore(),
      };

      const result = await verifyPaymentMiddleware(request, config);

      expect(result.success).toBe(false);
      if (!result.success) {
        const json = await result.response.json();
        expect(json.code).toBe('INSUFFICIENT_PAYMENT');
      }

      if (config.usedIntentsStore instanceof MemoryUsedIntentsStore) {
        config.usedIntentsStore.destroy();
      }
    });

    it('should reject payment above maximum', async () => {
      const highPaymentIntent = {
        ...validIntent,
        id: 'high-payment-intent-id',
        amount: 10000000000,
      };

      const signature = signPaymentIntent(
        { ...highPaymentIntent, signature: '' },
        testKeypair.secretKey
      );
      highPaymentIntent.signature = signature;

      const request = createRequestWithIntent(highPaymentIntent);
      const config: X402AdapterConfig = {
        maxPaymentAmount: 1000000000,
        usedIntentsStore: new MemoryUsedIntentsStore(),
      };

      const result = await verifyPaymentMiddleware(request, config);

      expect(result.success).toBe(false);
      if (!result.success) {
        const json = await result.response.json();
        expect(json.code).toBe('EXCESSIVE_PAYMENT');
      }

      if (config.usedIntentsStore instanceof MemoryUsedIntentsStore) {
        config.usedIntentsStore.destroy();
      }
    });

    it('should prevent replay attacks', async () => {
      const store = new MemoryUsedIntentsStore();
      const request = createRequestWithIntent(validIntent);

      const config: X402AdapterConfig = {
        usedIntentsStore: store,
      };

      // First request should succeed
      const result1 = await verifyPaymentMiddleware(request, config);
      expect(result1.success).toBe(true);

      // Second request with same intent should fail
      const result2 = await verifyPaymentMiddleware(request, config);
      expect(result2.success).toBe(false);

      if (!result2.success) {
        const json = await result2.response.json();
        expect(json.code).toBe('INTENT_ALREADY_USED');
      }

      store.destroy();
    });

    it('should reject invalid signature', async () => {
      const invalidIntent = {
        ...validIntent,
        id: 'invalid-signature-intent-id',
        amount: 2000000, // Changed amount without re-signing
      };

      const request = createRequestWithIntent(invalidIntent);
      const config: X402AdapterConfig = {
        usedIntentsStore: new MemoryUsedIntentsStore(),
      };

      const result = await verifyPaymentMiddleware(request, config);

      expect(result.success).toBe(false);
      if (!result.success) {
        const json = await result.response.json();
        expect(json.code).toBe('INVALID_SIGNATURE');
      }

      if (config.usedIntentsStore instanceof MemoryUsedIntentsStore) {
        config.usedIntentsStore.destroy();
      }
    });
  });

  describe('withPaymentVerification', () => {
    it('should wrap handler with payment verification', async () => {
      const mockHandler = jest.fn(async () => {
        return NextResponse.json({ success: true });
      });

      const wrappedIntent = {
        ...validIntent,
        id: 'wrapped-handler-intent-id',
      };

      const wrappedSignature = signPaymentIntent(
        { ...wrappedIntent, signature: '' },
        testKeypair.secretKey
      );
      wrappedIntent.signature = wrappedSignature;

      const config: X402AdapterConfig = {
        usedIntentsStore: new MemoryUsedIntentsStore(),
      };

      const wrappedHandler = withPaymentVerification(mockHandler, config);

      const headers = new Headers({
        'X-Payment-Intent-ID': wrappedIntent.id,
        'X-Payer': wrappedIntent.payer,
        'X-Payment-Signature': wrappedIntent.signature,
        'X-Payment-Amount': wrappedIntent.amount.toString(),
        'X-Job-ID': wrappedIntent.jobId,
        'X-Timestamp': wrappedIntent.timestamp,
        'X-Expires-In': wrappedIntent.expiresIn.toString(),
      });

      const request = new NextRequest('http://localhost:3000/api/test', { headers });
      const response = await wrappedHandler(request);

      expect(mockHandler).toHaveBeenCalled();
      expect(response.status).toBe(200);

      if (config.usedIntentsStore instanceof MemoryUsedIntentsStore) {
        config.usedIntentsStore.destroy();
      }
    });

    it('should return error without calling handler for invalid payment', async () => {
      const mockHandler = jest.fn(async () => {
        return NextResponse.json({ success: true });
      });

      const wrappedHandler = withPaymentVerification(mockHandler);
      const request = new NextRequest('http://localhost:3000/api/test');

      const response = await wrappedHandler(request);

      expect(mockHandler).not.toHaveBeenCalled();
      expect(response.status).toBe(402);
    });
  });

  describe('hasPaymentIntent', () => {
    it('should return true when payment headers are present', () => {
      const headers = new Headers({
        'X-Payment-Intent-ID': 'test-id',
        'X-Payer': 'test-payer',
        'X-Payment-Signature': 'test-signature',
        'X-Job-ID': 'test-job-id',
      });

      const request = new NextRequest('http://localhost:3000/api/test', { headers });

      expect(hasPaymentIntent(request)).toBe(true);
    });

    it('should return false when payment headers are missing', () => {
      const request = new NextRequest('http://localhost:3000/api/test');

      expect(hasPaymentIntent(request)).toBe(false);
    });

    it('should return false when some headers are missing', () => {
      const headers = new Headers({
        'X-Payment-Intent-ID': 'test-id',
        // Missing X-Payer and X-Payment-Signature
      });

      const request = new NextRequest('http://localhost:3000/api/test', { headers });

      expect(hasPaymentIntent(request)).toBe(false);
    });
  });

  describe('createErrorResponse', () => {
    it('should create error response with correct format', async () => {
      const response = createErrorResponse('TEST_ERROR', 'Test error message', 400);

      expect(response.status).toBe(400);

      const json = await response.json();
      expect(json.code).toBe('TEST_ERROR');
      expect(json.message).toBe('Test error message');
      expect(json.requestId).toBeTruthy();
    });

    it('should include details when provided', async () => {
      const details = { key: 'value', number: 123 };
      const response = createErrorResponse('TEST_ERROR', 'Test message', 400, details);

      const json = await response.json();
      expect(json.details).toEqual(details);
    });
  });

  describe('createPaymentRequiredResponse', () => {
    it('should create 402 response', async () => {
      const response = createPaymentRequiredResponse();

      expect(response.status).toBe(402);

      const json = await response.json();
      expect(json.code).toBe('PAYMENT_REQUIRED');
    });

    it('should include required amount in details', async () => {
      const response = createPaymentRequiredResponse('Payment needed', 100000);

      const json = await response.json();
      expect(json.details?.requiredAmount).toBe(100000);
    });
  });

  describe('createPricingResponse', () => {
    it('should calculate minimum payment correctly', () => {
      const pricing = createPricingResponse('inference_medium', 1000, 60);

      expect(pricing.jobType).toBe('inference_medium');
      expect(pricing.pricePerSecond).toBe(1000);
      expect(pricing.minimumPayment).toBe(60000);
      expect(pricing.estimatedTime).toBe(60);
    });

    it('should include resource information', () => {
      const pricing = createPricingResponse('training_large', 5000, 120);

      expect(pricing.resources).toBeDefined();
      expect(pricing.resources.gpu).toBeTruthy();
      expect(pricing.available).toBe(true);
    });
  });

  describe('MemoryUsedIntentsStore', () => {
    let store: MemoryUsedIntentsStore;

    beforeEach(() => {
      store = new MemoryUsedIntentsStore();
    });

    afterEach(() => {
      store.destroy();
    });

    it('should track used intents', async () => {
      const intentId = 'test-intent-123';
      const expiresAt = new Date(Date.now() + 60000);

      await store.add(intentId, expiresAt);

      const exists = await store.has(intentId);
      expect(exists).toBe(true);
    });

    it('should return false for non-existent intents', async () => {
      const exists = await store.has('non-existent-id');
      expect(exists).toBe(false);
    });

    it('should remove expired intents', async () => {
      const intentId = 'expired-intent';
      const expiresAt = new Date(Date.now() - 1000); // Already expired

      await store.add(intentId, expiresAt);

      const exists = await store.has(intentId);
      expect(exists).toBe(false);
    });

    it('should cleanup expired intents', async () => {
      const validIntent = 'valid-intent';
      const expiredIntent = 'expired-intent';

      await store.add(validIntent, new Date(Date.now() + 60000));
      await store.add(expiredIntent, new Date(Date.now() - 1000));

      await store.cleanup();

      expect(await store.has(validIntent)).toBe(true);
      expect(await store.has(expiredIntent)).toBe(false);
    });
  });

  describe('CircuitBreaker', () => {
    it('should allow execution when closed', async () => {
      const breaker = new CircuitBreaker(5, 60000);
      const fn = jest.fn(async () => 'success');

      const result = await breaker.execute(fn);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalled();
      expect(breaker.getState()).toBe('closed');
    });

    it('should open after threshold failures', async () => {
      const breaker = new CircuitBreaker(3, 60000);
      const fn = jest.fn(async () => {
        throw new Error('Failure');
      });

      // Trigger 3 failures
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(fn);
        } catch {
          // Expected
        }
      }

      expect(breaker.getState()).toBe('open');

      // Next call should fail immediately
      await expect(breaker.execute(fn)).rejects.toThrow('Circuit breaker is open');
    });

    it('should reset on successful execution', async () => {
      const breaker = new CircuitBreaker(5, 60000);
      const failFn = jest.fn(async () => {
        throw new Error('Failure');
      });
      const successFn = jest.fn(async () => 'success');

      // Trigger some failures
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(failFn);
        } catch {
          // Expected
        }
      }

      // Success should reset
      await breaker.execute(successFn);

      expect(breaker.getState()).toBe('closed');
    });

    it('should manually reset', async () => {
      const breaker = new CircuitBreaker(2, 60000);
      const fn = jest.fn(async () => {
        throw new Error('Failure');
      });

      // Trigger failures to open circuit
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(fn);
        } catch {
          // Expected
        }
      }

      expect(breaker.getState()).toBe('open');

      // Manual reset
      breaker.reset();

      expect(breaker.getState()).toBe('closed');
    });
  });

  describe('RateLimiter', () => {
    it('should allow requests within limit', async () => {
      const limiter = new RateLimiter(5, 60000);

      for (let i = 0; i < 5; i++) {
        const allowed = await limiter.checkLimit('test-key');
        expect(allowed).toBe(true);
      }
    });

    it('should block requests exceeding limit', async () => {
      const limiter = new RateLimiter(3, 60000);

      // First 3 should succeed
      for (let i = 0; i < 3; i++) {
        const allowed = await limiter.checkLimit('test-key');
        expect(allowed).toBe(true);
      }

      // 4th should fail
      const allowed = await limiter.checkLimit('test-key');
      expect(allowed).toBe(false);
    });

    it('should track different keys separately', async () => {
      const limiter = new RateLimiter(2, 60000);

      await limiter.checkLimit('key1');
      await limiter.checkLimit('key1');

      const key1Blocked = await limiter.checkLimit('key1');
      expect(key1Blocked).toBe(false);

      const key2Allowed = await limiter.checkLimit('key2');
      expect(key2Allowed).toBe(true);
    });

    it('should cleanup old requests', async () => {
      const limiter = new RateLimiter(5, 100); // 100ms window

      await limiter.checkLimit('test-key');

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      limiter.cleanup();

      // Should allow new requests
      const allowed = await limiter.checkLimit('test-key');
      expect(allowed).toBe(true);
    });
  });
});
