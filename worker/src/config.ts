import { PublicKey } from "@solana/web3.js";
import { WorkerConfig } from "./types";
import dotenv from "dotenv";
import path from "path";
import os from "os";

// Load .env file
dotenv.config();

/**
 * Load worker configuration from environment variables
 */
export function loadConfig(): WorkerConfig {
  // Required variables
  const rpcUrl = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
  const keypairPath =
    process.env.KEYPAIR_PATH || path.join(os.homedir(), ".config/solana/id.json");

  const marketStr = process.env.MARKET_PUBKEY;
  if (!marketStr) {
    throw new Error("MARKET_PUBKEY environment variable is required");
  }

  const programIdStr =
    process.env.PROGRAM_ID || "HYPERMarket11111111111111111111111111111111";

  // Optional variables
  const ipfsGateway = process.env.IPFS_GATEWAY || "https://ipfs.io";
  const ipfsUploadUrl =
    process.env.IPFS_UPLOAD_URL || "https://api.pinata.cloud/pinning/pinJSONToIPFS";
  const containerRuntime = (process.env.CONTAINER_RUNTIME || "docker") as
    | "docker"
    | "podman";
  const autoAccept = process.env.AUTO_ACCEPT === "true";
  const pollingInterval = parseInt(process.env.POLLING_INTERVAL || "10000", 10);
  const healthCheckInterval = parseInt(
    process.env.HEALTH_CHECK_INTERVAL || "60000",
    10
  );

  return {
    rpc_url: rpcUrl,
    keypair_path: keypairPath,
    market: new PublicKey(marketStr),
    program_id: new PublicKey(programIdStr),
    marketsProgramId: new PublicKey(programIdStr),
    ipfs_gateway: ipfsGateway,
    ipfs_upload_url: ipfsUploadUrl,
    container_runtime: containerRuntime,
    auto_accept: autoAccept,
    polling_interval: pollingInterval,
    health_check_interval: healthCheckInterval,
  };
}

/**
 * Default configuration for development
 */
export const DEFAULT_CONFIG: Partial<WorkerConfig> = {
  rpc_url: "https://api.devnet.solana.com",
  ipfs_gateway: "https://ipfs.io",
  ipfs_upload_url: "https://api.pinata.cloud/pinning/pinJSONToIPFS",
  container_runtime: "docker",
  auto_accept: true,
  polling_interval: 10000, // 10 seconds
  health_check_interval: 60000, // 1 minute
};
