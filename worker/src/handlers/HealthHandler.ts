import * as si from "systeminformation";
import { HealthStatus } from "../types";
import { SpecsHandler } from "./SpecsHandler";

/**
 * HealthHandler - Monitors system health and resource usage
 */
export class HealthHandler {
  private specsHandler: SpecsHandler;
  private startTime: Date;
  private activeJobs: number = 0;

  constructor(specsHandler: SpecsHandler) {
    this.specsHandler = specsHandler;
    this.startTime = new Date();
  }

  /**
   * Get current health status
   */
  public async getHealthStatus(): Promise<HealthStatus> {
    const [system, gpuStats, cpuUsage, memUsage, diskUsage] = await Promise.all([
      this.specsHandler.getSystemSpecs(),
      this.getGpuStats(),
      this.getCpuUsage(),
      this.getMemoryUsage(),
      this.getDiskUsage(),
    ]);

    // Determine overall health
    let status: "ok" | "warning" | "error" = "ok";

    if (
      cpuUsage > 90 ||
      memUsage > 90 ||
      diskUsage > 95 ||
      gpuStats.utilization.some((u) => u > 95)
    ) {
      status = "error";
    } else if (
      cpuUsage > 80 ||
      memUsage > 80 ||
      diskUsage > 90 ||
      gpuStats.utilization.some((u) => u > 90)
    ) {
      status = "warning";
    }

    return {
      status,
      system,
      gpu_utilization: gpuStats.utilization,
      vram_usage: gpuStats.vramUsage,
      cpu_usage: cpuUsage,
      ram_usage: memUsage,
      disk_usage: diskUsage,
      active_jobs: this.activeJobs,
      uptime: Math.floor((Date.now() - this.startTime.getTime()) / 1000),
      timestamp: new Date(),
    };
  }

  /**
   * Get GPU stats
   */
  private async getGpuStats(): Promise<{
    utilization: number[];
    vramUsage: number[];
  }> {
    const utilization: number[] = [];
    const vramUsage: number[] = [];

    try {
      // Try nvidia-smi for NVIDIA GPUs
      const { exec } = require("child_process");
      const { promisify } = require("util");
      const execAsync = promisify(exec);

      const { stdout } = await execAsync(
        "nvidia-smi --query-gpu=utilization.gpu,memory.used,memory.total --format=csv,noheader,nounits"
      );

      const lines = stdout.trim().split("\n");

      for (const line of lines) {
        const [util, memUsed, memTotal] = line.split(",").map((s: string) => parseInt(s.trim()));

        utilization.push(util || 0);
        vramUsage.push(memTotal > 0 ? (memUsed / memTotal) * 100 : 0);
      }
    } catch (error) {
      // nvidia-smi not available - return zeros
      const specs = await this.specsHandler.getSystemSpecs();
      utilization.push(...specs.gpus.map(() => 0));
      vramUsage.push(...specs.gpus.map(() => 0));
    }

    return { utilization, vramUsage };
  }

  /**
   * Get CPU usage percentage
   */
  private async getCpuUsage(): Promise<number> {
    const load = await si.currentLoad();
    return Math.round(load.currentLoad);
  }

  /**
   * Get memory usage percentage
   */
  private async getMemoryUsage(): Promise<number> {
    const mem = await si.mem();
    return Math.round((mem.used / mem.total) * 100);
  }

  /**
   * Get disk usage percentage
   */
  private async getDiskUsage(): Promise<number> {
    const disks = await si.fsSize();

    if (disks.length === 0) {
      return 0;
    }

    // Return usage of primary disk
    const primaryDisk = disks[0];
    return Math.round(primaryDisk.use);
  }

  /**
   * Increment active jobs counter
   */
  public incrementActiveJobs(): void {
    this.activeJobs++;
  }

  /**
   * Decrement active jobs counter
   */
  public decrementActiveJobs(): void {
    this.activeJobs = Math.max(0, this.activeJobs - 1);
  }

  /**
   * Check if system is healthy enough to accept new jobs
   */
  public async canAcceptNewJob(): Promise<boolean> {
    const health = await this.getHealthStatus();

    // Don't accept new jobs if system is in error state
    if (health.status === "error") {
      console.log("[HealthHandler] System in error state, not accepting new jobs");
      return false;
    }

    // Don't accept if already running too many jobs
    // TODO: Make this configurable
    if (health.active_jobs >= 3) {
      console.log("[HealthHandler] Too many active jobs, not accepting new jobs");
      return false;
    }

    return true;
  }

  /**
   * Log health status
   */
  public async logHealthStatus(): Promise<void> {
    const health = await this.getHealthStatus();

    console.log(`[Health] Status: ${health.status.toUpperCase()}`);
    console.log(`[Health] CPU: ${health.cpu_usage}%`);
    console.log(`[Health] RAM: ${health.ram_usage}%`);
    console.log(`[Health] Disk: ${health.disk_usage}%`);

    if (health.gpu_utilization.length > 0) {
      health.gpu_utilization.forEach((util, i) => {
        console.log(
          `[Health] GPU ${i}: ${util}% util, ${health.vram_usage[i].toFixed(1)}% VRAM`
        );
      });
    }

    console.log(`[Health] Active jobs: ${health.active_jobs}`);
    console.log(`[Health] Uptime: ${health.uptime}s`);
  }
}
