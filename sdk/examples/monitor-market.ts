/**
 * Example: Monitor market statistics
 */

import { HypernodeSDK } from "../src";
import { PublicKey } from "@solana/web3.js";

async function main() {
  const sdk = HypernodeSDK.fromKeypairFile(
    process.env.KEYPAIR_PATH || "/home/user/.config/solana/id.json",
    {
      rpcUrl: "https://api.devnet.solana.com",
      programId: "HYPERMarket11111111111111111111111111111111",
      market: new PublicKey(process.env.MARKET_PUBKEY!),
    }
  );

  console.log("📊 Hypernode Market Monitor\n");

  // Get market stats
  const stats = await sdk.market.getMarketStats();

  console.log("Market Statistics:");
  console.log(`  Total Jobs: ${stats.totalJobs}`);
  console.log(`  Total Nodes: ${stats.totalNodes}`);
  console.log(`  Queue Length: ${stats.queueLength}`);
  console.log(`  Queue Type: ${stats.queueType === 1 ? "Jobs" : stats.queueType === 2 ? "Nodes" : "Empty"}`);
  console.log(`  Job Price: ${stats.jobPrice / 1_000_000_000} SOL`);

  // Get queued jobs
  const queuedJobs = await sdk.market.getQueuedJobs();

  if (queuedJobs.length > 0) {
    console.log(`\n📋 Queued Jobs (${queuedJobs.length}):`);
    for (const jobPubkey of queuedJobs) {
      console.log(`  - ${jobPubkey.toString()}`);
    }
  }

  // Get queued nodes
  const queuedNodes = await sdk.market.getQueuedNodes();

  if (queuedNodes.length > 0) {
    console.log(`\n🖥️  Queued Nodes (${queuedNodes.length}):`);
    for (const nodePubkey of queuedNodes) {
      console.log(`  - ${nodePubkey.toString()}`);
    }
  }

  // Subscribe to market updates
  console.log("\n👀 Subscribing to market updates...");
  console.log("Press Ctrl+C to exit\n");

  await sdk.market.subscribeToMarket((market) => {
    console.log(`\n📡 Market Update:`);
    console.log(`  Total Jobs: ${market.totalJobs.toNumber()}`);
    console.log(`  Total Nodes: ${market.totalNodes.toNumber()}`);
    console.log(`  Queue Length: ${market.queue.length}`);
    console.log(`  Queue Type: ${market.queueType === 1 ? "Jobs" : market.queueType === 2 ? "Nodes" : "Empty"}`);
  });

  // Keep alive
  await new Promise(() => {});
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
