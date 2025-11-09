/**
 * Devnet Program Verification Script (Plain JS)
 *
 * Verifies that all 5 Hypernode programs are deployed and accessible on devnet.
 * Run: node tests/devnet-verify.js
 */

const { Connection, PublicKey } = require("@solana/web3.js");

const DEVNET_CONFIG = {
  rpcUrl: "https://api.devnet.solana.com",
  programs: {
    markets: new PublicKey("67UE2LconF9QU5Vobsaf5sXnW9yUisebLj8VmgGWLSdb"),
    staking: new PublicKey("3fw9eQN1KHarGcYVETvF7FDt2BYGuDPMjuhoE45RJnTJ"),
    rewards: new PublicKey("EqBzwuXKmDZbAMf2WTogQhzABsrG6dYbbKXW1adsLhbb"),
    slashing: new PublicKey("6hGxAwYG4dLiLapKYzxUq3G4fe13Ut3nfft2LueayYxq"),
    governance: new PublicKey("HgWFcrT4npr2iiqsF8v6bV6eHUsidmGkoYGYcJD45Jqz"),
  },
  token: {
    mint: new PublicKey("92s9qna3djkMncZzkacyNQ38UKnNXZFh4Jgqe3Cmpump"),
  },
};

async function main() {
  console.log("=== Hypernode Devnet Program Verification ===\n");

  const connection = new Connection(DEVNET_CONFIG.rpcUrl, "confirmed");
  console.log(`Connected to: ${DEVNET_CONFIG.rpcUrl}\n`);

  const programs = [
    { name: "Markets", id: DEVNET_CONFIG.programs.markets },
    { name: "Staking", id: DEVNET_CONFIG.programs.staking },
    { name: "Rewards", id: DEVNET_CONFIG.programs.rewards },
    { name: "Slashing", id: DEVNET_CONFIG.programs.slashing },
    { name: "Governance", id: DEVNET_CONFIG.programs.governance },
  ];

  let allPassed = true;

  console.log("Verifying programs...\n");

  for (const program of programs) {
    try {
      const accountInfo = await connection.getAccountInfo(program.id);

      if (!accountInfo) {
        console.log(`❌ ${program.name.padEnd(12)} - Account not found`);
        console.log(`   Program ID: ${program.id.toString()}`);
        allPassed = false;
        continue;
      }

      if (!accountInfo.executable) {
        console.log(`❌ ${program.name.padEnd(12)} - Account exists but not executable`);
        console.log(`   Program ID: ${program.id.toString()}`);
        allPassed = false;
        continue;
      }

      const sizeKB = (accountInfo.data.length / 1024).toFixed(2);
      console.log(`✅ ${program.name.padEnd(12)} - Deployed and executable (${sizeKB} KB)`);
      console.log(`   Program ID: ${program.id.toString()}`);
      console.log(`   Owner: ${accountInfo.owner.toString()}`);
      console.log(`   Lamports: ${accountInfo.lamports / 1e9} SOL`);
      console.log("");
    } catch (error) {
      console.log(`❌ ${program.name.padEnd(12)} - Error: ${error.message}`);
      console.log(`   Program ID: ${program.id.toString()}`);
      console.log("");
      allPassed = false;
    }
  }

  // Verify HYPER token mint
  console.log("Verifying HYPER token mint...\n");
  try {
    const mintInfo = await connection.getAccountInfo(DEVNET_CONFIG.token.mint);

    if (mintInfo) {
      console.log(`✅ HYPER Token Mint exists`);
      console.log(`   Mint Address: ${DEVNET_CONFIG.token.mint.toString()}`);
      console.log(`   Lamports: ${mintInfo.lamports / 1e9} SOL`);
      console.log("");
    } else {
      console.log(`⚠️  HYPER Token Mint not found (may need to be created)`);
      console.log(`   Mint Address: ${DEVNET_CONFIG.token.mint.toString()}`);
      console.log("");
    }
  } catch (error) {
    console.log(`❌ HYPER Token Mint - Error: ${error.message}`);
    console.log("");
  }

  console.log("=".repeat(60));
  if (allPassed) {
    console.log("✅ ALL PROGRAMS VERIFIED - Devnet deployment is functional!");
  } else {
    console.log("❌ SOME PROGRAMS FAILED VERIFICATION - Check errors above");
    process.exit(1);
  }
  console.log("=".repeat(60));

  console.log("\n📝 Next Steps:");
  console.log("1. Test basic program instructions");
  console.log("2. Test cross-program invocations (CPI)");
  console.log("3. Run integration tests");
  console.log("\nExplorer Links:");
  programs.forEach(p => {
    console.log(`- ${p.name}: https://explorer.solana.com/address/${p.id.toString()}?cluster=devnet`);
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
