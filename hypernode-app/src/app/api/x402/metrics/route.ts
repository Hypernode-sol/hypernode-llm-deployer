/**
 * x402 Metrics API Route
 *
 * GET /api/x402/metrics - Get monitoring metrics (Prometheus format)
 */

import { NextRequest, NextResponse } from 'next/server';
import { monitor } from '@/lib/x402/monitoring';

/**
 * GET /api/x402/metrics - Get x402 metrics in Prometheus format
 *
 * This endpoint returns monitoring metrics for x402 payment protocol.
 * Compatible with Prometheus scraping.
 */
export async function GET(request: NextRequest) {
  try {
    // Check if metrics are enabled
    const enabled = process.env.X402_MONITORING_ENABLED === 'true';

    if (!enabled) {
      return NextResponse.json(
        { error: 'Metrics not enabled' },
        { status: 503 }
      );
    }

    // Export metrics in Prometheus format
    const metrics = monitor.exportPrometheus();

    return new NextResponse(metrics, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; version=0.0.4',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('[x402] Error exporting metrics:', error);

    return NextResponse.json(
      {
        error: 'Failed to export metrics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
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
