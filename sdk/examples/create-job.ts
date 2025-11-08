/**
 * Example: Create a GPU job using Hypernode SDK
 */

import { HypernodeSDK, GpuType } from "../src";
import { PublicKey } from "@solana/web3.js";

async function main() {
  // Initialize SDK from keypair file
  const sdk = HypernodeSDK.fromKeypairFile(
    process.env.KEYPAIR_PATH || "/home/user/.config/solana/id.json",
    {
      rpcUrl: "https://api.devnet.solana.com",
      programId: "HYPERMarket11111111111111111111111111111111",
      market: new PublicKey(process.env.MARKET_PUBKEY!),
      ipfsGateway: "https://ipfs.io",
      ipfsUploadUrl: "https://api.pinata.cloud/pinning/pinJSONToIPFS",
    }
  );

  console.log("Creating job with Hypernode SDK...");
  console.log(`Wallet: ${sdk.getPublicKey().toString()}`);

  // Create a Llama 3 inference job
  const { signature, job, jobId } = await sdk.jobs.createJob({
    model: "meta-llama/Llama-3.1-8B-Instruct",
    framework: "pytorch",
    operations: [
      {
        type: "run",
        command: "python inference.py",
        workdir: "/workspace",
      },
    ],
    input: {
      prompt: "Explain quantum computing in simple terms",
      max_tokens: 200,
      temperature: 0.7,
    },
    minVram: 12, // 12GB VRAM minimum
    gpuType: GpuType.NVIDIA,
    env: {
      HF_TOKEN: process.env.HF_TOKEN || "",
    },
    timeout: 3600, // 1 hour
  });

  console.log("\n✅ Job created successfully!");
  console.log(`Job ID: ${jobId.toString()}`);
  console.log(`Job PDA: ${job.toString()}`);
  console.log(`Transaction: ${signature}`);

  // Subscribe to job updates
  console.log("\n👀 Watching for updates...");

  const subscriptionId = await sdk.jobs.subscribeToJob(job, (jobAccount) => {
    console.log(`\n📡 Job update:`);
    console.log(`  State: ${jobAccount.state}`);

    if (jobAccount.node) {
      console.log(`  Node: ${jobAccount.node.toString()}`);
    }

    if (jobAccount.timeStart.toNumber() > 0) {
      const startTime = new Date(jobAccount.timeStart.toNumber() * 1000);
      console.log(`  Started: ${startTime.toISOString()}`);
    }

    if (jobAccount.timeEnd.toNumber() > 0) {
      const endTime = new Date(jobAccount.timeEnd.toNumber() * 1000);
      console.log(`  Ended: ${endTime.toISOString()}`);

      const duration = jobAccount.timeEnd.toNumber() - jobAccount.timeStart.toNumber();
      console.log(`  Duration: ${duration}s`);
    }
  });

  // Wait for completion
  console.log("\n⏳ Waiting for job completion...");

  try {
    const completedJob = await sdk.jobs.waitForCompletion(job, 600000); // 10 min timeout

    console.log("\n✅ Job completed!");

    // Get result from IPFS
    const result = await sdk.jobs.getJobResult(job);

    if (result) {
      console.log("\n📄 Job Result:");
      console.log(`  Exit Code: ${result.exit_code}`);
      console.log(`  Execution Time: ${result.execution_time}s`);
      console.log("\n  Output:`);
      console.log(result.stdout);

      if (result.metrics) {
        console.log("\n📊 Metrics:");
        console.log(`  GPU Utilization: ${result.metrics.gpu_utilization}%`);
        console.log(`  VRAM Used: ${result.metrics.vram_used} GB`);

        if (result.metrics.tokens_generated) {
          console.log(`  Tokens Generated: ${result.metrics.tokens_generated}`);
        }
      }
    }
  } catch (error) {
    console.error("\n❌ Job failed or timed out:", error);
  } finally {
    // Cleanup
    await sdk.jobs.unsubscribe(subscriptionId);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
