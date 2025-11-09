import { PublicKey } from "@solana/web3.js";

/**
 * Network configuration
 */
export interface NetworkConfig {
  rpcUrl: string;
  programs: {
    markets: PublicKey;
    staking: PublicKey;
    rewards: PublicKey;
    slashing: PublicKey;
    governance: PublicKey;
  };
  token: {
    mint: PublicKey;
  };
}

/**
 * Devnet configuration with deployed program IDs
 * Deployed: November 8, 2025
 * HYPER Token (Devnet): 56jZUEMAhXxRu7Am3L2AkRRxNJb187zBbBQqnTf6jV75
 */
export const DEVNET_CONFIG: NetworkConfig = {
  rpcUrl: "https://api.devnet.solana.com",
  programs: {
    markets: new PublicKey("67UE2LconF9QU5Vobsaf5sXnW9yUisebLj8VmgGWLSdb"),
    staking: new PublicKey("3fw9eQN1KHarGcYVETvF7FDt2BYGuDPMjuhoE45RJnTJ"),
    rewards: new PublicKey("EqBzwuXKmDZbAMf2WTogQhzABsrG6dYbbKXW1adsLhbb"),
    slashing: new PublicKey("6hGxAwYG4dLiLapKYzxUq3G4fe13Ut3nfft2LueayYxq"),
    governance: new PublicKey("HgWFcrT4npr2iiqsF8v6bV6eHUsidmGkoYGYcJD45Jqz"),
  },
  token: {
    mint: new PublicKey("56jZUEMAhXxRu7Am3L2AkRRxNJb187zBbBQqnTf6jV75"), // FIXED: Devnet token
  },
};

/**
 * Localnet configuration for testing
 * Uses devnet token for local testing
 */
export const LOCALNET_CONFIG: NetworkConfig = {
  rpcUrl: "http://localhost:8899",
  programs: {
    markets: new PublicKey("8c1P5BJGB79gKFL4yXPxthZhKuhKd6WuAgxwQPET6nvV"),
    staking: new PublicKey("9nvKFcdaP1nnuGSzV3ZeFYRkvETksqkHHji1PvsE3R5k"),
    rewards: new PublicKey("7xTrVJ3xvUEfdZaDMj3BKdohFiWZJmCCm53dibRbUUbJ"),
    slashing: new PublicKey("83rLt9YBCTkaAX6vLUuEAQE7QdhofvQWUhjybXVr7nCL"),
    governance: new PublicKey("BYGEToSgdrpmbZt2uapsW6s7NnFuCmVabJzfd8uFT4dE"),
  },
  token: {
    mint: new PublicKey("56jZUEMAhXxRu7Am3L2AkRRxNJb187zBbBQqnTf6jV75"), // FIXED: Use devnet token for local testing
  },
};

/**
 * Mainnet configuration (placeholder - not yet deployed)
 * HYPER Token (Mainnet): 92s9qna3djkMncZzkacyNQ38UKnNXZFh4Jgqe3Cmpump
 */
export const MAINNET_CONFIG: NetworkConfig = {
  rpcUrl: "https://api.mainnet-beta.solana.com",
  programs: {
    markets: PublicKey.default, // TODO: Deploy to mainnet
    staking: PublicKey.default,
    rewards: PublicKey.default,
    slashing: PublicKey.default,
    governance: PublicKey.default,
  },
  token: {
    mint: new PublicKey("92s9qna3djkMncZzkacyNQ38UKnNXZFh4Jgqe3Cmpump"), // Mainnet token
  },
};

/**
 * Get configuration for a specific network
 */
export function getConfig(network: "devnet" | "localnet" | "mainnet"): NetworkConfig {
  switch (network) {
    case "devnet":
      return DEVNET_CONFIG;
    case "localnet":
      return LOCALNET_CONFIG;
    case "mainnet":
      return MAINNET_CONFIG;
    default:
      throw new Error(`Unknown network: ${network}`);
  }
}
