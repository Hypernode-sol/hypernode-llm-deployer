/**
 * Facilitator Adapter
 *
 * Bridges between our SDK FacilitatorClient and off-chain services (Oracle, x402)
 * Maps standalone facilitator methods to our program's instructions
 */

import { Connection, PublicKey, Keypair, Transaction } from '@solana/web3.js';
import { AnchorProvider, Program, BN, Wallet } from '@coral-xyz/anchor';
import { FacilitatorClient } from '../sdk/src/FacilitatorClient.js';
import dotenv from 'dotenv';

dotenv.config();

const FACILITATOR_PROGRAM_ID = new PublicKey(
  process.env.FACILITATOR_PROGRAM_ID || 'FAC1L1TaTorProgRamIdPLacehOLdEr111111111111'
);

const HYPER_MINT_DEVNET = new PublicKey(
  process.env.HYPER_MINT_DEVNET || '56jZUEMAhXxRu7Am3L2AkRRxNJb187zBbBQqnTf6jV75'
);

const HYPER_MINT_MAINNET = new PublicKey(
  process.env.HYPER_MINT_MAINNET || '92s9qna3djkMncZzkacyNQ38UKnNXZFh4Jgqe3Cmpump'
);

/**
 * Oracle Authority Keypair
 * In production, load from secure key management system
 */
const ORACLE_AUTHORITY = process.env.ORACLE_PRIVATE_KEY
  ? Keypair.fromSecretKey(new Uint8Array(JSON.parse(process.env.ORACLE_PRIVATE_KEY)))
  : Keypair.generate();

/**
 * Adapter class that wraps FacilitatorClient
 * Provides interface compatible with standalone facilitator client.js
 */
export class FacilitatorAdapter {
  public client: FacilitatorClient;
  public connection: Connection;
  public provider: AnchorProvider;
  public program: Program;
  public oracleAuthority: Keypair;
  public hyperMint: PublicKey;

  constructor(
    connection?: Connection,
    programId: PublicKey = FACILITATOR_PROGRAM_ID
  ) {
    this.connection = connection || new Connection(
      process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
      'confirmed'
    );

    this.oracleAuthority = ORACLE_AUTHORITY;

    // Determine HYPER mint based on network
    const network = process.env.SOLANA_NETWORK || 'devnet';
    this.hyperMint = network === 'mainnet-beta' ? HYPER_MINT_MAINNET : HYPER_MINT_DEVNET;

    // Create wallet for Oracle authority
    const wallet: Wallet = {
      publicKey: this.oracleAuthority.publicKey,
      signTransaction: async (tx: Transaction) => {
        tx.partialSign(this.oracleAuthority);
        return tx;
      },
      signAllTransactions: async (txs: Transaction[]) => {
        return txs.map(tx => {
          tx.partialSign(this.oracleAuthority);
          return tx;
        });
      },
    };

    this.provider = new AnchorProvider(
      this.connection,
      wallet,
      { commitment: 'confirmed' }
    );

    // Initialize FacilitatorClient from SDK
    this.client = new FacilitatorClient(
      this.program,
      this.connection,
      this.provider
    );

    console.log('[FacilitatorAdapter] Initialized');
    console.log(`[FacilitatorAdapter] Program ID: ${programId.toString()}`);
    console.log(`[FacilitatorAdapter] Oracle: ${this.oracleAuthority.publicKey.toString()}`);
    console.log(`[FacilitatorAdapter] HYPER Mint: ${this.hyperMint.toString()}`);
  }

  /**
   * Authorize payment (maps to createIntent in our program)
   *
   * Standalone client.js expects: authorizePayment(clientPubkey, intentId, amount, expiresAt)
   * Our FacilitatorClient has: createIntent(params, tokenMint)
   */
  async authorizePayment(
    clientPubkey: string,
    intentId: string,
    amount: bigint | BN,
    expiresAt: number
  ) {
    try {
      console.log(`[FacilitatorAdapter] Authorizing payment: ${intentId}`);

      // Convert intentId (string UUID) to Buffer
      const intentIdBuffer = Buffer.from(intentId.replace(/-/g, ''), 'hex');

      // Convert amount to BN if needed
      const amountBN = amount instanceof BN ? amount : new BN(amount.toString());

      // Create payment intent using our SDK
      const { intentId: createdIntentId, tx } = await this.client.createIntent(
        {
          amount: amountBN,
          jobId: intentIdBuffer, // Use intentId as jobId for now
          expirationSeconds: Math.floor(expiresAt - Date.now() / 1000),
        },
        this.hyperMint
      );

      // Sign and send transaction
      const provider = this.provider as AnchorProvider;
      const txSignature = await provider.sendAndConfirm(tx);

      // Get escrow PDA
      const paymentIntentPDA = this.client.getIntentPDA(intentId);
      const escrowPDA = this.client.getEscrowPDA(paymentIntentPDA);

      console.log(`[FacilitatorAdapter] Payment authorized. TX: ${txSignature}`);

      return {
        success: true,
        paymentIntent: paymentIntentPDA.toString(),
        escrow: escrowPDA.toString(),
        txSignature,
        amount: amountBN.toString(),
      };

    } catch (error) {
      console.error('[FacilitatorAdapter] Failed to authorize payment:', error);
      throw error;
    }
  }

  /**
   * Submit usage proof from Oracle
   * In our architecture, this is handled by claim_payment after verification
   *
   * Standalone expects: submitUsageProof(intentId, nodeId, executionHash, logsHash)
   * Our program has: verify_payment(signature) then claim_payment()
   */
  async submitUsageProof(
    intentId: string,
    nodeId: string,
    executionHash: string,
    logsHash: string
  ) {
    try {
      console.log(`[FacilitatorAdapter] Submitting usage proof for: ${intentId}`);

      // Create proof signature (Oracle signs the proof data)
      const proofData = JSON.stringify({
        intentId,
        nodeId,
        executionHash,
        logsHash,
        timestamp: Date.now(),
      });

      const proofHash = Buffer.from(proofData);

      // In our architecture, Oracle verifies off-chain and then node claims
      // For now, we'll verify payment using a mock signature
      // TODO: Integrate with actual verification flow

      // Generate 64-byte signature (mock for now)
      const signature = Buffer.alloc(64);

      const tx = await this.client.verifyPayment(intentId, signature);

      const provider = this.provider as AnchorProvider;
      const txSignature = await provider.sendAndConfirm(tx);

      console.log(`[FacilitatorAdapter] Usage proof submitted. TX: ${txSignature}`);

      return {
        success: true,
        usageProof: intentId, // In our system, proof is implicit in verification
        txSignature,
      };

    } catch (error) {
      console.error('[FacilitatorAdapter] Failed to submit usage proof:', error);
      throw error;
    }
  }

  /**
   * Get payment intent data
   */
  async getPaymentIntent(intentId: string) {
    try {
      const intent = await this.client.getIntent(intentId);

      if (!intent) {
        return null;
      }

      return {
        address: this.client.getIntentPDA(intentId).toString(),
        client: intent.payer.toString(),
        intentId,
        amount: intent.amount.toString(),
        status: this.mapPaymentStatus(intent.status),
        createdAt: new Date(intent.createdAt.toNumber() * 1000),
        expiresAt: new Date(intent.expiresAt.toNumber() * 1000),
      };

    } catch (error) {
      console.error('[FacilitatorAdapter] Failed to get payment intent:', error);
      if (error.message && error.message.includes('Account does not exist')) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Map our PaymentStatus enum to standalone format
   */
  private mapPaymentStatus(status: any): string {
    // Our PaymentStatus enum from programs/hypernode-facilitator/src/state/payment_intent.rs
    // { Pending, Verified, Claimed, Refunded, Expired }
    if (typeof status === 'object') {
      return Object.keys(status)[0]; // Extract enum variant name
    }
    return status;
  }

  /**
   * Derive Node PDA (compatible with standalone)
   * Note: Node management is in hypernode-nodes program, not facilitator
   */
  deriveNodePDA(nodeId: string) {
    // For compatibility, return a PDA structure
    // In production, this should call hypernode-nodes program
    const [pda, bump] = PublicKey.findProgramAddressSync(
      [Buffer.from('node'), Buffer.from(nodeId)],
      this.program.programId
    );
    return { pda, bump };
  }

  /**
   * Derive Payment Intent PDA
   */
  derivePaymentIntentPDA(intentId: string) {
    const pda = this.client.getIntentPDA(intentId);
    return { pda, bump: 0 }; // Bump not exposed by our client
  }

  /**
   * Generate execution hash (compatible with standalone)
   */
  generateExecutionHash(logs: any, result: any): string {
    const crypto = require('crypto');
    const data = JSON.stringify({ logs, result, timestamp: Date.now() });
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Generate intent hash
   */
  generateIntentHash(intentData: any): string {
    const crypto = require('crypto');
    const message = JSON.stringify(intentData);
    return crypto.createHash('sha256').update(message).digest('hex');
  }
}

/**
 * Lazy singleton instance
 */
let facilitatorAdapterInstance: FacilitatorAdapter | null = null;

export function getFacilitatorAdapter(): FacilitatorAdapter {
  if (!facilitatorAdapterInstance) {
    try {
      facilitatorAdapterInstance = new FacilitatorAdapter();
    } catch (error) {
      console.warn('[FacilitatorAdapter] Failed to initialize:', error.message);
      // Return mock adapter for development
      facilitatorAdapterInstance = {
        authorizePayment: async () => ({ escrow: 'mock-escrow', txSignature: 'mock-tx' }),
        submitUsageProof: async () => ({ txSignature: 'mock-tx' }),
        getPaymentIntent: async () => null,
        generateExecutionHash: () => 'mock-hash',
        generateIntentHash: () => 'mock-hash',
      } as any;
    }
  }
  return facilitatorAdapterInstance;
}

export default getFacilitatorAdapter();
