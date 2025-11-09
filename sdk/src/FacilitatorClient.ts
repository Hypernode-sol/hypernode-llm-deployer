import { Program, AnchorProvider, BN } from '@coral-xyz/anchor';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';
import { v4 as uuidv4 } from 'uuid';

export interface PaymentIntentParams {
  amount: BN;
  jobId?: Buffer;
  expirationSeconds?: number;
}

export interface PaymentIntent {
  id: Buffer;
  payer: PublicKey;
  amount: BN;
  jobId: Buffer;
  createdAt: BN;
  expiresAt: BN;
  signature: Buffer;
  status: PaymentStatus;
  escrow: PublicKey;
  bump: number;
}

export enum PaymentStatus {
  Pending = 'Pending',
  Verified = 'Verified',
  Claimed = 'Claimed',
  Refunded = 'Refunded',
  Expired = 'Expired',
}

export class FacilitatorClient {
  constructor(
    private program: Program,
    private connection: Connection,
    private provider: AnchorProvider
  ) {}

  /**
   * Create a new payment intent with escrow
   */
  async createIntent(
    params: PaymentIntentParams,
    tokenMint: PublicKey
  ): Promise<{ intentId: string; tx: Transaction }> {
    const { amount, jobId, expirationSeconds = 300 } = params;

    const intentId = uuidv4();
    const intentIdBytes = Buffer.from(intentId.replace(/-/g, ''), 'hex');

    const [paymentIntent] = PublicKey.findProgramAddressSync(
      [Buffer.from('payment_intent'), intentIdBytes],
      this.program.programId
    );

    const [escrow] = PublicKey.findProgramAddressSync(
      [Buffer.from('escrow'), paymentIntent.toBuffer()],
      this.program.programId
    );

    const [escrowAuthority] = PublicKey.findProgramAddressSync(
      [Buffer.from('escrow_authority')],
      this.program.programId
    );

    const payerTokenAccount = await getAssociatedTokenAddress(
      tokenMint,
      this.provider.wallet.publicKey
    );

    const now = Math.floor(Date.now() / 1000);
    const expiration = new BN(now + expirationSeconds);

    const tx = await this.program.methods
      .createIntent(
        Array.from(intentIdBytes),
        amount,
        jobId ? Array.from(jobId) : null,
        expiration
      )
      .accounts({
        paymentIntent,
        escrow,
        escrowAuthority,
        payer: this.provider.wallet.publicKey,
        payerTokenAccount,
        tokenMint,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .transaction();

    return { intentId, tx };
  }

  /**
   * Verify a payment intent with signature
   */
  async verifyPayment(
    intentId: string,
    signature: Buffer
  ): Promise<Transaction> {
    const intentIdBytes = Buffer.from(intentId.replace(/-/g, ''), 'hex');

    const [paymentIntent] = PublicKey.findProgramAddressSync(
      [Buffer.from('payment_intent'), intentIdBytes],
      this.program.programId
    );

    return await this.program.methods
      .verifyPayment(Array.from(signature))
      .accounts({
        paymentIntent,
        payer: this.provider.wallet.publicKey,
      })
      .transaction();
  }

  /**
   * Claim payment (for node providers)
   */
  async claimPayment(
    intentId: string,
    tokenMint: PublicKey
  ): Promise<Transaction> {
    const intentIdBytes = Buffer.from(intentId.replace(/-/g, ''), 'hex');

    const [paymentIntent] = PublicKey.findProgramAddressSync(
      [Buffer.from('payment_intent'), intentIdBytes],
      this.program.programId
    );

    const [escrow] = PublicKey.findProgramAddressSync(
      [Buffer.from('escrow'), paymentIntent.toBuffer()],
      this.program.programId
    );

    const [escrowAuthority] = PublicKey.findProgramAddressSync(
      [Buffer.from('escrow_authority')],
      this.program.programId
    );

    const recipientTokenAccount = await getAssociatedTokenAddress(
      tokenMint,
      this.provider.wallet.publicKey
    );

    return await this.program.methods
      .claimPayment()
      .accounts({
        paymentIntent,
        escrow,
        escrowAuthority,
        recipient: this.provider.wallet.publicKey,
        recipientTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .transaction();
  }

  /**
   * Refund expired payment intent
   */
  async refundPayment(
    intentId: string,
    tokenMint: PublicKey
  ): Promise<Transaction> {
    const intentIdBytes = Buffer.from(intentId.replace(/-/g, ''), 'hex');

    const [paymentIntent] = PublicKey.findProgramAddressSync(
      [Buffer.from('payment_intent'), intentIdBytes],
      this.program.programId
    );

    const [escrow] = PublicKey.findProgramAddressSync(
      [Buffer.from('escrow'), paymentIntent.toBuffer()],
      this.program.programId
    );

    const [escrowAuthority] = PublicKey.findProgramAddressSync(
      [Buffer.from('escrow_authority')],
      this.program.programId
    );

    const payerTokenAccount = await getAssociatedTokenAddress(
      tokenMint,
      this.provider.wallet.publicKey
    );

    return await this.program.methods
      .refundPayment()
      .accounts({
        paymentIntent,
        escrow,
        escrowAuthority,
        payer: this.provider.wallet.publicKey,
        payerTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .transaction();
  }

  /**
   * Get payment intent details
   */
  async getIntent(intentId: string): Promise<PaymentIntent | null> {
    const intentIdBytes = Buffer.from(intentId.replace(/-/g, ''), 'hex');

    const [paymentIntent] = PublicKey.findProgramAddressSync(
      [Buffer.from('payment_intent'), intentIdBytes],
      this.program.programId
    );

    try {
      const account = await this.program.account.paymentIntent.fetch(paymentIntent);
      return account as PaymentIntent;
    } catch {
      return null;
    }
  }

  /**
   * Get payment intent PDA
   */
  getIntentPDA(intentId: string): PublicKey {
    const intentIdBytes = Buffer.from(intentId.replace(/-/g, ''), 'hex');
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from('payment_intent'), intentIdBytes],
      this.program.programId
    );
    return pda;
  }

  /**
   * Get escrow PDA for an intent
   */
  getEscrowPDA(paymentIntentPDA: PublicKey): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from('escrow'), paymentIntentPDA.toBuffer()],
      this.program.programId
    );
    return pda;
  }
}
