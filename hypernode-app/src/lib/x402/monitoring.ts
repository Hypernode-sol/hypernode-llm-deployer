/**
 * x402 Monitoring and Metrics
 *
 * Collects and reports metrics for x402 payment protocol operations.
 * Provides insights into payment verification, job submissions, and errors.
 */

/**
 * Metric types
 */
export enum MetricType {
  Counter = 'counter',
  Gauge = 'gauge',
  Histogram = 'histogram',
}

/**
 * Metric data point
 */
export interface Metric {
  name: string;
  type: MetricType;
  value: number;
  labels?: Record<string, string>;
  timestamp: number;
}

/**
 * Monitoring service for x402
 */
export class X402Monitor {
  private metrics: Map<string, Metric> = new Map();
  private enabled: boolean;

  constructor() {
    this.enabled = process.env.X402_MONITORING_ENABLED === 'true';
  }

  /**
   * Increment a counter metric
   *
   * @param name - Metric name
   * @param value - Increment value (default: 1)
   * @param labels - Optional labels
   */
  incrementCounter(name: string, value: number = 1, labels?: Record<string, string>): void {
    if (!this.enabled) return;

    const key = this.getMetricKey(name, labels);
    const existing = this.metrics.get(key);

    this.metrics.set(key, {
      name,
      type: MetricType.Counter,
      value: (existing?.value || 0) + value,
      labels,
      timestamp: Date.now(),
    });
  }

  /**
   * Set a gauge metric
   *
   * @param name - Metric name
   * @param value - Gauge value
   * @param labels - Optional labels
   */
  setGauge(name: string, value: number, labels?: Record<string, string>): void {
    if (!this.enabled) return;

    const key = this.getMetricKey(name, labels);

    this.metrics.set(key, {
      name,
      type: MetricType.Gauge,
      value,
      labels,
      timestamp: Date.now(),
    });
  }

  /**
   * Record a histogram value
   *
   * @param name - Metric name
   * @param value - Value to record
   * @param labels - Optional labels
   */
  recordHistogram(name: string, value: number, labels?: Record<string, string>): void {
    if (!this.enabled) return;

    const key = this.getMetricKey(name, labels);

    this.metrics.set(key, {
      name,
      type: MetricType.Histogram,
      value,
      labels,
      timestamp: Date.now(),
    });
  }

  /**
   * Get all metrics
   *
   * @returns Array of metrics
   */
  getMetrics(): Metric[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
  }

  /**
   * Get metric key with labels
   *
   * @param name - Metric name
   * @param labels - Optional labels
   * @returns Metric key
   */
  private getMetricKey(name: string, labels?: Record<string, string>): string {
    if (!labels) return name;

    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(',');

    return `${name}{${labelStr}}`;
  }

  /**
   * Export metrics in Prometheus format
   *
   * @returns Prometheus-formatted metrics string
   */
  exportPrometheus(): string {
    const lines: string[] = [];

    for (const metric of this.metrics.values()) {
      const labels = metric.labels
        ? '{' + Object.entries(metric.labels).map(([k, v]) => `${k}="${v}"`).join(',') + '}'
        : '';

      lines.push(`${metric.name}${labels} ${metric.value} ${metric.timestamp}`);
    }

    return lines.join('\n');
  }
}

/**
 * Global monitor instance
 */
export const monitor = new X402Monitor();

/**
 * Common metric names
 */
export const Metrics = {
  PAYMENT_VERIFIED: 'x402_payment_verified_total',
  PAYMENT_REJECTED: 'x402_payment_rejected_total',
  JOB_CREATED: 'x402_job_created_total',
  JOB_COMPLETED: 'x402_job_completed_total',
  JOB_FAILED: 'x402_job_failed_total',
  VERIFICATION_TIME: 'x402_verification_duration_ms',
  ACTIVE_JOBS: 'x402_active_jobs',
  TOTAL_VOLUME: 'x402_total_volume_lamports',
  CIRCUIT_BREAKER_OPEN: 'x402_circuit_breaker_open',
  RATE_LIMIT_HIT: 'x402_rate_limit_hit_total',
  REPLAY_ATTACK_BLOCKED: 'x402_replay_attack_blocked_total',
} as const;

/**
 * Helper to measure execution time
 *
 * @param fn - Function to measure
 * @param metricName - Metric name for duration
 * @returns Function result
 */
export async function measureTime<T>(
  fn: () => Promise<T>,
  metricName: string
): Promise<T> {
  const start = Date.now();

  try {
    const result = await fn();
    const duration = Date.now() - start;
    monitor.recordHistogram(metricName, duration);
    return result;
  } catch (error) {
    const duration = Date.now() - start;
    monitor.recordHistogram(metricName, duration, { error: 'true' });
    throw error;
  }
}
