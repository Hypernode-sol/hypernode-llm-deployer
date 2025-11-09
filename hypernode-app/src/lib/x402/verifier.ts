/**
 * x402 Payment Intent Verifier
 *
 * Provides cryptographic verification of payment intents using Ed25519 signatures.
 * Implements trustless verification without requiring centralized authority.
 */

import nacl from 'tweetnacl';
import bs58 from 'bs58';
import {
  PaymentIntent,
  VerificationResult,
  X402_CONSTANTS,
} from './types';

/**
 * Verifies a payment intent signature and validates its contents
 *
 * @param intent - Payment intent to verify
 * @returns Verification result with status and details
 */
export async function verifyPaymentIntent(
  intent: PaymentIntent
): Promise<VerificationResult> {
  try {
    // Validate required fields
    if (!intent.payer || !intent.signature || !intent.amount) {
      return {
        valid: false,
        error: 'Missing required fields: payer, signature, or amount',
      };
    }

    // Validate amount is positive
    if (intent.amount <= 0) {
      return {
        valid: false,
        error: 'Payment amount must be positive',
      };
    }

    // Check expiration
    const now = Date.now();
    const intentTime = new Date(intent.timestamp).getTime();
    const expirationTime = intentTime + intent.expiresIn * 1000;

    if (now > expirationTime) {
      return {
        valid: false,
        error: 'Payment intent has expired',
        expired: true,
        payer: intent.payer,
        expiresIn: 0,
      };
    }

    // Validate expiration time is within bounds
    if (intent.expiresIn > X402_CONSTANTS.MAX_EXPIRATION) {
      return {
        valid: false,
        error: `Expiration time exceeds maximum (${X402_CONSTANTS.MAX_EXPIRATION}s)`,
      };
    }

    // Decode public key from base58
    let publicKeyBytes: Uint8Array;
    try {
      publicKeyBytes = bs58.decode(intent.payer);
    } catch (error) {
      return {
        valid: false,
        error: `Invalid payer public key format: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }

    // Validate public key length (32 bytes for Ed25519)
    if (publicKeyBytes.length !== 32) {
      return {
        valid: false,
        error: 'Invalid public key length (expected 32 bytes)',
      };
    }

    // Decode signature from base58
    let signatureBytes: Uint8Array;
    try {
      signatureBytes = bs58.decode(intent.signature);
    } catch (error) {
      return {
        valid: false,
        error: `Invalid signature format: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }

    // Validate signature length (64 bytes for Ed25519)
    if (signatureBytes.length !== 64) {
      return {
        valid: false,
        error: 'Invalid signature length (expected 64 bytes)',
      };
    }

    // Construct the message that was signed
    const message = constructSignatureMessage(intent);
    const messageBytes = new TextEncoder().encode(message);

    // Verify the signature using Ed25519
    const isValid = nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKeyBytes
    );

    if (!isValid) {
      return {
        valid: false,
        error: 'Signature verification failed',
        payer: intent.payer,
      };
    }

    // Calculate remaining time
    const remainingSeconds = Math.floor((expirationTime - now) / 1000);

    return {
      valid: true,
      payer: intent.payer,
      expired: false,
      expiresIn: remainingSeconds,
    };
  } catch (error) {
    return {
      valid: false,
      error: `Verification error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Constructs the canonical message that should be signed
 *
 * Format: x402-payment:<payer>:<amount>:<jobId>:<timestamp>:<expiresIn>
 *
 * @param intent - Payment intent
 * @returns Canonical message string
 */
export function constructSignatureMessage(intent: PaymentIntent): string {
  return `${X402_CONSTANTS.SIGNATURE_PREFIX}${intent.payer}:${intent.amount}:${intent.jobId}:${intent.timestamp}:${intent.expiresIn}`;
}

/**
 * Creates a payment intent signature for a given intent
 * This is used by agents to sign their payment intents
 *
 * @param intent - Payment intent without signature
 * @param secretKey - Wallet secret key (64 bytes)
 * @returns Base58 encoded signature
 */
export function signPaymentIntent(
  intent: Omit<PaymentIntent, 'signature'>,
  secretKey: Uint8Array
): string {
  // Validate secret key length (64 bytes for Ed25519)
  if (secretKey.length !== 64) {
    throw new Error('Invalid secret key length (expected 64 bytes)');
  }

  // Construct message
  const message = constructSignatureMessage(intent as PaymentIntent);
  const messageBytes = new TextEncoder().encode(message);

  // Sign the message
  const signature = nacl.sign.detached(messageBytes, secretKey);

  // Return base58 encoded signature
  return bs58.encode(signature);
}

/**
 * Generates a payment intent ID from the intent contents
 * Uses deterministic hashing for reproducibility
 *
 * @param intent - Payment intent
 * @returns Unique intent ID
 */
export function generateIntentId(
  intent: Omit<PaymentIntent, 'id' | 'signature'>
): string {
  const message = constructSignatureMessage(intent as PaymentIntent);
  const messageBytes = new TextEncoder().encode(message);

  // Use first 16 bytes of hash as ID
  const hash = nacl.hash(messageBytes);
  const idBytes = hash.slice(0, 16);

  return bs58.encode(idBytes);
}

/**
 * Validates payment intent structure without signature verification
 * Useful for quick validation before expensive cryptographic operations
 *
 * @param intent - Payment intent to validate
 * @returns Validation result
 */
export function validateIntentStructure(
  intent: unknown
): { valid: boolean; error?: string } {
  if (typeof intent !== 'object' || intent === null) {
    return { valid: false, error: 'Intent must be an object' };
  }

  const i = intent as Record<string, unknown>;

  // Check required string fields
  const stringFields = ['id', 'payer', 'jobId', 'timestamp', 'signature'];
  for (const field of stringFields) {
    if (typeof i[field] !== 'string') {
      return { valid: false, error: `Missing or invalid field: ${field}` };
    }
  }

  // Check required number fields
  const numberFields = ['amount', 'expiresIn'];
  for (const field of numberFields) {
    if (typeof i[field] !== 'number') {
      return { valid: false, error: `Missing or invalid field: ${field}` };
    }
  }

  // Validate timestamp format
  const timestamp = new Date(i.timestamp as string);
  if (isNaN(timestamp.getTime())) {
    return { valid: false, error: 'Invalid timestamp format' };
  }

  // Validate amount is positive
  if ((i.amount as number) <= 0) {
    return { valid: false, error: 'Amount must be positive' };
  }

  // Validate expiresIn is positive
  if ((i.expiresIn as number) <= 0) {
    return { valid: false, error: 'ExpiresIn must be positive' };
  }

  return { valid: true };
}

/**
 * Batch verify multiple payment intents
 * More efficient than verifying one by one
 *
 * @param intents - Array of payment intents
 * @returns Map of intent ID to verification result
 */
export async function batchVerifyIntents(
  intents: PaymentIntent[]
): Promise<Map<string, VerificationResult>> {
  const results = new Map<string, VerificationResult>();

  // Verify all intents in parallel
  const verifications = await Promise.all(
    intents.map(async (intent) => ({
      id: intent.id,
      result: await verifyPaymentIntent(intent),
    }))
  );

  // Build results map
  for (const { id, result } of verifications) {
    results.set(id, result);
  }

  return results;
}

/**
 * Checks if a public key is valid Solana format
 *
 * @param publicKey - Public key string (base58)
 * @returns True if valid
 */
export function isValidSolanaPublicKey(publicKey: string): boolean {
  try {
    const bytes = bs58.decode(publicKey);
    return bytes.length === 32;
  } catch {
    return false;
  }
}

/**
 * Extracts public key from secret key
 *
 * @param secretKey - Secret key (64 bytes)
 * @returns Public key (base58 encoded)
 */
export function getPublicKeyFromSecretKey(secretKey: Uint8Array): string {
  if (secretKey.length !== 64) {
    throw new Error('Invalid secret key length (expected 64 bytes)');
  }

  const publicKeyBytes = secretKey.slice(32);
  return bs58.encode(publicKeyBytes);
}
