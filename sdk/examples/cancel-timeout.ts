/**
 * Example: Cancel and timeout job management
 */

import { HypernodeSDK, GpuType, JobState } from "../src";
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

  console.log("🔧 Job Cancellation and Timeout Examples\n");

  // Example 1: Cancel a queued job
  console.log("Example 1: Cancel a queued job");
  console.log("=" .repeat(50));

  // Create a job
  const { job: job1 } = await sdk.jobs.createJob({
    model: "meta-llama/Llama-3.1-8B-Instruct",
    framework: "pytorch",
    operations: [{ type: "run", command: "python inference.py" }],
    input: { prompt: "Test prompt" },
    minVram: 12,
    gpuType: GpuType.NVIDIA,
  });

  console.log(`Job created: ${job1.toString()}`);

  // Check status
  const jobAccount1 = await sdk.jobs.getJob(job1);
  console.log(`State: ${jobAccount1.state}`);

  // Cancel if still queued
  if (jobAccount1.state === JobState.Queued) {
    console.log("\n⏹️  Cancelling job...");

    try {
      const cancelTx = await sdk.jobs.cancelJob(job1);
      console.log(`✅ Job cancelled: ${cancelTx}`);

      // Verify cancellation
      const cancelledJob = await sdk.jobs.getJob(job1);
      console.log(`New state: ${cancelledJob.state}`);
      console.log(`Refund processed automatically`);
    } catch (error) {
      console.error(`❌ Failed to cancel:`, error);
    }
  } else {
    console.log(`⚠️  Job not in queued state, cannot cancel`);
  }

  // Example 2: Timeout a stalled job
  console.log("\n\nExample 2: Timeout a stalled job");
  console.log("=".repeat(50));

  // Create a job with short timeout
  const { job: job2 } = await sdk.jobs.createJob({
    model: "deepseek-r1-qwen-7b",
    framework: "pytorch",
    operations: [{ type: "run", command: "python inference.py" }],
    input: { prompt: "Another test" },
    minVram: 8,
    timeout: 60, // 1 minute timeout
  });

  console.log(`Job created: ${job2.toString()}`);

  // Subscribe to updates
  const subscriptionId = await sdk.jobs.subscribeToJob(job2, async (jobAccount) => {
    console.log(`\n📡 Update: ${jobAccount.state}`);

    // If job is running, check for timeout
    if (jobAccount.state === JobState.Running) {
      const currentTime = Math.floor(Date.now() / 1000);
      const elapsed = currentTime - jobAccount.timeStart.toNumber();

      console.log(`Elapsed: ${elapsed}s / ${jobAccount.timeout.toNumber()}s`);

      // Wait for timeout
      if (elapsed >= jobAccount.timeout.toNumber()) {
        console.log("\n⏰ Job has timed out!");

        try {
          const timeoutTx = await sdk.jobs.timeoutJob(job2);
          console.log(`✅ Timeout processed: ${timeoutTx}`);
          console.log(`Refund sent to client`);

          // Unsubscribe after timeout
          await sdk.jobs.unsubscribe(subscriptionId);
        } catch (error) {
          console.error(`❌ Failed to timeout:`, error);
        }
      }
    }
  });

  // Example 3: Manually check and timeout
  console.log("\n\nExample 3: Manual timeout check");
  console.log("=".repeat(50));

  // Simulate checking a job that may have timed out
  async function checkAndTimeoutIfNeeded(jobPubkey: PublicKey) {
    try {
      const job = await sdk.jobs.getJob(jobPubkey);

      if (job.state !== JobState.Running) {
        console.log(`Job not running (${job.state}), skip timeout check`);
        return;
      }

      const currentTime = Math.floor(Date.now() / 1000);
      const elapsed = currentTime - job.timeStart.toNumber();
      const timeoutSeconds = job.timeout.toNumber();

      console.log(`Job: ${jobPubkey.toString()}`);
      console.log(`Elapsed: ${elapsed}s`);
      console.log(`Timeout: ${timeoutSeconds}s`);

      if (elapsed >= timeoutSeconds) {
        console.log("\n⏰ Timing out job...");

        const tx = await sdk.jobs.timeoutJob(jobPubkey);
        console.log(`✅ Timed out: ${tx}`);
        return tx;
      } else {
        console.log(`✓ Job still within timeout window`);
        return null;
      }
    } catch (error) {
      console.error(`Error checking timeout:`, error);
      throw error;
    }
  }

  // Check timeout for job2 (example)
  await checkAndTimeoutIfNeeded(job2);

  console.log("\n\n📋 Summary:");
  console.log("- cancelJob(): Cancel queued jobs before execution");
  console.log("- timeoutJob(): Recover funds from stalled jobs");
  console.log("- Both operations refund the client automatically");
  console.log("- Timeout can be called by anyone after timeout expires");
  console.log("- Cancel can only be called by job creator");
}

main()
  .then(() => {
    console.log("\n✅ Examples completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });
