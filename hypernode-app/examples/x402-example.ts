/**
 * x402 End-to-End Example
 *
 * Demonstrates complete workflow of AI agent submitting a job with payment.
 */

import { X402AgentClient, generateKeypair } from '../src/lib/x402/agent-client';

/**
 * Main example function
 */
async function main() {
  console.log('🚀 x402 Payment Protocol - End-to-End Example\n');

  // Step 1: Generate a keypair (in production, use existing wallet)
  console.log('Step 1: Generating test keypair...');
  const keypair = generateKeypair();
  console.log(`  Public Key: ${keypair.publicKey}`);
  console.log(`  Secret Key: ${keypair.secretKey.substring(0, 20)}...\n`);

  // Step 2: Initialize x402 client
  console.log('Step 2: Initializing x402 client...');
  const client = new X402AgentClient({
    apiUrl: 'http://localhost:3000/api',
    walletSecretKey: Buffer.from(keypair.secretKey, 'base64'),
  });
  console.log(`  Client initialized for: ${client.getPublicKey()}\n`);

  // Step 3: Get pricing information
  console.log('Step 3: Fetching pricing...');
  try {
    const pricing = await client.getPricing('inference_medium');
    console.log(`  Job Type: ${pricing.jobType}`);
    console.log(`  Price: ${pricing.minimumPayment} lamports (${pricing.minimumPayment / 1e9} SOL)`);
    console.log(`  GPU: ${pricing.resources.gpu} with ${pricing.resources.vram} VRAM`);
    console.log(`  Estimated Time: ${pricing.estimatedTime}s`);
    console.log(`  Available Workers: ${pricing.availableWorkers}\n`);
  } catch (error) {
    console.log(`  ⚠️  Pricing API not available (expected in development mode)\n`);
  }

  // Step 4: Submit a job
  console.log('Step 4: Submitting job with payment...');
  try {
    const job = await client.submitJob('inference_medium', {
      model: 'llama-3-70b',
      input: {
        prompt: 'Explain quantum computing in simple terms',
        max_tokens: 500,
        temperature: 0.7,
      },
      timeout: 300,
    });

    console.log(`  ✅ Job submitted successfully!`);
    console.log(`  Job ID: ${job.jobId}`);
    console.log(`  Status: ${job.status}`);
    console.log(`  Payment Status: ${job.paymentStatus}\n`);

    // Step 5: Poll for completion
    console.log('Step 5: Waiting for job completion...');
    const completed = await client.waitForCompletion(job.jobId, 2000, 60000);

    console.log(`  ✅ Job completed!`);
    console.log(`  Status: ${completed.status}`);
    console.log(`  Worker: ${completed.worker}`);
    console.log(`  Execution Time: ${completed.metrics?.executionTime}s`);
    console.log(`  Result:`);
    console.log(JSON.stringify(completed.result, null, 2));
  } catch (error) {
    console.log(`  ⚠️  Job submission failed (API server may not be running)`);
    console.log(`  Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
  }

  // Step 6: Demonstrate error handling
  console.log('\nStep 6: Demonstrating error handling...');
  try {
    // Try to get status of non-existent job
    await client.getJobStatus('non-existent-job-id');
  } catch (error) {
    console.log(`  ✅ Error correctly caught: ${error instanceof Error ? error.message : 'Unknown'}`);
  }

  console.log('\n✨ Example completed!\n');
}

/**
 * Run the example
 */
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { main };
