/**
 * API Types
 * HTTP REST and WebSocket API types for Hypernode services
 */

import { JobState, NodeStatus, GpuType } from '../contracts';
import { PaymentIntent } from '../x402';

// ============================================================================
// HTTP Response Types
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
  timestamp: number;
}

// ============================================================================
// Job API Types
// ============================================================================

export interface JobSubmissionRequest {
  ipfsHash: string;
  price: number; // Lamports
  timeout: number; // Seconds
  requirements: {
    minVram: number; // GB
    gpuType: GpuType;
  };
  metadata?: Record<string, any>;
}

export interface JobSubmissionResponse {
  jobId: string;
  publicKey: string;
  paymentIntent?: PaymentIntent;
  estimatedStartTime?: number; // Unix timestamp
  queuePosition?: number;
}

export interface JobStatusResponse {
  jobId: string;
  state: JobState;
  client: string;
  node: string | null;
  ipfsJob: string;
  ipfsResult: string | null;
  price: number;
  timeout: number;
  timeCreated: number;
  timeStart: number | null;
  timeEnd: number | null;
  progress?: number; // 0-100
  error?: string;
}

export interface JobListQuery {
  state?: JobState;
  client?: string;
  node?: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'timeCreated' | 'price' | 'state';
  sortOrder?: 'asc' | 'desc';
}

// ============================================================================
// Node API Types
// ============================================================================

export interface NodeRegistrationRequest {
  endpoint: string;
  gpuType: GpuType;
  gpuVram: number; // GB
  cpuCores: number;
  ram: number; // GB
  diskSpace: number; // GB
  signature: string; // Ed25519 signature
}

export interface NodeStatusResponse {
  publicKey: string;
  owner: string;
  endpoint: string;
  status: NodeStatus;
  hardware: {
    gpuType: GpuType;
    gpuVram: number;
    cpuCores: number;
    ram: number;
    diskSpace: number;
  };
  stats: {
    totalJobsCompleted: number;
    totalJobsFailed: number;
    reputationScore: number;
    uptime: number; // Percentage
  };
  staking: {
    amount: number; // Lamports
    required: number; // Lamports
  };
  registeredAt: number;
  lastHeartbeat: number;
}

export interface NodeListQuery {
  status?: NodeStatus;
  gpuType?: GpuType;
  minVram?: number;
  minReputation?: number;
  page?: number;
  pageSize?: number;
  sortBy?: 'reputation' | 'jobs' | 'vram';
  sortOrder?: 'asc' | 'desc';
}

// ============================================================================
// Market API Types
// ============================================================================

export interface MarketStatsResponse {
  totalJobs: number;
  totalNodes: number;
  activeJobs: number;
  activeNodes: number;
  averageJobPrice: number; // Lamports
  averageJobDuration: number; // Seconds
  totalVolume24h: number; // Lamports
  totalVolume7d: number; // Lamports
  gpuDistribution: Record<GpuType, number>;
}

// ============================================================================
// WebSocket Types
// ============================================================================

export enum WsMessageType {
  // Client -> Server
  Subscribe = 'subscribe',
  Unsubscribe = 'unsubscribe',
  Ping = 'ping',

  // Server -> Client
  JobUpdate = 'job_update',
  NodeUpdate = 'node_update',
  MarketUpdate = 'market_update',
  PaymentUpdate = 'payment_update',
  Error = 'error',
  Pong = 'pong',
}

export interface WsMessage<T = any> {
  type: WsMessageType;
  data: T;
  timestamp: number;
}

export interface WsSubscribeMessage {
  type: WsMessageType.Subscribe;
  data: {
    channel: 'jobs' | 'nodes' | 'market' | 'payments';
    filters?: {
      jobId?: string;
      nodeId?: string;
      clientId?: string;
    };
  };
}

export interface WsJobUpdateMessage {
  type: WsMessageType.JobUpdate;
  data: {
    jobId: string;
    state: JobState;
    progress?: number;
    error?: string;
    result?: string; // IPFS hash
  };
}

export interface WsNodeUpdateMessage {
  type: WsMessageType.NodeUpdate;
  data: {
    nodeId: string;
    status: NodeStatus;
    currentJob?: string;
  };
}

export interface WsPaymentUpdateMessage {
  type: WsMessageType.PaymentUpdate;
  data: {
    intentId: string;
    verified: boolean;
    jobId?: string;
    signature?: string;
  };
}

// ============================================================================
// Health Check Types
// ============================================================================

export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime: number; // Seconds
  services: {
    blockchain: 'healthy' | 'degraded' | 'unhealthy';
    database: 'healthy' | 'degraded' | 'unhealthy';
    redis: 'healthy' | 'degraded' | 'unhealthy';
    ipfs: 'healthy' | 'degraded' | 'unhealthy';
  };
  x402?: {
    enabled: boolean;
    circuitBreakerOpen: boolean;
  };
  timestamp: number;
}

