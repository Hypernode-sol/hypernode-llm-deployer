/**
 * x402 Payment Protocol Implementation
 *
 * Implements the x402 HTTP payment standard adapted for Solana
 * https://github.com/Hypernode-sol/Hypernode-facilitator
 */

import crypto from 'crypto';
import bs58 from 'bs58';
import nacl from 'tweetnacl';
import { PublicKey } from '@solana/web3.js';

/**
 * Payment Intent Structure (x402)
 */
export class PaymentIntent {
  constructor(data) {
    this.intentId = data.intentId || crypto.randomUUID();
    this.client = data.client; // Wallet public key
    this.amount = data.amount; // Amount in HYPER (will be converted to lamports)
    this.jobId = data.jobId;
    this.timestamp = data.timestamp || Date.now();
    this.expiresAt = data.expiresAt || Date.now() + (3600 * 1000); // 1 hour default
    this.nonce = data.nonce || crypto.randomBytes(32).toString('hex');
    this.metadata = data.metadata || {};
  }

  /**
   * Serialize for signing
   */
  serialize() {
    return JSON.stringify({
      intentId: this.intentId,
      client: this.client,
      amount: this.amount,
      jobId: this.jobId,
      timestamp: this.timestamp,
      expiresAt: this.expiresAt,
      nonce: this.nonce,
    });
  }

  /**
   * Create message to sign (x402 format)
   */
  toSigningMessage() {
    return `HYPERNODE Payment Intent\n\n` +
           `Intent ID: ${this.intentId}\n` +
           `Job ID: ${this.jobId}\n` +
           `Amount: ${this.amount} HYPER\n` +
           `Timestamp: ${new Date(this.timestamp).toISOString()}\n` +
           `Expires: ${new Date(this.expiresAt).toISOString()}\n` +
           `Nonce: ${this.nonce}\n\n` +
           `By signing this message, you authorize this payment.`;
  }

  /**
   * Generate hash for on-chain verification
   */
  hash() {
    return crypto
      .createHash('sha256')
      .update(this.serialize())
      .digest('hex');
  }

  /**
   * Validate payment intent
   */
  validate() {
    const errors = [];

    if (!this.client) {
      errors.push('Missing client wallet address');
    }

    if (!this.amount || this.amount <= 0) {
      errors.push('Invalid amount');
    }

    if (!this.jobId) {
      errors.push('Missing job ID');
    }

    if (this.expiresAt <= Date.now()) {
      errors.push('Payment intent has expired');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Convert to object
   */
  toJSON() {
    return {
      intentId: this.intentId,
      client: this.client,
      amount: this.amount,
      jobId: this.jobId,
      timestamp: this.timestamp,
      expiresAt: this.expiresAt,
      nonce: this.nonce,
      metadata: this.metadata,
    };
  }
}

/**
 * x402 Signature Verification
 */
export class X402Verifier {
  /**
   * Verify Solana wallet signature on payment intent
   */
  static verify(paymentIntent, signature, publicKey) {
    try {
      // Get signing message
      const message = paymentIntent.toSigningMessage();
      const messageBytes = new TextEncoder().encode(message);

      // Decode signature
      let signatureBytes;
      if (typeof signature === 'string') {
        signatureBytes = bs58.decode(signature);
      } else {
        signatureBytes = signature;
      }

      // Get public key bytes
      const publicKeyObj = new PublicKey(publicKey);
      const publicKeyBytes = publicKeyObj.toBytes();

      // Verify signature
      const verified = nacl.sign.detached.verify(
        messageBytes,
        signatureBytes,
        publicKeyBytes
      );

      if (!verified) {
        return { valid: false, error: 'Invalid signature' };
      }

      // Validate payment intent
      const validation = paymentIntent.validate();
      if (!validation.valid) {
        return { valid: false, error: validation.errors.join(', ') };
      }

      return { valid: true };

    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Verify that signature matches the client in payment intent
   */
  static verifyClient(paymentIntent, signature, expectedClient) {
    const verification = this.verify(paymentIntent, signature, expectedClient);

    if (!verification.valid) {
      return verification;
    }

    if (paymentIntent.client !== expectedClient) {
      return { valid: false, error: 'Client mismatch' };
    }

    return { valid: true };
  }
}

/**
 * x402 Payment Intent Store (in-memory cache)
 * In production, use Redis
 */
class PaymentIntentStore {
  constructor() {
    this.intents = new Map();
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000); // Clean every minute
  }

  /**
   * Store payment intent
   */
  store(intent, signature) {
    this.intents.set(intent.intentId, {
      intent,
      signature,
      createdAt: Date.now(),
    });
  }

  /**
   * Retrieve payment intent
   */
  retrieve(intentId) {
    const stored = this.intents.get(intentId);

    if (!stored) {
      return null;
    }

    // Check if expired
    if (stored.intent.expiresAt <= Date.now()) {
      this.intents.delete(intentId);
      return null;
    }

    return stored;
  }

  /**
   * Mark as used
   */
  markUsed(intentId) {
    const stored = this.intents.get(intentId);
    if (stored) {
      stored.used = true;
      stored.usedAt = Date.now();
    }
  }

  /**
   * Check if already used
   */
  isUsed(intentId) {
    const stored = this.intents.get(intentId);
    return stored ? stored.used === true : false;
  }

  /**
   * Cleanup expired intents
   */
  cleanup() {
    const now = Date.now();
    for (const [intentId, stored] of this.intents.entries()) {
      if (stored.intent.expiresAt <= now) {
        this.intents.delete(intentId);
      }
    }
  }

  /**
   * Get stats
   */
  stats() {
    return {
      total: this.intents.size,
      active: Array.from(this.intents.values()).filter(s => !s.used).length,
      used: Array.from(this.intents.values()).filter(s => s.used).length,
    };
  }
}

// Singleton store
const intentStore = new PaymentIntentStore();

/**
 * x402 Middleware for Express
 */
export function x402Middleware(req, res, next) {
  const authHeader = req.headers['x-payment-intent'];

  if (!authHeader) {
    return res.status(402).json({
      error: 'Payment Required',
      message: 'x402: Missing payment intent header',
    });
  }

  try {
    const { intent, signature } = JSON.parse(authHeader);

    // Create PaymentIntent object
    const paymentIntent = new PaymentIntent(intent);

    // Verify signature
    const verification = X402Verifier.verify(
      paymentIntent,
      signature,
      intent.client
    );

    if (!verification.valid) {
      return res.status(402).json({
        error: 'Payment Required',
        message: `x402: ${verification.error}`,
      });
    }

    // Check if already used
    if (intentStore.isUsed(paymentIntent.intentId)) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'Payment intent already used',
      });
    }

    // Store and attach to request
    intentStore.store(paymentIntent, signature);
    req.paymentIntent = paymentIntent;
    req.paymentSignature = signature;

    next();

  } catch (error) {
    return res.status(400).json({
      error: 'Bad Request',
      message: `x402: ${error.message}`,
    });
  }
}

/**
 * Helper to create payment intent on client side
 */
export function createPaymentIntent(data) {
  return new PaymentIntent(data);
}

export { PaymentIntent, X402Verifier, intentStore };
export default {
  PaymentIntent,
  X402Verifier,
  intentStore,
  middleware: x402Middleware,
  createPaymentIntent,
};
