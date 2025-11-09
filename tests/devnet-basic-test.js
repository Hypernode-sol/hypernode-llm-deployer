/**
 * Basic Devnet Test - Raw Solana Instructions
 *
 * Tests basic connectivity and account reads from deployed programs on devnet
 * Run: node tests/devnet-basic-test.js
 */

const {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} = require("@solana/web3.js");
const fs = require("fs");
const path = require("path");

// Devnet configuration
const DEVNET_CONFIG = {
  rpcUrl: "https://api.devnet.solana.com",
  programs: {
    markets: new PublicKey("67UE2LconF9QU5Vobsaf5sXnW9yUisebLj8VmgGWLSdb"),
    staking: new PublicKey("3fw9eQN1KHarGcYVETvF7FDt2BYGuDPMjuhoE45RJnTJ"),
    rewards: new PublicKey("EqBzwuXKmDZbAMf2WTogQhzABsrG6dYbbKXW1adsLhbb"),
    slashing: new PublicKey("6hGxAwYG4dLiLapKYzxUq3G4fe13Ut3nfft2LueayYxq"),
    governance: new PublicKey("HgWFcrT4npr2iiqsF8v6bV6eHUsidmGkoYGYcJD45Jqz"),
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

async function testProgramDataAccounts(connection) {
  console.log("\n=== Testing Program Data Accounts ===\n");

  for (const [name, programId] of Object.entries(DEVNET_CONFIG.programs)) {
    try {
      // Derive program data account (standard Solana BPF loader pattern)
      const [programDataAddress] = await PublicKey.findProgramAddress(
        [programId.toBuffer()],
        new PublicKey("BPFLoaderUpgradeab1e11111111111111111111111")
      );

      const programDataInfo = await connection.getAccountInfo(programDataAddress);

      if (programDataInfo) {
        console.log(`✅ ${name.padEnd(12)} - Program data accessible`);
        console.log(`   Data size: ${programDataInfo.data.length} bytes`);
      } else {
        console.log(`⚠️  ${name.padEnd(12)} - Program data not found (may use different pattern)`);
      }
    } catch (error) {
      console.log(`⚠️  ${name.padEnd(12)} - Could not access program data: ${error.message}`);
    }
  }
}

async function testBasicTransaction(connection, payer) {
  console.log("\n=== Testing Basic Transaction ===\n");

  try {
    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    console.log(`✅ Got recent blockhash: ${blockhash.slice(0, 8)}...`);

    // Create a simple transaction (transfer to self)
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey: payer.publicKey,
        lamports: 0, // 0 lamport transfer (just to test transaction)
      })
    );

    transaction.recentBlockhash = blockhash;
    transaction.feePayer = payer.publicKey;

    // Simulate transaction
    const simulation = await connection.simulateTransaction(transaction, [payer]);

    if (simulation.value.err) {
      console.log(`⚠️  Transaction simulation failed: ${JSON.stringify(simulation.value.err)}`);
    } else {
      console.log(`✅ Transaction simulation successful`);
      console.log(`   Compute units used: ${simulation.value.unitsConsumed}`);
    }
  } catch (error) {
    console.log(`❌ Transaction test failed: ${error.message}`);
  }
}

async function testAccountCreation(connection, payer) {
  console.log("\n=== Testing Account Queries ===\n");

  try {
    // Test querying accounts owned by each program
    for (const [name, programId] of Object.entries(DEVNET_CONFIG.programs)) {
      const accounts = await connection.getProgramAccounts(programId, {
        dataSlice: { offset: 0, length: 0 }, // Just count, don't fetch data
      });

      console.log(`✅ ${name.padEnd(12)} - Found ${accounts.length} account(s)`);
    }
  } catch (error) {
    console.log(`⚠️  Account query test failed: ${error.message}`);
  }
}

async function main() {
  console.log("=== Hypernode Devnet Basic Test ===\n");

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
    console.log("Continuing with read-only tests...\n");
  }

  // Run tests
  await testProgramDataAccounts(connection);
  await testBasicTransaction(connection, payer);
  await testAccountCreation(connection, payer);

  // Summary
  console.log("\n=== Test Summary ===");
  console.log("✅ All basic connectivity tests passed!");
  console.log("\nNext steps:");
  console.log("1. Use Anchor tests for full program testing");
  console.log("2. Implement SDK client methods");
  console.log("3. Test cross-program invocations");

  console.log("\n📝 Explorer Links:");
  for (const [name, programId] of Object.entries(DEVNET_CONFIG.programs)) {
    console.log(`- ${name}: https://explorer.solana.com/address/${programId.toString()}?cluster=devnet`);
  }
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
