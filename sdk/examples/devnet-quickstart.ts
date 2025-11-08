/**
 * Hypernode SDK Devnet Quickstart
 *
 * This example shows how to connect to Hypernode programs on devnet
 * and query basic information.
 *
 * Prerequisites:
 * - Solana devnet wallet with SOL
 * - HYPER tokens (optional, for staking operations)
 *
 * Run: ts-node sdk/examples/devnet-quickstart.ts
 */

import { Connection, Keypair } from "@solana/web3.js";
import { Wallet } from "@coral-xyz/anchor";
import { DEVNET_CONFIG } from "../src/config";
import fs from "fs";

async function main() {
  console.log("=== Hypernode SDK Devnet Quickstart ===\n");

  // Load your keypair from filesystem
  // Default Solana devnet keypair location
  const keypairPath = process.env.SOLANA_KEYPAIR || `${process.env.HOME}/.config/solana/id.json`;

  console.log(`Loading keypair from: ${keypairPath}`);
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
  const keypair = Keypair.fromSecretKey(new Uint8Array(keypairData));
  const wallet = new Wallet(keypair);

  console.log(`Wallet public key: ${wallet.publicKey.toString()}\n`);

  // Connect to devnet
  const connection = new Connection(DEVNET_CONFIG.rpcUrl, "confirmed");
  console.log(`Connected to: ${DEVNET_CONFIG.rpcUrl}`);

  // Check SOL balance
  const balance = await connection.getBalance(wallet.publicKey);
  console.log(`SOL Balance: ${balance / 1e9} SOL\n`);

  // Display deployed program IDs
  console.log("=== Deployed Program IDs (Devnet) ===");
  console.log(`Markets:    ${DEVNET_CONFIG.programs.markets.toString()}`);
  console.log(`Staking:    ${DEVNET_CONFIG.programs.staking.toString()}`);
  console.log(`Rewards:    ${DEVNET_CONFIG.programs.rewards.toString()}`);
  console.log(`Slashing:   ${DEVNET_CONFIG.programs.slashing.toString()}`);
  console.log(`Governance: ${DEVNET_CONFIG.programs.governance.toString()}`);
  console.log(`\nHYPER Token: ${DEVNET_CONFIG.token.mint.toString()}\n`);

  // Verify programs are deployed
  console.log("=== Verifying Program Deployment ===");
  for (const [name, programId] of Object.entries(DEVNET_CONFIG.programs)) {
    try {
      const accountInfo = await connection.getAccountInfo(programId);
      if (accountInfo && accountInfo.executable) {
        console.log(`✅ ${name.padEnd(12)} - Program found and executable`);
      } else {
        console.log(`❌ ${name.padEnd(12)} - Program not found or not executable`);
      }
    } catch (error) {
      console.log(`❌ ${name.padEnd(12)} - Error: ${error.message}`);
    }
  }

  console.log("\n=== Next Steps ===");
  console.log("1. Get devnet SOL: solana airdrop 2 --url devnet");
  console.log("2. Explore Markets: ts-node sdk/examples/create-job.ts");
  console.log("3. Try Staking: Stake HYPER tokens to earn rewards");
  console.log("4. Check SDK README for full API documentation");
  console.log("\nFor more information:");
  console.log("- Devnet Explorer: https://explorer.solana.com/?cluster=devnet");
  console.log("- Documentation: See DEVNET_DEPLOYMENT.md");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
