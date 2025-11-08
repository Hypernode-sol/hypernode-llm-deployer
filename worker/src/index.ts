#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { NodeManager } from "./NodeManager";
import { loadConfig } from "./config";

const program = new Command();

program
  .name("hypernode-worker")
  .description("Hypernode GPU worker client")
  .version("0.1.0");

/**
 * Start command - Start the worker node
 */
program
  .command("start")
  .description("Start the worker node")
  .option("-c, --config <path>", "Path to config file")
  .action(async (options) => {
    console.log(chalk.cyan.bold("\n╔═══════════════════════════════════════╗"));
    console.log(chalk.cyan.bold("║     HYPERNODE GPU WORKER CLIENT      ║"));
    console.log(chalk.cyan.bold("╚═══════════════════════════════════════╝\n"));

    const spinner = ora("Loading configuration...").start();

    try {
      // Load config
      const config = loadConfig();
      spinner.succeed("Configuration loaded");

      // Create node manager
      const nodeManager = new NodeManager(config);

      // Handle shutdown gracefully
      process.on("SIGINT", async () => {
        console.log(chalk.yellow("\n\n⚠️  Received SIGINT, shutting down..."));
        await nodeManager.stop();
        process.exit(0);
      });

      process.on("SIGTERM", async () => {
        console.log(chalk.yellow("\n\n⚠️  Received SIGTERM, shutting down..."));
        await nodeManager.stop();
        process.exit(0);
      });

      // Start worker
      await nodeManager.start();

      // Keep process alive
      await new Promise(() => {});
    } catch (error) {
      spinner.fail("Failed to start worker");
      console.error(chalk.red("\n❌ Error:"), error);
      process.exit(1);
    }
  });

/**
 * Status command - Show worker status
 */
program
  .command("status")
  .description("Show worker status")
  .action(async () => {
    console.log(chalk.cyan.bold("\n📊 Worker Status\n"));

    try {
      const config = loadConfig();
      const nodeManager = new NodeManager(config);

      // Get specs
      const specs = await nodeManager.getSpecs();

      console.log(chalk.bold("System Specs:"));
      console.log(`  CPU: ${specs.cpu.model} (${specs.cpu.cores} cores)`);
      console.log(`  RAM: ${specs.ram} GB`);
      console.log(`  GPUs: ${specs.gpus.length}`);

      specs.gpus.forEach((gpu, i) => {
        console.log(
          chalk.green(`    ${i + 1}. ${gpu.vendor} ${gpu.model} (${gpu.vram} GB VRAM)`)
        );
      });

      if (specs.container_runtime) {
        console.log(
          `  Container Runtime: ${specs.container_runtime.type} ${specs.container_runtime.version}`
        );
      }

      console.log();
    } catch (error) {
      console.error(chalk.red("❌ Error:"), error);
      process.exit(1);
    }
  });

/**
 * Test command - Test GPU detection
 */
program
  .command("test")
  .description("Test system requirements")
  .action(async () => {
    console.log(chalk.cyan.bold("\n🧪 Testing System Requirements\n"));

    const spinner = ora("Detecting GPUs...").start();

    try {
      const config = loadConfig();
      const nodeManager = new NodeManager(config);

      // Get specs
      const specs = await nodeManager.getSpecs();
      spinner.succeed(`Detected ${specs.gpus.length} GPU(s)`);

      // Test Docker
      spinner.start("Testing container runtime...");

      if (!specs.container_runtime) {
        spinner.fail("No container runtime detected");
        console.log(
          chalk.yellow(
            "\n⚠️  Please install Docker or Podman to run the worker.\n"
          )
        );
        process.exit(1);
      }

      spinner.succeed(
        `Container runtime: ${specs.container_runtime.type} ${specs.container_runtime.version}`
      );

      console.log(chalk.green("\n✅ All tests passed!\n"));
    } catch (error) {
      spinner.fail("Test failed");
      console.error(chalk.red("\n❌ Error:"), error);
      process.exit(1);
    }
  });

/**
 * Config command - Show current configuration
 */
program
  .command("config")
  .description("Show current configuration")
  .action(() => {
    console.log(chalk.cyan.bold("\n⚙️  Worker Configuration\n"));

    try {
      const config = loadConfig();

      console.log(chalk.bold("Solana:"));
      console.log(`  RPC URL: ${config.rpc_url}`);
      console.log(`  Keypair: ${config.keypair_path}`);
      console.log(`  Market: ${config.market.toString()}`);
      console.log(`  Program ID: ${config.program_id.toString()}`);

      console.log(chalk.bold("\nIPFS:"));
      console.log(`  Gateway: ${config.ipfs_gateway}`);
      console.log(`  Upload URL: ${config.ipfs_upload_url}`);

      console.log(chalk.bold("\nWorker:"));
      console.log(`  Container Runtime: ${config.container_runtime}`);
      console.log(`  Auto Accept: ${config.auto_accept}`);
      console.log(`  Polling Interval: ${config.polling_interval}ms`);
      console.log(`  Health Check Interval: ${config.health_check_interval}ms`);

      console.log();
    } catch (error) {
      console.error(chalk.red("❌ Error:"), error);
      process.exit(1);
    }
  });

// Parse CLI arguments
program.parse();
