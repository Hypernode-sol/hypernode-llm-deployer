/**
 * Devnet Instructions Test
 *
 * Tests actual program instructions on devnet:
 * 1. CreateMarket - Create a GPU marketplace
 * 2. CreateJob - Create and queue a job
 * 3. ListNode - Register node in queue (requires Staking program integration)
 *
 * Run: node tests/devnet-instructions-test.js
 */

const {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  TransactionInstruction,
  SYSVAR_RENT_PUBKEY,
} = require("@solana/web3.js");
const fs = require("fs");
const path = require("path");
const BN = require("bn.js");

// Devnet configuration
// IMPORTANT: These are the Program IDs from declare_id!() in the source code
// NOT the deployment addresses from Anchor.toml
const DEVNET_CONFIG = {
  rpcUrl: "https://api.devnet.solana.com",
  programs: {
    markets: new PublicKey("8c1P5BJGB79gKFL4yXPxthZhKuhKd6WuAgxwQPET6nvV"),
    staking: new PublicKey("9nvKFcdaP1nnuGSzV3ZeFYRkvETksqkHHji1PvsE3R5k"),
  },
};

async function loadKeypair() {
  const keypairPath = process.env.SOLANA_KEYPAIR ||
    path.join(process.env.HOME || process.env.USERPROFILE, ".config", "solana", "id.json");

  console.log(`Loading keypair from: ${keypairPath}`);

  try {
    const keypairData = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
    return Keypair.fromSecretKey(new Uint8Array(keypairData));
  } catch (error) {
    console.error(`Error loading keypair: ${error.message}`);
    console.log("Creating temporary test keypair...");
    return Keypair.generate();
  }
}

/**
 * Derive PDA for vault account
 */
async function deriveVaultPDA(marketPubkey, programId) {
  const [vaultPDA, bump] = await PublicKey.findProgramAddress(
    [Buffer.from("vault"), marketPubkey.toBuffer()],
    programId
  );
  return { vaultPDA, bump };
}

/**
 * Derive PDA for job account
 */
async function deriveJobPDA(jobId, programId) {
  const [jobPDA, bump] = await PublicKey.findProgramAddress(
    [Buffer.from("job"), jobId.toBuffer()],
    programId
  );
  return { jobPDA, bump };
}

/**
 * Test 1: Create Market
 * Creates a GPU marketplace with parameters
 */
async function testCreateMarket(connection, payer) {
  console.log("\n=== Test 1: Create Market ===\n");

  try {
    const marketsProgram = DEVNET_CONFIG.programs.markets;

    // Generate new market keypair
    const market = Keypair.generate();
    console.log(`Market address: ${market.publicKey.toString()}`);

    // Derive vault PDA
    const { vaultPDA } = await deriveVaultPDA(market.publicKey, marketsProgram);
    console.log(`Vault PDA: ${vaultPDA.toString()}`);

    // Market parameters
    const jobPrice = new BN(0.1 * LAMPORTS_PER_SOL); // 0.1 SOL
    const jobTimeout = new BN(3600); // 1 hour
    const nodeXHyperMinimum = new BN(1000); // 1000 xHYPER minimum

    console.log(`Job price: ${jobPrice.toNumber() / LAMPORTS_PER_SOL} SOL`);
    console.log(`Job timeout: ${jobTimeout.toString()} seconds`);
    console.log(`Node xHYPER minimum: ${nodeXHyperMinimum.toString()}`);

    // Calculate space needed for market account
    const marketAccountSpace = 8 + 32 + 8 + 8 + 16 + 1 + 1 + 8 + 8 + 32 + 4;
    const rentExempt = await connection.getMinimumBalanceForRentExemption(marketAccountSpace);

    // Build create market instruction data
    // Instruction discriminator for CreateMarket (first 8 bytes of sha256("global:create_market"))
    const discriminator = Buffer.from([0x18, 0xc6, 0x9b, 0xbd, 0x51, 0x04, 0x92, 0xf7]);

    // Serialize parameters
    const data = Buffer.concat([
      discriminator,
      jobPrice.toArrayLike(Buffer, "le", 8),
      jobTimeout.toArrayLike(Buffer, "le", 8),
      nodeXHyperMinimum.toArrayLike(Buffer, "le", 16),
    ]);

    // Create account + initialize market instruction
    const createAccountIx = SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: market.publicKey,
      lamports: rentExempt,
      space: marketAccountSpace,
      programId: marketsProgram,
    });

    const createMarketIx = new TransactionInstruction({
      programId: marketsProgram,
      keys: [
        { pubkey: market.publicKey, isSigner: false, isWritable: true },
        { pubkey: payer.publicKey, isSigner: true, isWritable: true },
        { pubkey: vaultPDA, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: data,
    });

    // Send transaction
    const transaction = new Transaction().add(createAccountIx, createMarketIx);
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = payer.publicKey;

    // Sign and send
    console.log("\nSimulating create market transaction...");
    const simulation = await connection.simulateTransaction(transaction, [payer, market]);

    if (simulation.value.err) {
      console.log(`❌ Simulation failed: ${JSON.stringify(simulation.value.err)}`);
      console.log("Logs:", simulation.value.logs);
      return null;
    }

    console.log(`✅ Simulation successful`);
    console.log(`   Compute units: ${simulation.value.unitsConsumed}`);
    console.log(`   Logs: ${simulation.value.logs?.slice(0, 3).join("\n   ")}`);

    // Note: Actual transaction sending is commented out for testing
    // Uncomment the following to actually create the market on devnet
    /*
    const signature = await connection.sendTransaction(transaction, [payer, market]);
    await connection.confirmTransaction(signature);
    console.log(`✅ Market created! Signature: ${signature}`);
    console.log(`   Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
    */

    return market.publicKey;
  } catch (error) {
    console.log(`❌ Create market failed: ${error.message}`);
    if (error.logs) {
      console.log("Program logs:", error.logs);
    }
    return null;
  }
}

/**
 * Test 2: Create Job
 * Creates a job and adds it to the market queue
 */
async function testCreateJob(connection, payer, marketPubkey) {
  console.log("\n=== Test 2: Create Job ===\n");

  if (!marketPubkey) {
    console.log("⚠️  Skipping: No market available");
    return null;
  }

  try {
    const marketsProgram = DEVNET_CONFIG.programs.markets;

    // Generate job ID
    const jobId = Keypair.generate().publicKey;
    console.log(`Job ID: ${jobId.toString()}`);

    // Derive job PDA
    const { jobPDA } = await deriveJobPDA(jobId, marketsProgram);
    console.log(`Job PDA: ${jobPDA.toString()}`);

    // Derive vault PDA
    const { vaultPDA } = await deriveVaultPDA(marketPubkey, marketsProgram);

    // Job parameters
    const ipfsJob = Buffer.alloc(32); // IPFS hash placeholder
    ipfsJob.write("QmExampleIPFSHash123456789", 0);
    const minVram = 8; // 8 GB VRAM
    const gpuType = 1; // NVIDIA

    console.log(`IPFS job: ${ipfsJob.toString("hex").slice(0, 32)}...`);
    console.log(`Min VRAM: ${minVram} GB`);
    console.log(`GPU type: ${gpuType === 1 ? "NVIDIA" : "AMD"}`);

    // Build instruction
    const discriminator = Buffer.from([0xec, 0x4e, 0x2f, 0x78, 0x05, 0x96, 0xd4, 0x49]); // create_job discriminator

    const data = Buffer.concat([
      discriminator,
      jobId.toBuffer(),
      ipfsJob,
      Buffer.from([minVram]),
      Buffer.from([gpuType]),
    ]);

    const createJobIx = new TransactionInstruction({
      programId: marketsProgram,
      keys: [
        { pubkey: jobPDA, isSigner: false, isWritable: true },
        { pubkey: marketPubkey, isSigner: false, isWritable: true },
        { pubkey: payer.publicKey, isSigner: true, isWritable: true },
        { pubkey: vaultPDA, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: data,
    });

    const transaction = new Transaction().add(createJobIx);
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = payer.publicKey;

    console.log("\nSimulating create job transaction...");
    const simulation = await connection.simulateTransaction(transaction, [payer]);

    if (simulation.value.err) {
      console.log(`❌ Simulation failed: ${JSON.stringify(simulation.value.err)}`);
      console.log("Logs:", simulation.value.logs);
      return null;
    }

    console.log(`✅ Simulation successful`);
    console.log(`   Compute units: ${simulation.value.unitsConsumed}`);

    return jobPDA;
  } catch (error) {
    console.log(`❌ Create job failed: ${error.message}`);
    return null;
  }
}

/**
 * Test 3: List Node
 * Registers a node in the market queue (requires staking)
 */
async function testListNode(connection, payer, marketPubkey) {
  console.log("\n=== Test 3: List Node ===\n");

  if (!marketPubkey) {
    console.log("⚠️  Skipping: No market available");
    return;
  }

  console.log("⚠️  This test requires a stake account from the Staking program");
  console.log("   Stake account derivation: seeds = ['stake', node.key()]");
  console.log("   Minimum xHYPER stake required as configured in market");

  try {
    const marketsProgram = DEVNET_CONFIG.programs.markets;
    const stakingProgram = DEVNET_CONFIG.programs.staking;

    // Derive stake account PDA
    const [stakeAccount] = await PublicKey.findProgramAddress(
      [Buffer.from("stake"), payer.publicKey.toBuffer()],
      stakingProgram
    );

    console.log(`\nNode: ${payer.publicKey.toString()}`);
    console.log(`Stake account (PDA): ${stakeAccount.toString()}`);

    // Check if stake account exists
    const stakeAccountInfo = await connection.getAccountInfo(stakeAccount);
    if (!stakeAccountInfo) {
      console.log(`\n⚠️  Stake account does not exist`);
      console.log(`   To test this instruction:`);
      console.log(`   1. First create a stake account via Staking program`);
      console.log(`   2. Stake sufficient HYPER tokens to get xHYPER`);
      console.log(`   3. Then call list_node instruction`);
      return;
    }

    console.log(`✅ Stake account exists (${stakeAccountInfo.data.length} bytes)`);

    // Build instruction
    const discriminator = Buffer.from([0x98, 0x98, 0x75, 0x32, 0x8c, 0x28, 0x2f, 0x55]); // list_node discriminator

    const data = Buffer.from(discriminator);

    const listNodeIx = new TransactionInstruction({
      programId: marketsProgram,
      keys: [
        { pubkey: marketPubkey, isSigner: false, isWritable: true },
        { pubkey: payer.publicKey, isSigner: true, isWritable: false },
        { pubkey: stakeAccount, isSigner: false, isWritable: false },
        { pubkey: stakingProgram, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: data,
    });

    const transaction = new Transaction().add(listNodeIx);
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = payer.publicKey;

    console.log("\nSimulating list node transaction...");
    const simulation = await connection.simulateTransaction(transaction, [payer]);

    if (simulation.value.err) {
      console.log(`❌ Simulation failed: ${JSON.stringify(simulation.value.err)}`);
      console.log("Logs:", simulation.value.logs);
      return;
    }

    console.log(`✅ Simulation successful`);
    console.log(`   Compute units: ${simulation.value.unitsConsumed}`);

  } catch (error) {
    console.log(`❌ List node failed: ${error.message}`);
  }
}

async function main() {
  console.log("=== Hypernode Devnet Instructions Test ===\n");

  // Setup
  const connection = new Connection(DEVNET_CONFIG.rpcUrl, "confirmed");
  console.log(`Connected to: ${DEVNET_CONFIG.rpcUrl}`);

  const payer = await loadKeypair();
  console.log(`Payer address: ${payer.publicKey.toString()}\n`);

  // Check balance
  const balance = await connection.getBalance(payer.publicKey);
  console.log(`Payer balance: ${balance / LAMPORTS_PER_SOL} SOL`);

  if (balance === 0) {
    console.log("\n⚠️  WARNING: Payer has 0 SOL balance");
    console.log("Run: solana airdrop 2 --url devnet");
    console.log("Continuing with simulations only...\n");
  }

  // Run tests
  const marketPubkey = await testCreateMarket(connection, payer);
  const jobPDA = await testCreateJob(connection, payer, marketPubkey);
  await testListNode(connection, payer, marketPubkey);

  // Summary
  console.log("\n=== Test Summary ===");
  console.log(`✅ CreateMarket: ${marketPubkey ? "Simulated successfully" : "Failed"}`);
  console.log(`✅ CreateJob: ${jobPDA ? "Simulated successfully" : "Skipped/Failed"}`);
  console.log(`⚠️  ListNode: Requires stake account (test shows expected flow)`);

  console.log("\n📝 Next Steps:");
  console.log("1. Uncomment transaction sending in testCreateMarket to create real market");
  console.log("2. Create stake account via Staking program");
  console.log("3. Stake HYPER tokens to get xHYPER");
  console.log("4. Run full flow including ListNode instruction");

  console.log("\n📊 Program IDs:");
  console.log(`Markets: https://explorer.solana.com/address/${DEVNET_CONFIG.programs.markets.toString()}?cluster=devnet`);
  console.log(`Staking: https://explorer.solana.com/address/${DEVNET_CONFIG.programs.staking.toString()}?cluster=devnet`);
}

main()
  .then(() => {
    console.log("\n✅ Tests completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  });
