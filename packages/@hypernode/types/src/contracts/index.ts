/**
 * Smart Contract Types
 * Based on Anchor IDL definitions for Hypernode programs
 */

import { PublicKey } from '@solana/web3.js';

// ============================================================================
// Common Enums
// ============================================================================

export enum JobState {
  Open = 0,
  Assigned = 1,
  Running = 2,
  Completed = 3,
  Failed = 4,
  Cancelled = 5,
}

export enum NodeStatus {
  Registered = 0,
  Active = 1,
  Busy = 2,
  Offline = 3,
  Slashed = 4,
}

export enum GpuType {
  Unknown = 0,
  NvidiaRTX3090 = 1,
  NvidiaRTX4090 = 2,
  NvidiaA100 = 3,
  NvidiaH100 = 4,
  AMDMI250 = 5,
  AMDMI300 = 6,
}

// ============================================================================
// Markets Program Types
// ============================================================================

export interface MarketAccount {
  authority: PublicKey;
  totalJobs: bigint;
  totalNodes: bigint;
  jobPrice: bigint;
  jobTimeout: bigint;
  bump: number;
}

export interface JobAccount {
  id: PublicKey;
  market: PublicKey;
  client: PublicKey;
  node: PublicKey | null;
  ipfsJob: Uint8Array; // [u8; 32]
  ipfsResult: Uint8Array; // [u8; 32]
  price: bigint;
  timeout: bigint;
  state: JobState;
  timeCreated: bigint;
  timeStart: bigint;
  timeEnd: bigint;
  minVram: number;
  gpuType: GpuType;
  bump: number;
}

// ============================================================================
// Nodes Program Types
// ============================================================================

export interface NodeAccount {
  owner: PublicKey;
  endpoint: string; // Max 256 bytes
  status: NodeStatus;
  gpuType: GpuType;
  gpuVram: number; // GB
  cpuCores: number;
  ram: number; // GB
  diskSpace: number; // GB
  totalJobsCompleted: bigint;
  totalJobsFailed: bigint;
  reputationScore: number;
  stakedAmount: bigint;
  registeredAt: bigint;
  lastHeartbeat: bigint;
  bump: number;
}

export interface NodeRegistrationParams {
  endpoint: string;
  gpuType: GpuType;
  gpuVram: number;
  cpuCores: number;
  ram: number;
  diskSpace: number;
}

// ============================================================================
// Staking Program Types
// ============================================================================

export interface StakeAccount {
  owner: PublicKey;
  amount: bigint;
  lockedUntil: bigint;
  rewardDebt: bigint;
  xnosBalance: bigint; // xNOS tokens (staking receipt)
  bump: number;
}

export interface StakingPool {
  authority: PublicKey;
  totalStaked: bigint;
  totalXnos: bigint;
  rewardPerToken: bigint;
  lastUpdateTime: bigint;
  minLockPeriod: bigint;
  maxLockPeriod: bigint;
  bump: number;
}

// ============================================================================
// Rewards Program Types
// ============================================================================

export interface RewardAccount {
  owner: PublicKey;
  totalEarned: bigint;
  totalClaimed: bigint;
  lastClaimTime: bigint;
  pendingReward: bigint;
  bump: number;
}

export interface ReflectionPool {
  totalTokens: bigint;
  totalReflections: bigint;
  reflectionPerToken: bigint;
  lastDistributionTime: bigint;
  bump: number;
}

// ============================================================================
// Governance Program Types
// ============================================================================

export enum ProposalState {
  Draft = 0,
  Active = 1,
  Succeeded = 2,
  Defeated = 3,
  Queued = 4,
  Executed = 5,
  Cancelled = 6,
}

export enum VoteChoice {
  Against = 0,
  For = 1,
  Abstain = 2,
}

export interface Proposal {
  id: bigint;
  proposer: PublicKey;
  description: string; // Max 1024 bytes
  startTime: bigint;
  endTime: bigint;
  votesFor: bigint;
  votesAgainst: bigint;
  votesAbstain: bigint;
  state: ProposalState;
  quorumVotes: bigint;
  executable: boolean;
  executed: boolean;
  bump: number;
}

export interface Vote {
  voter: PublicKey;
  proposal: PublicKey;
  choice: VoteChoice;
  weight: bigint;
  timestamp: bigint;
  bump: number;
}

// ============================================================================
// Slashing Program Types
// ============================================================================

export enum SlashReason {
  JobTimeout = 0,
  InvalidResult = 1,
  Offline = 2,
  MaliciousBehavior = 3,
}

export interface SlashEvent {
  node: PublicKey;
  reason: SlashReason;
  amount: bigint;
  timestamp: bigint;
  evidence: string; // Max 512 bytes
  bump: number;
}

export interface SlashingConfig {
  authority: PublicKey;
  timeoutSlashPercent: number; // Basis points (e.g., 500 = 5%)
  invalidResultSlashPercent: number;
  offlineSlashPercent: number;
  maliciousSlashPercent: number;
  slashCooldown: bigint; // Seconds
  bump: number;
}

