import Docker from "dockerode";
import { JobDefinition, JobResult } from "../types";
import { Readable } from "stream";

/**
 * DockerProvider - Orchestrates job execution in Docker containers
 * Supports running PyTorch, HuggingFace, and Stable Diffusion models
 */
export class DockerProvider {
  private docker: Docker;

  constructor() {
    this.docker = new Docker();
  }

  /**
   * Execute a job in a Docker container
   */
  public async executeJob(
    jobId: string,
    definition: JobDefinition
  ): Promise<JobResult> {
    console.log(`[Docker] Executing job ${jobId} with ${definition.framework}...`);

    const startTime = Date.now();

    try {
      // Select image based on framework
      const image = this.selectImage(definition.framework);

      // Ensure image is pulled
      await this.pullImage(image);

      // Prepare environment variables
      const env = this.prepareEnv(definition);

      // Create container
      const container = await this.docker.createContainer({
        Image: image,
        Env: env,
        HostConfig: {
          // GPU access
          DeviceRequests: [
            {
              Driver: "nvidia",
              Count: -1, // All GPUs
              Capabilities: [["gpu"]],
            },
          ],
          // Resource limits
          Memory: 16 * 1024 * 1024 * 1024, // 16GB
          NanoCpus: 8 * 1000000000, // 8 CPUs
        },
        Cmd: this.buildCommand(definition),
      });

      console.log(`[Docker] Container created: ${container.id}`);

      // Start container
      await container.start();

      // Collect logs
      const logs: string[] = [];
      const logStream = await container.logs({
        follow: true,
        stdout: true,
        stderr: true,
      });

      logStream.on("data", (chunk: Buffer) => {
        const log = chunk.toString();
        logs.push(log);
        console.log(`[Docker] ${log.trim()}`);
      });

      // Wait for container to finish
      const statusCode = await container.wait();

      // Get execution time
      const executionTime = Math.floor((Date.now() - startTime) / 1000);

      // Inspect container to get full logs
      const stdout = logs.join("\n");
      const stderr = "";

      // Cleanup container
      await container.remove();

      console.log(
        `[Docker] Job ${jobId} finished with exit code ${statusCode.StatusCode}`
      );

      return {
        exit_code: statusCode.StatusCode || 0,
        stdout,
        stderr,
        execution_time: executionTime,
        outputs: {}, // TODO: Extract outputs from container
        metrics: await this.extractMetrics(stdout, definition.framework),
      };
    } catch (error) {
      console.error(`[Docker] Job ${jobId} failed:`, error);

      const executionTime = Math.floor((Date.now() - startTime) / 1000);

      return {
        exit_code: 1,
        stdout: "",
        stderr: error instanceof Error ? error.message : String(error),
        execution_time: executionTime,
      };
    }
  }

  /**
   * Select Docker image based on framework
   */
  private selectImage(framework: string): string {
    const images: Record<string, string> = {
      pytorch: "pytorch/pytorch:2.1.0-cuda12.1-cudnn8-runtime",
      huggingface: "huggingface/transformers-pytorch-gpu:latest",
      "stable-diffusion": "stabilityai/stable-diffusion:latest",
      ollama: "ollama/ollama:latest",
    };

    return images[framework] || images.pytorch;
  }

  /**
   * Pull Docker image if not exists
   */
  private async pullImage(image: string): Promise<void> {
    try {
      await this.docker.getImage(image).inspect();
      console.log(`[Docker] Image ${image} already exists`);
    } catch (error) {
      console.log(`[Docker] Pulling image ${image}...`);

      await new Promise<void>((resolve, reject) => {
        this.docker.pull(image, (err: Error | null, stream: Readable) => {
          if (err) {
            reject(err);
            return;
          }

          this.docker.modem.followProgress(
            stream,
            (err: Error | null, output: any[]) => {
              if (err) {
                reject(err);
              } else {
                console.log(`[Docker] Image ${image} pulled successfully`);
                resolve();
              }
            },
            (event: any) => {
              if (event.status === "Downloading" || event.status === "Extracting") {
                // Show progress
                if (event.progress) {
                  console.log(`[Docker] ${event.status}: ${event.progress}`);
                }
              }
            }
          );
        });
      });
    }
  }

  /**
   * Prepare environment variables
   */
  private prepareEnv(definition: JobDefinition): string[] {
    const env: string[] = [];

    // Add user-defined env vars
    if (definition.env) {
      for (const [key, value] of Object.entries(definition.env)) {
        env.push(`${key}=${value}`);
      }
    }

    // Add framework-specific env vars
    env.push(`MODEL=${definition.model}`);
    env.push(`FRAMEWORK=${definition.framework}`);

    // PyTorch settings
    env.push("PYTORCH_CUDA_ALLOC_CONF=max_split_size_mb:512");

    // HuggingFace cache
    env.push("HF_HOME=/tmp/huggingface");

    return env;
  }

  /**
   * Build container command from job definition
   */
  private buildCommand(definition: JobDefinition): string[] {
    const commands: string[] = [];

    // Execute each operation
    for (const op of definition.operations) {
      if (op.type === "run" && op.command) {
        commands.push("sh", "-c", op.command);
      }
    }

    // If no operations, run default command
    if (commands.length === 0) {
      commands.push("python", "-c", this.generatePythonScript(definition));
    }

    return commands;
  }

  /**
   * Generate Python script for model inference
   */
  private generatePythonScript(definition: JobDefinition): string {
    // Simple inference script based on framework
    if (definition.framework === "pytorch" || definition.framework === "huggingface") {
      return `
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
import json

model_name = "${definition.model}"
print(f"Loading model {model_name}...")

tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForCausalLM.from_pretrained(
    model_name,
    torch_dtype=torch.float16,
    device_map="auto"
)

print("Model loaded successfully")

# Get input from definition
input_data = ${JSON.stringify(definition.input)}
prompt = input_data.get("prompt", "Hello, world!")

print(f"Running inference on prompt: {prompt}")

inputs = tokenizer(prompt, return_tensors="pt").to(model.device)
outputs = model.generate(**inputs, max_length=200)
result = tokenizer.decode(outputs[0], skip_special_tokens=True)

print("Result:")
print(result)
print(json.dumps({"result": result}))
`;
    }

    return `print("No default script for framework: ${definition.framework}")`;
  }

  /**
   * Extract metrics from stdout
   */
  private async extractMetrics(
    stdout: string,
    framework: string
  ): Promise<any> {
    const metrics: any = {};

    // Try to extract tokens generated
    const tokensMatch = stdout.match(/tokens[:\s]+(\d+)/i);
    if (tokensMatch) {
      metrics.tokens_generated = parseInt(tokensMatch[1]);
    }

    // Try to extract inference time
    const timeMatch = stdout.match(/inference.*?(\d+\.?\d*)\s*(ms|seconds|s)/i);
    if (timeMatch) {
      const value = parseFloat(timeMatch[1]);
      const unit = timeMatch[2];
      metrics.inference_time = unit.startsWith("s") ? value * 1000 : value;
    }

    // GPU utilization would come from nvidia-smi or other monitoring
    metrics.gpu_utilization = 0; // Placeholder

    return metrics;
  }

  /**
   * List running containers
   */
  public async listContainers(): Promise<Docker.ContainerInfo[]> {
    return await this.docker.listContainers({ all: false });
  }

  /**
   * Stop container
   */
  public async stopContainer(containerId: string): Promise<void> {
    const container = this.docker.getContainer(containerId);
    await container.stop();
    await container.remove();
  }

  /**
   * Get Docker info
   */
  public async getInfo(): Promise<any> {
    return await this.docker.info();
  }
}
