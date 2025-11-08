import * as si from "systeminformation";
import { exec } from "child_process";
import { promisify } from "util";
import { SystemSpec, GpuSpec, GpuType } from "../types";

const execAsync = promisify(exec);

/**
 * SpecsHandler - Detects system and GPU specifications
 * Based on Nosana's SpecsHandler
 */
export class SpecsHandler {
  private cachedSpecs?: SystemSpec;

  /**
   * Get complete system specs
   */
  public async getSystemSpecs(): Promise<SystemSpec> {
    if (this.cachedSpecs) {
      return this.cachedSpecs;
    }

    console.log("[SpecsHandler] Detecting system specs...");

    const [cpu, memory, os, gpus, containerRuntime] = await Promise.all([
      this.getCpuInfo(),
      this.getMemoryInfo(),
      this.getOsInfo(),
      this.detectGpus(),
      this.detectContainerRuntime(),
    ]);

    this.cachedSpecs = {
      cpu,
      ram: memory,
      gpus,
      os,
      container_runtime: containerRuntime,
    };

    console.log("[SpecsHandler] System specs detected:");
    console.log(`  CPU: ${cpu.model} (${cpu.cores} cores, ${cpu.threads} threads)`);
    console.log(`  RAM: ${memory} GB`);
    console.log(`  OS: ${os.platform} ${os.distro} ${os.release}`);
    console.log(`  GPUs: ${gpus.length}`);
    gpus.forEach((gpu, i) => {
      console.log(`    ${i + 1}. ${gpu.vendor} ${gpu.model} (${gpu.vram} GB VRAM)`);
    });
    if (containerRuntime) {
      console.log(`  Container Runtime: ${containerRuntime.type} ${containerRuntime.version}`);
    }

    return this.cachedSpecs;
  }

  /**
   * Get CPU info
   */
  private async getCpuInfo(): Promise<SystemSpec["cpu"]> {
    const cpu = await si.cpu();
    return {
      model: cpu.brand || "Unknown",
      cores: cpu.cores || 0,
      threads: cpu.cores || 0, // physicalCores not always available
    };
  }

  /**
   * Get memory info (GB)
   */
  private async getMemoryInfo(): Promise<number> {
    const mem = await si.mem();
    return Math.round(mem.total / 1024 / 1024 / 1024);
  }

  /**
   * Get OS info
   */
  private async getOsInfo(): Promise<SystemSpec["os"]> {
    const osInfo = await si.osInfo();
    return {
      platform: osInfo.platform || "unknown",
      distro: osInfo.distro || "unknown",
      release: osInfo.release || "unknown",
    };
  }

  /**
   * Detect GPUs
   */
  private async detectGpus(): Promise<GpuSpec[]> {
    const gpus: GpuSpec[] = [];

    // Try NVIDIA first
    const nvidiaGpus = await this.detectNvidiaGpus();
    gpus.push(...nvidiaGpus);

    // Try AMD
    const amdGpus = await this.detectAmdGpus();
    gpus.push(...amdGpus);

    // If no GPUs detected, try systeminformation as fallback
    if (gpus.length === 0) {
      const siGpus = await this.detectGpusViaSysinfo();
      gpus.push(...siGpus);
    }

    return gpus;
  }

  /**
   * Detect NVIDIA GPUs via nvidia-smi
   */
  private async detectNvidiaGpus(): Promise<GpuSpec[]> {
    try {
      const { stdout } = await execAsync(
        "nvidia-smi --query-gpu=name,memory.total,driver_version,pci.bus_id --format=csv,noheader,nounits"
      );

      const gpus: GpuSpec[] = [];
      const lines = stdout.trim().split("\n");

      for (const line of lines) {
        const [name, vramMB, driver, pciBus] = line.split(",").map((s) => s.trim());

        gpus.push({
          vendor: "NVIDIA",
          model: name,
          vram: Math.round(parseInt(vramMB) / 1024), // Convert MB to GB
          type: GpuType.NVIDIA,
          driver_version: driver,
          pci_bus: pciBus,
          cuda_version: await this.detectCudaVersion(),
        });
      }

      return gpus;
    } catch (error) {
      // nvidia-smi not available
      return [];
    }
  }

  /**
   * Detect CUDA version
   */
  private async detectCudaVersion(): Promise<string | undefined> {
    try {
      const { stdout } = await execAsync("nvcc --version");
      const match = stdout.match(/release (\d+\.\d+)/);
      return match ? match[1] : undefined;
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Detect AMD GPUs via rocm-smi
   */
  private async detectAmdGpus(): Promise<GpuSpec[]> {
    try {
      const { stdout } = await execAsync("rocm-smi --showproductname --showmeminfo vram");

      const gpus: GpuSpec[] = [];
      // Parse rocm-smi output
      // This is simplified - real parsing would be more complex

      // For now, just return empty array
      // TODO: Implement proper rocm-smi parsing
      return gpus;
    } catch (error) {
      // rocm-smi not available
      return [];
    }
  }

  /**
   * Detect GPUs via systeminformation library (fallback)
   */
  private async detectGpusViaSysinfo(): Promise<GpuSpec[]> {
    try {
      const graphics = await si.graphics();
      const gpus: GpuSpec[] = [];

      for (const controller of graphics.controllers) {
        // Determine GPU type from vendor
        let gpuType = GpuType.Any;
        let vendor = controller.vendor || "Unknown";

        if (vendor.toLowerCase().includes("nvidia")) {
          gpuType = GpuType.NVIDIA;
          vendor = "NVIDIA";
        } else if (vendor.toLowerCase().includes("amd")) {
          gpuType = GpuType.AMD;
          vendor = "AMD";
        }

        gpus.push({
          vendor,
          model: controller.model || "Unknown",
          vram: controller.vram ? Math.round(controller.vram / 1024) : 0, // Convert MB to GB
          type: gpuType,
        });
      }

      return gpus;
    } catch (error) {
      console.error("[SpecsHandler] Failed to detect GPUs:", error);
      return [];
    }
  }

  /**
   * Detect container runtime (Docker or Podman)
   */
  private async detectContainerRuntime(): Promise<
    SystemSpec["container_runtime"] | undefined
  > {
    // Try Docker first
    try {
      const { stdout } = await execAsync("docker --version");
      const match = stdout.match(/Docker version ([\d.]+)/);
      if (match) {
        return {
          type: "docker",
          version: match[1],
        };
      }
    } catch (error) {
      // Docker not available
    }

    // Try Podman
    try {
      const { stdout } = await execAsync("podman --version");
      const match = stdout.match(/podman version ([\d.]+)/);
      if (match) {
        return {
          type: "podman",
          version: match[1],
        };
      }
    } catch (error) {
      // Podman not available
    }

    return undefined;
  }

  /**
   * Check if system meets job requirements
   */
  public async meetsJobRequirements(
    minVram: number,
    gpuType: GpuType
  ): Promise<boolean> {
    const specs = await this.getSystemSpecs();

    // Check if any GPU meets requirements
    for (const gpu of specs.gpus) {
      // Check VRAM
      if (gpu.vram < minVram) {
        continue;
      }

      // Check GPU type
      if (gpuType !== GpuType.Any && gpu.type !== gpuType) {
        continue;
      }

      return true;
    }

    return false;
  }

  /**
   * Get best GPU for job
   */
  public async getBestGpu(minVram: number, gpuType: GpuType): Promise<GpuSpec | null> {
    const specs = await this.getSystemSpecs();

    // Filter GPUs that meet requirements
    const eligibleGpus = specs.gpus.filter((gpu) => {
      if (gpu.vram < minVram) return false;
      if (gpuType !== GpuType.Any && gpu.type !== gpuType) return false;
      return true;
    });

    if (eligibleGpus.length === 0) {
      return null;
    }

    // Return GPU with most VRAM
    return eligibleGpus.reduce((best, current) =>
      current.vram > best.vram ? current : best
    );
  }
}
