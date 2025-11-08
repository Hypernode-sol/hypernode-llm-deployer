import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { HypernodeMarkets } from "../target/types/hypernode_markets";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { assert } from "chai";

describe("hypernode-markets", () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.HypernodeMarkets as Program<HypernodeMarkets>;

  // Test accounts
  let market: Keypair;
  let marketVault: PublicKey;
  let marketVaultBump: number;
  let client: Keypair;
  let node: Keypair;
  let jobId: PublicKey;
  let jobPda: PublicKey;
  let jobBump: number;

  // Market parameters
  const jobPrice = new anchor.BN(1_000_000_000); // 1 SOL
  const jobTimeout = new anchor.BN(3600); // 1 hour
  const nodeXhyperMinimum = new anchor.BN(100_000_000); // 100 xHYPER

  // IPFS CIDs (mock)
  const ipfsJob = Buffer.alloc(32, 1);
  const ipfsResult = Buffer.alloc(32, 2);

  before(async () => {
    // Initialize test accounts
    market = Keypair.generate();
    client = Keypair.generate();
    node = Keypair.generate();
    jobId = Keypair.generate().publicKey;

    // Derive PDAs
    [marketVault, marketVaultBump] = await PublicKey.findProgramAddress(
      [Buffer.from("vault"), market.publicKey.toBuffer()],
      program.programId
    );

    [jobPda, jobBump] = await PublicKey.findProgramAddress(
      [Buffer.from("job"), jobId.toBuffer()],
      program.programId
    );

    // Airdrop SOL to test accounts
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        provider.wallet.publicKey,
        10 * anchor.web3.LAMPORTS_PER_SOL
      )
    );

    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        client.publicKey,
        10 * anchor.web3.LAMPORTS_PER_SOL
      )
    );

    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        node.publicKey,
        10 * anchor.web3.LAMPORTS_PER_SOL
      )
    );
  });

  it("Creates a market", async () => {
    await program.methods
      .createMarket(jobPrice, jobTimeout, nodeXhyperMinimum)
      .accounts({
        market: market.publicKey,
        authority: provider.wallet.publicKey,
        vault: marketVault,
        systemProgram: SystemProgram.programId,
      })
      .signers([market])
      .rpc();

    // Fetch market account
    const marketAccount = await program.account.marketAccount.fetch(market.publicKey);

    // Verify market fields
    assert.equal(
      marketAccount.authority.toString(),
      provider.wallet.publicKey.toString()
    );
    assert.equal(marketAccount.jobPrice.toNumber(), jobPrice.toNumber());
    assert.equal(marketAccount.jobTimeout.toNumber(), jobTimeout.toNumber());
    assert.equal(marketAccount.nodeXhyperMinimum.toString(), nodeXhyperMinimum.toString());
    assert.equal(marketAccount.queue.length, 0);
    assert.equal(marketAccount.queueType, 0); // QUEUE_TYPE_EMPTY
    assert.equal(marketAccount.totalJobs.toNumber(), 0);
    assert.equal(marketAccount.totalNodes.toNumber(), 0);

    console.log("✅ Market created:", market.publicKey.toString());
  });

  it("Creates a job", async () => {
    const minVram = 8; // 8GB
    const gpuType = 1; // NVIDIA

    await program.methods
      .createJob(jobId, Array.from(ipfsJob), minVram, gpuType)
      .accounts({
        job: jobPda,
        market: market.publicKey,
        client: client.publicKey,
        vault: marketVault,
        systemProgram: SystemProgram.programId,
      })
      .signers([client])
      .rpc();

    // Fetch job account
    const jobAccount = await program.account.jobAccount.fetch(jobPda);

    // Verify job fields
    assert.equal(jobAccount.id.toString(), jobId.toString());
    assert.equal(jobAccount.market.toString(), market.publicKey.toString());
    assert.equal(jobAccount.client.toString(), client.publicKey.toString());
    assert.equal(jobAccount.node, null);
    assert.deepEqual(Buffer.from(jobAccount.ipfsJob), ipfsJob);
    assert.equal(jobAccount.price.toNumber(), jobPrice.toNumber());
    assert.equal(jobAccount.minVram, minVram);
    assert.equal(jobAccount.gpuType, gpuType);
    assert.equal(jobAccount.state.queued !== undefined, true);

    // Verify market queue updated
    const marketAccount = await program.account.marketAccount.fetch(market.publicKey);
    assert.equal(marketAccount.queue.length, 1);
    assert.equal(marketAccount.queueType, 1); // QUEUE_TYPE_JOBS
    assert.equal(marketAccount.totalJobs.toNumber(), 1);

    console.log("✅ Job created:", jobPda.toString());
  });

  it("Node claims job (work_job)", async () => {
    await program.methods
      .workJob()
      .accounts({
        job: jobPda,
        market: market.publicKey,
        node: node.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([node])
      .rpc();

    // Fetch job account
    const jobAccount = await program.account.jobAccount.fetch(jobPda);

    // Verify job is now running
    assert.equal(jobAccount.node.toString(), node.publicKey.toString());
    assert.equal(jobAccount.state.running !== undefined, true);
    assert.notEqual(jobAccount.timeStart.toNumber(), 0);

    // Verify market queue is empty
    const marketAccount = await program.account.marketAccount.fetch(market.publicKey);
    assert.equal(marketAccount.queue.length, 0);
    assert.equal(marketAccount.queueType, 0); // QUEUE_TYPE_EMPTY

    console.log("✅ Node claimed job:", node.publicKey.toString());
  });

  it("Node finishes job and receives payment", async () => {
    // Get initial balances
    const nodeAccountBefore = await provider.connection.getAccountInfo(node.publicKey);
    const vaultBefore = await provider.connection.getAccountInfo(marketVault);

    await program.methods
      .finishJob(Array.from(ipfsResult))
      .accounts({
        job: jobPda,
        market: market.publicKey,
        node: node.publicKey,
        nodeAccount: node.publicKey,
        vault: marketVault,
        systemProgram: SystemProgram.programId,
      })
      .signers([node])
      .rpc();

    // Fetch job account
    const jobAccount = await program.account.jobAccount.fetch(jobPda);

    // Verify job is completed
    assert.equal(jobAccount.state.completed !== undefined, true);
    assert.deepEqual(Buffer.from(jobAccount.ipfsResult), ipfsResult);
    assert.notEqual(jobAccount.timeEnd.toNumber(), 0);

    // Verify payment transferred
    const nodeAccountAfter = await provider.connection.getAccountInfo(node.publicKey);
    const vaultAfter = await provider.connection.getAccountInfo(marketVault);

    const nodeBalanceIncrease = nodeAccountAfter.lamports - nodeAccountBefore.lamports;
    const vaultBalanceDecrease = vaultBefore.lamports - vaultAfter.lamports;

    assert.equal(nodeBalanceIncrease, jobPrice.toNumber());
    assert.equal(vaultBalanceDecrease, jobPrice.toNumber());

    console.log("✅ Job finished and payment transferred:", jobPrice.toString(), "lamports");
  });

  it("Node lists in queue when no jobs available", async () => {
    await program.methods
      .listNode()
      .accounts({
        market: market.publicKey,
        node: node.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([node])
      .rpc();

    // Verify node added to queue
    const marketAccount = await program.account.marketAccount.fetch(market.publicKey);
    assert.equal(marketAccount.queue.length, 1);
    assert.equal(marketAccount.queueType, 2); // QUEUE_TYPE_NODES
    assert.equal(marketAccount.queue[0].toString(), node.publicKey.toString());

    console.log("✅ Node listed in queue:", node.publicKey.toString());
  });
});
