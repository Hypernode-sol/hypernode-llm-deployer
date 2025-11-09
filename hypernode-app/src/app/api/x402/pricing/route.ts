/**
 * x402 Payment Protocol - Pricing API Route
 *
 * GET /api/x402/pricing - Get pricing information
 */

import { NextRequest, NextResponse } from 'next/server';
import { PricingInfo } from '@/lib/x402/types';

/**
 * GET /api/x402/pricing - Get pricing information for all job types
 *
 * This endpoint returns pricing information for available job types.
 * No payment verification is required.
 */
export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const jobType = searchParams.get('jobType');

    // If specific job type requested, return only that pricing
    if (jobType) {
      const pricing = getPricingForJobType(jobType);
      return NextResponse.json<PricingInfo>(pricing);
    }

    // Otherwise, return all pricing information
    const allPricing = getAllPricing();
    return NextResponse.json<PricingInfo[]>(allPricing);
  } catch (error) {
    console.error('[x402] Error fetching pricing:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch pricing information',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Get pricing for a specific job type
 *
 * @param jobType - Job type identifier
 * @returns Pricing information
 */
function getPricingForJobType(jobType: string): PricingInfo {
  const pricing: Record<string, PricingInfo> = {
    'inference_small': {
      jobType: 'inference_small',
      pricePerSecond: 1667, // ~100K lamports per minute
      minimumPayment: 100000, // 0.0001 SOL
      estimatedTime: 60,
      resources: {
        gpu: 'NVIDIA T4',
        vram: '16GB',
        cpu: '4 vCPUs',
        memory: '16GB',
      },
      available: true,
      availableWorkers: 127,
    },
    'inference_medium': {
      jobType: 'inference_medium',
      pricePerSecond: 8333, // ~500K lamports per minute
      minimumPayment: 500000, // 0.0005 SOL
      estimatedTime: 60,
      resources: {
        gpu: 'NVIDIA A10',
        vram: '24GB',
        cpu: '8 vCPUs',
        memory: '32GB',
      },
      available: true,
      availableWorkers: 89,
    },
    'inference_large': {
      jobType: 'inference_large',
      pricePerSecond: 33333, // ~2M lamports per minute
      minimumPayment: 2000000, // 0.002 SOL
      estimatedTime: 60,
      resources: {
        gpu: 'NVIDIA A100',
        vram: '40GB',
        cpu: '16 vCPUs',
        memory: '64GB',
      },
      available: true,
      availableWorkers: 45,
    },
    'training_small': {
      jobType: 'training_small',
      pricePerSecond: 1389, // ~5M lamports per hour
      minimumPayment: 5000000, // 0.005 SOL
      estimatedTime: 3600,
      resources: {
        gpu: 'NVIDIA A10',
        vram: '24GB',
        cpu: '8 vCPUs',
        memory: '32GB',
      },
      available: true,
      availableWorkers: 34,
    },
    'training_medium': {
      jobType: 'training_medium',
      pricePerSecond: 5556, // ~20M lamports per hour
      minimumPayment: 20000000, // 0.02 SOL
      estimatedTime: 3600,
      resources: {
        gpu: 'NVIDIA A100',
        vram: '40GB',
        cpu: '16 vCPUs',
        memory: '64GB',
      },
      available: true,
      availableWorkers: 23,
    },
    'training_large': {
      jobType: 'training_large',
      pricePerSecond: 27778, // ~100M lamports per hour
      minimumPayment: 100000000, // 0.1 SOL
      estimatedTime: 3600,
      resources: {
        gpu: 'NVIDIA H100',
        vram: '80GB',
        cpu: '32 vCPUs',
        memory: '128GB',
      },
      available: true,
      availableWorkers: 12,
    },
  };

  return pricing[jobType] || {
    jobType: 'custom',
    pricePerSecond: 16667, // ~1M lamports per minute
    minimumPayment: 1000000, // 0.001 SOL
    estimatedTime: 60,
    resources: {
      gpu: 'NVIDIA A10',
      vram: '24GB',
      cpu: '8 vCPUs',
      memory: '32GB',
    },
    available: true,
    availableWorkers: 56,
  };
}

/**
 * Get all available pricing
 *
 * @returns Array of pricing information
 */
function getAllPricing(): PricingInfo[] {
  const jobTypes = [
    'inference_small',
    'inference_medium',
    'inference_large',
    'training_small',
    'training_medium',
    'training_large',
  ];

  return jobTypes.map(jobType => getPricingForJobType(jobType));
}

/**
 * OPTIONS handler for CORS
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
