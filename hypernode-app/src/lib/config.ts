import { PublicKey, clusterApiUrl } from '@solana/web3.js';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';

// Network configuration
export const NETWORK = (process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet') as WalletAdapterNetwork;

export const RPC_ENDPOINT = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl(NETWORK);

// Program IDs
export const PROGRAM_IDS = {
  markets: new PublicKey(process.env.NEXT_PUBLIC_MARKETS_PROGRAM_ID || '67UE2LconF9QU5Vobsaf5sXnW9yUisebLj8VmgGWLSdb'),
  staking: new PublicKey(process.env.NEXT_PUBLIC_STAKING_PROGRAM_ID || '3fw9eQN1KHarGcYVETvF7FDt2BYGuDPMjuhoE45RJnTJ'),
  rewards: new PublicKey(process.env.NEXT_PUBLIC_REWARDS_PROGRAM_ID || 'EqBzwuXKmDZbAMf2WTogQhzABsrG6dYbbKXW1adsLhbb'),
  slashing: new PublicKey(process.env.NEXT_PUBLIC_SLASHING_PROGRAM_ID || '6hGxAwYG4dLiLapKYzxUq3G4fe13Ut3nfft2LueayYxq'),
  governance: new PublicKey(process.env.NEXT_PUBLIC_GOVERNANCE_PROGRAM_ID || 'HgWFcrT4npr2iiqsF8v6bV6eHUsidmGkoYGYcJD45Jqz'),
};

// HYPER Token Mint (network-aware)
// Mainnet: 92s9qna3djkMncZzkacyNQ38UKnNXZFh4Jgqe3Cmpump
// Devnet: 56jZUEMAhXxRu7Am3L2AkRRxNJb187zBbBQqnTf6jV75
const HYPER_MINT_MAINNET = '92s9qna3djkMncZzkacyNQ38UKnNXZFh4Jgqe3Cmpump';
const HYPER_MINT_DEVNET = '56jZUEMAhXxRu7Am3L2AkRRxNJb187zBbBQqnTf6jV75';

export const HYPER_MINT = new PublicKey(
  process.env.NEXT_PUBLIC_HYPER_MINT ||
  (NETWORK === 'mainnet-beta' ? HYPER_MINT_MAINNET : HYPER_MINT_DEVNET)
);

// IPFS Configuration
export const IPFS_CONFIG = {
  gateway: process.env.NEXT_PUBLIC_IPFS_GATEWAY || 'https://ipfs.io',
  uploadUrl: process.env.NEXT_PUBLIC_IPFS_UPLOAD_URL || '',
};

// App Configuration
export const APP_CONFIG = {
  name: 'Hypernode',
  description: 'Decentralized GPU Network on Solana',
  url: 'https://hypernodesolana.org',
  twitter: '@hypernode_sol',
  contact: 'contact@hypernodesolana.org',
};

// Staking multipliers (duration in days -> multiplier)
export const STAKING_MULTIPLIERS: Record<number, number> = {
  14: 1.0,    // 2 weeks: 1x
  30: 1.25,   // 1 month: 1.25x
  90: 1.75,   // 3 months: 1.75x
  180: 2.5,   // 6 months: 2.5x
  365: 4.0,   // 1 year: 4x
};

// GPU type labels
export const GPU_TYPE_LABELS: Record<number, string> = {
  0: 'Any',
  1: 'NVIDIA',
  2: 'AMD',
};

// Job state labels
export const JOB_STATE_LABELS: Record<string, string> = {
  queued: 'Queued',
  running: 'Running',
  completed: 'Completed',
  stopped: 'Stopped',
  timedOut: 'Timed Out',
};

// Framework options
export const FRAMEWORKS = [
  { value: 'pytorch', label: 'PyTorch', description: 'Llama, Mistral, Qwen' },
  { value: 'huggingface', label: 'HuggingFace', description: 'Any HF Transformer' },
  { value: 'stable-diffusion', label: 'Stable Diffusion', description: 'SD 1.5, SDXL' },
  { value: 'ollama', label: 'Ollama', description: 'Any Ollama model' },
];

// Popular models
export const POPULAR_MODELS = {
  pytorch: [
    'meta-llama/Llama-3.1-8B-Instruct',
    'meta-llama/Llama-2-7b-chat-hf',
    'mistralai/Mistral-7B-Instruct-v0.2',
    'Qwen/Qwen-7B-Chat',
  ],
  'stable-diffusion': [
    'runwayml/stable-diffusion-v1-5',
    'stabilityai/stable-diffusion-xl-base-1.0',
    'CompVis/stable-diffusion-v1-4',
  ],
  huggingface: [
    'sentence-transformers/all-MiniLM-L6-v2',
    'bert-base-uncased',
    'facebook/bart-large-cnn',
  ],
  ollama: [
    'llama2',
    'mistral',
    'codellama',
  ],
};
