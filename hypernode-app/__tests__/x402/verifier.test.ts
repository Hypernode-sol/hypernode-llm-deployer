/**
 * Tests for x402 Payment Intent Verifier
 */

import nacl from 'tweetnacl';
import bs58 from 'bs58';
import {
  verifyPaymentIntent,
  signPaymentIntent,
  constructSignatureMessage,
  generateIntentId,
  validateIntentStructure,
  batchVerifyIntents,
  isValidSolanaPublicKey,
  getPublicKeyFromSecretKey,
} from '@/lib/x402/verifier';
import { PaymentIntent, X402_CONSTANTS } from '@/lib/x402/types';

describe('x402 Verifier', () => {
  let testKeypair: nacl.SignKeyPair;
  let validIntent: PaymentIntent;

  beforeEach(() => {
    // Generate a test keypair
    testKeypair = nacl.sign.keyPair();

    // Create a valid payment intent (without signature initially)
    const intentWithoutSignature: Omit<PaymentIntent, 'signature'> = {
      id: 'test-intent-id',
      payer: bs58.encode(testKeypair.publicKey),
      amount: 1000000, // 0.001 SOL
      jobId: 'test-job-123',
      timestamp: new Date().toISOString(),
      expiresIn: 300, // 5 minutes
    };

    // Sign the intent
    const signature = signPaymentIntent(intentWithoutSignature, testKeypair.secretKey);

    validIntent = {
      ...intentWithoutSignature,
      signature,
    };
  });

  describe('verifyPaymentIntent', () => {
    it('should verify a valid payment intent', async () => {
      const result = await verifyPaymentIntent(validIntent);

      expect(result.valid).toBe(true);
      expect(result.payer).toBe(validIntent.payer);
      expect(result.expired).toBe(false);
      expect(result.expiresIn).toBeGreaterThan(0);
      expect(result.error).toBeUndefined();
    });

    it('should reject intent with invalid signature', async () => {
      const tamperedIntent = {
        ...validIntent,
        amount: 2000000, // Changed amount without re-signing
      };

      const result = await verifyPaymentIntent(tamperedIntent);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Signature verification failed');
    });

    it('should reject intent with invalid payer public key', async () => {
      const invalidIntent = {
        ...validIntent,
        payer: 'invalid-public-key',
      };

      const result = await verifyPaymentIntent(invalidIntent);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid payer public key format');
    });

    it('should reject intent with negative amount', async () => {
      const negativeAmountIntent: Omit<PaymentIntent, 'signature'> = {
        id: 'test-intent-id',
        payer: bs58.encode(testKeypair.publicKey),
        amount: -1000,
        jobId: 'test-job-123',
        timestamp: new Date().toISOString(),
        expiresIn: 300,
      };

      const signature = signPaymentIntent(negativeAmountIntent, testKeypair.secretKey);
      const intent = { ...negativeAmountIntent, signature };

      const result = await verifyPaymentIntent(intent);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Payment amount must be positive');
    });

    it('should reject expired intent', async () => {
      const expiredIntent: Omit<PaymentIntent, 'signature'> = {
        id: 'expired-intent-id',
        payer: bs58.encode(testKeypair.publicKey),
        amount: 1000000,
        jobId: 'test-job-123',
        timestamp: new Date(Date.now() - 10000).toISOString(), // 10 seconds ago
        expiresIn: 5, // Already expired
      };

      const signature = signPaymentIntent(expiredIntent, testKeypair.secretKey);
      const intent = { ...expiredIntent, signature };

      const result = await verifyPaymentIntent(intent);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('has expired');
      expect(result.expired).toBe(true);
    });

    it('should reject intent with excessive expiration time', async () => {
      const longExpiryIntent: Omit<PaymentIntent, 'signature'> = {
        id: 'long-expiry-id',
        payer: bs58.encode(testKeypair.publicKey),
        amount: 1000000,
        jobId: 'test-job-123',
        timestamp: new Date().toISOString(),
        expiresIn: X402_CONSTANTS.MAX_EXPIRATION + 100, // Exceeds maximum
      };

      const signature = signPaymentIntent(longExpiryIntent, testKeypair.secretKey);
      const intent = { ...longExpiryIntent, signature };

      const result = await verifyPaymentIntent(intent);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('exceeds maximum');
    });

    it('should reject intent with missing fields', async () => {
      const incompleteIntent = {
        id: 'test-id',
        payer: bs58.encode(testKeypair.publicKey),
        // Missing amount, jobId, timestamp, expiresIn
      } as unknown as PaymentIntent;

      const result = await verifyPaymentIntent(incompleteIntent);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Missing required fields');
    });

    it('should reject intent with wrong signature length', async () => {
      const invalidIntent = {
        ...validIntent,
        signature: bs58.encode(new Uint8Array(32)), // Wrong length (should be 64)
      };

      const result = await verifyPaymentIntent(invalidIntent);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid signature length');
    });
  });

  describe('signPaymentIntent', () => {
    it('should create a valid signature', () => {
      const intent: Omit<PaymentIntent, 'signature'> = {
        id: 'test-id',
        payer: bs58.encode(testKeypair.publicKey),
        amount: 1000000,
        jobId: 'test-job-123',
        timestamp: new Date().toISOString(),
        expiresIn: 300,
      };

      const signature = signPaymentIntent(intent, testKeypair.secretKey);

      expect(signature).toBeTruthy();
      expect(typeof signature).toBe('string');

      // Verify the signature is valid
      const signedIntent: PaymentIntent = { ...intent, signature };
      const message = constructSignatureMessage(signedIntent);
      const messageBytes = new TextEncoder().encode(message);
      const signatureBytes = bs58.decode(signature);

      const isValid = nacl.sign.detached.verify(
        messageBytes,
        signatureBytes,
        testKeypair.publicKey
      );

      expect(isValid).toBe(true);
    });

    it('should throw error for invalid secret key length', () => {
      const intent: Omit<PaymentIntent, 'signature'> = {
        id: 'test-id',
        payer: bs58.encode(testKeypair.publicKey),
        amount: 1000000,
        jobId: 'test-job-123',
        timestamp: new Date().toISOString(),
        expiresIn: 300,
      };

      const invalidSecretKey = new Uint8Array(32); // Should be 64 bytes

      expect(() => signPaymentIntent(intent, invalidSecretKey)).toThrow(
        'Invalid secret key length'
      );
    });
  });

  describe('constructSignatureMessage', () => {
    it('should construct canonical message format', () => {
      const intent: PaymentIntent = {
        id: 'test-id',
        payer: 'test-payer',
        amount: 1000000,
        jobId: 'test-job-123',
        timestamp: '2024-01-01T00:00:00.000Z',
        expiresIn: 300,
        signature: 'test-signature',
      };

      const message = constructSignatureMessage(intent);

      expect(message).toBe(
        'x402-payment:test-payer:1000000:test-job-123:2024-01-01T00:00:00.000Z:300'
      );
    });

    it('should include signature prefix', () => {
      const message = constructSignatureMessage(validIntent);

      expect(message.startsWith(X402_CONSTANTS.SIGNATURE_PREFIX)).toBe(true);
    });
  });

  describe('generateIntentId', () => {
    it('should generate deterministic ID', () => {
      const intent: Omit<PaymentIntent, 'id' | 'signature'> = {
        payer: bs58.encode(testKeypair.publicKey),
        amount: 1000000,
        jobId: 'test-job-123',
        timestamp: '2024-01-01T00:00:00.000Z',
        expiresIn: 300,
      };

      const id1 = generateIntentId(intent);
      const id2 = generateIntentId(intent);

      expect(id1).toBe(id2);
      expect(typeof id1).toBe('string');
      expect(id1.length).toBeGreaterThan(0);
    });

    it('should generate different IDs for different intents', () => {
      const intent1: Omit<PaymentIntent, 'id' | 'signature'> = {
        payer: bs58.encode(testKeypair.publicKey),
        amount: 1000000,
        jobId: 'test-job-123',
        timestamp: '2024-01-01T00:00:00.000Z',
        expiresIn: 300,
      };

      const intent2: Omit<PaymentIntent, 'id' | 'signature'> = {
        ...intent1,
        amount: 2000000,
      };

      const id1 = generateIntentId(intent1);
      const id2 = generateIntentId(intent2);

      expect(id1).not.toBe(id2);
    });
  });

  describe('validateIntentStructure', () => {
    it('should validate correct structure', () => {
      const result = validateIntentStructure(validIntent);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject non-object input', () => {
      const result = validateIntentStructure('not an object');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Intent must be an object');
    });

    it('should reject missing string fields', () => {
      const invalidIntent = {
        amount: 1000000,
        expiresIn: 300,
      };

      const result = validateIntentStructure(invalidIntent);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Missing or invalid field');
    });

    it('should reject invalid timestamp format', () => {
      const invalidIntent = {
        ...validIntent,
        timestamp: 'invalid-timestamp',
      };

      const result = validateIntentStructure(invalidIntent);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid timestamp format');
    });

    it('should reject negative amount', () => {
      const invalidIntent = {
        ...validIntent,
        amount: -1000,
      };

      const result = validateIntentStructure(invalidIntent);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Amount must be positive');
    });

    it('should reject non-positive expiresIn', () => {
      const invalidIntent = {
        ...validIntent,
        expiresIn: 0,
      };

      const result = validateIntentStructure(invalidIntent);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('ExpiresIn must be positive');
    });
  });

  describe('batchVerifyIntents', () => {
    it('should verify multiple intents in parallel', async () => {
      const intents: PaymentIntent[] = [];

      // Create 5 valid intents
      for (let i = 0; i < 5; i++) {
        const keypair = nacl.sign.keyPair();
        const intent: Omit<PaymentIntent, 'signature'> = {
          id: `intent-${i}`,
          payer: bs58.encode(keypair.publicKey),
          amount: 1000000 + i,
          jobId: `job-${i}`,
          timestamp: new Date().toISOString(),
          expiresIn: 300,
        };

        const signature = signPaymentIntent(intent, keypair.secretKey);
        intents.push({ ...intent, signature });
      }

      const results = await batchVerifyIntents(intents);

      expect(results.size).toBe(5);

      for (const [id, result] of results) {
        expect(result.valid).toBe(true);
        expect(id).toMatch(/^intent-\d$/);
      }
    });

    it('should handle mix of valid and invalid intents', async () => {
      const validKeypair = nacl.sign.keyPair();
      const validIntent: Omit<PaymentIntent, 'signature'> = {
        id: 'valid-intent',
        payer: bs58.encode(validKeypair.publicKey),
        amount: 1000000,
        jobId: 'valid-job',
        timestamp: new Date().toISOString(),
        expiresIn: 300,
      };

      const validSignature = signPaymentIntent(validIntent, validKeypair.secretKey);

      const intents: PaymentIntent[] = [
        { ...validIntent, signature: validSignature },
        { ...validIntent, id: 'invalid-intent', signature: 'invalid-signature' },
      ];

      const results = await batchVerifyIntents(intents);

      expect(results.get('valid-intent')?.valid).toBe(true);
      expect(results.get('invalid-intent')?.valid).toBe(false);
    });
  });

  describe('isValidSolanaPublicKey', () => {
    it('should validate correct public key', () => {
      const publicKey = bs58.encode(testKeypair.publicKey);

      expect(isValidSolanaPublicKey(publicKey)).toBe(true);
    });

    it('should reject invalid base58 string', () => {
      expect(isValidSolanaPublicKey('not-base58!')).toBe(false);
    });

    it('should reject wrong length', () => {
      const shortKey = bs58.encode(new Uint8Array(16)); // Should be 32 bytes

      expect(isValidSolanaPublicKey(shortKey)).toBe(false);
    });

    it('should reject empty string', () => {
      expect(isValidSolanaPublicKey('')).toBe(false);
    });
  });

  describe('getPublicKeyFromSecretKey', () => {
    it('should extract public key from secret key', () => {
      const publicKey = getPublicKeyFromSecretKey(testKeypair.secretKey);
      const expectedPublicKey = bs58.encode(testKeypair.publicKey);

      expect(publicKey).toBe(expectedPublicKey);
    });

    it('should throw error for invalid secret key length', () => {
      const invalidSecretKey = new Uint8Array(32); // Should be 64 bytes

      expect(() => getPublicKeyFromSecretKey(invalidSecretKey)).toThrow(
        'Invalid secret key length'
      );
    });
  });

  describe('Integration tests', () => {
    it('should complete full sign and verify cycle', async () => {
      // Generate keypair
      const keypair = nacl.sign.keyPair();

      // Create intent
      const intent: Omit<PaymentIntent, 'signature'> = {
        id: generateIntentId({
          payer: bs58.encode(keypair.publicKey),
          amount: 5000000,
          jobId: 'integration-test-job',
          timestamp: new Date().toISOString(),
          expiresIn: 600,
        }),
        payer: bs58.encode(keypair.publicKey),
        amount: 5000000,
        jobId: 'integration-test-job',
        timestamp: new Date().toISOString(),
        expiresIn: 600,
      };

      // Sign intent
      const signature = signPaymentIntent(intent, keypair.secretKey);
      const signedIntent: PaymentIntent = { ...intent, signature };

      // Verify intent
      const result = await verifyPaymentIntent(signedIntent);

      expect(result.valid).toBe(true);
      expect(result.payer).toBe(intent.payer);
      expect(result.error).toBeUndefined();
    });
  });
});
